#!/usr/bin/env python3
"""Kofra — verificação das fórmulas da Fase 2.

Lê cada CSV de testes/ (observações feitas na referência), recalcula com as
fórmulas descritas em docs/especificacao-calculos.md e compara.

Tolerância: R$ 0,01 nos valores em dinheiro; igualdade exata nos percentuais
exibidos, contagens, datas e textos (tempo, prévia de parcelas, avisos).

Uso:  python3 ferramentas/verificar_formulas.py   (gera testes/relatorio-verificacao.md)
"""
import csv
import os
import re
import sys
from datetime import date
from decimal import Decimal as D, ROUND_HALF_UP, getcontext

getcontext().prec = 60

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTES = os.path.join(RAIZ, "testes")
TOL = D("0.01")
META_MILHAO = D("1000000")
LIMITE_MESES = 1200  # 100 anos

resultados = []  # (arquivo, id, campo, observado, calculado, ok, diff)


# ---------- utilitários ----------
def ler(nome):
    with open(os.path.join(TESTES, nome), encoding="utf-8") as f:
        return list(csv.DictReader(f, delimiter=";"))


def dinheiro(s):
    s = (s or "").strip()
    return D(s.replace(",", ".")) if s else None


def numero(s):
    s = (s or "").strip()
    return D(s.replace(",", ".")) if s else None


def arred(x, casas):
    q = D(1).scaleb(-casas)
    return x.quantize(q, rounding=ROUND_HALF_UP)


def brl(x):
    """Formata 1234.5 -> '1.234,50' (sem o símbolo)."""
    x = arred(x, 2)
    sinal = "-" if x < 0 else ""
    inteiro, dec = f"{abs(x):.2f}".split(".")
    grupos = []
    while inteiro:
        grupos.insert(0, inteiro[-3:])
        inteiro = inteiro[:-3]
    return f"{sinal}{'.'.join(grupos)},{dec}"


def data_br(s):
    d, m, a = s.split("/")
    return date(int(a), int(m), int(d))


def cmp_dinheiro(arq, id_, campo, obs, calc):
    if obs is None or obs == "":
        return
    o = dinheiro(obs)
    diff = abs(o - arred(calc, 2))
    resultados.append((arq, id_, campo, brl(o), brl(calc), diff <= TOL, diff))


def cmp_exato(arq, id_, campo, obs, calc):
    if obs is None or obs == "":
        return
    ok = str(obs).strip() == str(calc).strip()
    resultados.append((arq, id_, campo, str(obs).strip(), str(calc), ok, None))


def cmp_numero(arq, id_, campo, obs, calc, casas):
    if obs is None or obs == "":
        return
    o = numero(obs)
    c = arred(calc, casas)
    resultados.append((arq, id_, campo, str(o), str(c), o == c, None))


def taxa_mensal(taxa_pct, unidade):
    t = taxa_pct / 100
    if unidade == "mensal":
        return t
    return (1 + t) ** (D(1) / D(12)) - 1


def texto_tempo(n):
    anos, meses = divmod(n, 12)
    partes = []
    if anos:
        partes.append("1 ano" if anos == 1 else f"{anos} anos")
    if meses:
        partes.append("1 mês" if meses == 1 else f"{meses} meses")
    return " e ".join(partes)


def mes_add(ano, mes, k):
    t = ano * 12 + (mes - 1) + k
    return t // 12, t % 12 + 1


def parse_mes(s):  # '2026-10'
    a, m = s.split("-")
    return int(a), int(m)


def janela(s):  # '2026-08..2026-10'
    ini, fim = s.split("..")
    return parse_mes(ini), parse_mes(fim)


def meses_da_janela(ini, fim):
    out = []
    a, m = ini
    while (a, m) <= fim:
        out.append((a, m))
        a, m = mes_add(a, m, 1)
    return out


def serie(s):
    mapa = {}
    for parte in (s or "").split("|"):
        if not parte.strip():
            continue
        k, v = parte.split(":")
        mapa[parse_mes(k)] = dinheiro(v)
    return mapa


# ---------- Orçamento ----------
def orcamento_saldo():
    arq = "orcamento_saldo.csv"
    for r in ler(arq):
        R, DF, DV, I = (dinheiro(r[c]) for c in ("receita", "despesas_fixas", "despesas_variaveis", "investir"))
        cmp_dinheiro(arq, r["id"], "despesas", r["obs_despesas"], DF + DV)
        cmp_dinheiro(arq, r["id"], "saldo", r["obs_saldo"], R - DF - DV - I)


def orcamento_investir():
    arq = "orcamento_investir.csv"
    for r in ler(arq):
        R = dinheiro(r["receita"])
        if r["modo"] == "percentual":
            inv = arred(R * numero(r["percentual"]) / 100, 2)
        elif r["modo"] == "fixo":
            inv = dinheiro(r["valor_fixo"])
            cmp_numero(arq, r["id"], "percentual_exibido", r["obs_percentual_exibido"], inv / R * 100, 1)
        else:
            inv = D(0)
        cmp_dinheiro(arq, r["id"], "investir", r["obs_investir"], inv)


def orcamento_receita_prevista():
    arq = "orcamento_receita_prevista.csv"
    for r in ler(arq):
        cmp_dinheiro(arq, r["id"], "receita", r["obs_receita"], dinheiro(r["receitas_confirmadas"]))
        cmp_dinheiro(arq, r["id"], "a_receber", r["obs_a_receber"], dinheiro(r["receitas_previstas_pendentes"]))


ABA_DO_TIPO = {"receita": "receita", "prevista-recebida": "receita", "prevista-pendente": None,
               "fixa": "fixa", "variavel": "variavel", "parcela": "variavel"}


def orcamento_categorias():
    """Cada aba do Orçamento tem o seu gráfico (corrigido na Fase 4): % inteiro sobre o total da aba."""
    arq = "orcamento_categorias.csv"
    for r in ler(arq):
        por_cat = {}
        for parte in r["itens"].split("|"):
            m = re.match(r"^(.*) \(([\w-]+), ([^)]+)\):([\d.,]+)$", parte.strip())
            _, tipo, cat, valor = m.groups()
            if ABA_DO_TIPO[tipo] == r["aba"]:
                por_cat[cat] = por_cat.get(cat, D(0)) + dinheiro(valor)
        total = sum(por_cat.values())
        ordem = sorted(por_cat.items(), key=lambda kv: -kv[1])
        calc = "|".join(f"{cat}:{arred(v / total * 100, 0)}" for cat, v in ordem)
        cmp_exato(arq, r["id"], "percentuais", r["obs_percentuais"], calc)


def parcelamento():
    arq = "parcelamento.csv"
    for r in ler(arq):
        total, n = dinheiro(r["valor_total"]), int(r["parcelas"])
        padrao = arred(total / n, 2)
        primeira = total - (n - 1) * padrao
        parcelas = [primeira] + [padrao] * (n - 1)
        cmp_exato(arq, r["id"], "previa", r["obs_previa"], f"{n}x de R$ {brl(padrao)}")
        for k in (1, 2, 3):
            if k <= n:
                cmp_dinheiro(arq, r["id"], f"parcela_{k}", r[f"obs_parcela_{k}"], parcelas[k - 1])
        dc = r["data_compra"]
        ano, mes = (parse_mes(dc) if "-" in dc else (data_br(dc).year, data_br(dc).month))
        for k in (1, 2):
            a, m = mes_add(ano, mes, k - 1)
            cmp_exato(arq, r["id"], f"data_parcela_{k}", r[f"obs_data_parcela_{k}"], f"01/{m:02d}/{a}")
        cmp_dinheiro(arq, r["id"], "soma_parcelas", r["valor_total"], sum(parcelas))


# ---------- Patrimônio e Investimentos ----------
def patrimonio():
    arq = "patrimonio.csv"
    for r in ler(arq):
        L, I, B, Dv = (dinheiro(r[c]) for c in ("liquidez", "investimentos", "bens", "dividas"))
        p = L + I + B - Dv
        if r["precisao_obs"] == "reais":
            cmp_numero(arq, r["id"], "patrimonio (sem centavos)", r["obs_patrimonio"], p, 0)
        else:
            cmp_dinheiro(arq, r["id"], "patrimonio", r["obs_patrimonio"], p)


def patrimonio_composicao():
    arq = "patrimonio_composicao.csv"
    for r in ler(arq):
        itens = []
        for parte in r["itens"].split("|"):
            nome, grupo, valor = parte.split(":")
            itens.append((nome, grupo, dinheiro(valor)))
        base = sum(v for _, g, v in itens if g != "divida")
        calc = ["-" if g == "divida" else str(arred(v / base * 100, 0)) for _, g, v in itens]
        cmp_exato(arq, r["id"], "percentuais", r["obs_percentuais"], "|".join(calc))


def investimentos_rendimento():
    arq = "investimentos_rendimento.csv"
    for r in ler(arq):
        inv, atual = dinheiro(r["valor_investido"]), dinheiro(r["valor_atual"])
        rend = atual - inv
        cmp_dinheiro(arq, r["id"], "rendimento", r["obs_rendimento"], rend)
        if inv > 0:
            cmp_numero(arq, r["id"], "rendimento_pct", r["obs_rendimento_pct"], rend / inv * 100, 1)


# ---------- Reserva ----------
def reserva_meta():
    arq = "reserva_meta.csv"
    for r in ler(arq):
        cmp_dinheiro(arq, r["id"], "meta", r["obs_meta"], dinheiro(r["custo_mensal"]) * int(r["meses"]))


def reserva_percentual():
    arq = "reserva_percentual.csv"
    for r in ler(arq):
        meta = dinheiro(r["meta"])
        atual = sum((dinheiro(x) for x in r["locais"].split("|") if x.strip()), D(0))
        estado = "zero" if atual == 0 else ("completo" if atual >= meta else "parcial")
        cmp_dinheiro(arq, r["id"], "valor_atual", r["obs_valor_atual"], atual)
        cmp_exato(arq, r["id"], "estado_kofra", r["estado_kofra"], estado)
        if estado == "completo":
            # a referência não exibe percentual quando a reserva está completa
            cmp_exato(arq, r["id"], "percentual_oculto", "sim", "sim" if r["obs_percentual"] == "" else "não")
        else:
            cmp_numero(arq, r["id"], "percentual", r["obs_percentual"], atual / meta * 100, 0)


# ---------- Visão geral e Início ----------
def visao_geral():
    arq = "visao_geral.csv"
    for r in ler(arq):
        ini, fim = janela(r["janela"])
        meses = meses_da_janela(ini, fim)
        n = len(meses)
        ant_ini, ant_fim = mes_add(*ini, -n), mes_add(*ini, -1)
        cmp_exato(arq, r["id"], "janela_anterior", r["janela_anterior"],
                  f"{ant_ini[0]}-{ant_ini[1]:02d}..{ant_fim[0]}-{ant_fim[1]:02d}")
        meses_ant = meses_da_janela(ant_ini, ant_fim)
        rec, gas = serie(r["receitas_por_mes"]), serie(r["gastos_por_mes"])
        R = sum((rec.get(m, D(0)) for m in meses), D(0))
        G = sum((gas.get(m, D(0)) for m in meses), D(0))
        Ra = sum((rec.get(m, D(0)) for m in meses_ant), D(0))
        Ga = sum((gas.get(m, D(0)) for m in meses_ant), D(0))
        cmp_dinheiro(arq, r["id"], "receita", r["obs_receita"], R)
        cmp_dinheiro(arq, r["id"], "gastos", r["obs_gastos"], G)
        cmp_dinheiro(arq, r["id"], "saldo_periodo", r["obs_saldo_periodo"], R - G)
        for campo, atual, ant in (("receita_variacao", R, Ra), ("gastos_variacao", G, Ga)):
            obs = r[f"obs_{campo}"]
            if obs == "":
                continue
            if ant == 0:
                cmp_exato(arq, r["id"], campo, obs, "sem anterior")
            elif obs == "sem anterior":
                cmp_exato(arq, r["id"], campo, obs, brl(atual - ant))
            else:
                cmp_dinheiro(arq, r["id"], campo, obs, atual - ant)


def visao_geral_estoques():
    arq = "visao_geral_estoques.csv"
    for r in ler(arq):
        fim, ant = dinheiro(r["valor_fim_janela"]), dinheiro(r["valor_fim_janela_anterior"])
        cmp_dinheiro(arq, r["id"], "valor", r["obs_valor"], fim)
        if ant == 0:
            cmp_exato(arq, r["id"], "variacao", r["obs_variacao"], "sem anterior")
        else:
            cmp_dinheiro(arq, r["id"], "variacao", r["obs_variacao"], fim - ant)


def inicio_indicadores():
    arq = "inicio_indicadores.csv"
    for r in ler(arq):
        R, I, Dp = dinheiro(r["receita"]), dinheiro(r["investir"]), dinheiro(r["despesas"])
        cmp_numero(arq, r["id"], "despesas_pct", r["obs_percentual"], Dp / (R - I) * 100, 0)


# ---------- Metas ----------
def metas_aporte_mensal():
    arq = "metas_aporte_mensal.csv"
    for r in ler(arq):
        hoje, prazo = data_br(r["hoje"]), data_br(r["prazo"])
        falta = dinheiro(r["valor_total"]) - dinheiro(r["guardado"])
        if prazo < hoje or falta <= 0:
            calc = "oculto"
        else:
            meses = max(1, (prazo.year - hoje.year) * 12 + (prazo.month - hoje.month))
            calc = str(arred(falta / meses, 0))
        cmp_exato(arq, r["id"], "sugestao_mensal", r["obs_sugestao"], calc)


def metas_progresso():
    arq = "metas_progresso.csv"
    for r in ler(arq):
        total = dinheiro(r["valor_total"])
        guardado = sum((dinheiro(x) for x in r["movimentacoes"].split("|") if x.strip()), D(0))
        cmp_dinheiro(arq, r["id"], "guardado", r["obs_guardado"], guardado)
        if guardado < total:
            cmp_dinheiro(arq, r["id"], "falta", r["obs_falta"], total - guardado)
        cmp_exato(arq, r["id"], "concluida", r["obs_concluida"], "sim" if guardado >= total else "nao")


# ---------- Calculadoras ----------
def simular_juros(pv, pmt, i, n):
    saldo, linhas = pv, []
    for m in range(1, n + 1):
        juros = saldo * i
        saldo = saldo * (1 + i) + pmt
        linhas.append((m, juros, pv + pmt * m, saldo))
    return saldo, linhas


def juros_compostos():
    arq = "juros_compostos.csv"
    casos = {}
    for r in ler(arq):
        pv, pmt = dinheiro(r["valor_inicial"]), dinheiro(r["valor_mensal"])
        taxa, periodo = numero(r["taxa"]), int(r["periodo"])
        if taxa <= 0 or periodo <= 0:
            cmp_exato(arq, r["id"], "aviso", r["obs_aviso"], "pede taxa e período")
            continue
        i = taxa_mensal(taxa, r["unidade_taxa"])
        n = periodo if r["unidade_periodo"] == "meses" else periodo * 12
        final, linhas = simular_juros(pv, pmt, i, n)
        casos[r["id"]] = linhas
        investido = pv + pmt * n
        juros = final - investido
        cmp_dinheiro(arq, r["id"], "valor_final", r["obs_valor_final"], final)
        cmp_dinheiro(arq, r["id"], "total_investido", r["obs_total_investido"], investido)
        cmp_dinheiro(arq, r["id"], "total_juros", r["obs_total_juros"], juros)
        cmp_numero(arq, r["id"], "pct_investido", r["obs_pct_investido"], investido / final * 100, 1)
        cmp_numero(arq, r["id"], "pct_juros", r["obs_pct_juros"], juros / final * 100, 1)
    arq2 = "juros_compostos_mes_a_mes.csv"
    for r in ler(arq2):
        m, juros, inv, acum = casos[r["caso"]][int(r["mes"]) - 1]
        rid = f"{r['caso']}/mês {r['mes']}"
        cmp_dinheiro(arq2, rid, "juros_mes", r["obs_juros_mes"], juros)
        cmp_dinheiro(arq2, rid, "total_investido", r["obs_total_investido"], inv)
        cmp_dinheiro(arq2, rid, "total_acumulado", r["obs_total_acumulado"], acum)


def primeiro_milhao_tempo():
    arq = "primeiro_milhao_tempo.csv"
    for r in ler(arq):
        pv, pmt = dinheiro(r["valor_inicial"]), dinheiro(r["valor_mensal"])
        if pv >= META_MILHAO:
            cmp_exato(arq, r["id"], "aviso", r["obs_aviso"], "valor inicial já atinge a meta")
            continue
        i = taxa_mensal(numero(r["taxa"]), r["unidade_taxa"])
        saldo, n = pv, None
        for k in range(1, LIMITE_MESES + 1):
            saldo = saldo * (1 + i) + pmt
            if saldo >= META_MILHAO:
                n = k
                break
        if n is None:
            cmp_exato(arq, r["id"], "aviso", r["obs_aviso"], "inalcançável em até 100 anos")
            continue
        investido = pv + pmt * n
        juros = META_MILHAO - investido
        cmp_exato(arq, r["id"], "tempo", r["obs_tempo"], texto_tempo(n))
        cmp_dinheiro(arq, r["id"], "investido", r["obs_investido"], investido)
        cmp_dinheiro(arq, r["id"], "juros", r["obs_juros"], juros)
        cmp_numero(arq, r["id"], "pct_investido", r["obs_pct_investido"], investido / META_MILHAO * 100, 1)
        cmp_numero(arq, r["id"], "pct_juros", r["obs_pct_juros"], juros / META_MILHAO * 100, 1)


def primeiro_milhao_aporte():
    arq = "primeiro_milhao_aporte.csv"
    for r in ler(arq):
        pv, prazo = dinheiro(r["valor_inicial"]), int(r["prazo"])
        n = prazo * 12 if r["unidade_prazo"] == "anos" else prazo
        i = taxa_mensal(numero(r["taxa"]), r["unidade_taxa"])
        fator = (1 + i) ** n
        if pv * fator >= META_MILHAO:
            cmp_exato(arq, r["id"], "aviso", r["obs_aviso"], "valor inicial já é suficiente")
            investido = pv
        else:
            pmt = (META_MILHAO - pv * fator) * i / (fator - 1)
            cmp_dinheiro(arq, r["id"], "aporte", r["obs_aporte"], pmt)
            investido = arred(pv + pmt * n, 2)
        juros = META_MILHAO - investido
        cmp_dinheiro(arq, r["id"], "investido", r["obs_investido"], investido)
        cmp_dinheiro(arq, r["id"], "juros", r["obs_juros"], juros)
        cmp_numero(arq, r["id"], "pct_investido", r["obs_pct_investido"], investido / META_MILHAO * 100, 1)
        cmp_numero(arq, r["id"], "pct_juros", r["obs_pct_juros"], juros / META_MILHAO * 100, 1)


# ---------- relatório ----------
def main():
    for f in (orcamento_saldo, orcamento_investir, orcamento_receita_prevista, orcamento_categorias, parcelamento,
              patrimonio, patrimonio_composicao, investimentos_rendimento,
              reserva_meta, reserva_percentual, visao_geral, visao_geral_estoques,
              inicio_indicadores, metas_aporte_mensal, metas_progresso,
              juros_compostos, primeiro_milhao_tempo, primeiro_milhao_aporte):
        f()

    por_arquivo = {}
    for arq, id_, campo, obs, calc, ok, diff in resultados:
        d = por_arquivo.setdefault(arq, {"casos": set(), "checagens": 0, "ok": 0, "maxdiff": D(0), "dinheiro": False})
        d["casos"].add(id_.split("/")[0])
        d["checagens"] += 1
        d["ok"] += 1 if ok else 0
        if diff is not None:
            d["dinheiro"] = True
            d["maxdiff"] = max(d["maxdiff"], diff)

    total = len(resultados)
    falhas = [x for x in resultados if not x[5]]
    linhas = ["# Relatório de verificação das fórmulas (Fase 2)", "",
              "Gerado por `ferramentas/verificar_formulas.py` a partir dos CSVs de `testes/`.",
              "Tolerância: R$ 0,01 em dinheiro; igualdade exata em percentuais exibidos, datas e textos.", "",
              "| Arquivo | Casos | Checagens | OK | Maior diferença (R$) |",
              "|---|---:|---:|---:|---:|"]
    for arq, d in por_arquivo.items():
        md = brl(d["maxdiff"]) if d["dinheiro"] else "—"
        linhas.append(f"| {arq} | {len(d['casos'])} | {d['checagens']} | {d['ok']} | {md} |")
    linhas += ["", f"**Total: {total - len(falhas)} de {total} checagens OK.**", ""]
    if falhas:
        linhas += ["## Falhas", "", "| Arquivo | Caso | Campo | Observado | Calculado |", "|---|---|---|---|---|"]
        for arq, id_, campo, obs, calc, ok, diff in falhas:
            linhas.append(f"| {arq} | {id_} | {campo} | {obs} | {calc} |")
    else:
        linhas.append("Nenhuma divergência: todas as fórmulas reproduzem exatamente o que a referência mostrou.")
    saida = os.path.join(TESTES, "relatorio-verificacao.md")
    with open(saida, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")
    print("\n".join(linhas))
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())

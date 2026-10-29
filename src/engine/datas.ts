/** Mês de competência no formato 'AAAA-MM'. */
export type Mes = string;
/** Data no formato 'AAAA-MM-DD' (sem fuso: é a data do calendário). */
export type DataISO = string;

const NOMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const doisDigitos = (n: number) => String(n).padStart(2, '0');

export function hojeISO(agora: Date = new Date()): DataISO {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

export function mesDe(data: DataISO): Mes {
  return data.slice(0, 7);
}

export function mesAtual(agora: Date = new Date()): Mes {
  return mesDe(hojeISO(agora));
}

export function partesMes(mes: Mes): { ano: number; mes: number } {
  const [a, m] = mes.split('-').map(Number);
  return { ano: a, mes: m };
}

export function criarMes(ano: number, mes: number): Mes {
  return `${ano}-${doisDigitos(mes)}`;
}

export function somarMeses(mes: Mes, k: number): Mes {
  const { ano, mes: m } = partesMes(mes);
  const t = ano * 12 + (m - 1) + k;
  return criarMes(Math.floor(t / 12), (((t % 12) + 12) % 12) + 1);
}

/** Quantos meses de `de` até `ate` (ate − de). */
export function diferencaMeses(de: Mes, ate: Mes): number {
  const a = partesMes(de);
  const b = partesMes(ate);
  return (b.ano - a.ano) * 12 + (b.mes - a.mes);
}

export function diasNoMes(mes: Mes): number {
  const { ano, mes: m } = partesMes(mes);
  return new Date(ano, m, 0).getDate();
}

/** A data do dia `dia` no mês, limitada ao último dia (31 em fevereiro vira 28/29). */
export function dataNoMes(mes: Mes, dia: number): DataISO {
  return `${mes}-${doisDigitos(Math.min(Math.max(1, dia), diasNoMes(mes)))}`;
}

export function primeiroDia(mes: Mes): DataISO {
  return `${mes}-01`;
}

export function ultimoDia(mes: Mes): DataISO {
  return dataNoMes(mes, 31);
}

export function diaDe(data: DataISO): number {
  return Number(data.slice(8, 10));
}

/** Meses de `inicio` a `fim`, inclusive. */
export function listarMeses(inicio: Mes, fim: Mes): Mes[] {
  const n = diferencaMeses(inicio, fim);
  return n < 0 ? [] : Array.from({ length: n + 1 }, (_, i) => somarMeses(inicio, i));
}

/** Diferença em dias corridos entre duas datas (b − a). */
export function diferencaDias(a: DataISO, b: DataISO): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

export function somarDias(data: DataISO, dias: number): DataISO {
  const [y, m, d] = data.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + dias));
  return `${t.getUTCFullYear()}-${doisDigitos(t.getUTCMonth() + 1)}-${doisDigitos(t.getUTCDate())}`;
}

export function dataValida(data: string): data is DataISO {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [y, m, d] = data.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= diasNoMes(criarMes(y, m));
}

/** "outubro de 2026" (longo) · "out/2026" (curto) · "Out 2026" (rotulo) · "out" (sigla) */
export function nomeMes(mes: Mes, estilo: 'longo' | 'curto' | 'rotulo' | 'sigla' = 'longo'): string {
  const { ano, mes: m } = partesMes(mes);
  switch (estilo) {
    case 'curto':
      return `${CURTOS[m - 1]}/${ano}`;
    case 'rotulo':
      return `${CURTOS[m - 1][0].toUpperCase()}${CURTOS[m - 1].slice(1)} ${ano}`;
    case 'sigla':
      return CURTOS[m - 1];
    default:
      return `${NOMES[m - 1]} de ${ano}`;
  }
}

export function nomeMesCapitalizado(mes: Mes): string {
  const s = nomeMes(mes, 'longo');
  return s[0].toUpperCase() + s.slice(1);
}

/** "27/10/2026" (numerica) · "27 out 2026" (extenso) · "27/10" (diaMes) · "27 de outubro" (diaNome) */
export function formatarData(
  data: DataISO,
  estilo: 'numerica' | 'extenso' | 'diaMes' | 'diaNome' = 'numerica',
): string {
  const [y, m, d] = data.split('-').map(Number);
  switch (estilo) {
    case 'extenso':
      return `${d} ${CURTOS[m - 1]} ${y}`;
    case 'diaMes':
      return `${doisDigitos(d)}/${doisDigitos(m)}`;
    case 'diaNome':
      return `${d} de ${NOMES[m - 1]}`;
    default:
      return `${doisDigitos(d)}/${doisDigitos(m)}/${y}`;
  }
}

/** Converte "27/10/2026" em '2026-10-27'. */
export function lerDataBR(texto: string): DataISO | null {
  const m = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return dataValida(iso) ? iso : null;
}

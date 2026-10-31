// Teste de verdade contra o Supabase: cria 2 contas temporárias, confere o isolamento
// entre elas (RLS) e a gravação por revisão, e apaga tudo no fim.
// Uso: node ferramentas/nuvem/testar-seguranca.mjs
// A chave secreta vem de .segredos.env (SUPABASE_SECRET_KEY) e serve só para apagar as contas.
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function lerEnv(arquivo) {
  const linhas = readFileSync(join(raiz, arquivo), 'utf8').split(/\r?\n/);
  return Object.fromEntries(linhas.filter((l) => /^\w+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
}

const { VITE_SUPABASE_URL: URL_NUVEM, VITE_SUPABASE_PUBLISHABLE_KEY: PUBLICA } = lerEnv('.env');
const { SUPABASE_SECRET_KEY: SECRETA } = lerEnv('.segredos.env');
if (!SECRETA) throw new Error('Falta SUPABASE_SECRET_KEY em .segredos.env');

const opcoes = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const novoCliente = () => createClient(URL_NUVEM, PUBLICA, opcoes);
const admin = createClient(URL_NUVEM, SECRETA, opcoes);

let falhas = 0;
function conferir(nome, ok, detalhe = '') {
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${ok || !detalhe ? '' : ` — ${detalhe}`}`);
  if (!ok) falhas++;
}

const contas = [];

async function criarConta(rotulo) {
  const cliente = novoCliente();
  const email = `teste-pila-${rotulo}-${randomBytes(6).toString('hex')}@pila-teste.dev`;
  const senha = randomBytes(18).toString('base64url');
  const { data, error } = await cliente.auth.signUp({ email, password: senha });
  if (error || !data.session) throw new Error(`Cadastro falhou: ${error?.message ?? 'sem sessão'}`);
  contas.push(data.user.id);
  return { cliente, id: data.user.id };
}

const docs = (c) => c.from('documentos');

try {
  const a = await criarConta('a');
  const b = await criarConta('b');
  const anonimo = novoCliente();

  // Cada conta grava e lê o próprio documento.
  const gravouA = await docs(a.cliente).insert({ usuario_id: a.id, dados: { dono: 'a' }, versao: 1 });
  const gravouB = await docs(b.cliente).insert({ usuario_id: b.id, dados: { dono: 'b' }, versao: 1 });
  conferir('A grava o próprio documento', !gravouA.error, gravouA.error?.message);
  conferir('B grava o próprio documento', !gravouB.error, gravouB.error?.message);
  const lidoA = await docs(a.cliente).select('usuario_id, dados');
  const lidoB = await docs(b.cliente).select('usuario_id, dados');
  conferir('A lê só o próprio documento', lidoA.data?.length === 1 && lidoA.data[0].dados.dono === 'a', JSON.stringify(lidoA));
  conferir('B lê só o próprio documento', lidoB.data?.length === 1 && lidoB.data[0].dados.dono === 'b', JSON.stringify(lidoB));

  // B não alcança o documento de A.
  const bLeA = await docs(b.cliente).select('dados').eq('usuario_id', a.id);
  conferir('B não lê o documento de A', bLeA.data?.length === 0, JSON.stringify(bLeA));
  const bAlteraA = await docs(b.cliente).update({ dados: { dono: 'b invadiu' } }).eq('usuario_id', a.id).select();
  conferir('B não altera o documento de A', bAlteraA.data?.length === 0, JSON.stringify(bAlteraA));
  const bApagaA = await docs(b.cliente).delete().eq('usuario_id', a.id).select();
  conferir('B não apaga o documento de A', bApagaA.data?.length === 0, JSON.stringify(bApagaA));
  const bRoubaA = await docs(b.cliente).update({ usuario_id: a.id }).eq('usuario_id', b.id).select();
  conferir('B não transfere o próprio documento para A', !!bRoubaA.error || bRoubaA.data?.length === 0, JSON.stringify(bRoubaA));
  const bInsereA = await docs(b.cliente).insert({ usuario_id: a.id, dados: { dono: 'b' } });
  conferir('B não cria documento em nome de A', !!bInsereA.error);
  const intacto = await docs(a.cliente).select('dados, versao').single();
  conferir('o documento de A segue intacto', intacto.data?.dados.dono === 'a' && intacto.data?.versao === 1, JSON.stringify(intacto));

  // Sem login, nada.
  const anonLe = await docs(anonimo).select('dados');
  conferir('sem login não lê nenhum documento', !anonLe.data?.length, JSON.stringify(anonLe));

  // Gravação condicionada à revisão, como o app faz.
  const antes = (await docs(a.cliente).select('atualizado_em').single()).data.atualizado_em;
  const errada = await docs(a.cliente).update({ dados: { dono: 'revisao errada' }, versao: 100 }).eq('usuario_id', a.id).eq('versao', 99).select();
  conferir('update com a revisão errada não atualiza nenhuma linha', errada.data?.length === 0, JSON.stringify(errada));
  const depoisErrada = await docs(a.cliente).select('dados, versao').single();
  conferir('update com a revisão errada não muda nada', depoisErrada.data?.dados.dono === 'a' && depoisErrada.data?.versao === 1, JSON.stringify(depoisErrada));
  const certa = await docs(a.cliente).update({ dados: { dono: 'a2' }, versao: 2 }).eq('usuario_id', a.id).eq('versao', 1).select('versao, atualizado_em');
  conferir('update com a revisão certa grava e soma 1', certa.data?.length === 1 && certa.data[0].versao === 2, JSON.stringify(certa));
  conferir('o trigger atualiza atualizado_em', certa.data?.[0]?.atualizado_em !== antes);
  const duplicado = await docs(a.cliente).insert({ usuario_id: a.id, dados: { dono: 'a3' } });
  conferir('criar sobre um documento existente dá 23505, que o app trata como conflito', duplicado.error?.code === '23505', JSON.stringify(duplicado));
} finally {
  for (const id of contas) {
    const { error } = await admin.auth.admin.deleteUser(id);
    conferir(`conta temporária ${id.slice(0, 8)} apagada`, !error, error?.message);
  }
  if (contas.length) {
    const sobra = await admin.from('documentos').select('usuario_id').in('usuario_id', contas);
    conferir('nenhum documento das contas temporárias sobrou', sobra.data?.length === 0, JSON.stringify(sobra));
  }
}

console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exitCode = falhas ? 1 : 0;

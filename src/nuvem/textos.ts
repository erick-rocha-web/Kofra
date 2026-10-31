import type { Situacao } from './sincronizacao';

const SEM_INTERNET = 'Sem internet: as alterações ficam neste aparelho e vão quando a conexão voltar';

function quando(iso: string, agora: Date): string {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === agora.toDateString()) return `às ${hora}`;
  return `em ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
}

export function textoSituacao(situacao: Situacao, sincronizadoEm: string | null, agora = new Date()): string {
  switch (situacao) {
    case 'enviando':
      return 'Enviando…';
    case 'sem-internet':
      return SEM_INTERNET;
    case 'erro':
      return 'Erro ao sincronizar';
    case 'decidir':
      return 'Falta escolher quais dados manter';
    case 'salvo':
      return sincronizadoEm ? `Tudo salvo na nuvem ${quando(sincronizadoEm, agora)}` : 'Tudo em dia: seus dados vão para a nuvem no primeiro salvamento';
    default:
      return 'Conferindo a nuvem…';
  }
}

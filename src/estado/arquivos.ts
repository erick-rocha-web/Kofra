/**
 * Salvar arquivos para a pessoa.
 * Dentro do claude.ai a página roda num quadro protegido: downloads passam pela
 * capacidade "downloads" (com confirmação). Fora dele (arquivo aberto no navegador),
 * um link de download comum funciona.
 */

type ResultadoSalvar = 'salvo' | 'recusado' | 'indisponivel';

interface DownloadsNS {
  save(req: { filename: string; data: string | Blob }): Promise<{ status: 'saved' | 'delivered' }>;
}

interface ClaudeGlobal {
  use(nome: string): Promise<unknown>;
}

export function claudeDisponivel(): ClaudeGlobal | null {
  const c = (window as unknown as { claude?: ClaudeGlobal }).claude;
  return c && typeof c.use === 'function' ? c : null;
}

export async function salvarArquivo(nome: string, conteudo: string): Promise<ResultadoSalvar> {
  const claude = claudeDisponivel();
  if (claude) {
    let downloads: DownloadsNS | null = null;
    try {
      downloads = (await claude.use('downloads')) as DownloadsNS | null;
    } catch {
      downloads = null;
    }
    if (!downloads) return 'indisponivel';
    try {
      await downloads.save({ filename: nome, data: conteudo });
      return 'salvo';
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'declined') return 'recusado';
      return 'indisponivel';
    }
  }
  try {
    const blob = new Blob([conteudo], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'salvo';
  } catch {
    return 'indisponivel';
  }
}

/** Copia texto (precisa ser chamado dentro do clique). */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export function lerArquivoTexto(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(r.error ?? new Error('Falha ao ler o arquivo'));
    r.readAsText(arquivo, 'utf-8');
  });
}

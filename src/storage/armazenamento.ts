import type { Dados } from './tipos';

/**
 * Interface única de armazenamento. Hoje: IndexedDB do navegador (ou memória, se o
 * navegador bloquear). Amanhã: uma API na nuvem com a mesma interface.
 */
export interface Armazenamento {
  readonly tipo: 'indexeddb' | 'memoria';
  carregar(): Promise<Dados | null>;
  salvar(dados: Dados): Promise<void>;
  apagarTudo(): Promise<void>;
}

const BANCO = 'pila';
// Nome do banco até 29/10/2026, quando o app se chamava Kofra.
const BANCO_ANTIGO = 'kofra';
const LOJA = 'dados';
const CHAVE = 'principal';

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(BANCO, 1);
    } catch (e) {
      reject(e);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LOJA)) db.createObjectStore(LOJA);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Não foi possível abrir o IndexedDB'));
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });
}

/** Abre o banco antigo só se ele já existir; sem isso, abrir criaria um banco vazio. */
function abrirBancoAntigo(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(BANCO_ANTIGO);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => req.transaction?.abort();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

function apagarBanco(nome: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(nome);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

class ArmazenamentoIndexedDB implements Armazenamento {
  readonly tipo = 'indexeddb' as const;
  constructor(private db: IDBDatabase) {}

  private transacao<T>(modo: IDBTransactionMode, fazer: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(LOJA, modo);
        const req = fazer(tx.objectStore(LOJA));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error ?? new Error('Falha no IndexedDB'));
        tx.onabort = () => reject(tx.error ?? new Error('Transação cancelada'));
      } catch (e) {
        reject(e);
      }
    });
  }

  async carregar(): Promise<Dados | null> {
    const v = await this.transacao('readonly', (s) => s.get(CHAVE));
    return (v as Dados | undefined) ?? null;
  }

  async salvar(dados: Dados): Promise<void> {
    await this.transacao('readwrite', (s) => s.put(dados, CHAVE));
  }

  async apagarTudo(): Promise<void> {
    await this.transacao('readwrite', (s) => s.delete(CHAVE));
    await apagarBanco(BANCO_ANTIGO);
  }
}

/** Traz os dados do banco antigo para o novo. O antigo só é apagado depois de conferir a cópia. */
async function migrarBancoAntigo(novo: Armazenamento): Promise<void> {
  if (await novo.carregar()) return;
  const antigo = await abrirBancoAntigo();
  if (!antigo) return;
  let podeApagar = false;
  try {
    const dados = await new ArmazenamentoIndexedDB(antigo).carregar();
    if (dados) {
      await novo.salvar(dados);
      podeApagar = JSON.stringify(await novo.carregar()) === JSON.stringify(dados);
    } else {
      podeApagar = true;
    }
  } finally {
    antigo.close();
  }
  if (podeApagar) await apagarBanco(BANCO_ANTIGO);
}

class ArmazenamentoMemoria implements Armazenamento {
  readonly tipo = 'memoria' as const;
  private copia: Dados | null = null;
  async carregar() {
    return this.copia;
  }
  async salvar(dados: Dados) {
    this.copia = dados;
  }
  async apagarTudo() {
    this.copia = null;
  }
}

/** Tenta o IndexedDB; se o navegador recusar (janela privada, bloqueio), usa a memória. */
export async function criarArmazenamento(): Promise<Armazenamento> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('sem IndexedDB');
    const db = await Promise.race([
      abrirBanco(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), 4000)),
    ]);
    const a = new ArmazenamentoIndexedDB(db);
    await a.carregar(); // confirma que leitura funciona
    await Promise.race([
      migrarBancoAntigo(a).catch(() => undefined),
      new Promise<void>((res) => setTimeout(res, 4000)),
    ]);
    return a;
  } catch {
    return new ArmazenamentoMemoria();
  }
}

import { useId, useState, type FormEvent } from 'react';
import { useSinc } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { criarConta, entrar, obterSincronizador, pedirRedefinicao, sair, useConta, useNuvem } from '../../nuvem/conta';
import { textoSituacao } from '../../nuvem/textos';
import { Botao, BotaoIcone, Campo, Entrada, Segmentado } from '../../ui/base';

const SENHA_MINIMA = 8;

export function CampoSenha({
  rotulo,
  valor,
  aoMudar,
  autoComplete,
  ajuda,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  autoComplete: string;
  ajuda?: string;
}) {
  const id = useId();
  const [ver, setVer] = useState(false);
  return (
    <Campo rotulo={rotulo} htmlFor={id} ajuda={ajuda}>
      <div className="relative">
        <Entrada
          id={id}
          type={ver ? 'text' : 'password'}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          autoComplete={autoComplete}
          className="pr-12"
          required
        />
        <BotaoIcone
          icone={ver ? 'eye-slash' : 'eye'}
          rotulo={ver ? 'Esconder a senha' : 'Mostrar a senha'}
          variante="fantasma"
          tamanho={38}
          className="absolute right-1 top-1"
          onClick={() => setVer(!ver)}
        />
      </div>
    </Campo>
  );
}

function FormConta() {
  const idEmail = useId();
  const sinc = useSinc();
  const [modo, setModo] = useState<'entrar' | 'criar' | 'esqueci'>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function trocar(m: typeof modo) {
    setModo(m);
    setErro(null);
    setAviso(null);
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    const emailLimpo = email.trim();
    if (modo !== 'esqueci' && senha.length < SENHA_MINIMA) {
      setErro(`Senha curta: use pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    setEnviando(true);
    let falha: string | null;
    if (modo === 'entrar') falha = await entrar(emailLimpo, senha);
    else if (modo === 'criar') falha = await criarConta(emailLimpo, senha);
    else falha = await pedirRedefinicao(emailLimpo);
    setEnviando(false);
    setErro(falha);
    if (!falha && modo === 'esqueci') {
      setAviso('Se este e-mail tiver conta, enviamos um link para definir a senha nova. Abra o link neste mesmo navegador.');
    }
  }

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-3.5" noValidate>
      {sinc.usuarioId && (
        <p className="text-[13px] leading-[19px] text-suave">Sua sessão terminou. Entre de novo para continuar sincronizando: o que você alterou aqui segue guardado neste aparelho.</p>
      )}
      {modo === 'esqueci' ? (
        <p className="text-[13px] leading-[19px] text-suave">Informe o e-mail da conta para receber o link de redefinição.</p>
      ) : (
        <Segmentado<'entrar' | 'criar'>
          rotulo="Entrar ou criar conta"
          valor={modo}
          aoMudar={trocar}
          opcoes={[
            { valor: 'entrar', rotulo: 'Entrar' },
            { valor: 'criar', rotulo: 'Criar conta' },
          ]}
        />
      )}
      <Campo rotulo="E-mail" htmlFor={idEmail}>
        <Entrada id={idEmail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required />
      </Campo>
      {modo !== 'esqueci' && (
        <CampoSenha
          rotulo="Senha"
          valor={senha}
          aoMudar={setSenha}
          autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
          ajuda={modo === 'criar' ? `No mínimo ${SENHA_MINIMA} caracteres.` : undefined}
        />
      )}
      {erro && (
        <p role="alert" className="text-[13px] font-medium leading-[19px] text-despesa">
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="text-[13px] leading-[19px] text-suave">
          {aviso}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Botao type="submit" variante="primario" disabled={enviando || !email.trim()}>
          {modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Enviar link'}
        </Botao>
        {modo === 'entrar' && (
          <Botao variante="fantasma" onClick={() => trocar('esqueci')}>
            Esqueci a senha
          </Botao>
        )}
        {modo === 'esqueci' && (
          <Botao variante="fantasma" onClick={() => trocar('entrar')}>
            Voltar
          </Botao>
        )}
      </div>
    </form>
  );
}

function ContaConectada() {
  const { usuario, situacao, erro, escolha, escolhaAberta } = useNuvem();
  const { saida } = useConta();
  const sinc = useSinc();
  const { avisar, navegar } = useUI();
  const texto = textoSituacao(situacao, sinc.sincronizadoEm);
  return (
    <div className="flex flex-col gap-3">
      <div className="min-w-0">
        <p className="text-[12.5px] text-suave">Conta</p>
        <p className="truncate text-[14px] font-semibold">{usuario?.email}</p>
      </div>
      <div role="status" className="text-[13px] leading-[19px] text-suave">
        <p>{texto}</p>
        {situacao === 'erro' && erro && <p className="mt-0.5">{erro}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {(situacao === 'erro' || situacao === 'sem-internet') && (
          <Botao icone="arrow-clockwise" onClick={() => void obterSincronizador()?.verificar()}>
            Tentar de novo
          </Botao>
        )}
        {escolha && !escolhaAberta && (
          <Botao variante="primario" onClick={() => obterSincronizador()?.reabrirEscolha()}>
            Escolher
          </Botao>
        )}
        <Botao
          icone="sign-out"
          disabled={saida === 'saindo'}
          onClick={async () => {
            if (await sair()) {
              avisar('Você saiu da conta.');
              navegar('inicio');
            }
          }}
        >
          Sair
        </Botao>
      </div>
    </div>
  );
}

export function BlocoConta() {
  const { disponivel, carregando } = useConta();
  const { usuario } = useNuvem();
  if (!disponivel) return null;
  return (
    <div id="conta" className="mt-4 scroll-mt-6 border-t border-borda pt-4">
      {carregando ? <p className="text-[13px] text-suave">Conferindo a sua conta…</p> : usuario ? <ContaConectada /> : <FormConta />}
    </div>
  );
}

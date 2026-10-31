import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loja } from './estado/loja';
import { iniciarNuvem } from './nuvem/conta';
import { ProvedorUI } from './estado/ui';
import './ui/estilos.css';

document.documentElement.lang = 'pt-BR';
const raiz = document.getElementById('raiz');
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <ProvedorUI>
        <App />
      </ProvedorUI>
    </StrictMode>,
  );
  void loja.iniciar().then(iniciarNuvem);
}

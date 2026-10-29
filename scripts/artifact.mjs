// Converte dist/index.html (documento completo, uso local) no formato de página
// publicada como Artifact no claude.ai: sem <!doctype>/<html>/<head>/<body>,
// com <title> e <style> no topo (o claude.ai envolve o conteúdo no esqueleto).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'dist/index.html'), 'utf8');

const pegar = (re) => html.match(re)?.[0] ?? '';
const todos = (re) => [...html.matchAll(re)].map((m) => m[0]);

const titulo = pegar(/<title>[\s\S]*?<\/title>/);
const metaLados = pegar(/<meta name="claude:viewport-fit-sides"[^>]*>/);
const fontes = todos(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>/g);
const estilos = todos(/<style[^>]*>[\s\S]*?<\/style>/g);
const scripts = todos(/<script[^>]*>[\s\S]*?<\/script>/g).map((s) => s.replace(/\s+crossorigin(?=[\s>])/, ''));
const corpo = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? '').replace(/<script[\s\S]*?<\/script>/g, '').trim();

for (const s of scripts) {
  const interno = s.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  if (/<\/script/i.test(interno)) throw new Error('Script embutido contém "</script": a página quebraria.');
}
if (!titulo || !estilos.length || !scripts.length || !corpo.includes('id="raiz"')) {
  throw new Error('dist/index.html não tem a estrutura esperada.');
}

const saida = [titulo, metaLados, ...fontes, ...estilos, corpo, ...scripts].filter(Boolean).join('\n');
writeFileSync(join(raiz, 'dist/kofra-artifact.html'), saida + '\n');
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`dist/index.html (${kb(html.length)}) → dist/kofra-artifact.html (${kb(saida.length)})`);

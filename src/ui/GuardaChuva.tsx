import { useId } from 'react';
import type { EstadoReserva } from '../engine/reserva';

const COPA =
  'M40 170A120 120 0 0 1 280 170Q265 156 250 170Q235 156 220 170Q205 156 190 170Q175 156 160 170Q145 156 130 170Q115 156 100 170Q85 156 70 170Q55 156 40 170Z';
const VARETAS = 'M160 50Q97 74 70 170M160 50Q118 76 100 170M160 50Q139 78 130 170M160 50V170M160 50Q181 78 190 170M160 50Q202 76 220 170M160 50Q223 74 250 170';
const CHUVA = 'M52 12l-5 11M98 26l-5 11M142 6l-5 11M206 22l-5 11M250 8l-5 11M296 26l-5 11M22 64l-5 11M304 76l-5 11M16 122l-5 11M310 132l-5 11';
const BRILHO = 'M262 18l3 8 8 3-8 3-3 8-3-8-8-3 8-3z M58 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2z M292 70l2 5 5 2-5 2-2 5-2-5-5-2 5-2z';

/**
 * A metáfora da reserva: a cor preenche a copa da esquerda para a direita na proporção da meta.
 * Com a meta atingida a chuva para e aparecem brilhos.
 */
export function GuardaChuva({ fracao, estado, largura = 320 }: { fracao: number; estado: EstadoReserva; largura?: number }) {
  const id = useId().replace(/:/g, '');
  const cor = estado === 'completo' ? 'var(--pos)' : 'var(--brand)';
  const preenchido = Math.round(240 * Math.max(0, Math.min(1, fracao)));
  const pct = Math.round(fracao * 100);
  return (
    <svg
      width={largura}
      height={(largura * 250) / 320}
      viewBox="0 0 320 250"
      role="img"
      aria-label={estado === 'completo' ? 'Guarda-chuva totalmente aberto: reserva completa' : `Guarda-chuva ${pct}% preenchido`}
      className="max-w-full"
    >
      <defs>
        <clipPath id={`copa-${id}`}>
          <path d={COPA} />
        </clipPath>
      </defs>
      {estado !== 'completo' && <path d={CHUVA} stroke="var(--rain)" strokeWidth="3" strokeLinecap="round" fill="none" />}
      {estado === 'completo' && <path d={BRILHO} fill={cor} />}
      <path d="M160 50V34" stroke="var(--muted)" strokeWidth="5" strokeLinecap="round" />
      <path d="M160 170V218a13 13 0 0 1-26 0" stroke="var(--muted)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d={COPA} fill="var(--surface2)" />
      {preenchido > 0 && <rect x="40" y="40" width={preenchido} height="140" fill={cor} clipPath={`url(#copa-${id})`} />}
      <path d={VARETAS} stroke="var(--surface)" strokeWidth="2.5" fill="none" />
      <path d={COPA} stroke="var(--line)" strokeWidth="2" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        side: 'var(--side)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        borda: 'var(--border)',
        texto: 'var(--text)',
        suave: 'var(--muted)',
        marca: 'var(--brand)',
        'sobre-marca': 'var(--on-brand)',
        'marca-suave': 'var(--brand-soft)',
        receita: 'var(--pos)',
        'receita-suave': 'var(--pos-soft)',
        despesa: 'var(--neg)',
        'despesa-suave': 'var(--neg-soft)',
        investimento: 'var(--inv)',
        'investimento-suave': 'var(--inv-soft)',
        neutro: 'var(--neutral)',
        alerta: 'var(--warn)',
        'alerta-suave': 'var(--warn-soft)',
        campo: 'var(--field)',
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      screens: {
        xs: '420px',
      },
    },
  },
  plugins: [],
};

/** Marca do Kofra: cofre arredondado com fechadura + palavra "kofra" expandida. */
export function Logo({ tamanho = 30, comNome = true }: { tamanho?: number; comNome?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={tamanho} height={tamanho} viewBox="0 0 30 30" aria-hidden="true">
        <rect width="30" height="30" rx="9" fill="var(--brand)" />
        <circle cx="15" cy="12.5" r="4" fill="var(--on-brand)" />
        <path d="M13 15H17L18.5 22.5H11.5Z" fill="var(--on-brand)" />
      </svg>
      {comNome && (
        <span
          className="text-texto"
          style={{ fontSize: Math.round(tamanho * 0.7), lineHeight: 1, fontWeight: 700, fontStretch: '125%', letterSpacing: '-0.01em' }}
        >
          kofra
        </span>
      )}
    </span>
  );
}

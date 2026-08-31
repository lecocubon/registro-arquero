export type Pestana = 'hoy' | 'progreso' | 'medidas' | 'datos';

const ICONOS: Record<Pestana, { texto: string; path: string }> = {
  hoy: { texto: 'Hoy', path: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5' },
  progreso: { texto: 'Progreso', path: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  medidas: { texto: 'Medidas', path: 'M3 8h18v8H3zM7 8v4M11 8v3M15 8v4M19 8v3' },
  datos: { texto: 'Datos', path: 'M12 5c4 0 7-.9 7-2s-3-2-7-2-7 .9-7 2 3 2 7 2zM5 3v18c0 1.1 3 2 7 2s7-.9 7-2V3M5 12c0 1.1 3 2 7 2s7-.9 7-2' },
};

interface Props {
  activa: Pestana;
  onCambio: (p: Pestana) => void;
}

export function BarraPestanas({ activa, onCambio }: Props) {
  return (
    <nav className="pad-bottom-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface">
      {(Object.keys(ICONOS) as Pestana[]).map((p) => (
        <button
          key={p}
          type="button"
          aria-current={activa === p ? 'page' : undefined}
          onClick={() => onCambio(p)}
          className={`flex h-tab flex-1 flex-col items-center justify-center gap-[3px] font-display text-[11.5px] font-semibold tracking-[0.13em] uppercase ${
            activa === p ? 'text-accent' : 'text-ink3'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-[21px] fill-none stroke-current"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={ICONOS[p].path} />
          </svg>
          {ICONOS[p].texto}
        </button>
      ))}
    </nav>
  );
}

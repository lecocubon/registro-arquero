import { redondear1 } from '../lib/e1rm';

interface Props {
  valores: number[];
  maximo: number;
  /** Semana a la que corresponde el primer valor. */
  desde?: number;
}

export function BarrasSemana({ valores, maximo, desde = 1 }: Props) {
  return (
    <>
      <div className="mt-2.5 flex h-9 items-end gap-1">
        {valores.map((v, i) => {
          const pct = maximo > 0 ? Math.max(2, Math.round((v / maximo) * 100)) : 2;
          return (
            <div
              key={i}
              title={v > 0 ? `Semana ${desde + i}: ${redondear1(v)} kg` : `Semana ${desde + i}: sin datos`}
              className={`min-h-[2px] flex-1 rounded-t-[2px] ${v > 0 ? 'bg-accent' : 'bg-accent-soft'}`}
              style={{ height: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="mt-[3px] flex gap-1">
        {valores.map((_, i) => (
          <span key={i} className="flex-1 text-center text-[9px] tracking-[0.04em] text-ink3">
            {desde + i}
          </span>
        ))}
      </div>
    </>
  );
}

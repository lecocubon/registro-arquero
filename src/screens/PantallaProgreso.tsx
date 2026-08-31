import { BarrasSemana } from '../components/BarrasSemana';
import type { RegistroSerie } from '../db/db';
import { redondear1 } from '../lib/e1rm';
import { progresoPorEjercicio } from '../lib/progreso';

export function PantallaProgreso({ todas }: { todas: RegistroSerie[] }) {
  const filas = progresoPorEjercicio(todas);

  if (!filas.length) {
    return (
      <>
        <p className="mb-2.5 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">
          Progreso
        </p>
        <p className="py-6 text-[14px] leading-relaxed text-ink3">
          Todavia no hay datos. Registra tu primera serie con kg y reps y aca vas a ver el e1RM
          estimado semana a semana.
          <br />
          <br />
          e1RM = estimacion de tu maximo a una repeticion, ajustada por RIR. Sirve para comparar
          semanas aunque cambien las repeticiones.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="mb-2.5 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">
        e1RM estimado por semana
      </p>
      {filas.map((f) => (
        <article
          key={f.ejercicioId}
          className="mb-2.5 rounded-xl border border-line bg-surface px-3.5 py-3.5"
        >
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-[14.5px] leading-tight font-semibold">{f.nombre}</span>
            <span className="font-display text-[20px] font-bold whitespace-nowrap tabular-nums">
              {redondear1(f.actual)}
              {f.variacion !== null && (
                <span
                  className={`ml-1.5 text-[12px] font-semibold ${
                    f.variacion > 0 ? 'text-accent' : 'text-ink3'
                  }`}
                >
                  {f.variacion > 0 ? '+' : ''}
                  {Math.round(f.variacion)}%
                </span>
              )}
            </span>
          </div>
          <BarrasSemana valores={f.porSemana} maximo={f.maximo} />
        </article>
      ))}
      <p className="pt-2 text-[13px] leading-relaxed text-ink3">
        El porcentaje compara la ultima semana con datos contra la primera con datos. Un salto grande
        de una semana a otra casi siempre es un RIR mal estimado, no una mejora real.
      </p>
    </>
  );
}

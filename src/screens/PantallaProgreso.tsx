import { useState } from 'react';
import { BarrasSemana } from '../components/BarrasSemana';
import { FichaEjercicio } from '../components/FichaEjercicio';
import { nombreMusculo } from '../data/biblioteca';
import type { RegistroSerie } from '../db/db';
import { useArquero } from '../estado/arquero';
import { redondear1 } from '../lib/e1rm';
import { seriesPorMusculo } from '../lib/musculos';
import { inicioMesociclo } from '../lib/periodizacion';
import { progresoPorEjercicio } from '../lib/progreso';

const ETIQUETA = 'mb-2.5 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase';
const SERIES = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

function SeriesPorMusculo({ semana, todas }: { semana: number; todas: RegistroSerie[] }) {
  const { catalogo } = useArquero();
  const [ver, setVer] = useState(semana);
  const actual = seriesPorMusculo(todas, ver, catalogo);
  const anterior = new Map(seriesPorMusculo(todas, ver - 1, catalogo).map((m) => [m.musculo, m.series]));
  const maximo = Math.max(1, ...actual.map((m) => m.series));

  return (
    <section className="mb-6">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">Series por músculo</p>
        <div className="flex items-center gap-0.5 rounded-full bg-surface2 p-[3px]">
          <button type="button" aria-label="Semana anterior" onClick={() => setVer((v) => Math.max(1, v - 1))} className="flex size-8 items-center justify-center rounded-full text-ink2">
            −
          </button>
          <span className="min-w-[56px] text-center font-display text-[13px] font-bold tracking-[0.08em] uppercase">Sem {ver}</span>
          <button type="button" aria-label="Semana siguiente" onClick={() => setVer((v) => v + 1)} className="flex size-8 items-center justify-center rounded-full text-ink2">
            +
          </button>
        </div>
      </div>
      {actual.length ? (
        <ul className="rounded-xl border border-line bg-surface px-3.5 py-2">
          {actual.map((m) => {
            const previo = anterior.get(m.musculo);
            return (
              <li key={m.musculo} className="grid grid-cols-[104px_1fr_auto] items-center gap-2.5 py-1.5">
                <span className="truncate text-[13.5px] text-ink2">{nombreMusculo(m.musculo)}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface2">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(m.series / maximo) * 100}%` }} />
                </span>
                <span className="min-w-[64px] text-right text-[13.5px] font-semibold text-ink tabular-nums">
                  {SERIES.format(m.series)}
                  {previo !== undefined && (
                    <span className="ml-1 text-[11px] font-normal text-ink3">({SERIES.format(previo)})</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-line bg-surface px-3.5 py-4 text-[13.5px] text-ink3">
          Sin series registradas en la semana {ver}.
        </p>
      )}
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink3">
        Cuenta 1 para el músculo principal y 0,5 para cada secundario. Entre paréntesis, la semana anterior.
      </p>
    </section>
  );
}

export function PantallaProgreso({ semana, todas }: { semana: number; todas: RegistroSerie[] }) {
  const { programa, catalogo } = useArquero();
  const [ficha, setFicha] = useState<string | null>(null);
  const filas = progresoPorEjercicio(todas, programa, catalogo);

  return (
    <>
      <SeriesPorMusculo semana={semana} todas={todas} />

      {!filas.length ? (
        <>
          <p className={ETIQUETA}>e1RM estimado por semana</p>
          <p className="py-2 text-[14px] leading-relaxed text-ink3">
            Todavía no hay datos. Registra tu primera serie con kg y reps y acá vas a ver el e1RM estimado semana a
            semana.
            <br />
            <br />
            e1RM = estimación de tu máximo a una repetición, ajustada por RIR. Sirve para comparar semanas aunque
            cambien las repeticiones.
          </p>
        </>
      ) : (
        <>
          <p className={ETIQUETA}>e1RM estimado por semana</p>
          {filas.map((f) => (
            <button
              key={f.ejercicioId}
              type="button"
              onClick={() => setFicha(f.ejercicioId)}
              className="mb-2.5 block w-full rounded-xl border border-line bg-surface px-3.5 py-3.5 text-left"
            >
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="text-[14.5px] leading-tight font-semibold">{f.nombre}</span>
                <span className="font-display text-[20px] font-bold whitespace-nowrap tabular-nums">
                  {redondear1(f.actual)}
                  {f.variacion !== null && (
                    <span className={`ml-1.5 text-[12px] font-semibold ${f.variacion > 0 ? 'text-accent' : 'text-ink3'}`}>
                      {f.variacion > 0 ? '+' : ''}
                      {Math.round(f.variacion)}%
                    </span>
                  )}
                </span>
              </div>
              <BarrasSemana valores={f.porSemana} maximo={f.maximo} desde={inicioMesociclo(programa)} />
            </button>
          ))}
          <p className="pt-2 text-[13px] leading-relaxed text-ink3">
            Toca un ejercicio para ver récords, historial y otras métricas. El porcentaje compara la última semana con
            datos contra la primera; un salto grande casi siempre es un RIR mal estimado.
          </p>
        </>
      )}

      {ficha && <FichaEjercicio ejercicioId={ficha} onCerrar={() => setFicha(null)} />}
    </>
  );
}

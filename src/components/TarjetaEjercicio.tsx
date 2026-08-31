import type { Ejercicio } from '../data/programa';
import { idSerie, type RegistroSerie } from '../db/db';
import { alternarHecha, guardarCampo, ultimoRegistro } from '../db/repo';
import { planSemana } from '../lib/periodizacion';
import { incrementoSugerido } from '../lib/progresion';
import { CampoNumero } from './CampoNumero';

interface Props {
  semana: number;
  sesionId: string;
  ejercicio: Ejercicio;
  registros: Map<string, RegistroSerie>;
  todas: RegistroSerie[];
}

function textoReferencia(series: RegistroSerie[]): string {
  return series
    .map((s) => {
      if ((s.kg ?? 0) > 0) return `${s.kg}×${s.reps ?? '?'}`;
      if ((s.segundos ?? 0) > 0) return `${s.segundos}s`;
      if ((s.reps ?? 0) > 0) return `${s.reps}`;
      return '✓';
    })
    .join(' · ');
}

export function TarjetaEjercicio({ semana, sesionId, ejercicio, registros, todas }: Props) {
  const plan = planSemana(semana, ejercicio);
  const previo = ultimoRegistro(todas, ejercicio.id, semana);
  const planPrevio = previo ? planSemana(previo.semana, ejercicio) : null;
  const subir =
    previo && planPrevio
      ? incrementoSugerido(ejercicio, previo.series, planPrevio.rirObjetivo)
      : null;

  const rango =
    ejercicio.reps[0] === ejercicio.reps[1] ? `${ejercicio.reps[0]}` : `${ejercicio.reps[0]}–${ejercicio.reps[1]}`;
  const unidad = ejercicio.tipo === 'tiempo' ? ' s' : '';
  const lado = ejercicio.porLado ? ' por lado' : '';

  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex items-baseline gap-3 px-3.5 pt-3 pb-2.5">
        <span className="min-w-[22px] shrink-0 font-display text-[15px] font-bold text-accent">
          {ejercicio.bloque}
        </span>
        <h3 className="flex-1 text-[15px] leading-tight font-semibold">{ejercicio.nombre}</h3>
      </header>

      <p className="px-3.5 pb-2.5 pl-[47px] text-[12.5px] text-ink3">
        {plan.series} × {rango}
        {unidad}
        {lado}
        {ejercicio.tipo === 'carga' ? ` · RIR ${plan.rirObjetivo}` : ''}
      </p>

      {previo && (
        <p className="border-t border-line bg-surface2 px-3.5 py-2 pl-[47px] text-[12.5px] leading-snug text-ink2">
          Semana {previo.semana}: <b className="font-semibold text-ink">{textoReferencia(previo.series)}</b>
          {subir !== null && (
            <span className="font-semibold text-accent"> — cumpliste el rango, sube {subir} kg</span>
          )}
        </p>
      )}

      <div className="px-3.5 pt-1 pb-3">
        {Array.from({ length: plan.series }, (_, i) => i + 1).map((serie) => {
          const r = registros.get(idSerie(semana, sesionId, ejercicio.id, serie));
          return (
            <div key={serie} className="flex items-center gap-2 py-[5px]">
              <span className="w-[22px] shrink-0 font-display text-[13px] font-semibold tracking-[0.06em] text-ink3">
                {serie}
              </span>

              {ejercicio.tipo === 'salto' && (
                <button
                  type="button"
                  aria-pressed={r?.hecha ?? false}
                  onClick={() => void alternarHecha(semana, sesionId, ejercicio.id, serie)}
                  className={`flex h-[52px] flex-1 items-center justify-center rounded-[10px] border font-display text-[14px] font-semibold tracking-[0.1em] uppercase ${
                    r?.hecha
                      ? 'border-accent bg-accent-soft text-accent-ink'
                      : 'border-line text-ink3'
                  }`}
                >
                  {r?.hecha ? '✓ Hecha' : 'Marcar serie'}
                </button>
              )}

              {ejercicio.tipo === 'tiempo' && (
                <CampoNumero
                  etiqueta="Segundos"
                  ariaLabel={`${ejercicio.nombre}, serie ${serie}, segundos`}
                  valor={r?.segundos ?? null}
                  onCambio={(v) => void guardarCampo(semana, sesionId, ejercicio.id, serie, 'segundos', v)}
                />
              )}

              {ejercicio.tipo === 'carga' && (
                <>
                  <CampoNumero
                    etiqueta="kg"
                    ariaLabel={`${ejercicio.nombre}, serie ${serie}, kilos`}
                    valor={r?.kg ?? null}
                    onCambio={(v) => void guardarCampo(semana, sesionId, ejercicio.id, serie, 'kg', v)}
                  />
                  <CampoNumero
                    etiqueta="Reps"
                    ariaLabel={`${ejercicio.nombre}, serie ${serie}, repeticiones`}
                    valor={r?.reps ?? null}
                    onCambio={(v) => void guardarCampo(semana, sesionId, ejercicio.id, serie, 'reps', v)}
                  />
                  <CampoNumero
                    etiqueta="RIR"
                    ariaLabel={`${ejercicio.nombre}, serie ${serie}, RIR`}
                    valor={r?.rir ?? null}
                    onCambio={(v) => void guardarCampo(semana, sesionId, ejercicio.id, serie, 'rir', v)}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

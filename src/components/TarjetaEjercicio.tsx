import { useState } from 'react';
import { catalogoPorId, soloSeMarca } from '../data/biblioteca';
import type { Ejercicio } from '../data/programa';
import { db, idSerie, type RegistroSerie } from '../db/db';
import {
  agregarCalentamiento,
  copiarValores,
  guardarCampo,
  iniciarDescanso,
  marcarSerie,
  quitarCalentamiento,
  reemplazarPorHoy,
  registrarTiempo,
} from '../db/repo';
import { useArquero } from '../estado/arquero';
import { descansoDe, formatoReloj } from '../lib/descanso';
import { planSemana } from '../lib/periodizacion';
import { incrementoSugerido } from '../lib/progresion';
import { NOMBRE_RECORD, recordsNuevos } from '../lib/records';
import {
  esCalentamiento,
  esSerieEfectiva,
  serieAnterior,
  ultimoRegistro,
  valoresParaCopiar,
} from '../lib/series';
import { avisar } from './Avisos';
import { CalculadoraDiscos } from './CalculadoraDiscos';
import { CampoNumero } from './CampoNumero';
import { CampoTiempo } from './CampoTiempo';
import { Capa } from './Capa';
import { FichaEjercicio } from './FichaEjercicio';
import { ListaEjercicios } from './ListaEjercicios';

interface Props {
  semana: number;
  sesionId: string;
  ejercicio: Ejercicio;
  registros: Map<string, RegistroSerie>;
  todas: RegistroSerie[];
  /** Si hoy se reemplazo, el ejercicio del programa. */
  original?: Ejercicio;
  /** Ids de la sesion de hoy, para no elegir un reemplazo repetido. */
  idsSesion: Set<string>;
}

const ACCION = '-my-1 h-9 shrink-0 rounded-lg px-2 text-[12.5px] font-medium text-accent';

const FILA = 'grid grid-cols-[18px_46px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_44px] items-center gap-1.5';

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

function Anterior({ registro, tipo, onCopiar }: { registro?: RegistroSerie; tipo: Ejercicio['tipo']; onCopiar?: () => void }) {
  const kg = registro?.kg ?? 0;
  const contenido =
    tipo === 'tiempo' && (registro?.segundos ?? 0) > 0 ? (
      <>{registro?.segundos}s</>
    ) : kg > 0 ? (
      <>
        {registro?.kg}
        <br />×{registro?.reps ?? '?'}
      </>
    ) : (
      '–'
    );
  return (
    <button
      type="button"
      disabled={!onCopiar}
      onClick={onCopiar}
      aria-label={onCopiar ? 'Copiar valores de la vez anterior' : 'Sin registro anterior'}
      className="flex h-[52px] items-center justify-center rounded-[10px] text-center text-[12px] leading-tight font-medium text-ink3 tabular-nums enabled:active:bg-surface2"
    >
      <span>{contenido}</span>
    </button>
  );
}

function BotonHecha({ hecha, etiqueta, onClick }: { hecha: boolean; etiqueta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={hecha}
      aria-label={etiqueta}
      onClick={onClick}
      className={`flex h-[52px] items-center justify-center rounded-[10px] border text-[22px] font-bold ${
        hecha ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink3'
      }`}
    >
      ✓
    </button>
  );
}

export function TarjetaEjercicio({ semana, sesionId, ejercicio, registros, todas, original, idsSesion }: Props) {
  const { programa, catalogo } = useArquero();
  const [capa, setCapa] = useState<null | 'ficha' | 'cambiar' | 'discos'>(null);
  const plan = planSemana(semana, ejercicio, programa);
  const previo = ultimoRegistro(todas, ejercicio.id, semana);
  const planPrevio = previo ? planSemana(previo.semana, ejercicio, programa) : null;
  const subir =
    previo && planPrevio ? incrementoSugerido(ejercicio, previo.series, planPrevio.rirObjetivo) : null;
  const descanso = descansoDe(ejercicio, programa);
  const info = catalogoPorId(ejercicio.id, catalogo);
  const conBarra = Boolean(info?.equipo.some((q) => q === 'barra' || q === 'trap-bar'));
  const idOriginal = original?.id ?? ejercicio.id;

  const propios = [...registros.values()].filter((r) => r.ejercicioId === ejercicio.id);
  const calentamientos = propios.filter(esCalentamiento).length
    ? Math.max(...propios.filter(esCalentamiento).map((r) => r.serie))
    : 0;
  const hechas = propios.filter((r) => esSerieEfectiva(r) && r.serie <= plan.series).length;

  const rango =
    ejercicio.reps[0] === ejercicio.reps[1] ? `${ejercicio.reps[0]}` : `${ejercicio.reps[0]}–${ejercicio.reps[1]}`;
  const unidad = ejercicio.tipo === 'tiempo' ? ' s' : '';
  const lado = ejercicio.porLado ? ' por lado' : '';

  const marcar = async (serie: number, anterior?: RegistroSerie) => {
    const marcada = await marcarSerie(
      semana,
      sesionId,
      ejercicio.id,
      serie,
      valoresParaCopiar(ejercicio, anterior),
    );
    if (!marcada) return;
    await iniciarDescanso(descanso, ejercicio.id);
    const guardada = await db.series.get(idSerie(semana, sesionId, ejercicio.id, serie));
    const nuevos = guardada ? recordsNuevos(todas, guardada) : [];
    if (guardada && nuevos.length) {
      const nombres = nuevos.map((n) => NOMBRE_RECORD[n]).join(' y ');
      avisar(`Récord · ${nombres}: ${guardada.kg} kg × ${guardada.reps}`, 'record');
    }
  };

  // Primer kg anotado hoy (o la vez anterior), para abrir la calculadora con ese peso.
  const kgHoy =
    Array.from({ length: plan.series }, (_, i) => registros.get(idSerie(semana, sesionId, ejercicio.id, i + 1))?.kg).find(
      (kg) => (kg ?? 0) > 0,
    ) ??
    previo?.series.find((r) => (r.kg ?? 0) > 0)?.kg ??
    null;

  const elegirReemplazo = async (nuevoId: string) => {
    const conDatos = propios.some((r) => esSerieEfectiva(r));
    const aviso =
      'Ya anotaste series en este ejercicio hoy. Quedan guardadas, pero dejarás de verlas en la sesión. ¿Cambiar igual?';
    if (conDatos && !window.confirm(aviso)) return;
    await reemplazarPorHoy(semana, sesionId, idOriginal, nuevoId);
    setCapa(null);
  };

  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex items-baseline gap-3 px-3.5 pt-3 pb-1">
        <span className="min-w-[22px] shrink-0 font-display text-[15px] font-bold text-accent">
          {ejercicio.bloque}
        </span>
        <h3 className="min-w-0 flex-1 text-[15px] leading-tight font-semibold">
          <button
            type="button"
            onClick={() => setCapa('ficha')}
            className="text-left underline decoration-line2 underline-offset-4"
          >
            {ejercicio.nombre}
          </button>
        </h3>
        <span
          className={`shrink-0 font-display text-[15px] font-bold tabular-nums ${
            hechas >= plan.series ? 'text-accent' : 'text-ink3'
          }`}
          aria-label={`${hechas} de ${plan.series} series`}
        >
          {hechas}/{plan.series}
        </span>
      </header>

      {original && (
        <p className="mx-3.5 mb-1.5 ml-[47px] flex items-center justify-between gap-2 rounded-lg bg-warn-soft px-2.5 py-1.5 text-[12.5px] text-warn">
          <span>Solo hoy, en lugar de {original.nombre}</span>
          <button
            type="button"
            onClick={() => void reemplazarPorHoy(semana, sesionId, idOriginal, null)}
            className="-my-1 h-8 shrink-0 font-semibold underline"
          >
            Deshacer
          </button>
        </p>
      )}

      <p className="px-3.5 pl-[47px] text-[12.5px] text-ink3">
        {plan.series} × {rango}
        {unidad}
        {lado}
        {ejercicio.tipo === 'carga' ? ` · RIR ${plan.rirObjetivo}` : ''}
        {descanso > 0 ? ` · ⏱ ${formatoReloj(descanso * 1000)}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-x-1 px-3.5 pt-1 pb-2 pl-[39px]">
        <button type="button" onClick={() => setCapa('cambiar')} className={ACCION}>
          ⇄ Cambiar hoy
        </button>
        {conBarra && (
          <button type="button" onClick={() => setCapa('discos')} className={ACCION}>
            Discos
          </button>
        )}
        {ejercicio.tipo === 'carga' && (
          <button
            type="button"
            onClick={() => void agregarCalentamiento(semana, sesionId, ejercicio.id, calentamientos + 1)}
            aria-label="Agregar serie de calentamiento"
            className={ACCION}
          >
            + Calent.
          </button>
        )}
      </div>

      {previo && (
        <p className="border-t border-line bg-surface2 px-3.5 py-2 pl-[47px] text-[12.5px] leading-snug text-ink2">
          Semana {previo.semana}: <b className="font-semibold text-ink">{textoReferencia(previo.series)}</b>
          {subir !== null && (
            <span className="font-semibold text-accent"> — cumpliste el rango, sube {subir} kg</span>
          )}
        </p>
      )}

      <div className="px-2.5 pt-1 pb-3">
        {Array.from({ length: calentamientos }, (_, i) => i + 1).map((n) => {
          const r = registros.get(idSerie(semana, sesionId, ejercicio.id, n, 'calentamiento'));
          const ultimo = n === calentamientos;
          return (
            <div key={`c${n}`} className={`${FILA} py-[5px]`}>
              <span className="text-center font-display text-[14px] font-bold text-warn" title="Calentamiento">
                W
              </span>
              <span className="text-center text-[10px] leading-tight tracking-[0.04em] text-ink3 uppercase">
                Calent.
              </span>
              <CampoNumero
                etiqueta="kg"
                ariaLabel={`${ejercicio.nombre}, calentamiento ${n}, kilos`}
                valor={r?.kg ?? null}
                onCambio={(v) =>
                  void guardarCampo(semana, sesionId, ejercicio.id, n, 'kg', v, 'calentamiento')
                }
              />
              <CampoNumero
                etiqueta="Reps"
                ariaLabel={`${ejercicio.nombre}, calentamiento ${n}, repeticiones`}
                valor={r?.reps ?? null}
                onCambio={(v) =>
                  void guardarCampo(semana, sesionId, ejercicio.id, n, 'reps', v, 'calentamiento')
                }
              />
              <span />
              {ultimo ? (
                <button
                  type="button"
                  onClick={() => void quitarCalentamiento(semana, sesionId, ejercicio.id, n)}
                  aria-label={`Quitar calentamiento ${n}`}
                  className="flex h-[52px] items-center justify-center rounded-[10px] text-[22px] text-ink3"
                >
                  ×
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}

        {Array.from({ length: plan.series }, (_, i) => i + 1).map((serie) => {
          const r = registros.get(idSerie(semana, sesionId, ejercicio.id, serie));
          const hecha = r?.hecha ?? false;
          const anterior = previo ? serieAnterior(previo.series, serie) : undefined;
          const copiable = valoresParaCopiar(ejercicio, anterior);
          const etiquetaHecha = `${ejercicio.nombre}, serie ${serie}: ${hecha ? 'desmarcar' : 'marcar hecha'}`;

          return (
            <div
              key={serie}
              className={`${FILA} rounded-[12px] px-0 py-[5px] ${hecha ? 'bg-accent-soft' : ''}`}
            >
              <span
                className={`text-center font-display text-[13px] font-semibold tracking-[0.06em] ${hecha ? 'text-accent-ink' : 'text-ink3'}`}
              >
                {serie}
              </span>

              {soloSeMarca(ejercicio.tipo) ? (
                <button
                  type="button"
                  aria-pressed={hecha}
                  onClick={() => void marcar(serie)}
                  className={`col-span-5 flex h-[52px] items-center justify-center gap-2 rounded-[10px] border font-display text-[14px] font-semibold tracking-[0.1em] uppercase ${
                    hecha ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink3'
                  }`}
                >
                  {hecha ? '✓ Hecha' : 'Marcar serie'}
                </button>
              ) : (
                <>
                  <Anterior
                    registro={anterior}
                    tipo={ejercicio.tipo}
                    onCopiar={
                      copiable
                        ? () => void copiarValores(semana, sesionId, ejercicio.id, serie, copiable)
                        : undefined
                    }
                  />

                  {ejercicio.tipo === 'tiempo' ? (
                    <div className="col-span-3 min-w-0">
                      <CampoTiempo
                        ariaLabel={`${ejercicio.nombre}, serie ${serie}, segundos`}
                        valor={r?.segundos ?? null}
                        objetivo={ejercicio.reps}
                        onCambio={(v) =>
                          void guardarCampo(semana, sesionId, ejercicio.id, serie, 'segundos', v)
                        }
                        onTerminar={(s) =>
                          void registrarTiempo(semana, sesionId, ejercicio.id, serie, s).then(() =>
                            iniciarDescanso(descanso, ejercicio.id),
                          )
                        }
                      />
                    </div>
                  ) : (
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

                  <BotonHecha hecha={hecha} etiqueta={etiquetaHecha} onClick={() => void marcar(serie, anterior)} />
                </>
              )}
            </div>
          );
        })}
      </div>
      {capa === 'ficha' && <FichaEjercicio ejercicioId={ejercicio.id} onCerrar={() => setCapa(null)} />}
      {capa === 'discos' && <CalculadoraDiscos kgInicial={kgHoy} onCerrar={() => setCapa(null)} />}
      {capa === 'cambiar' && (
        <Capa titulo={`Cambiar ${original?.nombre ?? ejercicio.nombre} por hoy`} onCerrar={() => setCapa(null)}>
          <p className="mb-3 text-[13.5px] leading-relaxed text-ink2">
            Se mantienen las series, reps y RIR del programa. El historial queda en el ejercicio que elijas.
          </p>
          <ListaEjercicios
            filtroInicial={{ musculo: catalogoPorId(idOriginal, catalogo)?.musculo ?? '' }}
            tipoFijo={ejercicio.tipo}
            deshabilitados={new Set([...idsSesion].filter((id) => id !== ejercicio.id))}
            onElegir={(e) => void elegirReemplazo(e.id)}
          />
        </Capa>
      )}
    </section>
  );
}

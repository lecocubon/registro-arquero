import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { TIPOS, catalogoPorId, nombreEquipo, nombreMusculo } from '../data/biblioteca';
import { db } from '../db/db';
import { borrarFoto, guardarFoto, guardarNotaEjercicio, leerNotaEjercicio } from '../db/repo';
import { useArquero } from '../estado/arquero';
import { redondear1 } from '../lib/e1rm';
import { fechaCorta } from '../lib/numeros';
import { inicioMesociclo } from '../lib/periodizacion';
import { METRICAS, historialDe, metricaPorSemana, recordsDe, type Metrica } from '../lib/records';
import { esCalentamiento } from '../lib/series';
import { avisar } from './Avisos';
import { BarrasSemana } from './BarrasSemana';
import { Capa } from './Capa';
import { FormEjercicioPropio } from './FormEjercicioPropio';
import { FotosEjercicio } from './ImagenEjercicio';

type Pestana = 'resumen' | 'historial' | 'tecnica';

const LADO_MAX_FOTO = 900;

/** Reduce la foto antes de guardarla: una foto de camara pesa varios MB. */
async function comprimir(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAX_FOTO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((ok, falla) =>
    canvas.toBlob((b) => (b ? ok(b) : falla(new Error('No se pudo procesar la foto'))), 'image/jpeg', 0.82),
  );
}

function NotaTecnica({ ejercicioId }: { ejercicioId: string }) {
  const [texto, setTexto] = useState<string | null>(null);
  useEffect(() => {
    void leerNotaEjercicio(ejercicioId).then(setTexto);
  }, [ejercicioId]);
  if (texto === null) return null;
  return (
    <textarea
      value={texto}
      rows={4}
      aria-label="Tus notas de técnica"
      placeholder="Tus notas: agarre, altura del asiento, sensaciones, molestias…"
      onChange={(e) => {
        setTexto(e.target.value);
        void guardarNotaEjercicio(ejercicioId, e.target.value);
      }}
      className="w-full rounded-[10px] border border-line bg-field px-3 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-accent"
    />
  );
}

export function FichaEjercicio({ ejercicioId, onCerrar }: { ejercicioId: string; onCerrar: () => void }) {
  const { catalogo, programa, conFoto } = useArquero();
  const ejercicio = catalogoPorId(ejercicioId, catalogo);
  const series = useLiveQuery(() => db.series.where('ejercicioId').equals(ejercicioId).toArray(), [ejercicioId], []);
  const sesiones = useLiveQuery(() => db.sesiones.toArray(), [], []);
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const [metrica, setMetrica] = useState<Metrica>('e1rm');
  const [editando, setEditando] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  if (!ejercicio) {
    return (
      <Capa titulo="Ejercicio" onCerrar={onCerrar}>
        <p className="py-6 text-ink3">Este ejercicio ya no existe en la biblioteca.</p>
      </Capa>
    );
  }

  const esCarga = ejercicio.tipo === 'carga';
  const records = recordsDe(series, ejercicioId);
  const desdeSemana = inicioMesociclo(programa);
  const valores = metricaPorSemana(series, ejercicioId, metrica, programa.semanas, desdeSemana);
  const maximo = Math.max(0, ...valores);
  const historial = historialDe(series, ejercicioId);
  const nombreSesion = (id: string) => programa.sesiones.find((s) => s.id === id)?.nombre ?? id;
  const fecha = (semana: number, sesionId: string) =>
    sesiones.find((s) => s.id === `${semana}|${sesionId}`)?.fecha;

  const PESTANAS: { id: Pestana; nombre: string }[] = [
    { id: 'resumen', nombre: 'Resumen' },
    { id: 'historial', nombre: `Historial${historial.length ? ` (${historial.length})` : ''}` },
    { id: 'tecnica', nombre: 'Técnica' },
  ];

  return (
    <Capa
      titulo={ejercicio.nombre}
      onCerrar={onCerrar}
      accion={
        ejercicio.propio ? (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="h-11 shrink-0 rounded-lg px-3 text-[14px] font-semibold text-accent"
          >
            Editar
          </button>
        ) : undefined
      }
    >
      <FotosEjercicio ejercicio={ejercicio} />
      <div className="mt-2 flex gap-2">
        <input
          ref={archivo}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            void comprimir(f)
              .then((b) => guardarFoto(ejercicioId, b))
              .then(() => avisar('Foto guardada'))
              .catch(() => avisar('No se pudo guardar la foto', 'error'));
          }}
        />
        <button
          type="button"
          onClick={() => archivo.current?.click()}
          className="h-10 flex-1 rounded-[10px] border border-line text-[13.5px] font-medium text-ink2"
        >
          {conFoto.has(ejercicioId) ? 'Cambiar foto' : 'Poner foto propia'}
        </button>
        {conFoto.has(ejercicioId) && (
          <button
            type="button"
            onClick={() => void borrarFoto(ejercicioId)}
            className="h-10 rounded-[10px] border border-line px-3 text-[13.5px] font-medium text-ink3"
          >
            Quitar
          </button>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13.5px]">
        <dt className="text-ink3">Principal</dt>
        <dd className="font-semibold text-ink">{nombreMusculo(ejercicio.musculo)}</dd>
        {ejercicio.secundarios.length > 0 && (
          <>
            <dt className="text-ink3">Secundarios</dt>
            <dd className="text-ink2">{ejercicio.secundarios.map(nombreMusculo).join(', ')}</dd>
          </>
        )}
        <dt className="text-ink3">Equipo</dt>
        <dd className="text-ink2">{ejercicio.equipo.map(nombreEquipo).join(', ')}</dd>
        <dt className="text-ink3">Registro</dt>
        <dd className="text-ink2">{TIPOS.find((t) => t.id === ejercicio.tipo)?.detalle}</dd>
      </dl>

      <div role="tablist" className="mt-4 mb-3 grid grid-cols-3 gap-1 rounded-xl bg-surface2 p-1">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id)}
            className={`h-10 rounded-lg text-[13px] font-semibold ${
              pestana === p.id ? 'bg-surface text-ink' : 'text-ink3'
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {pestana === 'resumen' &&
        (esCarga ? (
          <>
            <div className="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 pb-1 [scrollbar-width:none]">
              {METRICAS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={metrica === m.id}
                  onClick={() => setMetrica(m.id)}
                  className={`h-9 shrink-0 rounded-full border px-3 text-[13px] font-semibold ${
                    metrica === m.id ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink2'
                  }`}
                >
                  {m.nombre}
                </button>
              ))}
            </div>
            <div className="mt-2 rounded-xl border border-line bg-surface px-3.5 py-3">
              {maximo > 0 ? (
                <>
                  <div className="font-display text-[22px] font-bold tabular-nums">
                    {redondear1(maximo)} kg
                    <span className="ml-2 font-sans text-[12px] font-normal text-ink3">mejor semana</span>
                  </div>
                  <BarrasSemana valores={valores} maximo={maximo} desde={desdeSemana} />
                </>
              ) : (
                <p className="py-3 text-[13.5px] text-ink3">Todavía no hay series con kg y reps.</p>
              )}
            </div>

            <p className="mt-4 mb-2 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">
              Récords personales
            </p>
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-[14px]">
              {[
                ['Mayor peso', records.mayorPeso && `${records.mayorPeso.kg} kg × ${records.mayorPeso.reps}`, records.mayorPeso?.semana],
                ['Mejor e1RM', records.mejorE1rm && `${redondear1(records.mejorE1rm.valor)} kg (${records.mejorE1rm.kg}×${records.mejorE1rm.reps})`, records.mejorE1rm?.semana],
                ['Mejor serie', records.mejorVolumenSerie && `${redondear1(records.mejorVolumenSerie.valor)} kg (${records.mejorVolumenSerie.kg}×${records.mejorVolumenSerie.reps})`, records.mejorVolumenSerie?.semana],
                ['Mejor volumen sesión', records.mejorVolumenSesion && `${redondear1(records.mejorVolumenSesion.valor)} kg`, records.mejorVolumenSesion?.semana],
              ].map(([nombre, valor, semana]) => (
                <li key={String(nombre)} className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                  <span className="text-ink2">{nombre}</span>
                  <span className="text-right font-semibold text-ink tabular-nums">
                    {valor || '—'}
                    {semana ? <span className="ml-1.5 text-[11.5px] font-normal text-ink3">sem {semana}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="py-2 text-[14px] leading-relaxed text-ink3">
            Los récords y gráficos son para ejercicios de carga. Revisa el historial para ver lo registrado.
          </p>
        ))}

      {pestana === 'historial' &&
        (historial.length ? (
          <ul className="grid gap-2">
            {historial.map((h) => {
              const f = fecha(h.semana, h.sesionId);
              return (
                <li key={`${h.semana}|${h.sesionId}`} className="rounded-xl border border-line bg-surface px-3.5 py-2.5">
                  <div className="font-display text-[14px] font-bold tracking-[0.06em] text-accent uppercase">
                    Semana {h.semana} · {nombreSesion(h.sesionId)}
                    {f ? ` · ${fechaCorta(f)}` : ''}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13.5px] text-ink2 tabular-nums">
                    {h.series.map((s) => (
                      <span key={s.id} className={esCalentamiento(s) ? 'text-ink3' : ''}>
                        {esCalentamiento(s) ? 'W ' : `${s.serie}. `}
                        {(s.kg ?? 0) > 0
                          ? `${s.kg}×${s.reps ?? '?'}${s.rir !== null && s.rir !== undefined ? ` @${s.rir}` : ''}`
                          : (s.segundos ?? 0) > 0
                            ? `${s.segundos}s`
                            : (s.reps ?? 0) > 0
                              ? `${s.reps} reps`
                              : '✓'}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-2 text-[14px] text-ink3">Todavía no has registrado este ejercicio.</p>
        ))}

      {pestana === 'tecnica' && (
        <>
          {ejercicio.indicaciones.length > 0 && (
            <ol className="mb-4 grid gap-2">
              {ejercicio.indicaciones.map((t, i) => (
                <li key={i} className="flex gap-3 text-[14.5px] leading-snug text-ink">
                  <span className="font-display text-[16px] font-bold text-accent">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mb-2 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">Tus notas</p>
          <NotaTecnica ejercicioId={ejercicioId} />
        </>
      )}

      {editando && ejercicio.propio && (
        <FormEjercicioPropio existente={ejercicio} onCerrar={() => setEditando(false)} onBorrado={onCerrar} />
      )}
    </Capa>
  );
}

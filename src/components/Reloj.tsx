import { useEffect, useState } from 'react';
import { db, idSesion, type Medicion, type RegistroSerie, type RegistroSesion } from '../db/db';
import {
  NOMBRE_PERMISO,
  abrirAjustesSalud,
  guardarEntrenamientoSalud,
  leerGrasas,
  leerPesos,
  leerPulso,
  leerPulsoReposo,
  leerSueno,
  useSalud,
  type PermisoSalud,
} from '../lib/salud';
import {
  formatoHorasMinutos,
  idEntrenamientoSalud,
  medicionesDesdeSalud,
  resumenPulso,
  resumenSueno,
  ultimoValor,
  type ResumenPulso,
  type ResumenSueno,
} from '../lib/saludDatos';
import { ventanaSesion } from '../lib/series';
import { avisar } from './Avisos';

const ETIQUETA = 'mb-2.5 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase';
const BOTON = 'h-11 w-full rounded-[10px] border border-line bg-surface text-[14px] font-semibold text-ink2';
const PRINCIPAL =
  'h-12 w-full rounded-[11px] bg-accent font-display text-[16px] font-bold tracking-[0.1em] text-on-accent uppercase disabled:opacity-50';

function mensajeNoDisponible(motivo?: string): string {
  if (motivo === 'web') return 'La conexión con el reloj funciona solo en la app Android de Arquero, no en la versión web.';
  if (motivo === 'sin-instalar') return 'Health Connect no está instalado en este teléfono.';
  if (motivo === 'actualizar') return 'Health Connect necesita actualizarse desde Play Store.';
  return 'Health Connect no está disponible en este teléfono.';
}

/** Importa peso y grasa de los ultimos 30 dias como mediciones. Devuelve cuantas agrego. */
export async function importarMedicionesDelReloj(sesiones: RegistroSesion[], semanaActual: number): Promise<number> {
  const [pesos, grasas, existentes] = await Promise.all([leerPesos(), leerGrasas(), db.mediciones.toArray()]);
  const nuevas = medicionesDesdeSalud(pesos, grasas, existentes, sesiones, semanaActual);
  if (nuevas.length) await db.mediciones.bulkAdd(nuevas as Medicion[]);
  return nuevas.length;
}

// ---------------- Datos: conexion ----------------

export function PanelReloj({ semana, sesiones }: { semana: number; sesiones: RegistroSesion[] }) {
  const { estado, conectar } = useSalud();
  const [importando, setImportando] = useState(false);

  return (
    <section className="mb-6">
      <p className={ETIQUETA}>Reloj · Health Connect</p>
      <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
        {!estado ? (
          <p className="text-[13.5px] text-ink3">Revisando Health Connect…</p>
        ) : !estado.disponible ? (
          <p className="text-[13.5px] leading-relaxed text-ink2">{mensajeNoDisponible(estado.motivo)}</p>
        ) : (
          <>
            <p className="mb-2 text-[13.5px] leading-relaxed text-ink2">
              Samsung Health comparte con Health Connect lo que mide tu Galaxy Watch. Arquero lee peso, % de grasa,
              pulso y sueño, y guarda tus sesiones como entrenamientos de fuerza.
            </p>
            <ul className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
              {(Object.keys(NOMBRE_PERMISO) as PermisoSalud[]).map((p) => {
                const ok = estado.concedidos.includes(p);
                return (
                  <li key={p} className={ok ? 'text-accent-ink' : 'text-ink3'}>
                    {ok ? '✓' : '·'} {NOMBRE_PERMISO[p]}
                  </li>
                );
              })}
            </ul>
            <div className="grid gap-2">
              {estado.concedidos.length < Object.keys(NOMBRE_PERMISO).length && (
                <button type="button" onClick={() => void conectar()} className={PRINCIPAL}>
                  {estado.concedidos.length ? 'Dar permisos que faltan' : 'Conectar'}
                </button>
              )}
              {estado.concedidos.includes('peso') && (
                <button
                  type="button"
                  disabled={importando}
                  onClick={() => {
                    setImportando(true);
                    void importarMedicionesDelReloj(sesiones, semana)
                      .then((n) => avisar(n ? `${n} ${n === 1 ? 'medición importada' : 'mediciones importadas'}` : 'No hay lecturas nuevas'))
                      .catch(() => avisar('No se pudo leer Health Connect', 'error'))
                      .finally(() => setImportando(false));
                  }}
                  className={BOTON}
                >
                  {importando ? 'Importando…' : 'Traer peso y grasa (30 días)'}
                </button>
              )}
              <button type="button" onClick={() => void abrirAjustesSalud()} className={BOTON}>
                Ajustes de Health Connect
              </button>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink3">
              Para que lleguen los datos del reloj: Samsung Health → Ajustes → Health Connect → permitir escribir.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

// ---------------- Hoy: recuperacion ----------------

export function RecuperacionReloj() {
  const { estado, tiene } = useSalud();
  const [datos, setDatos] = useState<{ sueno: ResumenSueno | null; reposo: number | null } | null>(null);
  const puede = Boolean(estado?.disponible) && (tiene('sueno') || tiene('pulsoReposo'));

  useEffect(() => {
    if (!puede) return;
    let vigente = true;
    void Promise.all([tiene('sueno') ? leerSueno() : [], tiene('pulsoReposo') ? leerPulsoReposo() : []])
      .then(([s, r]) => vigente && setDatos({ sueno: resumenSueno(s, Date.now()), reposo: ultimoValor(r) }))
      .catch(() => vigente && setDatos(null));
    return () => {
      vigente = false;
    };
  }, [puede, tiene]);

  if (!puede || !datos || (!datos.sueno && datos.reposo === null)) return null;

  return (
    <div className="mb-3.5 grid grid-cols-2 gap-2">
      {datos.sueno && (
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <div className="text-[10.5px] tracking-[0.08em] text-ink3 uppercase">Sueño anoche</div>
          <div className="font-display text-[19px] font-bold text-ink">{formatoHorasMinutos(datos.sueno.minutos)}</div>
        </div>
      )}
      {datos.reposo !== null && (
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <div className="text-[10.5px] tracking-[0.08em] text-ink3 uppercase">Pulso en reposo</div>
          <div className="font-display text-[19px] font-bold text-ink">{datos.reposo} lpm</div>
        </div>
      )}
    </div>
  );
}

// ---------------- Sesion: pulso y guardar ----------------

interface PropsSesion {
  semana: number;
  sesionId: string;
  nombreSesion: string;
  registros: RegistroSerie[];
  meta: RegistroSesion | undefined;
  notas: string;
}

const CINCO_MIN = 5 * 60_000;

export function RelojSesion({ semana, sesionId, nombreSesion, registros, meta, notas }: PropsSesion) {
  const { estado, tiene, conectar } = useSalud();
  const [pulso, setPulso] = useState<ResumenPulso | null | 'cargando'>(null);
  const [guardando, setGuardando] = useState(false);

  // Mismo bloque que la duracion: una edicion dias despues no estira el horario.
  const ventana = ventanaSesion(registros, meta?.inicio, Date.now());
  const inicio = ventana?.desde;
  const fin = ventana?.hasta;
  const hayVentana = inicio !== undefined && fin !== undefined && fin > inicio;

  useEffect(() => {
    if (!estado?.disponible || !tiene('pulso') || !hayVentana) return;
    let vigente = true;
    setPulso('cargando');
    // Un poco antes y despues: la primera serie se anota despues de hacerla.
    void leerPulso(new Date((inicio ?? 0) - CINCO_MIN), new Date((fin ?? 0) + CINCO_MIN))
      .then((m) => vigente && setPulso(resumenPulso(m)))
      .catch(() => vigente && setPulso(null));
    return () => {
      vigente = false;
    };
  }, [estado?.disponible, tiene, hayVentana, inicio, fin]);

  if (!estado?.disponible) return null;

  const guardar = async () => {
    if (!hayVentana || inicio === undefined || fin === undefined) return;
    setGuardando(true);
    try {
      await guardarEntrenamientoSalud({
        idCliente: idEntrenamientoSalud(semana, sesionId),
        version: Date.now(),
        inicio: new Date(inicio).toISOString(),
        fin: new Date(Math.max(fin, inicio + 60_000)).toISOString(),
        titulo: `Arquero · ${nombreSesion} (semana ${semana})`,
        notas: notas || undefined,
      });
      const id = idSesion(semana, sesionId);
      const actual = await db.sesiones.get(id);
      if (actual) await db.sesiones.put({ ...actual, guardadaEnSalud: Date.now() });
      avisar('Entrenamiento guardado en Health Connect');
    } catch {
      avisar('No se pudo guardar en Health Connect', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-line bg-surface px-3.5 py-3">
      <p className="mb-2 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">Reloj</p>
      {tiene('pulso') &&
        (pulso === 'cargando' ? (
          <p className="mb-3 text-[13.5px] text-ink3">Leyendo pulso…</p>
        ) : pulso ? (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10.5px] tracking-[0.08em] text-ink3 uppercase">Pulso medio</div>
              <div className="font-display text-[20px] font-bold text-ink">{pulso.promedio} lpm</div>
            </div>
            <div>
              <div className="text-[10.5px] tracking-[0.08em] text-ink3 uppercase">Pulso máximo</div>
              <div className="font-display text-[20px] font-bold text-ink">{pulso.maximo} lpm</div>
            </div>
          </div>
        ) : hayVentana ? (
          <p className="mb-3 text-[13px] leading-relaxed text-ink3">
            Sin lecturas de pulso en el horario de esta sesión. Para tener pulso continuo, inicia un ejercicio en el
            reloj mientras entrenas.
          </p>
        ) : null)}

      {tiene('guardarEntrenamiento') ? (
        <>
          <button type="button" disabled={!hayVentana || guardando} onClick={() => void guardar()} className={PRINCIPAL}>
            {guardando ? 'Guardando…' : meta?.guardadaEnSalud ? 'Actualizar en Samsung Health' : 'Guardar en Samsung Health'}
          </button>
          <p className="mt-2 text-[12px] leading-relaxed text-ink3">
            {meta?.guardadaEnSalud
              ? `Guardado ${new Date(meta.guardadaEnSalud).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}. Volver a guardar lo actualiza, no lo duplica.`
              : hayVentana
                ? 'Se guarda como entrenamiento de fuerza con el horario de la primera a la última serie.'
                : 'Anota al menos dos series para tener horario de inicio y fin.'}
          </p>
        </>
      ) : (
        <button type="button" onClick={() => void conectar()} className={BOTON}>
          Permitir guardar entrenamientos
        </button>
      )}
    </section>
  );
}

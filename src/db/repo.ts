import {
  ajustarDescanso as calcularAjuste,
  nuevoDescanso,
  type EstadoDescanso,
} from '../lib/descanso';
import { tieneValores, type ValoresSerie } from '../lib/series';
import {
  db,
  hoy,
  idSerie,
  idSesion,
  serieVacia,
  type Medicion,
  type RegistroSerie,
  type TipoSerie,
} from './db';

export type CampoSerie = 'kg' | 'reps' | 'rir' | 'segundos';

async function leerSerie(
  semana: number,
  sesionId: string,
  ejercicioId: string,
  serie: number,
  tipo: TipoSerie,
): Promise<RegistroSerie> {
  const id = idSerie(semana, sesionId, ejercicioId, serie, tipo);
  return (await db.series.get(id)) ?? serieVacia(semana, sesionId, ejercicioId, serie, tipo);
}

/**
 * Autoguardado: cada tecla escribe directo en IndexedDB dentro de una
 * transaccion. No existe estado "sin guardar".
 */
export async function guardarCampo(
  semana: number,
  sesionId: string,
  ejercicioId: string,
  serie: number,
  campo: CampoSerie,
  valor: number | null,
  tipo: TipoSerie = 'normal',
): Promise<void> {
  await db.transaction('rw', db.series, db.sesiones, async () => {
    const actual = await leerSerie(semana, sesionId, ejercicioId, serie, tipo);
    await db.series.put({ ...actual, [campo]: valor, actualizado: Date.now() });
    await tocarSesion(semana, sesionId);
  });
}

/** Copia los valores de la vez anterior a la serie, sin marcarla. */
export async function copiarValores(
  semana: number,
  sesionId: string,
  ejercicioId: string,
  serie: number,
  valores: ValoresSerie,
): Promise<void> {
  await db.transaction('rw', db.series, db.sesiones, async () => {
    const actual = await leerSerie(semana, sesionId, ejercicioId, serie, 'normal');
    await db.series.put({ ...actual, ...valores, actualizado: Date.now() });
    await tocarSesion(semana, sesionId);
  });
}

/**
 * Alterna el ✓ de una serie. Si se marca vacia y hay valores de la vez
 * anterior, los copia. Devuelve true si la serie quedo marcada.
 */
export async function marcarSerie(
  semana: number,
  sesionId: string,
  ejercicioId: string,
  serie: number,
  anterior?: ValoresSerie,
): Promise<boolean> {
  let marcada = false;
  await db.transaction('rw', db.series, db.sesiones, async () => {
    const actual = await leerSerie(semana, sesionId, ejercicioId, serie, 'normal');
    marcada = !actual.hecha;
    const copia = marcada && !tieneValores(actual) && anterior ? anterior : {};
    await db.series.put({ ...actual, ...copia, hecha: marcada, actualizado: Date.now() });
    await tocarSesion(semana, sesionId);
  });
  return marcada;
}

/** Guarda el tiempo del cronometro y deja la serie marcada. */
export async function registrarTiempo(
  semana: number,
  sesionId: string,
  ejercicioId: string,
  serie: number,
  segundos: number,
): Promise<void> {
  await db.transaction('rw', db.series, db.sesiones, async () => {
    const actual = await leerSerie(semana, sesionId, ejercicioId, serie, 'normal');
    await db.series.put({ ...actual, segundos, hecha: true, actualizado: Date.now() });
    await tocarSesion(semana, sesionId);
  });
}

export async function agregarCalentamiento(
  semana: number,
  sesionId: string,
  ejercicioId: string,
  numero: number,
): Promise<void> {
  const nueva = serieVacia(semana, sesionId, ejercicioId, numero, 'calentamiento');
  await db.series.put({ ...nueva, actualizado: Date.now() });
}

export async function quitarCalentamiento(
  semana: number,
  sesionId: string,
  ejercicioId: string,
  numero: number,
): Promise<void> {
  await db.series.delete(idSerie(semana, sesionId, ejercicioId, numero, 'calentamiento'));
}

export async function guardarNota(semana: number, sesionId: string, nota: string): Promise<void> {
  const id = idSesion(semana, sesionId);
  const actual = await db.sesiones.get(id);
  await db.sesiones.put({
    ...actual,
    id,
    semana,
    sesionId,
    fecha: actual?.fecha ?? hoy(),
    nota,
    actualizado: Date.now(),
  });
}

async function tocarSesion(semana: number, sesionId: string): Promise<void> {
  const id = idSesion(semana, sesionId);
  const actual = await db.sesiones.get(id);
  const ahora = Date.now();
  await db.sesiones.put({
    id,
    semana,
    sesionId,
    fecha: actual?.fecha ?? hoy(),
    nota: actual?.nota ?? '',
    inicio: actual?.inicio ?? ahora,
    actualizado: ahora,
  });
}

export async function semanaActual(): Promise<number> {
  const a = await db.ajustes.get('semana');
  const v = Number(a?.valor);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

export async function fijarSemana(semana: number): Promise<void> {
  await db.ajustes.put({ clave: 'semana', valor: semana });
}

const CLAVE_DESCANSO = 'descanso';

/**
 * El descanso vive en IndexedDB como hora de termino: sobrevive a cerrar la
 * app, cambiar de pestana o que el telefono congele la pagina.
 */
export async function leerDescanso(): Promise<EstadoDescanso | null> {
  const a = await db.ajustes.get(CLAVE_DESCANSO);
  if (typeof a?.valor !== 'string') return null;
  try {
    const e = JSON.parse(a.valor) as EstadoDescanso;
    return Number.isFinite(e.fin) && Number.isFinite(e.total) ? e : null;
  } catch {
    return null;
  }
}

export async function iniciarDescanso(segundos: number, ejercicioId: string): Promise<void> {
  if (segundos <= 0) return;
  const estado = nuevoDescanso(segundos, ejercicioId, Date.now());
  await db.ajustes.put({ clave: CLAVE_DESCANSO, valor: JSON.stringify(estado) });
}

export async function sumarDescanso(deltaSegundos: number): Promise<void> {
  await db.transaction('rw', db.ajustes, async () => {
    const actual = await leerDescanso();
    if (!actual) return;
    const nuevo = calcularAjuste(actual, deltaSegundos, Date.now());
    if (nuevo) await db.ajustes.put({ clave: CLAVE_DESCANSO, valor: JSON.stringify(nuevo) });
    else await db.ajustes.delete(CLAVE_DESCANSO);
  });
}

/** Si se pasa `fin`, solo borra ese descanso (no uno mas nuevo iniciado entremedio). */
export async function terminarDescanso(fin?: number): Promise<void> {
  await db.transaction('rw', db.ajustes, async () => {
    const actual = await leerDescanso();
    if (!actual) return;
    if (fin !== undefined && actual.fin !== fin) return;
    await db.ajustes.delete(CLAVE_DESCANSO);
  });
}

export async function guardarMedicion(m: Omit<Medicion, 'id'>): Promise<void> {
  await db.mediciones.add(m as Medicion);
}

export async function borrarMedicion(id: number): Promise<void> {
  await db.mediciones.delete(id);
}

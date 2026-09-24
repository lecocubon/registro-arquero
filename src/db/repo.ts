import { cancelarAvisoDescanso, programarAvisoDescanso } from '../lib/avisoDescanso';
import {
  ajustarDescanso as calcularAjuste,
  nuevoDescanso,
  type EstadoDescanso,
} from '../lib/descanso';
import { tieneValores, type ValoresSerie } from '../lib/series';
import type { EjercicioCatalogo } from '../data/biblioteca';
import type { ProgramaDef } from '../data/programa';
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
    ...actual,
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
  // El aviso del sistema es lo unico que suena con la pantalla apagada.
  void programarAvisoDescanso(estado.fin);
}

export async function sumarDescanso(deltaSegundos: number): Promise<void> {
  const siguiente = await db.transaction('rw', db.ajustes, async () => {
    const actual = await leerDescanso();
    if (!actual) return null;
    const nuevo = calcularAjuste(actual, deltaSegundos, Date.now());
    if (nuevo) await db.ajustes.put({ clave: CLAVE_DESCANSO, valor: JSON.stringify(nuevo) });
    else await db.ajustes.delete(CLAVE_DESCANSO);
    return nuevo;
  });
  if (siguiente) void programarAvisoDescanso(siguiente.fin);
  else void cancelarAvisoDescanso();
}

/** Si se pasa `fin`, solo borra ese descanso (no uno mas nuevo iniciado entremedio). */
export async function terminarDescanso(fin?: number): Promise<void> {
  const borrado = await db.transaction('rw', db.ajustes, async () => {
    const actual = await leerDescanso();
    if (!actual) return false;
    if (fin !== undefined && actual.fin !== fin) return false;
    await db.ajustes.delete(CLAVE_DESCANSO);
    return true;
  });
  // Omitir el descanso no debe dejar el aviso programado; si ya sono, no pasa nada.
  if (borrado) void cancelarAvisoDescanso();
}

export async function guardarMedicion(m: Omit<Medicion, 'id'>): Promise<void> {
  await db.mediciones.add(m as Medicion);
}

export async function borrarMedicion(id: number): Promise<void> {
  await db.mediciones.delete(id);
}

// ---------- programa editable ----------

const ID_PROGRAMA = 'activo';

export async function leerPrograma(): Promise<ProgramaDef | null> {
  return (await db.programas.get(ID_PROGRAMA))?.definicion ?? null;
}

export async function guardarPrograma(definicion: ProgramaDef): Promise<void> {
  await db.programas.put({ id: ID_PROGRAMA, definicion, actualizado: Date.now() });
}

/** Vuelve al programa del archivo. El historial no se toca. */
export async function restaurarPrograma(): Promise<void> {
  await db.programas.delete(ID_PROGRAMA);
}

// ---------- biblioteca propia ----------

export async function guardarEjercicioPropio(e: EjercicioCatalogo): Promise<void> {
  await db.ejerciciosPropios.put({ ...e, propio: true });
}

export async function borrarEjercicioPropio(id: string): Promise<void> {
  await db.transaction('rw', db.ejerciciosPropios, db.fotos, async () => {
    await db.ejerciciosPropios.delete(id);
    await db.fotos.delete(id);
  });
}

export async function guardarFoto(ejercicioId: string, imagen: Blob): Promise<void> {
  await db.fotos.put({ ejercicioId, imagen, actualizado: Date.now() });
}

export async function borrarFoto(ejercicioId: string): Promise<void> {
  await db.fotos.delete(ejercicioId);
}

const PREFIJO_NOTA = 'nota:';

export async function guardarNotaEjercicio(ejercicioId: string, nota: string): Promise<void> {
  const clave = PREFIJO_NOTA + ejercicioId;
  if (nota.trim()) await db.ajustes.put({ clave, valor: nota });
  else await db.ajustes.delete(clave);
}

export async function leerNotaEjercicio(ejercicioId: string): Promise<string> {
  const a = await db.ajustes.get(PREFIJO_NOTA + ejercicioId);
  return typeof a?.valor === 'string' ? a.valor : '';
}

export async function leerNotasEjercicios(): Promise<Record<string, string>> {
  const todas = await db.ajustes.where('clave').startsWith(PREFIJO_NOTA).toArray();
  return Object.fromEntries(
    todas.filter((a) => typeof a.valor === 'string').map((a) => [a.clave.slice(PREFIJO_NOTA.length), a.valor as string]),
  );
}

// ---------- reemplazo por un dia ----------

export async function reemplazarPorHoy(
  semana: number,
  sesionId: string,
  originalId: string,
  nuevoId: string | null,
): Promise<void> {
  await db.transaction('rw', db.sesiones, async () => {
    const id = idSesion(semana, sesionId);
    const actual = await db.sesiones.get(id);
    const reemplazos = { ...(actual?.reemplazos ?? {}) };
    if (nuevoId && nuevoId !== originalId) reemplazos[originalId] = nuevoId;
    else delete reemplazos[originalId];
    await db.sesiones.put({
      ...actual,
      id,
      semana,
      sesionId,
      fecha: actual?.fecha ?? hoy(),
      nota: actual?.nota ?? '',
      reemplazos,
      actualizado: Date.now(),
    });
  });
}

// ---------- altura (para IMC y grasa con cinta) ----------

export async function leerAlturaCm(): Promise<number | null> {
  const v = Number((await db.ajustes.get('alturaCm'))?.valor);
  return Number.isFinite(v) && v >= 100 && v <= 250 ? v : null;
}

export async function fijarAlturaCm(cm: number): Promise<void> {
  await db.ajustes.put({ clave: 'alturaCm', valor: cm });
}

// ---------- calculadora de discos ----------

export async function leerBarraKg(): Promise<number> {
  const v = Number((await db.ajustes.get('barraKg'))?.valor);
  return Number.isFinite(v) && v >= 0 ? v : 20;
}

export async function fijarBarraKg(kg: number): Promise<void> {
  await db.ajustes.put({ clave: 'barraKg', valor: kg });
}

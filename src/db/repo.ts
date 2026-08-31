import { db, hoy, idSerie, idSesion, serieVacia, tieneDatos, type Medicion, type RegistroSerie } from './db';

export type CampoSerie = 'kg' | 'reps' | 'rir' | 'segundos';

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
): Promise<void> {
  const id = idSerie(semana, sesionId, ejercicioId, serie);
  await db.transaction('rw', db.series, db.sesiones, async () => {
    const actual = (await db.series.get(id)) ?? serieVacia(semana, sesionId, ejercicioId, serie);
    await db.series.put({ ...actual, [campo]: valor, actualizado: Date.now() });
    await tocarSesion(semana, sesionId);
  });
}

export async function alternarHecha(
  semana: number,
  sesionId: string,
  ejercicioId: string,
  serie: number,
): Promise<void> {
  const id = idSerie(semana, sesionId, ejercicioId, serie);
  await db.transaction('rw', db.series, db.sesiones, async () => {
    const actual = (await db.series.get(id)) ?? serieVacia(semana, sesionId, ejercicioId, serie);
    await db.series.put({ ...actual, hecha: !actual.hecha, actualizado: Date.now() });
    await tocarSesion(semana, sesionId);
  });
}

export async function guardarNota(semana: number, sesionId: string, nota: string): Promise<void> {
  const id = idSesion(semana, sesionId);
  const actual = await db.sesiones.get(id);
  await db.sesiones.put({
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
  await db.sesiones.put({
    id,
    semana,
    sesionId,
    fecha: actual?.fecha ?? hoy(),
    nota: actual?.nota ?? '',
    actualizado: Date.now(),
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

export interface UltimoRegistro {
  semana: number;
  series: RegistroSerie[];
}

/**
 * Ultima semana anterior a `antesDeSemana` en la que hay series con datos
 * para ese ejercicio.
 */
export function ultimoRegistro(
  todas: RegistroSerie[],
  ejercicioId: string,
  antesDeSemana: number,
): UltimoRegistro | null {
  const previas = todas.filter(
    (r) => r.ejercicioId === ejercicioId && r.semana < antesDeSemana && tieneDatos(r),
  );
  if (!previas.length) return null;
  const semana = Math.max(...previas.map((r) => r.semana));
  const series = previas.filter((r) => r.semana === semana).sort((a, b) => a.serie - b.serie);
  return { semana, series };
}

export async function guardarMedicion(m: Omit<Medicion, 'id'>): Promise<void> {
  await db.mediciones.add(m as Medicion);
}

export async function borrarMedicion(id: number): Promise<void> {
  await db.mediciones.delete(id);
}

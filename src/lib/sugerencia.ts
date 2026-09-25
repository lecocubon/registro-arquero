import type { Ejercicio } from '../data/programa';
import type { RegistroSerie } from '../db/db';
import { e1rm } from './e1rm';
import { esSerieEfectiva } from './series';

/**
 * Carga sugerida para hoy. La doble progresion solo avisa cuando completaste
 * el rango; esto ademas corrige el caso contrario: quedarte con una carga a
 * la que le sacas muchas mas repeticiones de las que pide el programa.
 */

/** Kilos con los que deberian salir `reps` dejando `rir` en el tanque. */
export function cargaPara(e1rmKg: number, reps: number, rir: number): number {
  const margen = Math.max(0, rir);
  return e1rmKg / (1 + (reps + margen) / 30);
}

/** Al multiplo de `paso` mas cercano hacia abajo: en el gimnasio no hay medios discos. */
export function redondearCarga(kg: number, paso: number): number {
  if (!(paso > 0)) return Math.round(kg * 10) / 10;
  return Math.floor(kg / paso + 1e-9) * paso;
}

export interface Sugerencia {
  kg: number;
  /** Respecto de la carga que usaste la vez anterior. */
  direccion: 'subir' | 'bajar';
  /** Repeticiones con las que deberia salir esa carga. */
  reps: number;
}

/**
 * Sugerencia a partir de la mejor serie de la vez anterior: se estima el
 * e1RM y se baja al minimo del rango con el RIR objetivo. Devuelve null si
 * no hay con que estimar o si la carga de la vez anterior ya es la correcta.
 */
export function sugerirCarga(
  ejercicio: Ejercicio,
  previas: RegistroSerie[],
  rirObjetivo: number,
): Sugerencia | null {
  if (ejercicio.tipo !== 'carga' || !(ejercicio.incremento > 0)) return null;

  const utiles = previas.filter((r) => esSerieEfectiva(r) && (r.kg ?? 0) > 0 && (r.reps ?? 0) > 0);
  if (!utiles.length) return null;

  const mejor = Math.max(...utiles.map((r) => e1rm(r.kg, r.reps, r.rir)));
  if (!(mejor > 0)) return null;

  const repsObjetivo = ejercicio.reps[0];
  const kg = redondearCarga(cargaPara(mejor, repsObjetivo, rirObjetivo), ejercicio.incremento);
  if (!(kg > 0)) return null;

  const usada = Math.max(...utiles.map((r) => r.kg ?? 0));
  const salto = kg - usada;
  // Menos de un incremento de diferencia no es noticia.
  if (Math.abs(salto) < ejercicio.incremento) return null;

  return { kg, direccion: salto > 0 ? 'subir' : 'bajar', reps: repsObjetivo };
}

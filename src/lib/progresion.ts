import type { Ejercicio } from '../data/programa';

export interface SerieRegistrada {
  kg?: number | null;
  reps?: number | null;
  rir?: number | null;
}

/**
 * Doble progresion: en la ultima sesion registrada TODAS las series llegaron
 * al tope del rango con RIR >= objetivo. Solo aplica a ejercicios de carga.
 */
export function cumpleDobleProgresion(
  ejercicio: Ejercicio,
  series: SerieRegistrada[],
  rirObjetivo: number,
): boolean {
  if (ejercicio.tipo !== 'carga') return false;
  if (!series.length) return false;
  const tope = ejercicio.reps[1];
  return series.every((s) => {
    const kg = s.kg ?? 0;
    const reps = s.reps ?? 0;
    const rir = s.rir;
    if (!(kg > 0)) return false;
    if (!(reps >= tope)) return false;
    if (rir === null || rir === undefined || !Number.isFinite(rir)) return false;
    return rir >= rirObjetivo;
  });
}

/** kg a sumar, o null si todavia no toca subir. */
export function incrementoSugerido(
  ejercicio: Ejercicio,
  series: SerieRegistrada[],
  rirObjetivo: number,
): number | null {
  if (!cumpleDobleProgresion(ejercicio, series, rirObjetivo)) return null;
  return ejercicio.incremento > 0 ? ejercicio.incremento : null;
}

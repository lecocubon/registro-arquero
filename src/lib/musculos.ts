import { catalogoPorId, type EjercicioCatalogo, type Musculo } from '../data/biblioteca';
import type { RegistroSerie } from '../db/db';
import { esSerieEfectiva } from './series';

export const PESO_SECUNDARIO = 0.5;

export interface SeriesMusculo {
  musculo: Musculo;
  series: number;
}

/**
 * Series de trabajo por grupo muscular en una semana: 1 al musculo principal
 * y 0,5 a cada secundario. Calentamientos y ejercicios de tiempo no suman.
 */
export function seriesPorMusculo(
  registros: RegistroSerie[],
  semana: number,
  catalogo: EjercicioCatalogo[],
): SeriesMusculo[] {
  const cuenta = new Map<Musculo, number>();
  const sumar = (m: Musculo, v: number) => cuenta.set(m, (cuenta.get(m) ?? 0) + v);
  for (const r of registros) {
    if (r.semana !== semana || !esSerieEfectiva(r)) continue;
    const e = catalogoPorId(r.ejercicioId, catalogo);
    if (!e || e.tipo === 'tiempo') continue;
    sumar(e.musculo, 1);
    for (const s of e.secundarios) if (s !== e.musculo) sumar(s, PESO_SECUNDARIO);
  }
  return [...cuenta.entries()]
    .map(([musculo, series]) => ({ musculo, series }))
    .sort((a, b) => b.series - a.series || a.musculo.localeCompare(b.musculo));
}

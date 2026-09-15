import { BIBLIOTECA, catalogoPorId, type EjercicioCatalogo } from '../data/biblioteca';
import { PROGRAMA, ejercicioPorId, type Programa } from '../data/programa';
import type { RegistroSerie } from '../db/db';
import { e1rm, variacionPorcentual } from './e1rm';

export interface FilaProgreso {
  ejercicioId: string;
  nombre: string;
  /** Mejor e1RM de cada semana; indice 0 = semana 1. 0 = sin datos. */
  porSemana: number[];
  actual: number;
  maximo: number;
  variacion: number | null;
}

export function progresoPorEjercicio(
  series: RegistroSerie[],
  programa: Programa = PROGRAMA,
  catalogo: EjercicioCatalogo[] = BIBLIOTECA,
): FilaProgreso[] {
  const porEjercicio = new Map<string, number[]>();
  for (const r of series) {
    if (r.tipo === 'calentamiento') continue;
    const valor = e1rm(r.kg, r.reps, r.rir);
    if (valor <= 0) continue;
    const idx = r.semana - 1;
    if (idx < 0 || idx >= programa.semanas) continue;
    let arr = porEjercicio.get(r.ejercicioId);
    if (!arr) {
      arr = new Array<number>(programa.semanas).fill(0);
      porEjercicio.set(r.ejercicioId, arr);
    }
    if (valor > (arr[idx] ?? 0)) arr[idx] = valor;
  }

  const filas: FilaProgreso[] = [];
  for (const [ejercicioId, porSemana] of porEjercicio) {
    const conDatos = porSemana.filter((v) => v > 0);
    if (!conDatos.length) continue;
    filas.push({
      ejercicioId,
      nombre: catalogoPorId(ejercicioId, catalogo)?.nombre ?? ejercicioPorId(ejercicioId, programa)?.nombre ?? ejercicioId,
      porSemana,
      actual: conDatos[conDatos.length - 1] ?? 0,
      maximo: Math.max(...porSemana),
      variacion: variacionPorcentual(porSemana),
    });
  }
  return filas.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

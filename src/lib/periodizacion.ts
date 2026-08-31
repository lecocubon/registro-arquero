import { PROGRAMA, type Ejercicio, type Fase, type Programa } from '../data/programa';

export interface PlanSemana {
  series: number;
  rirObjetivo: number;
}

export function limitarSemana(semana: number, programa: Programa = PROGRAMA): number {
  if (!Number.isFinite(semana)) return 1;
  return Math.min(Math.max(Math.trunc(semana), 1), programa.semanas);
}

export function faseDe(semana: number, programa: Programa = PROGRAMA): Fase {
  const s = limitarSemana(semana, programa);
  const fase = programa.fases.find((f) => s >= f.semanas[0] && s <= f.semanas[1]);
  const ultima = programa.fases[programa.fases.length - 1];
  if (!fase) {
    if (!ultima) throw new Error('El programa no define fases');
    return ultima;
  }
  return fase;
}

/**
 * (semana, ejercicio) => series y RIR objetivo de esa semana.
 * Es la unica fuente de verdad de la periodizacion.
 */
export function planSemana(
  semana: number,
  ejercicio: Ejercicio,
  programa: Programa = PROGRAMA,
): PlanSemana {
  const fase = faseDe(semana, programa);

  const factor = fase.factorSeries ?? 1;
  const extra = fase.seriesExtra?.[ejercicio.tipo] ?? 0;
  const minimo = fase.seriesMinimas ?? 1;
  const series = Math.max(minimo, Math.round(ejercicio.series * factor)) + extra;

  // Prioridad: la fase con rirTodos manda sobre todo (descarga), luego el RIR
  // fijo del ejercicio, luego el RIR de fase para los principales.
  let rirObjetivo = ejercicio.rirObjetivo;
  if (ejercicio.tipo === 'carga') {
    if (fase.rirTodos !== undefined) rirObjetivo = fase.rirTodos;
    else if (ejercicio.rirFijo !== undefined) rirObjetivo = ejercicio.rirFijo;
    else if (ejercicio.principal && fase.rirPrincipal !== undefined) rirObjetivo = fase.rirPrincipal;
  }

  return { series, rirObjetivo };
}

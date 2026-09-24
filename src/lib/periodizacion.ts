import { PROGRAMA, type Ejercicio, type Fase, type Mesociclo, type Programa } from '../data/programa';

export interface PlanSemana {
  series: number;
  rirObjetivo: number;
}

/** Primera semana del mesociclo en curso. Los programas viejos empiezan en 1. */
export function inicioMesociclo(programa: Mesociclo = PROGRAMA): number {
  const d = programa.desde;
  return Number.isFinite(d) && (d as number) >= 1 ? Math.trunc(d as number) : 1;
}

/** Ultima semana del mesociclo en curso. */
export function finMesociclo(programa: Mesociclo = PROGRAMA): number {
  return inicioMesociclo(programa) + Math.max(1, programa.semanas) - 1;
}

export function numeroMesociclo(programa: Mesociclo = PROGRAMA): number {
  const n = programa.mesociclo;
  return Number.isFinite(n) && (n as number) >= 1 ? Math.trunc(n as number) : 1;
}

/**
 * Semana dentro del mesociclo (1 a `semanas`). El historial usa semanas
 * absolutas, que siguen subiendo mesociclo tras mesociclo, asi que las fases
 * se resuelven con esta.
 */
export function semanaRelativa(semana: number, programa: Mesociclo = PROGRAMA): number {
  const rel = Math.trunc(semana) - inicioMesociclo(programa) + 1;
  if (!Number.isFinite(rel)) return 1;
  return Math.min(Math.max(rel, 1), Math.max(1, programa.semanas));
}

/** Semanas absolutas del mesociclo en curso, en orden. */
export function semanasDelMesociclo(programa: Mesociclo = PROGRAMA): number[] {
  const desde = inicioMesociclo(programa);
  return Array.from({ length: Math.max(1, programa.semanas) }, (_, i) => desde + i);
}

/** Se puede volver a semanas de mesociclos anteriores para corregir datos. */
export function limitarSemana(semana: number, programa: Mesociclo = PROGRAMA): number {
  if (!Number.isFinite(semana)) return inicioMesociclo(programa);
  return Math.min(Math.max(Math.trunc(semana), 1), finMesociclo(programa));
}

export function faseDe(semana: number, programa: Programa = PROGRAMA): Fase {
  const s = semanaRelativa(limitarSemana(semana, programa), programa);
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

  // La movilidad no se descarga ni se acumula: siempre las mismas series.
  const factor = ejercicio.tipo === 'movilidad' ? 1 : (fase.factorSeries ?? 1);
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

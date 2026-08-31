/**
 * Epley ajustada por RIR: kg * (1 + (reps + RIR) / 30).
 * Devuelve 0 cuando el dato no permite estimar nada.
 */
export function e1rm(
  kg: number | null | undefined,
  reps: number | null | undefined,
  rir: number | null | undefined = 0,
): number {
  if (!Number.isFinite(kg as number) || !Number.isFinite(reps as number)) return 0;
  const k = kg as number;
  const r = reps as number;
  if (k <= 0 || r <= 0) return 0;
  const extra = Number.isFinite(rir as number) && (rir as number) > 0 ? (rir as number) : 0;
  return k * (1 + (r + extra) / 30);
}

export function redondear1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** Variacion porcentual respecto de la primera semana con datos. */
export function variacionPorcentual(valores: number[]): number | null {
  const conDatos = valores.filter((v) => v > 0);
  const primero = conDatos[0];
  const ultimo = conDatos[conDatos.length - 1];
  if (conDatos.length < 2 || primero === undefined || ultimo === undefined || primero <= 0) return null;
  return (ultimo / primero - 1) * 100;
}

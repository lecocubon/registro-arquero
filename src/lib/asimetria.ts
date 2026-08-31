export const UMBRAL_ASIMETRIA = 0.12;

/** |izq - der| / max(izq, der). null si falta algun lado. */
export function asimetria(
  izquierda: number | null | undefined,
  derecha: number | null | undefined,
): number | null {
  if (!Number.isFinite(izquierda as number) || !Number.isFinite(derecha as number)) return null;
  const i = izquierda as number;
  const d = derecha as number;
  if (i <= 0 || d <= 0) return null;
  return Math.abs(i - d) / Math.max(i, d);
}

/** Marca cuando supera el 12%. */
export function asimetriaAlta(valor: number | null): boolean {
  if (valor === null) return false;
  return valor > UMBRAL_ASIMETRIA + 1e-9;
}

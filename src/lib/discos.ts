export const DISCOS_ESTANDAR = [25, 20, 15, 10, 5, 2.5, 1.25];
export const BARRAS = [20, 15, 10, 0];

export interface ResultadoDiscos {
  /** Discos a poner en cada lado, de mayor a menor. */
  porLado: number[];
  /** Peso total que se logra con esos discos y la barra. */
  logrado: number;
  /** Lo que falta para llegar al objetivo (0 si se logra exacto). */
  faltante: number;
}

/**
 * Reparte el objetivo en discos por lado, del mas pesado al mas liviano.
 * Trabaja en gramos para no acumular errores con 1,25 kg.
 */
export function calcularDiscos(
  objetivoKg: number,
  barraKg: number,
  discos: number[] = DISCOS_ESTANDAR,
): ResultadoDiscos {
  const barra = Math.max(0, Math.round(barraKg * 1000));
  const objetivo = Math.max(0, Math.round((Number.isFinite(objetivoKg) ? objetivoKg : 0) * 1000));
  let lado = Math.max(0, Math.floor((objetivo - barra) / 2));
  const disponibles = [...new Set(discos.map((d) => Math.round(d * 1000)))]
    .filter((d) => d > 0)
    .sort((a, b) => b - a);

  const gramos: number[] = [];
  for (const d of disponibles) {
    while (lado >= d) {
      gramos.push(d);
      lado -= d;
    }
  }
  const logrado = barra + 2 * gramos.reduce((suma, d) => suma + d, 0);
  return {
    porLado: gramos.map((g) => g / 1000),
    logrado: logrado / 1000,
    faltante: Math.max(0, objetivo - logrado) / 1000,
  };
}

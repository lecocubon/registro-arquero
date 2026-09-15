import type { Medicion } from '../db/db';

/**
 * Estimaciones de composicion corporal con cinta metrica. La app es de uso
 * personal (hombre): se usa la formula masculina del metodo US Navy, que
 * solo necesita cuello, cintura y altura. La cadera entra en la formula
 * femenina; aca se registra para el indice cintura/cadera.
 */

/** % de grasa, metodo US Navy (hombre). Error tipico ±3–4 puntos: sirve para tendencia. */
export function grasaNavyHombre(
  cinturaCm: number | null | undefined,
  cuelloCm: number | null | undefined,
  alturaCm: number | null | undefined,
): number | null {
  if (!cinturaCm || !cuelloCm || !alturaCm) return null;
  if (cinturaCm <= cuelloCm || alturaCm < 100 || alturaCm > 250) return null;
  const valor = 495 / (1.0324 - 0.19077 * Math.log10(cinturaCm - cuelloCm) + 0.15456 * Math.log10(alturaCm)) - 450;
  return Number.isFinite(valor) && valor > 2 && valor < 70 ? Math.round(valor * 10) / 10 : null;
}

export function imc(pesoKg: number | null | undefined, alturaCm: number | null | undefined): number | null {
  if (!pesoKg || !alturaCm || alturaCm < 100) return null;
  return Math.round((pesoKg / (alturaCm / 100) ** 2) * 10) / 10;
}

export function indiceCinturaCadera(cinturaCm: number | null | undefined, caderaCm: number | null | undefined): number | null {
  if (!cinturaCm || !caderaCm) return null;
  return Math.round((cinturaCm / caderaCm) * 100) / 100;
}

export interface GrasaCorporal {
  valor: number;
  /** 'medida': anotada o importada (bascula, InBody). 'cinta': estimada con cuello y cintura. */
  metodo: 'medida' | 'cinta';
}

/** La grasa anotada manda; si no hay, se estima con la cinta. */
export function grasaDe(m: Medicion, alturaCm: number | null): GrasaCorporal | null {
  if (m.grasa !== null && m.grasa !== undefined && m.grasa > 0) return { valor: m.grasa, metodo: 'medida' };
  const estimada = grasaNavyHombre(m.cintura, m.cuello, alturaCm);
  return estimada === null ? null : { valor: estimada, metodo: 'cinta' };
}

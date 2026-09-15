import type { Ejercicio } from '../data/programa';
import type { RegistroSerie } from '../db/db';

export type ValoresSerie = Partial<Pick<RegistroSerie, 'kg' | 'reps' | 'rir' | 'segundos'>>;

export function esCalentamiento(r: RegistroSerie): boolean {
  return r.tipo === 'calentamiento';
}

export function tieneValores(r: RegistroSerie | undefined): boolean {
  if (!r) return false;
  return (r.kg ?? 0) > 0 || (r.reps ?? 0) > 0 || (r.segundos ?? 0) > 0;
}

export function tieneDatos(r: RegistroSerie | undefined): boolean {
  if (!r) return false;
  return tieneValores(r) || r.hecha;
}

/** Serie de trabajo con algo registrado: numeros o marcada como hecha. */
export function esSerieEfectiva(r: RegistroSerie): boolean {
  return !esCalentamiento(r) && tieneDatos(r);
}

export interface UltimoRegistro {
  semana: number;
  series: RegistroSerie[];
}

/**
 * Ultima semana anterior a `antesDeSemana` con series de trabajo registradas
 * para ese ejercicio. Los calentamientos se ignoran.
 */
export function ultimoRegistro(
  todas: RegistroSerie[],
  ejercicioId: string,
  antesDeSemana: number,
): UltimoRegistro | null {
  const previas = todas.filter(
    (r) => r.ejercicioId === ejercicioId && r.semana < antesDeSemana && esSerieEfectiva(r),
  );
  if (!previas.length) return null;
  const semana = Math.max(...previas.map((r) => r.semana));
  const series = previas.filter((r) => r.semana === semana).sort((a, b) => a.serie - b.serie);
  return { semana, series };
}

/**
 * Registro de la vez anterior que corresponde a la serie `serie`. Si ese dia
 * se hicieron menos series, repite la ultima.
 */
export function serieAnterior(previas: RegistroSerie[], serie: number): RegistroSerie | undefined {
  return previas.find((r) => r.serie === serie) ?? previas[previas.length - 1];
}

/** Valores que se copian desde la vez anterior, segun el tipo de ejercicio. */
export function valoresParaCopiar(ejercicio: Ejercicio, r: RegistroSerie | undefined): ValoresSerie | undefined {
  if (!r || !tieneValores(r)) return undefined;
  if (ejercicio.tipo === 'carga') return { kg: r.kg, reps: r.reps, rir: r.rir };
  if (ejercicio.tipo === 'tiempo') return { segundos: r.segundos };
  return undefined;
}

export const MINUTOS_SESION_ABIERTA = 90;

export interface ResumenSesion {
  /** null si todavia no se registro nada. */
  duracionMs: number | null;
  enCurso: boolean;
  volumenKg: number;
  seriesHechas: number;
  seriesPlanificadas: number;
}

/**
 * Duracion: desde la primera serie tocada hasta ahora mientras haya actividad
 * reciente; despues queda congelada en la ultima actividad.
 */
export function resumenSesion(
  registros: RegistroSerie[],
  seriesPlanificadas: number,
  inicio: number | undefined,
  ahora: number,
): ResumenSesion {
  const conDatos = registros.filter(tieneDatos);
  const trabajo = conDatos.filter((r) => !esCalentamiento(r));

  const volumenKg = trabajo.reduce((acc, r) => {
    const kg = r.kg ?? 0;
    const reps = r.reps ?? 0;
    return kg > 0 && reps > 0 ? acc + kg * reps : acc;
  }, 0);

  if (!conDatos.length) {
    return { duracionMs: null, enCurso: false, volumenKg, seriesHechas: 0, seriesPlanificadas };
  }

  const primera = Math.min(...conDatos.map((r) => r.actualizado));
  const ultima = Math.max(...conDatos.map((r) => r.actualizado));
  const desde = inicio !== undefined && inicio <= primera ? inicio : primera;
  const enCurso = ahora - ultima < MINUTOS_SESION_ABIERTA * 60_000;
  const hasta = enCurso ? ahora : ultima;

  return {
    duracionMs: Math.max(0, hasta - desde),
    enCurso,
    volumenKg,
    seriesHechas: trabajo.length,
    seriesPlanificadas,
  };
}

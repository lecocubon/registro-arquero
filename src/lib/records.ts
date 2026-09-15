import type { RegistroSerie } from '../db/db';
import { e1rm } from './e1rm';
import { esCalentamiento, tieneValores } from './series';

export type Metrica = 'e1rm' | 'peso' | 'volumenSerie' | 'volumenSesion';

export const METRICAS: { id: Metrica; nombre: string; unidad: string }[] = [
  { id: 'e1rm', nombre: 'e1RM', unidad: 'kg' },
  { id: 'peso', nombre: 'Mayor peso', unidad: 'kg' },
  { id: 'volumenSerie', nombre: 'Mejor serie', unidad: 'kg' },
  { id: 'volumenSesion', nombre: 'Volumen sesión', unidad: 'kg' },
];

export interface MarcaSerie {
  valor: number;
  semana: number;
  sesionId: string;
  kg: number;
  reps: number;
  rir: number | null;
}

export interface MarcaSesion {
  valor: number;
  semana: number;
  sesionId: string;
}

export interface Records {
  mayorPeso: MarcaSerie | null;
  mejorE1rm: MarcaSerie | null;
  mejorVolumenSerie: MarcaSerie | null;
  mejorVolumenSesion: MarcaSesion | null;
}

/** Series de trabajo de ese ejercicio con kg y reps. */
function seriesConCarga(series: RegistroSerie[], ejercicioId: string): RegistroSerie[] {
  return series.filter(
    (r) => r.ejercicioId === ejercicioId && !esCalentamiento(r) && (r.kg ?? 0) > 0 && (r.reps ?? 0) > 0,
  );
}

function marca(r: RegistroSerie, valor: number): MarcaSerie {
  return { valor, semana: r.semana, sesionId: r.sesionId, kg: r.kg ?? 0, reps: r.reps ?? 0, rir: r.rir };
}

function mejor<T extends { valor: number }>(actual: T | null, candidato: T): T {
  // Ante empate gana la mas antigua: el record se logro primero ahi.
  return !actual || candidato.valor > actual.valor ? candidato : actual;
}

export function volumenesPorSesion(series: RegistroSerie[], ejercicioId: string): MarcaSesion[] {
  const grupos = new Map<string, MarcaSesion>();
  for (const r of seriesConCarga(series, ejercicioId)) {
    const clave = `${r.semana}|${r.sesionId}`;
    const g = grupos.get(clave) ?? { valor: 0, semana: r.semana, sesionId: r.sesionId };
    g.valor += (r.kg ?? 0) * (r.reps ?? 0);
    grupos.set(clave, g);
  }
  return [...grupos.values()].sort((a, b) => a.semana - b.semana);
}

export function recordsDe(series: RegistroSerie[], ejercicioId: string): Records {
  let mayorPeso: MarcaSerie | null = null;
  let mejorE1rm: MarcaSerie | null = null;
  let mejorVolumenSerie: MarcaSerie | null = null;
  const ordenadas = seriesConCarga(series, ejercicioId).sort((a, b) => a.semana - b.semana || a.serie - b.serie);
  for (const r of ordenadas) {
    mayorPeso = mejor(mayorPeso, marca(r, r.kg ?? 0));
    mejorE1rm = mejor(mejorE1rm, marca(r, e1rm(r.kg, r.reps, r.rir)));
    mejorVolumenSerie = mejor(mejorVolumenSerie, marca(r, (r.kg ?? 0) * (r.reps ?? 0)));
  }
  let mejorVolumenSesion: MarcaSesion | null = null;
  for (const v of volumenesPorSesion(series, ejercicioId)) mejorVolumenSesion = mejor(mejorVolumenSesion, v);
  return { mayorPeso, mejorE1rm, mejorVolumenSerie, mejorVolumenSesion };
}

export type TipoRecord = 'mayorPeso' | 'mejorE1rm' | 'mejorVolumenSerie';

export const NOMBRE_RECORD: Record<TipoRecord, string> = {
  mayorPeso: 'Mayor peso',
  mejorE1rm: 'Mejor e1RM',
  mejorVolumenSerie: 'Mejor serie',
};

/**
 * Records que supera `serie` frente al resto del historial. Sin historial
 * previo no hay record: la primera vez no se celebra.
 */
export function recordsNuevos(todas: RegistroSerie[], serie: RegistroSerie): TipoRecord[] {
  if (esCalentamiento(serie) || !tieneValores(serie) || !((serie.kg ?? 0) > 0 && (serie.reps ?? 0) > 0)) return [];
  const previas = todas.filter((r) => r.id !== serie.id);
  const antes = recordsDe(previas, serie.ejercicioId);
  if (!antes.mayorPeso) return [];
  const kg = serie.kg ?? 0;
  const reps = serie.reps ?? 0;
  const nuevos: TipoRecord[] = [];
  if (kg > antes.mayorPeso.valor) nuevos.push('mayorPeso');
  if (antes.mejorE1rm && e1rm(kg, reps, serie.rir) > antes.mejorE1rm.valor + 1e-9) nuevos.push('mejorE1rm');
  if (antes.mejorVolumenSerie && kg * reps > antes.mejorVolumenSerie.valor) nuevos.push('mejorVolumenSerie');
  return nuevos;
}

export function metricaPorSemana(
  series: RegistroSerie[],
  ejercicioId: string,
  metrica: Metrica,
  semanas: number,
): number[] {
  const valores = new Array<number>(semanas).fill(0);
  const poner = (semana: number, v: number) => {
    const i = semana - 1;
    if (i >= 0 && i < semanas && v > (valores[i] ?? 0)) valores[i] = v;
  };
  if (metrica === 'volumenSesion') {
    for (const v of volumenesPorSesion(series, ejercicioId)) poner(v.semana, v.valor);
    return valores;
  }
  for (const r of seriesConCarga(series, ejercicioId)) {
    const kg = r.kg ?? 0;
    const reps = r.reps ?? 0;
    poner(r.semana, metrica === 'e1rm' ? e1rm(kg, reps, r.rir) : metrica === 'peso' ? kg : kg * reps);
  }
  return valores;
}

export interface EntradaHistorial {
  semana: number;
  sesionId: string;
  series: RegistroSerie[];
}

/** Todas las veces que se hizo el ejercicio, de la mas reciente a la mas antigua. */
export function historialDe(series: RegistroSerie[], ejercicioId: string): EntradaHistorial[] {
  const grupos = new Map<string, EntradaHistorial>();
  for (const r of series) {
    if (r.ejercicioId !== ejercicioId || !(tieneValores(r) || r.hecha)) continue;
    const clave = `${r.semana}|${r.sesionId}`;
    const g = grupos.get(clave) ?? { semana: r.semana, sesionId: r.sesionId, series: [] };
    g.series.push(r);
    grupos.set(clave, g);
  }
  for (const g of grupos.values()) {
    g.series.sort((a, b) => Number(!esCalentamiento(a)) - Number(!esCalentamiento(b)) || a.serie - b.serie);
  }
  return [...grupos.values()].sort((a, b) => b.semana - a.semana || a.sesionId.localeCompare(b.sesionId));
}

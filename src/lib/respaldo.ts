import { PROGRAMA, ejercicioPorId, type Programa } from '../data/programa';
import type { Medicion, RegistroSerie, RegistroSesion } from '../db/db';
import { asimetria } from './asimetria';
import { e1rm, redondear1 } from './e1rm';

export const VERSION_RESPALDO = 1;

export interface Respaldo {
  app: 'registro-arquero';
  version: number;
  exportado: string;
  programa: string;
  semana: number;
  series: RegistroSerie[];
  sesiones: RegistroSesion[];
  mediciones: Medicion[];
}

export function construirRespaldo(datos: {
  semana: number;
  series: RegistroSerie[];
  sesiones: RegistroSesion[];
  mediciones: Medicion[];
  programa?: Programa;
}): Respaldo {
  return {
    app: 'registro-arquero',
    version: VERSION_RESPALDO,
    exportado: new Date().toISOString(),
    programa: (datos.programa ?? PROGRAMA).nombre,
    semana: datos.semana,
    series: datos.series,
    sesiones: datos.sesiones,
    mediciones: datos.mediciones,
  };
}

/** Lanza Error con mensaje legible si el JSON no sirve. */
export function validarRespaldo(raw: unknown): Respaldo {
  if (typeof raw !== 'object' || raw === null) throw new Error('El archivo no es un JSON de objeto.');
  const r = raw as Partial<Respaldo>;
  if (r.app !== 'registro-arquero') throw new Error('El archivo no es un respaldo de esta app.');
  if (!Array.isArray(r.series) || !Array.isArray(r.mediciones)) {
    throw new Error('Al respaldo le faltan las listas de series o mediciones.');
  }
  const sesiones = Array.isArray(r.sesiones) ? r.sesiones : [];
  const semana = Number.isFinite(r.semana) ? (r.semana as number) : 1;
  return {
    app: 'registro-arquero',
    version: Number(r.version) || VERSION_RESPALDO,
    exportado: typeof r.exportado === 'string' ? r.exportado : new Date().toISOString(),
    programa: typeof r.programa === 'string' ? r.programa : PROGRAMA.nombre,
    semana,
    series: r.series as RegistroSerie[],
    sesiones,
    mediciones: r.mediciones as Medicion[],
  };
}

function celda(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(filas: unknown[][]): string {
  return filas.map((f) => f.map(celda).join(',')).join('\n');
}

export function seriesACsv(
  series: RegistroSerie[],
  sesiones: RegistroSesion[],
  programa: Programa = PROGRAMA,
): string {
  const fechas = new Map(sesiones.map((s) => [s.id, s.fecha]));
  const filas: unknown[][] = [
    ['semana', 'sesion', 'fecha', 'bloque', 'ejercicio', 'tipo', 'serie', 'kg', 'reps', 'rir', 'segundos', 'hecha', 'e1rm'],
  ];
  const ordenadas = [...series].sort(
    (a, b) => a.semana - b.semana || a.sesionId.localeCompare(b.sesionId) || a.ejercicioId.localeCompare(b.ejercicioId) || a.serie - b.serie,
  );
  for (const r of ordenadas) {
    const ej = ejercicioPorId(r.ejercicioId, programa);
    const est = e1rm(r.kg, r.reps, r.rir);
    filas.push([
      r.semana,
      r.sesionId,
      fechas.get(`${r.semana}|${r.sesionId}`) ?? '',
      ej?.bloque ?? '',
      ej?.nombre ?? r.ejercicioId,
      ej?.tipo ?? '',
      r.serie,
      r.kg,
      r.reps,
      r.rir,
      r.segundos,
      r.hecha ? 'si' : 'no',
      est > 0 ? redondear1(est) : '',
    ]);
  }
  return csv(filas);
}

export function medicionesACsv(mediciones: Medicion[]): string {
  const filas: unknown[][] = [
    ['fecha', 'semana', 'salto_vertical_cm', 'lateral_izq_cm', 'lateral_der_cm', 'asimetria_lateral_pct', 'horizontal_izq_cm', 'horizontal_der_cm', 'asimetria_horizontal_pct', 'peso_kg', 'cintura_cm'],
  ];
  const ordenadas = [...mediciones].sort((a, b) => a.fecha.localeCompare(b.fecha));
  for (const m of ordenadas) {
    const aLat = asimetria(m.lateralIzq, m.lateralDer);
    const aHor = asimetria(m.horizontalIzq, m.horizontalDer);
    filas.push([
      m.fecha,
      m.semana,
      m.saltoVertical,
      m.lateralIzq,
      m.lateralDer,
      aLat === null ? '' : redondear1(aLat * 100),
      m.horizontalIzq,
      m.horizontalDer,
      aHor === null ? '' : redondear1(aHor * 100),
      m.peso,
      m.cintura,
    ]);
  }
  return csv(filas);
}

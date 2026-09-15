import { BIBLIOTECA, catalogoPorId, type EjercicioCatalogo } from '../data/biblioteca';
import { PROGRAMA, ejercicioPorId, type Programa, type ProgramaDef } from '../data/programa';
import type { Medicion, RegistroSerie, RegistroSesion } from '../db/db';
import { asimetria } from './asimetria';
import { grasaNavyHombre, imc, indiceCinturaCadera } from './composicion';
import { e1rm, redondear1 } from './e1rm';

export const VERSION_RESPALDO = 2;

export interface FotoRespaldo {
  ejercicioId: string;
  /** data:image/...;base64 */
  dataUrl: string;
}

export interface Respaldo {
  app: 'registro-arquero';
  version: number;
  exportado: string;
  programa: string;
  semana: number;
  series: RegistroSerie[];
  sesiones: RegistroSesion[];
  mediciones: Medicion[];
  /** v2: programa editado en la app; null si se usa el de fabrica. */
  definicionPrograma: ProgramaDef | null;
  ejerciciosPropios: EjercicioCatalogo[];
  /** v2: notas de tecnica por ejercicio. */
  notas: Record<string, string>;
  fotos: FotoRespaldo[];
  /** v2: altura para IMC y grasa con cinta. */
  alturaCm?: number | null;
}

export function construirRespaldo(datos: {
  semana: number;
  series: RegistroSerie[];
  sesiones: RegistroSesion[];
  mediciones: Medicion[];
  programa?: Programa;
  definicionPrograma?: ProgramaDef | null;
  ejerciciosPropios?: EjercicioCatalogo[];
  notas?: Record<string, string>;
  fotos?: FotoRespaldo[];
  alturaCm?: number | null;
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
    definicionPrograma: datos.definicionPrograma ?? null,
    ejerciciosPropios: datos.ejerciciosPropios ?? [],
    notas: datos.notas ?? {},
    fotos: datos.fotos ?? [],
    alturaCm: datos.alturaCm ?? null,
  };
}

function esDefinicionPrograma(v: unknown): v is ProgramaDef {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Partial<ProgramaDef>;
  return (
    typeof p.nombre === 'string' &&
    Number.isFinite(p.semanas) &&
    Array.isArray(p.fases) &&
    Array.isArray(p.sesiones) &&
    typeof p.descansos === 'object'
  );
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
  if (r.definicionPrograma != null && !esDefinicionPrograma(r.definicionPrograma)) {
    throw new Error('El programa guardado en el respaldo está dañado.');
  }
  const notas =
    typeof r.notas === 'object' && r.notas !== null
      ? Object.fromEntries(Object.entries(r.notas).filter(([, v]) => typeof v === 'string'))
      : {};
  return {
    app: 'registro-arquero',
    version: Number(r.version) || VERSION_RESPALDO,
    exportado: typeof r.exportado === 'string' ? r.exportado : new Date().toISOString(),
    programa: typeof r.programa === 'string' ? r.programa : PROGRAMA.nombre,
    semana,
    series: r.series as RegistroSerie[],
    sesiones,
    mediciones: r.mediciones as Medicion[],
    definicionPrograma: r.definicionPrograma ?? null,
    ejerciciosPropios: Array.isArray(r.ejerciciosPropios) ? r.ejerciciosPropios : [],
    notas,
    fotos: Array.isArray(r.fotos)
      ? r.fotos.filter((f) => typeof f?.ejercicioId === 'string' && /^data:image\//.test(f?.dataUrl ?? ''))
      : [],
    alturaCm: Number.isFinite(r.alturaCm) ? (r.alturaCm as number) : null,
  };
}

function celda(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(filas: unknown[][]): string {
  return filas.map((f) => f.map(celda).join(',')).join('\n');
}

const ordenTipo = (r: RegistroSerie) => (r.tipo === 'calentamiento' ? 0 : 1);

export function seriesACsv(
  series: RegistroSerie[],
  sesiones: RegistroSesion[],
  programa: Programa = PROGRAMA,
  catalogo: EjercicioCatalogo[] = BIBLIOTECA,
): string {
  const fechas = new Map(sesiones.map((s) => [s.id, s.fecha]));
  const filas: unknown[][] = [
    ['semana', 'sesion', 'fecha', 'bloque', 'ejercicio', 'tipo', 'serie', 'tipo_serie', 'kg', 'reps', 'rir', 'segundos', 'hecha', 'e1rm'],
  ];
  const ordenadas = [...series].sort(
    (a, b) => a.semana - b.semana || a.sesionId.localeCompare(b.sesionId) || a.ejercicioId.localeCompare(b.ejercicioId) || ordenTipo(a) - ordenTipo(b) || a.serie - b.serie,
  );
  for (const r of ordenadas) {
    const ej = ejercicioPorId(r.ejercicioId, programa);
    const cat = catalogoPorId(r.ejercicioId, catalogo);
    const est = r.tipo === 'calentamiento' ? 0 : e1rm(r.kg, r.reps, r.rir);
    filas.push([
      r.semana,
      r.sesionId,
      fechas.get(`${r.semana}|${r.sesionId}`) ?? '',
      ej?.bloque ?? '',
      cat?.nombre ?? ej?.nombre ?? r.ejercicioId,
      cat?.tipo ?? ej?.tipo ?? '',
      r.serie,
      r.tipo ?? 'normal',
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

export function medicionesACsv(mediciones: Medicion[], alturaCm: number | null = null): string {
  const filas: unknown[][] = [
    ['fecha', 'semana', 'salto_vertical_cm', 'lateral_izq_cm', 'lateral_der_cm', 'asimetria_lateral_pct', 'horizontal_izq_cm', 'horizontal_der_cm', 'asimetria_horizontal_pct', 'peso_kg', 'cintura_cm', 'grasa_pct', 'origen', 'cuello_cm', 'cadera_cm', 'grasa_cinta_pct', 'imc', 'cintura_cadera', 'nota'],
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
      m.grasa ?? '',
      m.origen ?? 'manual',
      m.cuello ?? '',
      m.cadera ?? '',
      grasaNavyHombre(m.cintura, m.cuello, alturaCm) ?? '',
      imc(m.peso, alturaCm) ?? '',
      indiceCinturaCadera(m.cintura, m.cadera) ?? '',
      m.nota ?? '',
    ]);
  }
  return csv(filas);
}

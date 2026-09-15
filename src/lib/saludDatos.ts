import type { Medicion, RegistroSesion } from '../db/db';

/**
 * Traduccion pura de lo que entrega Health Connect a datos de Arquero. No
 * conoce el plugin nativo: asi se puede probar sin telefono.
 */

export interface MuestraSalud {
  value: number;
  startDate: string;
  endDate: string;
  sleepState?: string;
  stages?: { stage: string; durationMinutes: number }[];
}

/** YYYY-MM-DD en la zona horaria del telefono. */
export function fechaLocal(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Ultima muestra de cada dia, por fecha local. */
function ultimaPorDia(muestras: MuestraSalud[]): Map<string, MuestraSalud> {
  const porDia = new Map<string, MuestraSalud>();
  for (const m of muestras) {
    if (!Number.isFinite(m.value) || m.value <= 0) continue;
    const dia = fechaLocal(m.startDate);
    const actual = porDia.get(dia);
    if (!actual || m.startDate > actual.startDate) porDia.set(dia, m);
  }
  return porDia;
}

/** Semana del programa en que cae una fecha: la de la sesion registrada mas cercana hacia atras. */
export function semanaParaFecha(fecha: string, sesiones: RegistroSesion[], semanaActual: number): number {
  const previas = sesiones.filter((s) => s.fecha <= fecha).sort((a, b) => b.fecha.localeCompare(a.fecha));
  return previas[0]?.semana ?? (sesiones.length ? 1 : semanaActual);
}

const redondear = (v: number, decimales: number) => Math.round(v * 10 ** decimales) / 10 ** decimales;

/**
 * Mediciones nuevas a partir de peso y % de grasa del reloj o la bascula.
 * Una por dia (la ultima lectura). Se omiten los dias que ya tienen peso
 * anotado, a mano o importado antes, para no duplicar.
 */
export function medicionesDesdeSalud(
  pesos: MuestraSalud[],
  grasas: MuestraSalud[],
  existentes: Medicion[],
  sesiones: RegistroSesion[],
  semanaActual: number,
): Omit<Medicion, 'id'>[] {
  const conPeso = new Set(existentes.filter((m) => m.peso !== null).map((m) => m.fecha));
  const pesoDia = ultimaPorDia(pesos);
  const grasaDia = ultimaPorDia(grasas);
  const dias = [...new Set([...pesoDia.keys(), ...grasaDia.keys()])].filter((d) => !conPeso.has(d)).sort();

  return dias.map((fecha) => ({
    fecha,
    semana: semanaParaFecha(fecha, sesiones, semanaActual),
    saltoVertical: null,
    lateralIzq: null,
    lateralDer: null,
    horizontalIzq: null,
    horizontalDer: null,
    peso: pesoDia.has(fecha) ? redondear(pesoDia.get(fecha)?.value ?? 0, 1) : null,
    cintura: null,
    grasa: grasaDia.has(fecha) ? redondear(grasaDia.get(fecha)?.value ?? 0, 1) : null,
    origen: 'reloj',
  }));
}

const ESTADOS_DESPIERTO = new Set(['awake', 'inBed']);
export const HORAS_VENTANA_SUENO = 20;

export interface ResumenSueno {
  minutos: number;
  desde: string;
  hasta: string;
}

/** Sueno de la ultima noche: sesiones que terminaron en las ultimas 20 horas, sin tiempo despierto. */
export function resumenSueno(muestras: MuestraSalud[], ahora: number): ResumenSueno | null {
  const limite = ahora - HORAS_VENTANA_SUENO * 3_600_000;
  const recientes = muestras.filter((m) => {
    const fin = Date.parse(m.endDate);
    return Number.isFinite(fin) && fin >= limite && fin <= ahora + 3_600_000;
  });
  if (!recientes.length) return null;

  let minutos = 0;
  for (const m of recientes) {
    if (m.stages?.length) {
      minutos += m.stages.filter((s) => !ESTADOS_DESPIERTO.has(s.stage)).reduce((t, s) => t + s.durationMinutes, 0);
    } else if (!ESTADOS_DESPIERTO.has(m.sleepState ?? '')) {
      minutos += m.value;
    }
  }
  if (minutos <= 0) return null;
  const desde = recientes.map((m) => m.startDate).sort()[0] ?? '';
  const hasta = recientes.map((m) => m.endDate).sort().at(-1) ?? '';
  return { minutos: Math.round(minutos), desde, hasta };
}

export interface ResumenPulso {
  promedio: number;
  maximo: number;
  lecturas: number;
}

export function resumenPulso(muestras: MuestraSalud[]): ResumenPulso | null {
  const valores = muestras.map((m) => m.value).filter((v) => Number.isFinite(v) && v > 20 && v < 250);
  if (!valores.length) return null;
  return {
    promedio: Math.round(valores.reduce((a, b) => a + b, 0) / valores.length),
    maximo: Math.round(Math.max(...valores)),
    lecturas: valores.length,
  };
}

/** Ultimo valor de una serie de muestras (por ejemplo, FC en reposo). */
export function ultimoValor(muestras: MuestraSalud[]): number | null {
  const ordenadas = muestras.filter((m) => Number.isFinite(m.value) && m.value > 0).sort((a, b) => b.startDate.localeCompare(a.startDate));
  return ordenadas[0] ? Math.round(ordenadas[0].value) : null;
}

/** "6 h 40 min" */
export function formatoHorasMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Id estable para que guardar dos veces la misma sesion actualice en vez de duplicar. */
export function idEntrenamientoSalud(semana: number, sesionId: string): string {
  return `arquero|${semana}|${sesionId}`;
}

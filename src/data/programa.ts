/**
 * Programa por defecto del mesociclo. La app parte de este archivo y el editor
 * guarda una copia modificada en el telefono; "Restaurar" vuelve a este.
 * Aqui solo va la prescripcion: que es cada ejercicio vive en biblioteca.json.
 */
import { BIBLIOTECA, catalogoPorId, type EjercicioCatalogo, type TipoEjercicio } from './biblioteca';

export type { TipoEjercicio } from './biblioteca';

/** Prescripcion de un ejercicio dentro de una sesion. */
export interface EjercicioPlan {
  /** Id del ejercicio en la biblioteca. Tambien es la clave del historial. */
  id: string;
  bloque: string;
  /** Series base; la fase puede ajustarlas. */
  series: number;
  /** Rango [min, max]. En tipo "tiempo" son segundos; en "salto" es informativo. */
  reps: [number, number];
  rirObjetivo: number;
  /** Incremento de carga sugerido, en kg. */
  incremento: number;
  /** Sigue el RIR de la fase en vez del propio. */
  principal?: boolean;
  /** Ignora la fase y mantiene siempre este RIR. */
  rirFijo?: number;
  porLado?: boolean;
  /** Descanso tras cada serie, en segundos. Si falta, se usa `descansos`. */
  descanso?: number;
}

/** Prescripcion resuelta con nombre y tipo de la biblioteca. */
export interface Ejercicio extends EjercicioPlan {
  nombre: string;
  tipo: TipoEjercicio;
}

export interface Fase {
  nombre: string;
  nota: string;
  /** Rango inclusivo [desde, hasta]. */
  semanas: [number, number];
  /** RIR de los ejercicios marcados como principales. */
  rirPrincipal?: number;
  /** Sobreescribe el RIR de todos los ejercicios de carga. */
  rirTodos?: number;
  factorSeries?: number;
  seriesMinimas?: number;
  seriesExtra?: Partial<Record<TipoEjercicio, number>>;
}

export interface DescansosPorDefecto {
  principal: number;
  carga: number;
  tiempo: number;
  salto: number;
}

interface SesionBase {
  id: string;
  nombre: string;
  lugar: string;
  foco: string;
}

export interface SesionDef extends SesionBase {
  ejercicios: EjercicioPlan[];
}

export interface SesionPlan extends SesionBase {
  ejercicios: Ejercicio[];
}

interface ProgramaBase {
  nombre: string;
  semanas: number;
  /** Segundos de descanso cuando el ejercicio no define el suyo. */
  descansos: DescansosPorDefecto;
  fases: Fase[];
}

/** Lo que se guarda y se edita. */
export interface ProgramaDef extends ProgramaBase {
  sesiones: SesionDef[];
}

/** Lo que usa la app: cada ejercicio con su nombre y tipo. */
export interface Programa extends ProgramaBase {
  sesiones: SesionPlan[];
}

export const PROGRAMA_BASE: ProgramaDef = {
  nombre: 'Bajo los Tres Palos',
  semanas: 8,
  descansos: { principal: 180, carga: 90, tiempo: 60, salto: 90 },
  fases: [
    {
      nombre: 'Calibracion',
      semanas: [1, 2],
      rirPrincipal: 3,
      nota: 'Principales a 3 RIR. Buscas tus cargas reales, no records.',
    },
    {
      nombre: 'Carga',
      semanas: [3, 5],
      rirPrincipal: 2,
      nota: 'Principales a 2 RIR. Doble progresion activa.',
    },
    {
      nombre: 'Acumulacion',
      semanas: [6, 7],
      rirPrincipal: 1,
      seriesExtra: { salto: 1 },
      nota: 'Principales a 1 RIR. Una serie extra de salto.',
    },
    {
      nombre: 'Descarga y retest',
      semanas: [8, 8],
      rirTodos: 4,
      factorSeries: 0.6,
      seriesMinimas: 2,
      nota: 'Misma carga, menos series, 4 RIR. Al final: bateria de medicion.',
    },
  ],
  sesiones: [
    {
      id: 'lunes',
      nombre: 'Lunes',
      lugar: 'Casa',
      foco: 'Tren superior, tronco y salto vertical',
      ejercicios: [
        { id: 'salto-vertical-detenido', bloque: 'A', series: 3, reps: [5, 5], rirObjetivo: 0, incremento: 0 },
        { id: 'dominadas', bloque: 'B1', series: 4, reps: [2, 4], rirObjetivo: 2, incremento: 2.5, principal: true },
        { id: 'talones-una-pierna', bloque: 'B2', series: 4, reps: [10, 15], rirObjetivo: 2, incremento: 2, porLado: true },
        { id: 'press-mancuernas', bloque: 'C1', series: 4, reps: [6, 8], rirObjetivo: 2, incremento: 2 },
        { id: 'remo-unilateral', bloque: 'C2', series: 4, reps: [8, 10], rirObjetivo: 2, incremento: 2, porLado: true },
        { id: 'press-hombro-pie', bloque: 'D1', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 2 },
        { id: 'plancha-lateral', bloque: 'D2', series: 3, reps: [25, 40], rirObjetivo: 0, incremento: 0, porLado: true },
      ],
    },
    {
      id: 'martes',
      nombre: 'Martes',
      lugar: 'Gimnasio · 07:00',
      foco: 'Fuerza de tren inferior',
      ejercicios: [
        { id: 'salto-contramovimiento', bloque: 'A', series: 3, reps: [4, 4], rirObjetivo: 0, incremento: 0 },
        { id: 'sentadilla-barra', bloque: 'B', series: 4, reps: [5, 6], rirObjetivo: 2, incremento: 5, principal: true },
        { id: 'press-banca', bloque: 'C1', series: 4, reps: [5, 6], rirObjetivo: 2, incremento: 2.5, principal: true },
        { id: 'curl-femoral', bloque: 'C2', series: 4, reps: [8, 12], rirObjetivo: 2, incremento: 5 },
        { id: 'peso-muerto-rumano', bloque: 'D1', series: 3, reps: [6, 8], rirObjetivo: 3, incremento: 5, rirFijo: 3 },
        { id: 'face-pull', bloque: 'D2', series: 3, reps: [12, 15], rirObjetivo: 2, incremento: 2.5 },
      ],
    },
    {
      id: 'jueves',
      nombre: 'Jueves',
      lugar: 'Gimnasio · 07:00',
      foco: 'Potencia lateral, unilateral y traccion',
      ejercicios: [
        { id: 'salto-lateral-una-pierna', bloque: 'A', series: 3, reps: [3, 3], rirObjetivo: 0, incremento: 0, porLado: true },
        { id: 'bulgara', bloque: 'B', series: 3, reps: [8, 8], rirObjetivo: 3, incremento: 2, rirFijo: 3, porLado: true, descanso: 120 },
        { id: 'empuje-cadera', bloque: 'C1', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 5 },
        { id: 'jalon-pecho', bloque: 'C2', series: 4, reps: [8, 10], rirObjetivo: 2, incremento: 5 },
        { id: 'press-inclinado', bloque: 'D1', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 2 },
        { id: 'talones-sentado', bloque: 'D2', series: 3, reps: [12, 15], rirObjetivo: 2, incremento: 5 },
        { id: 'core-antiextension', bloque: 'E', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 0 },
      ],
    },
  ],
};

export function resolverEjercicio(plan: EjercicioPlan, catalogo: EjercicioCatalogo[]): Ejercicio {
  const c = catalogoPorId(plan.id, catalogo);
  // Un ejercicio propio borrado no debe romper la sesion: se muestra por su id.
  return { ...plan, nombre: c?.nombre ?? plan.id, tipo: c?.tipo ?? 'carga' };
}

export function resolverPrograma(def: ProgramaDef, catalogo: EjercicioCatalogo[] = BIBLIOTECA): Programa {
  return {
    ...def,
    sesiones: def.sesiones.map((s) => ({
      ...s,
      ejercicios: s.ejercicios.map((e) => resolverEjercicio(e, catalogo)),
    })),
  };
}

export const PROGRAMA: Programa = resolverPrograma(PROGRAMA_BASE);

export function sesionPorId(id: string, programa: Programa = PROGRAMA): SesionPlan | undefined {
  return programa.sesiones.find((s) => s.id === id);
}

export function ejercicioPorId(id: string, programa: Programa = PROGRAMA): Ejercicio | undefined {
  for (const s of programa.sesiones) {
    const e = s.ejercicios.find((x) => x.id === id);
    if (e) return e;
  }
  return undefined;
}

/**
 * Ejercicios de la sesion con los reemplazos de ese dia aplicados. El
 * reemplazo hereda la prescripcion (series, reps, RIR) del ejercicio original.
 */
export function ejerciciosDelDia(
  sesion: SesionPlan,
  reemplazos: Record<string, string> | undefined,
  catalogo: EjercicioCatalogo[],
): { ejercicio: Ejercicio; original?: Ejercicio }[] {
  return sesion.ejercicios.map((original) => {
    const nuevoId = reemplazos?.[original.id];
    if (!nuevoId || nuevoId === original.id) return { ejercicio: original };
    return { ejercicio: resolverEjercicio({ ...original, id: nuevoId }, catalogo), original };
  });
}

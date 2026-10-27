/**
 * Programa por defecto del mesociclo. La app parte de este archivo y el editor
 * guarda una copia modificada en el telefono; "Restaurar" vuelve a este.
 * Aqui solo va la prescripcion: que es cada ejercicio vive en biblioteca.json.
 */
import { BIBLIOTECA, catalogoPorId, type EjercicioCatalogo, type TipoEjercicio } from './biblioteca';
import type { ExtraDelDia } from '../db/db';

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
  /** Ausente en programas guardados antes del dia de movilidad. */
  movilidad?: number;
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

/** Donde cae el mesociclo en el historial, que usa semanas absolutas. */
export interface Mesociclo {
  /** Semanas que dura un mesociclo. Las fases se definen sobre estas. */
  semanas: number;
  /** Numero de mesociclo; sube al empezar uno nuevo. Ausente = 1. */
  mesociclo?: number;
  /** Semana absoluta en que empieza este mesociclo. Ausente = 1. */
  desde?: number;
}

interface ProgramaBase extends Mesociclo {
  nombre: string;
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
  mesociclo: 1,
  desde: 1,
  descansos: { principal: 180, carga: 90, tiempo: 60, salto: 90, movilidad: 0 },
  fases: [
    {
      nombre: 'Calibración',
      semanas: [1, 2],
      rirPrincipal: 3,
      nota: 'Principales a 3 RIR. Buscas tus cargas reales, no récords.',
    },
    {
      nombre: 'Carga',
      semanas: [3, 5],
      rirPrincipal: 2,
      nota: 'Principales a 2 RIR. Doble progresión activa.',
    },
    {
      nombre: 'Acumulación',
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
      nota: 'Misma carga, menos series, 4 RIR. Al final: batería de medición.',
    },
  ],
  sesiones: [
    {
      id: 'lunes',
      nombre: 'Lunes',
      lugar: 'Gimnasio · 07:00',
      foco: 'Potencia lateral, unilateral y cadena posterior',
      ejercicios: [
        { id: 'salto-lateral-una-pierna', bloque: 'A1', series: 3, reps: [3, 3], rirObjetivo: 0, incremento: 0, porLado: true, descanso: 120 },
        { id: 'salto-lateral-conos', bloque: 'A2', series: 3, reps: [8, 10], rirObjetivo: 0, incremento: 0, descanso: 90 },
        { id: 'bulgara', bloque: 'B', series: 3, reps: [8, 8], rirObjetivo: 3, incremento: 2, rirFijo: 3, porLado: true, descanso: 120 },
        { id: 'empuje-cadera', bloque: 'C1', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 5 },
        { id: 'press-inclinado', bloque: 'C2', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 2 },
        { id: 'talones-cajon-mancuernas', bloque: 'D1', series: 3, reps: [12, 15], rirObjetivo: 2, incremento: 2 },
        { id: 'core-antiextension', bloque: 'D2', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 0 },
      ],
    },
    {
      id: 'martes',
      nombre: 'Martes',
      lugar: 'Gimnasio · 07:00 · fútbol en la noche',
      foco: 'Tren superior, manguito rotador y salto vertical, piernas frescas para el fútbol',
      ejercicios: [
        { id: 'salto-vertical-detenido', bloque: 'A', series: 3, reps: [5, 5], rirObjetivo: 0, incremento: 0, descanso: 120 },
        { id: 'dominadas', bloque: 'B1', series: 4, reps: [3, 5], rirObjetivo: 2, incremento: 2.5, principal: true },
        { id: 'press-banca', bloque: 'B2', series: 4, reps: [5, 6], rirObjetivo: 2, incremento: 2.5, principal: true },
        { id: 'remo-pecho-apoyado', bloque: 'C1', series: 3, reps: [10, 12], rirObjetivo: 2, incremento: 2 },
        { id: 'press-hombro-maquina', bloque: 'C2', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 2.5 },
        { id: 'rotacion-externa-polea', bloque: 'D1', series: 3, reps: [12, 15], rirObjetivo: 2, incremento: 1, porLado: true },
        { id: 'plano-escapular-banda', bloque: 'D2', series: 2, reps: [10, 12], rirObjetivo: 2, incremento: 1, porLado: true },
        { id: 'plancha-lateral', bloque: 'D3', series: 3, reps: [25, 40], rirObjetivo: 0, incremento: 0, porLado: true },
      ],
    },
    {
      id: 'jueves',
      nombre: 'Jueves',
      lugar: 'Gimnasio · 07:00',
      foco: 'Fuerza de tren inferior, lejos del fútbol',
      ejercicios: [
        { id: 'salto-contramovimiento', bloque: 'A1', series: 3, reps: [4, 4], rirObjetivo: 0, incremento: 0, descanso: 120 },
        { id: 'salto-cajon', bloque: 'A2', series: 3, reps: [3, 3], rirObjetivo: 0, incremento: 0, descanso: 120 },
        { id: 'sentadilla-barra', bloque: 'B', series: 4, reps: [5, 6], rirObjetivo: 2, incremento: 5, principal: true },
        { id: 'sentadilla-hack', bloque: 'C1', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 5 },
        { id: 'curl-femoral', bloque: 'C2', series: 4, reps: [8, 12], rirObjetivo: 2, incremento: 5 },
        { id: 'peso-muerto-rumano', bloque: 'D1', series: 3, reps: [6, 8], rirObjetivo: 3, incremento: 5, rirFijo: 3 },
        { id: 'abductor-maquina', bloque: 'D2', series: 3, reps: [12, 15], rirObjetivo: 2, incremento: 5 },
      ],
    },
    {
      id: 'movilidad',
      nombre: 'Movilidad',
      lugar: 'Casa o gimnasio · colchoneta · miércoles o viernes',
      foco: 'Pies, tobillos, rodillas, cadera y manguito rotador',
      ejercicios: [
        { id: 'arco-corto', bloque: 'A1', series: 2, reps: [8, 8], rirObjetivo: 0, incremento: 0, porLado: true },
        { id: 'pulgar-pie', bloque: 'A2', series: 2, reps: [10, 10], rirObjetivo: 0, incremento: 0, porLado: true },
        { id: 'sentarse-sobre-dedos', bloque: 'A3', series: 2, reps: [30, 30], rirObjetivo: 0, incremento: 0, descanso: 0 },
        { id: 'rodilla-pared', bloque: 'B1', series: 2, reps: [10, 10], rirObjetivo: 0, incremento: 0, porLado: true },
        { id: 'tibial-pared', bloque: 'B2', series: 2, reps: [15, 20], rirObjetivo: 1, incremento: 0, descanso: 45 },
        { id: 'talones-una-pierna', bloque: 'B3', series: 2, reps: [12, 15], rirObjetivo: 1, incremento: 2, porLado: true, descanso: 45 },
        { id: 'aductor-rana', bloque: 'C1', series: 2, reps: [10, 10], rirObjetivo: 0, incremento: 0, descanso: 0 },
        { id: 'sentadilla-cosaca', bloque: 'C2', series: 2, reps: [6, 8], rirObjetivo: 2, incremento: 0, porLado: true, descanso: 45 },
        { id: 'copenhagen-rodilla', bloque: 'C3', series: 2, reps: [15, 20], rirObjetivo: 2, incremento: 0, porLado: true, descanso: 45 },
        { id: 'zancada-atg', bloque: 'D1', series: 2, reps: [8, 10], rirObjetivo: 2, incremento: 0, porLado: true, descanso: 45 },
        { id: 'equilibrio-una-pierna', bloque: 'D2', series: 2, reps: [30, 30], rirObjetivo: 0, incremento: 0, porLado: true, descanso: 0 },
        { id: 'rotacion-externa-90-banda', bloque: 'E1', series: 3, reps: [12, 15], rirObjetivo: 2, incremento: 1, porLado: true, descanso: 45 },
        { id: 'rotacion-externa-tumbado', bloque: 'E2', series: 2, reps: [12, 15], rirObjetivo: 2, incremento: 1, porLado: true, descanso: 45 },
        { id: 'serrato-pared', bloque: 'E3', series: 2, reps: [10, 10], rirObjetivo: 0, incremento: 0, descanso: 0 },
        { id: 'estiramiento-cruzado-hombro', bloque: 'E4', series: 2, reps: [30, 30], rirObjetivo: 0, incremento: 0, porLado: true, descanso: 0 },
        { id: 'pogos', bloque: 'F1', series: 3, reps: [15, 20], rirObjetivo: 0, incremento: 0, descanso: 60 },
      ],
    },
  ],
};

/**
 * Mesociclo 2, semanas 9 a 16. Sigue al primero sin que haya que tocar nada:
 * `programaDeFabrica` lo entrega cuando la semana en curso entra en su rango.
 * Cambia respecto del primero: la prensa pasa a ser el trabajo principal de
 * pantorrilla, entra un segundo salto reactivo el lunes y un lanzamiento de
 * balon el jueves, y las principales bajan de rango de repeticiones.
 */
export const PROGRAMA_MESO2: ProgramaDef = {
  nombre: 'Bajo los Tres Palos',
  semanas: 8,
  mesociclo: 2,
  desde: 9,
  descansos: { principal: 180, carga: 90, tiempo: 60, salto: 120, movilidad: 0 },
  fases: [
    {
      nombre: 'Carga',
      semanas: [1, 3],
      rirPrincipal: 2,
      nota: 'Principales a 2 RIR. Vienes de ocho semanas: empieza donde quedaste, no desde cero.',
    },
    {
      nombre: 'Intensidad',
      semanas: [4, 6],
      rirPrincipal: 1,
      seriesExtra: { salto: 1 },
      nota: 'Principales a 1 RIR y una serie extra de salto. Los saltos van frescos, antes de las pesas.',
    },
    {
      nombre: 'Pico',
      semanas: [7, 7],
      rirPrincipal: 1,
      nota: 'La semana más pesada del bloque. Si una serie se pone fea, cierra ahí.',
    },
    {
      nombre: 'Descarga y retest',
      semanas: [8, 8],
      rirTodos: 4,
      factorSeries: 0.6,
      seriesMinimas: 2,
      nota: 'Misma carga, menos series, 4 RIR. Al final: batería de medición y saltos.',
    },
  ],
  sesiones: [
    {
      id: 'lunes',
      nombre: 'Lunes',
      lugar: 'Gimnasio · 07:00',
      foco: 'Potencia lateral, unilateral y pantorrilla cargada',
      ejercicios: [
        { id: 'salto-lateral-una-pierna', bloque: 'A1', series: 3, reps: [3, 3], rirObjetivo: 0, incremento: 0, porLado: true, descanso: 120 },
        { id: 'rebote-lateral', bloque: 'A2', series: 3, reps: [6, 6], rirObjetivo: 0, incremento: 0, porLado: true, descanso: 90 },
        { id: 'bulgara', bloque: 'B', series: 3, reps: [6, 8], rirObjetivo: 3, incremento: 2, rirFijo: 3, porLado: true, descanso: 120 },
        { id: 'empuje-cadera', bloque: 'C1', series: 4, reps: [6, 8], rirObjetivo: 2, incremento: 5 },
        { id: 'press-inclinado', bloque: 'C2', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 2 },
        { id: 'talones-prensa', bloque: 'D1', series: 4, reps: [10, 12], rirObjetivo: 2, incremento: 4.5 },
        { id: 'core-antiextension', bloque: 'D2', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 0 },
      ],
    },
    {
      id: 'martes',
      nombre: 'Martes',
      lugar: 'Gimnasio · 07:00 · fútbol en la noche',
      foco: 'Tren superior, manguito rotador y salto vertical, piernas frescas para el fútbol',
      ejercicios: [
        { id: 'salto-vertical-detenido', bloque: 'A', series: 3, reps: [5, 5], rirObjetivo: 0, incremento: 0, descanso: 120 },
        { id: 'dominadas', bloque: 'B1', series: 4, reps: [4, 6], rirObjetivo: 2, incremento: 2.5, principal: true },
        { id: 'press-banca', bloque: 'B2', series: 4, reps: [4, 6], rirObjetivo: 2, incremento: 2.5, principal: true },
        { id: 'remo-pecho-apoyado', bloque: 'C1', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 2 },
        { id: 'press-hombro-maquina', bloque: 'C2', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 2.5 },
        { id: 'rotacion-externa-polea', bloque: 'D1', series: 3, reps: [12, 15], rirObjetivo: 2, incremento: 1, porLado: true },
        { id: 'plano-escapular-banda', bloque: 'D2', series: 2, reps: [10, 12], rirObjetivo: 2, incremento: 1, porLado: true },
        { id: 'plancha-lateral', bloque: 'D3', series: 3, reps: [30, 45], rirObjetivo: 0, incremento: 0, porLado: true },
      ],
    },
    {
      id: 'jueves',
      nombre: 'Jueves',
      lugar: 'Gimnasio · 07:00',
      foco: 'Fuerza de tren inferior y triple extensión, lejos del fútbol',
      ejercicios: [
        { id: 'salto-contramovimiento', bloque: 'A1', series: 3, reps: [4, 4], rirObjetivo: 0, incremento: 0, descanso: 120 },
        { id: 'lanzamiento-cuchara', bloque: 'A2', series: 3, reps: [3, 3], rirObjetivo: 0, incremento: 0, descanso: 90 },
        { id: 'sentadilla-barra', bloque: 'B', series: 4, reps: [4, 6], rirObjetivo: 2, incremento: 5, principal: true },
        { id: 'sentadilla-hack', bloque: 'C1', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 5 },
        { id: 'curl-femoral-sentado', bloque: 'C2', series: 3, reps: [8, 12], rirObjetivo: 2, incremento: 5 },
        { id: 'peso-muerto-rumano', bloque: 'D1', series: 3, reps: [6, 8], rirObjetivo: 3, incremento: 5, rirFijo: 3 },
        { id: 'abductor-maquina', bloque: 'D2', series: 3, reps: [12, 15], rirObjetivo: 2, incremento: 5 },
      ],
    },
    {
      id: 'movilidad',
      nombre: 'Movilidad',
      lugar: 'Casa o gimnasio · colchoneta · miércoles o viernes',
      foco: 'Pies, tobillos, rodillas, cadera y manguito rotador',
      ejercicios: [
        { id: 'arco-corto', bloque: 'A1', series: 2, reps: [8, 8], rirObjetivo: 0, incremento: 0, porLado: true },
        { id: 'pulgar-pie', bloque: 'A2', series: 2, reps: [10, 10], rirObjetivo: 0, incremento: 0, porLado: true },
        { id: 'sentarse-sobre-dedos', bloque: 'A3', series: 2, reps: [30, 30], rirObjetivo: 0, incremento: 0, descanso: 0 },
        { id: 'rodilla-pared', bloque: 'B1', series: 2, reps: [10, 10], rirObjetivo: 0, incremento: 0, porLado: true },
        { id: 'tibial-pared', bloque: 'B2', series: 2, reps: [15, 20], rirObjetivo: 1, incremento: 0, descanso: 45 },
        { id: 'talones-una-pierna', bloque: 'B3', series: 2, reps: [12, 15], rirObjetivo: 1, incremento: 2, porLado: true, descanso: 45 },
        { id: 'aductor-rana', bloque: 'C1', series: 2, reps: [10, 10], rirObjetivo: 0, incremento: 0, descanso: 0 },
        { id: 'sentadilla-cosaca', bloque: 'C2', series: 2, reps: [6, 8], rirObjetivo: 2, incremento: 0, porLado: true, descanso: 45 },
        { id: 'copenhagen-rodilla', bloque: 'C3', series: 2, reps: [20, 25], rirObjetivo: 2, incremento: 0, porLado: true, descanso: 45 },
        { id: 'zancada-atg', bloque: 'D1', series: 2, reps: [8, 10], rirObjetivo: 2, incremento: 0, porLado: true, descanso: 45 },
        { id: 'equilibrio-bosu', bloque: 'D2', series: 2, reps: [30, 30], rirObjetivo: 0, incremento: 0, porLado: true, descanso: 0 },
        { id: 'rotacion-externa-90-banda', bloque: 'E1', series: 3, reps: [12, 15], rirObjetivo: 2, incremento: 1, porLado: true, descanso: 45 },
        { id: 'rotacion-externa-tumbado', bloque: 'E2', series: 2, reps: [12, 15], rirObjetivo: 2, incremento: 1, porLado: true, descanso: 45 },
        { id: 'serrato-pared', bloque: 'E3', series: 2, reps: [10, 10], rirObjetivo: 0, incremento: 0, descanso: 0 },
        { id: 'estiramiento-cruzado-hombro', bloque: 'E4', series: 2, reps: [30, 30], rirObjetivo: 0, incremento: 0, porLado: true, descanso: 0 },
        { id: 'pogos', bloque: 'F1', series: 3, reps: [20, 25], rirObjetivo: 0, incremento: 0, descanso: 60 },
      ],
    },
  ],
};

/** El bloque de fabrica que le toca a esa semana absoluta. */
export function programaDeFabrica(semana: number): ProgramaDef {
  const desde = PROGRAMA_MESO2.desde ?? 9;
  return Number.isFinite(semana) && semana >= desde ? PROGRAMA_MESO2 : PROGRAMA_BASE;
}

/**
 * Con que arranca un telefono que estrena la app: sin sesiones, para que cada
 * uno arme las suyas. El plan de arquero sigue en PROGRAMA_BASE y se carga
 * desde Programa con "Restaurar programa de fabrica".
 */
export const PROGRAMA_VACIO: ProgramaDef = {
  nombre: 'Mi entrenamiento',
  semanas: 8,
  mesociclo: 1,
  desde: 1,
  descansos: { principal: 180, carga: 90, tiempo: 60, salto: 90, movilidad: 0 },
  fases: [
    {
      nombre: 'Carga',
      semanas: [1, 7],
      rirPrincipal: 2,
      nota: 'Sube el peso cuando llegues al tope de repeticiones con el RIR objetivo.',
    },
    {
      nombre: 'Descarga',
      semanas: [8, 8],
      rirTodos: 4,
      factorSeries: 0.6,
      seriesMinimas: 2,
      nota: 'Misma carga, menos series, 4 RIR. Semana para llegar fresco al siguiente bloque.',
    },
  ],
  sesiones: [],
};

/** Siguiente letra de bloque: A, B, C... segun cuantos bloques distintos hay. */
export function siguienteBloque(ejercicios: EjercicioPlan[]): string {
  const letras = new Set(ejercicios.map((e) => e.bloque.charAt(0).toUpperCase()));
  let codigo = 'A'.charCodeAt(0);
  while (letras.has(String.fromCharCode(codigo)) && codigo < 'Z'.charCodeAt(0)) codigo += 1;
  return String.fromCharCode(codigo);
}

export function planPorDefecto(e: EjercicioCatalogo, bloque: string): EjercicioPlan {
  if (e.tipo === 'tiempo') return { id: e.id, bloque, series: 3, reps: [20, 40], rirObjetivo: 0, incremento: 0 };
  if (e.tipo === 'salto') return { id: e.id, bloque, series: 3, reps: [3, 5], rirObjetivo: 0, incremento: 0 };
  if (e.tipo === 'movilidad') return { id: e.id, bloque, series: 2, reps: [8, 10], rirObjetivo: 0, incremento: 0 };
  const barra = e.equipo.includes('barra') || e.equipo.includes('trap-bar');
  return { id: e.id, bloque, series: 3, reps: [8, 10], rirObjetivo: 2, incremento: barra ? 2.5 : 2 };
}

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
export interface FilaDelDia {
  ejercicio: Ejercicio;
  /** Si hoy se reemplazo, el ejercicio del programa. */
  original?: Ejercicio;
  /** Si se agrego hoy, con que intencion. */
  extra?: ExtraDelDia;
}

export function ejerciciosDelDia(
  sesion: SesionPlan,
  reemplazos: Record<string, string> | undefined,
  catalogo: EjercicioCatalogo[],
  extras: ExtraDelDia[] = [],
): FilaDelDia[] {
  const delPrograma: FilaDelDia[] = sesion.ejercicios.map((original) => {
    const nuevoId = reemplazos?.[original.id];
    if (!nuevoId || nuevoId === original.id) return { ejercicio: original };
    return { ejercicio: resolverEjercicio({ ...original, id: nuevoId }, catalogo), original };
  });

  // Los agregados van al final, con la prescripcion por defecto de su tipo.
  const planes = delPrograma.map((f) => f.ejercicio);
  const agregados: FilaDelDia[] = [];
  for (const extra of extras) {
    const info = catalogoPorId(extra.id, catalogo);
    if (!info) continue;
    const bloque = siguienteBloque([...planes, ...agregados.map((f) => f.ejercicio)]);
    agregados.push({ ejercicio: resolverEjercicio(planPorDefecto(info, bloque), catalogo), extra });
  }
  return [...delPrograma, ...agregados];
}

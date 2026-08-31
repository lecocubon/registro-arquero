/**
 * Definicion del mesociclo. Editar SOLO este archivo para cambiar el programa:
 * ningun componente conoce ejercicios ni semanas.
 */

export type TipoEjercicio = 'carga' | 'tiempo' | 'salto';

export interface Ejercicio {
  /** Estable: se usa como clave en IndexedDB. No renombrar sin migrar datos. */
  id: string;
  nombre: string;
  bloque: string;
  /** Series base; la fase puede ajustarlas. */
  series: number;
  /** Rango [min, max]. En tipo "tiempo" son segundos; en "salto" es informativo. */
  reps: [number, number];
  rirObjetivo: number;
  /** Incremento de carga sugerido, en kg. */
  incremento: number;
  tipo: TipoEjercicio;
  /** Sigue el RIR de la fase en vez del propio. */
  principal?: boolean;
  /** Ignora la fase y mantiene siempre este RIR. */
  rirFijo?: number;
  porLado?: boolean;
}

export interface SesionPlan {
  id: string;
  nombre: string;
  lugar: string;
  foco: string;
  ejercicios: Ejercicio[];
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

export interface Programa {
  nombre: string;
  semanas: number;
  sesiones: SesionPlan[];
  fases: Fase[];
}

export const PROGRAMA: Programa = {
  nombre: 'Bajo los Tres Palos',
  semanas: 8,
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
        { id: 'salto-vertical-detenido', bloque: 'A', nombre: 'Salto vertical con aterrizaje detenido', series: 3, reps: [5, 5], rirObjetivo: 0, incremento: 0, tipo: 'salto' },
        { id: 'dominadas', bloque: 'B1', nombre: 'Dominadas', series: 4, reps: [2, 4], rirObjetivo: 2, incremento: 2.5, tipo: 'carga', principal: true },
        { id: 'talones-una-pierna', bloque: 'B2', nombre: 'Elevacion de talones a una pierna', series: 4, reps: [10, 15], rirObjetivo: 2, incremento: 2, tipo: 'carga', porLado: true },
        { id: 'press-mancuernas', bloque: 'C1', nombre: 'Press con mancuernas', series: 4, reps: [6, 8], rirObjetivo: 2, incremento: 2, tipo: 'carga' },
        { id: 'remo-unilateral', bloque: 'C2', nombre: 'Remo unilateral con mancuerna', series: 4, reps: [8, 10], rirObjetivo: 2, incremento: 2, tipo: 'carga', porLado: true },
        { id: 'press-hombro-pie', bloque: 'D1', nombre: 'Press de hombro de pie', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 2, tipo: 'carga' },
        { id: 'plancha-lateral', bloque: 'D2', nombre: 'Plancha lateral', series: 3, reps: [25, 40], rirObjetivo: 0, incremento: 0, tipo: 'tiempo', porLado: true },
      ],
    },
    {
      id: 'martes',
      nombre: 'Martes',
      lugar: 'Gimnasio · 07:00',
      foco: 'Fuerza de tren inferior',
      ejercicios: [
        { id: 'salto-contramovimiento', bloque: 'A', nombre: 'Salto vertical con contramovimiento', series: 3, reps: [4, 4], rirObjetivo: 0, incremento: 0, tipo: 'salto' },
        { id: 'sentadilla-barra', bloque: 'B', nombre: 'Sentadilla con barra', series: 4, reps: [5, 6], rirObjetivo: 2, incremento: 5, tipo: 'carga', principal: true },
        { id: 'press-banca', bloque: 'C1', nombre: 'Press banca con barra', series: 4, reps: [5, 6], rirObjetivo: 2, incremento: 2.5, tipo: 'carga', principal: true },
        { id: 'curl-femoral', bloque: 'C2', nombre: 'Curl femoral tumbado', series: 4, reps: [8, 12], rirObjetivo: 2, incremento: 5, tipo: 'carga' },
        { id: 'peso-muerto-rumano', bloque: 'D1', nombre: 'Peso muerto rumano', series: 3, reps: [6, 8], rirObjetivo: 3, incremento: 5, tipo: 'carga', rirFijo: 3 },
        { id: 'face-pull', bloque: 'D2', nombre: 'Face pull o remo alto', series: 3, reps: [12, 15], rirObjetivo: 2, incremento: 2.5, tipo: 'carga' },
      ],
    },
    {
      id: 'jueves',
      nombre: 'Jueves',
      lugar: 'Gimnasio · 07:00',
      foco: 'Potencia lateral, unilateral y traccion',
      ejercicios: [
        { id: 'salto-lateral-una-pierna', bloque: 'A', nombre: 'Salto lateral a una pierna', series: 3, reps: [3, 3], rirObjetivo: 0, incremento: 0, tipo: 'salto', porLado: true },
        { id: 'bulgara', bloque: 'B', nombre: 'Sentadilla bulgara con mancuernas', series: 3, reps: [8, 8], rirObjetivo: 3, incremento: 2, tipo: 'carga', rirFijo: 3, porLado: true },
        { id: 'empuje-cadera', bloque: 'C1', nombre: 'Empuje de cadera con barra', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 5, tipo: 'carga' },
        { id: 'jalon-pecho', bloque: 'C2', nombre: 'Jalon al pecho', series: 4, reps: [8, 10], rirObjetivo: 2, incremento: 5, tipo: 'carga' },
        { id: 'press-inclinado', bloque: 'D1', nombre: 'Press inclinado con mancuernas', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 2, tipo: 'carga' },
        { id: 'talones-sentado', bloque: 'D2', nombre: 'Elevacion de talones sentado', series: 3, reps: [12, 15], rirObjetivo: 2, incremento: 5, tipo: 'carga' },
        { id: 'core-antiextension', bloque: 'E', nombre: 'Dead bug o rueda abdominal', series: 3, reps: [8, 10], rirObjetivo: 2, incremento: 0, tipo: 'carga' },
      ],
    },
  ],
};

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

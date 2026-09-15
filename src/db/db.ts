import Dexie, { type Table } from 'dexie';
import type { EjercicioCatalogo } from '../data/biblioteca';
import type { ProgramaDef } from '../data/programa';

/** Los calentamientos no cuentan para progresion, e1RM ni volumen. */
export type TipoSerie = 'normal' | 'calentamiento';

export interface RegistroSerie {
  /** `${semana}|${sesionId}|${ejercicioId}|${serie}`; calentamientos usan `c${serie}`. */
  id: string;
  semana: number;
  sesionId: string;
  ejercicioId: string;
  serie: number;
  /** Ausente en registros anteriores a los calentamientos: equivale a 'normal'. */
  tipo?: TipoSerie;
  kg: number | null;
  reps: number | null;
  rir: number | null;
  segundos: number | null;
  hecha: boolean;
  actualizado: number;
}

export interface RegistroSesion {
  /** `${semana}|${sesionId}` */
  id: string;
  semana: number;
  sesionId: string;
  fecha: string;
  nota: string;
  /** Epoch ms de la primera serie tocada. */
  inicio?: number;
  /** Solo ese dia: id del ejercicio del programa -> id del que lo reemplaza. */
  reemplazos?: Record<string, string>;
  /** Epoch ms de la ultima vez que se guardo en Health Connect. */
  guardadaEnSalud?: number;
  actualizado: number;
}

export interface Medicion {
  id?: number;
  fecha: string;
  semana: number;
  saltoVertical: number | null;
  lateralIzq: number | null;
  lateralDer: number | null;
  horizontalIzq: number | null;
  horizontalDer: number | null;
  peso: number | null;
  cintura: number | null;
  /** % de grasa corporal. Ausente en mediciones antiguas. */
  grasa?: number | null;
  /** 'reloj' si vino de Health Connect. Ausente = anotada a mano. */
  origen?: 'manual' | 'reloj';
}

export interface Ajuste {
  clave: string;
  valor: string | number;
}

export interface ProgramaGuardado {
  /** Por ahora solo existe 'activo'. */
  id: string;
  definicion: ProgramaDef;
  actualizado: number;
}

export interface FotoEjercicio {
  ejercicioId: string;
  imagen: Blob;
  actualizado: number;
}

export class ArqueroDB extends Dexie {
  series!: Table<RegistroSerie, string>;
  sesiones!: Table<RegistroSesion, string>;
  mediciones!: Table<Medicion, number>;
  ajustes!: Table<Ajuste, string>;
  programas!: Table<ProgramaGuardado, string>;
  ejerciciosPropios!: Table<EjercicioCatalogo, string>;
  fotos!: Table<FotoEjercicio, string>;

  constructor(nombre = 'registro-arquero') {
    super(nombre);
    this.version(1).stores({
      series: 'id, semana, sesionId, ejercicioId, [semana+sesionId], [ejercicioId+semana]',
      sesiones: 'id, semana, sesionId',
      mediciones: '++id, fecha, semana',
      ajustes: 'clave',
    });
    this.version(2).stores({
      programas: 'id',
      ejerciciosPropios: 'id',
      fotos: 'ejercicioId',
    });
  }
}

export const db = new ArqueroDB();

export function idSerie(
  semana: number,
  sesionId: string,
  ejercicioId: string,
  serie: number,
  tipo: TipoSerie = 'normal',
): string {
  const n = tipo === 'calentamiento' ? `c${serie}` : `${serie}`;
  return `${semana}|${sesionId}|${ejercicioId}|${n}`;
}

export function idSesion(semana: number, sesionId: string): string {
  return `${semana}|${sesionId}`;
}

export function hoy(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function serieVacia(
  semana: number,
  sesionId: string,
  ejercicioId: string,
  serie: number,
  tipo: TipoSerie = 'normal',
): RegistroSerie {
  return {
    id: idSerie(semana, sesionId, ejercicioId, serie, tipo),
    semana,
    sesionId,
    ejercicioId,
    serie,
    tipo,
    kg: null,
    reps: null,
    rir: null,
    segundos: null,
    hecha: false,
    actualizado: 0,
  };
}

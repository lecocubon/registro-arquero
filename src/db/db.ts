import Dexie, { type Table } from 'dexie';

export interface RegistroSerie {
  /** `${semana}|${sesionId}|${ejercicioId}|${serie}` */
  id: string;
  semana: number;
  sesionId: string;
  ejercicioId: string;
  serie: number;
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
}

export interface Ajuste {
  clave: string;
  valor: string | number;
}

export class ArqueroDB extends Dexie {
  series!: Table<RegistroSerie, string>;
  sesiones!: Table<RegistroSesion, string>;
  mediciones!: Table<Medicion, number>;
  ajustes!: Table<Ajuste, string>;

  constructor(nombre = 'registro-arquero') {
    super(nombre);
    this.version(1).stores({
      series: 'id, semana, sesionId, ejercicioId, [semana+sesionId], [ejercicioId+semana]',
      sesiones: 'id, semana, sesionId',
      mediciones: '++id, fecha, semana',
      ajustes: 'clave',
    });
  }
}

export const db = new ArqueroDB();

export function idSerie(semana: number, sesionId: string, ejercicioId: string, serie: number): string {
  return `${semana}|${sesionId}|${ejercicioId}|${serie}`;
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
): RegistroSerie {
  return {
    id: idSerie(semana, sesionId, ejercicioId, serie),
    semana,
    sesionId,
    ejercicioId,
    serie,
    kg: null,
    reps: null,
    rir: null,
    segundos: null,
    hecha: false,
    actualizado: 0,
  };
}

export function tieneDatos(r: RegistroSerie | undefined): boolean {
  if (!r) return false;
  return (r.kg ?? 0) > 0 || (r.reps ?? 0) > 0 || (r.segundos ?? 0) > 0 || r.hecha;
}

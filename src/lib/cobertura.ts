import { catalogoPorId, type EjercicioCatalogo, type Equipo, type Musculo } from '../data/biblioteca';
import type { ProgramaDef } from '../data/programa';
import { PESO_SECUNDARIO } from './musculos';
import { CANDIDATOS, sePuedeHacer, type Patron } from './planificador';

/** Lo que se sabe de quien entrena, si respondio el cuestionario. */
export interface FiltroSugerencias {
  equipo?: ReadonlySet<Equipo>;
  /** Ids a no proponer por sus molestias. */
  evitar?: ReadonlySet<string>;
}

/**
 * Revisa un programa armado a mano: cuantas series por semana recibe cada
 * grupo grande y que le falta, con ejercicios sugeridos para cubrirlo. Cuenta
 * las series base del programa (1 al musculo principal, 0,5 a cada
 * secundario); saltos y movilidad no suman.
 */

export type Grupo =
  | 'pecho'
  | 'espalda'
  | 'hombros'
  | 'biceps'
  | 'triceps'
  | 'cuadriceps'
  | 'isquiotibiales'
  | 'gluteos'
  | 'pantorrillas'
  | 'abdominales';

interface DefGrupo {
  id: Grupo;
  nombre: string;
  musculos: Musculo[];
  /** Series semanales por debajo de las cuales se avisa. Es un piso, no un ideal. */
  minimo: number;
  patrones: Patron[];
}

const GRUPOS: DefGrupo[] = [
  { id: 'pecho', nombre: 'Pecho', musculos: ['pecho'], minimo: 6, patrones: ['empujeH', 'empujeH2'] },
  { id: 'espalda', nombre: 'Espalda', musculos: ['dorsales', 'espalda-media'], minimo: 8, patrones: ['tironV', 'tironH', 'tironH2'] },
  { id: 'hombros', nombre: 'Hombros', musculos: ['hombros'], minimo: 4, patrones: ['empujeV', 'hombroLat', 'hombroPost'] },
  { id: 'cuadriceps', nombre: 'Cuádriceps', musculos: ['cuadriceps'], minimo: 6, patrones: ['rodilla', 'rodilla2', 'unilateral'] },
  { id: 'isquiotibiales', nombre: 'Isquiotibiales', musculos: ['isquiotibiales'], minimo: 4, patrones: ['isquio', 'bisagra'] },
  { id: 'gluteos', nombre: 'Glúteos', musculos: ['gluteos'], minimo: 4, patrones: ['gluteo', 'bisagra'] },
  { id: 'biceps', nombre: 'Bíceps', musculos: ['biceps'], minimo: 3, patrones: ['biceps'] },
  { id: 'triceps', nombre: 'Tríceps', musculos: ['triceps'], minimo: 3, patrones: ['triceps'] },
  { id: 'pantorrillas', nombre: 'Pantorrillas', musculos: ['pantorrillas'], minimo: 3, patrones: ['pantorrilla'] },
  { id: 'abdominales', nombre: 'Core', musculos: ['abdominales'], minimo: 3, patrones: ['coreA', 'coreB'] },
];

export interface Falta {
  grupo: Grupo;
  nombre: string;
  series: number;
  minimo: number;
  sugeridos: EjercicioCatalogo[];
}

export interface Cobertura {
  /** Series semanales por grupo, para mostrar el reparto completo. */
  series: Record<Grupo, number>;
  faltas: Falta[];
  empuje: number;
  tiron: number;
  /** Texto si el empuje le gana por mucho al tiron. */
  desbalance: string | null;
}

const EMPUJE = new Set([...CANDIDATOS.empujeH, ...CANDIDATOS.empujeH2, ...CANDIDATOS.empujeV, ...CANDIDATOS.triceps]);
const TIRON = new Set([...CANDIDATOS.tironV, ...CANDIDATOS.tironH, ...CANDIDATOS.tironH2, ...CANDIDATOS.hombroPost, ...CANDIDATOS.biceps]);

function ladoDe(e: EjercicioCatalogo): 'empuje' | 'tiron' | null {
  if (EMPUJE.has(e.id)) return 'empuje';
  if (TIRON.has(e.id)) return 'tiron';
  if (e.musculo === 'pecho' || e.musculo === 'triceps') return 'empuje';
  if (e.musculo === 'dorsales' || e.musculo === 'espalda-media' || e.musculo === 'biceps') return 'tiron';
  return null;
}

/** Ejercicios para cubrir un grupo: primero los que usa el planificador, despues el resto de la biblioteca. */
export function sugerirPara(
  grupo: Grupo,
  catalogo: EjercicioCatalogo[],
  excluir: ReadonlySet<string>,
  { equipo, evitar }: FiltroSugerencias = {},
  cuantos = 3,
): EjercicioCatalogo[] {
  const def = GRUPOS.find((g) => g.id === grupo);
  if (!def) return [];
  const sirve = (e: EjercicioCatalogo | undefined): e is EjercicioCatalogo =>
    e !== undefined &&
    !excluir.has(e.id) &&
    !evitar?.has(e.id) &&
    e.tipo !== 'salto' &&
    e.tipo !== 'movilidad' &&
    (!equipo || sePuedeHacer(e, equipo));
  const preferidos = [...new Set(def.patrones.flatMap((p) => CANDIDATOS[p]))].map((id) => catalogoPorId(id, catalogo)).filter(sirve);
  const resto = catalogo
    .filter((e) => def.musculos.includes(e.musculo) && !preferidos.includes(e))
    .filter(sirve)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  // Los preferidos van primero solo si son del grupo: una bisagra cuenta para glúteo e isquio.
  const delGrupo = preferidos.filter((e) => def.musculos.includes(e.musculo) || e.secundarios.some((m) => def.musculos.includes(m)));
  return [...delGrupo, ...resto].slice(0, cuantos);
}

export function revisarCobertura(def: ProgramaDef, catalogo: EjercicioCatalogo[], filtro: FiltroSugerencias = {}): Cobertura {
  const series = Object.fromEntries(GRUPOS.map((g) => [g.id, 0])) as Record<Grupo, number>;
  let empuje = 0;
  let tiron = 0;
  const enPrograma = new Set<string>();

  for (const s of def.sesiones) {
    for (const plan of s.ejercicios) {
      enPrograma.add(plan.id);
      const e = catalogoPorId(plan.id, catalogo);
      if (!e || e.tipo === 'salto' || e.tipo === 'movilidad') continue;
      for (const g of GRUPOS) {
        if (g.musculos.includes(e.musculo)) series[g.id] += plan.series;
        else if (e.secundarios.some((m) => g.musculos.includes(m))) series[g.id] += plan.series * PESO_SECUNDARIO;
      }
      const lado = ladoDe(e);
      if (lado === 'empuje') empuje += plan.series;
      if (lado === 'tiron') tiron += plan.series;
    }
  }

  const faltas: Falta[] = enPrograma.size
    ? GRUPOS.filter((g) => series[g.id] < g.minimo).map((g) => ({
        grupo: g.id,
        nombre: g.nombre,
        series: series[g.id],
        minimo: g.minimo,
        sugeridos: sugerirPara(g.id, catalogo, enPrograma, filtro),
      }))
    : [];

  const desbalance =
    empuje >= 6 && empuje > tiron * 1.5
      ? `Haces ${empuje} series de empuje y ${tiron} de tirón a la semana. Para cuidar los hombros conviene que el tirón iguale al empuje: suma un remo o un jalón.`
      : null;

  return { series, faltas, empuje, tiron, desbalance };
}

/** "0", "1,5", "6": medias series cuando cuentan como secundario. */
export function formatoSeries(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

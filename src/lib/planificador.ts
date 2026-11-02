import { catalogoPorId, type EjercicioCatalogo, type Equipo } from '../data/biblioteca';
import type { DescansosPorDefecto, EjercicioPlan, Fase, ProgramaDef, SesionDef } from '../data/programa';

/**
 * Arma un programa a partir de las respuestas del cuestionario de inicio. Es
 * puro: recibe respuestas y catalogo y devuelve la definicion, que la pantalla
 * muestra antes de guardar. Cada sesion sale de una plantilla de patrones de
 * movimiento; cada patron tiene candidatos en orden de preferencia y se queda
 * con el primero que se puede hacer con el equipo marcado.
 */

export type Objetivo = 'fuerza' | 'musculo' | 'grasa' | 'deporte' | 'salud';
export type Experiencia = 'nuevo' | 'intermedio' | 'avanzado';
export type Lugar = 'gimnasio' | 'gimnasio-basico' | 'casa' | 'sin-equipo';
export type Molestia = 'hombro' | 'rodilla' | 'lumbar' | 'muneca';

export interface Respuestas {
  objetivo: Objetivo;
  dias: number;
  minutos: number;
  lugar: Lugar;
  equipo: Equipo[];
  experiencia: Experiencia;
  molestias: Molestia[];
}

export const OBJETIVOS: { id: Objetivo; nombre: string; detalle: string }[] = [
  { id: 'fuerza', nombre: 'Ganar fuerza', detalle: 'Levantar más en los básicos: pocas repeticiones, descansos largos.' },
  { id: 'musculo', nombre: 'Ganar músculo', detalle: 'Más volumen y repeticiones medias, cerca del fallo.' },
  { id: 'grasa', nombre: 'Bajar grasa', detalle: 'Mantener el músculo mientras comes menos: sesiones densas, descansos cortos.' },
  { id: 'deporte', nombre: 'Rendir en mi deporte', detalle: 'Fuerza y saltos para correr, saltar y cambiar de dirección.' },
  { id: 'salud', nombre: 'Salud o volver a entrenar', detalle: 'Retomar con calma, lejos del fallo, cuidando articulaciones.' },
];

export const EXPERIENCIAS: { id: Experiencia; nombre: string; detalle: string }[] = [
  { id: 'nuevo', nombre: 'Estoy empezando', detalle: 'Menos de 6 meses entrenando con pesas, o mucho tiempo parado.' },
  { id: 'intermedio', nombre: 'Algo de experiencia', detalle: 'Entre 6 meses y 2 años: conozco los ejercicios básicos.' },
  { id: 'avanzado', nombre: 'Varios años', detalle: 'Más de 2 años constante; sé cuánto me queda en cada serie.' },
];

const EQUIPO_GIMNASIO: Equipo[] = [
  'barra', 'mancuernas', 'kettlebell', 'maquina', 'polea', 'bandas', 'barra-z', 'barra-dominadas', 'paralelas', 'banco', 'rack', 'cajon', 'balon-medicinal',
];

export const LUGARES: { id: Lugar; nombre: string; detalle: string; equipo: Equipo[] }[] = [
  { id: 'gimnasio', nombre: 'Gimnasio completo', detalle: 'Máquinas, poleas, barras y mancuernas.', equipo: EQUIPO_GIMNASIO },
  {
    id: 'gimnasio-basico',
    nombre: 'Gimnasio chico',
    detalle: 'Barra, mancuernas y banco; pocas máquinas.',
    equipo: ['barra', 'mancuernas', 'banco', 'rack', 'barra-dominadas'],
  },
  { id: 'casa', nombre: 'Casa con algo de equipo', detalle: 'Mancuernas o kettlebell, bandas.', equipo: ['mancuernas', 'bandas'] },
  { id: 'sin-equipo', nombre: 'Sin equipo', detalle: 'Solo el cuerpo y lo que haya en casa.', equipo: [] },
];

export const MOLESTIAS: { id: Molestia; nombre: string }[] = [
  { id: 'hombro', nombre: 'Hombro' },
  { id: 'rodilla', nombre: 'Rodilla' },
  { id: 'lumbar', nombre: 'Espalda baja' },
  { id: 'muneca', nombre: 'Muñeca o codo' },
];

export const DIAS_POSIBLES = [2, 3, 4, 5] as const;
export const MINUTOS_POSIBLES = [45, 60, 75] as const;

export const RESPUESTAS_INICIALES: Respuestas = {
  objetivo: 'musculo',
  dias: 3,
  minutos: 60,
  lugar: 'gimnasio',
  equipo: EQUIPO_GIMNASIO,
  experiencia: 'intermedio',
  molestias: [],
};

// ---------------------------------------------------------------- patrones

type Rol = 'principal' | 'basico' | 'accesorio' | 'aislado' | 'core' | 'salto' | 'manguito' | 'condicion';

type Patron =
  | 'rodilla'
  | 'rodilla2'
  | 'unilateral'
  | 'bisagra'
  | 'gluteo'
  | 'isquio'
  | 'pantorrilla'
  | 'empujeH'
  | 'empujeH2'
  | 'empujeV'
  | 'tironV'
  | 'tironH'
  | 'tironH2'
  | 'hombroLat'
  | 'hombroPost'
  | 'manguito'
  | 'biceps'
  | 'triceps'
  | 'coreA'
  | 'coreB'
  | 'saltoV'
  | 'saltoH'
  | 'condicion';

/** Candidatos por patron, del preferido al de reserva. Los ultimos sirven sin equipo. */
export const CANDIDATOS: Record<Patron, string[]> = {
  rodilla: ['sentadilla-barra', 'sentadilla-hack', 'prensa', 'sentadilla-smith', 'sentadilla-goblet', 'sentadilla-mancuernas', 'sentadilla-peso-corporal'],
  rodilla2: ['prensa', 'sentadilla-hack', 'sentadilla-goblet', 'zancadas-mancuernas', 'sentadilla-mancuernas', 'zancada-atg'],
  unilateral: ['bulgara', 'split-squat-smith', 'zancada-atras', 'subida-cajon', 'zancadas-mancuernas', 'zancada-atg'],
  bisagra: ['peso-muerto-rumano', 'peso-muerto-trap-bar', 'peso-muerto-piernas-rectas', 'peso-muerto-una-pierna', 'pull-through', 'puente-gluteo-una-pierna'],
  gluteo: ['empuje-cadera-maquina', 'empuje-cadera', 'puente-gluteo', 'puente-banda', 'puente-gluteo-una-pierna'],
  isquio: ['curl-femoral-sentado', 'curl-femoral', 'curl-femoral-de-pie', 'peso-muerto-una-pierna', 'puente-gluteo-una-pierna'],
  pantorrilla: ['talones-de-pie', 'talones-prensa', 'talones-sentado', 'talones-una-pierna', 'talones-banda'],
  empujeH: ['press-banca', 'press-mancuernas', 'press-pecho-maquina', 'press-maquina-palanca', 'press-suelo-mancuernas', 'flexiones'],
  empujeH2: ['press-inclinado', 'press-inclinado-maquina', 'cruce-poleas', 'press-banca-inclinado-barra', 'press-pecho-polea', 'flexiones-abiertas'],
  empujeV: ['press-hombro-maquina', 'press-hombro-mancuernas-sentado', 'press-militar-barra', 'press-hombro-pie', 'press-kettlebell-militar', 'flexiones-abiertas'],
  tironV: ['dominadas', 'jalon-pecho', 'dominadas-asistidas', 'jalon-agarre-cerrado', 'remo-maquina-alto'],
  tironH: ['remo-pecho-apoyado', 'remo-polea-sentado', 'remo-maquina-palanca', 'remo-unilateral', 'remo-mancuernas', 'remo-kettlebell', 'remo-polea-de-pie'],
  tironH2: ['remo-polea-unilateral', 'remo-unilateral', 'remo-polea-sentado', 'remo-mancuernas', 'separacion-banda'],
  hombroLat: ['elevaciones-laterales-polea', 'elevaciones-laterales', 'elevacion-lateral-inclinado'],
  hombroPost: ['face-pull', 'pajaros-polea', 'pec-deck-inverso', 'pajaros', 'separacion-banda'],
  manguito: ['rotacion-externa-polea', 'rotacion-externa-banda', 'rotacion-externa-tumbado'],
  biceps: ['curl-mancuernas', 'curl-polea', 'curl-barra-z', 'curl-martillo', 'curl-martillo-cuerda'],
  triceps: ['extension-triceps-polea', 'extension-triceps-mancuerna', 'press-cerrado-mancuernas', 'fondos-maquina', 'fondos-banco'],
  coreA: ['core-antiextension', 'plancha', 'crunch-inverso'],
  coreB: ['plancha-lateral', 'pallof', 'crunch-polea', 'navaja-lateral'],
  saltoV: ['salto-contramovimiento', 'salto-cajon', 'salto-vertical-detenido'],
  saltoH: ['salto-largo', 'salto-lateral-una-pierna', 'rebote-lateral'],
  condicion: ['swing-kettlebell', 'paseo-granjero', 'thruster-kettlebell', 'escaladores'],
};

/** Piden tecnica: a quien empieza se le dan solo si no hay otra opcion. */
const EXIGENTES = new Set(['sentadilla-barra', 'dominadas', 'press-militar-barra', 'press-banca-inclinado-barra', 'peso-muerto-trap-bar', 'bulgara']);

/** Lo que se evita con cada molestia. Si no queda nada, el patron se salta. */
const EVITAR: Record<Molestia, Set<string>> = {
  hombro: new Set([
    'press-banca', 'press-militar-barra', 'press-hombro-pie', 'press-banca-inclinado-barra', 'fondos-maquina', 'fondos-banco',
    'dominadas', 'press-kettlebell-militar', 'thruster-kettlebell',
  ]),
  rodilla: new Set([
    'sentadilla-barra', 'sentadilla-peso-corporal', 'zancada-atg', 'zancadas-mancuernas', 'subida-cajon', 'nordico',
    'salto-contramovimiento', 'salto-cajon', 'salto-vertical-detenido', 'salto-largo', 'salto-lateral-una-pierna', 'rebote-lateral',
  ]),
  lumbar: new Set([
    'sentadilla-barra', 'peso-muerto-rumano', 'peso-muerto-piernas-rectas', 'remo-mancuernas', 'remo-polea-de-pie',
    'press-militar-barra', 'press-hombro-pie', 'swing-kettlebell', 'thruster-kettlebell',
  ]),
  muneca: new Set(['press-banca', 'curl-barra-z', 'press-cerrado-mancuernas', 'flexiones', 'flexiones-abiertas', 'escaladores']),
};

/** Pares en que cualquiera de los dos sirve: un goblet sale con kettlebell o con mancuerna. */
const ALTERNATIVAS: Equipo[][] = [
  ['kettlebell', 'mancuernas'],
  ['bandas', 'polea'],
  ['barra', 'mancuernas'],
];

export function sePuedeHacer(e: EjercicioCatalogo, equipo: ReadonlySet<Equipo>): boolean {
  const tiene = (x: Equipo) => x === 'peso-corporal' || equipo.has(x);
  const pendientes = e.equipo.filter((x) => !tiene(x));
  return pendientes.every((x) => ALTERNATIVAS.some((par) => par.includes(x) && par.some((y) => y !== x && e.equipo.includes(y) && tiene(y))));
}

// ---------------------------------------------------------------- plantillas

interface Hueco {
  patron: Patron;
  rol: Rol;
}

interface Plantilla {
  id: string;
  nombre: string;
  foco: string;
  /** En orden de ejecucion y de prioridad: si falta tiempo, se cortan los ultimos. */
  huecos: Hueco[];
}

const h = (patron: Patron, rol: Rol): Hueco => ({ patron, rol });

const FULL_A: Plantilla = {
  id: 'completo-a',
  nombre: 'Cuerpo completo A',
  foco: 'Sentadilla, empuje y remo',
  huecos: [h('saltoV', 'salto'), h('rodilla', 'principal'), h('empujeH', 'principal'), h('tironH', 'basico'), h('bisagra', 'accesorio'), h('hombroPost', 'aislado'), h('coreA', 'core'), h('biceps', 'aislado'), h('triceps', 'aislado')],
};
const FULL_B: Plantilla = {
  id: 'completo-b',
  nombre: 'Cuerpo completo B',
  foco: 'Bisagra de cadera, tirón vertical y hombro',
  huecos: [h('saltoH', 'salto'), h('bisagra', 'principal'), h('tironV', 'principal'), h('empujeV', 'basico'), h('unilateral', 'accesorio'), h('coreB', 'core'), h('hombroLat', 'aislado'), h('pantorrilla', 'aislado'), h('triceps', 'aislado')],
};
const FULL_C: Plantilla = {
  id: 'completo-c',
  nombre: 'Cuerpo completo C',
  foco: 'Pierna a una pierna, pecho inclinado y glúteo',
  huecos: [h('saltoV', 'salto'), h('rodilla2', 'principal'), h('empujeH2', 'basico'), h('tironH2', 'basico'), h('gluteo', 'accesorio'), h('isquio', 'accesorio'), h('coreA', 'core'), h('biceps', 'aislado'), h('hombroLat', 'aislado')],
};
const TORSO_A: Plantilla = {
  id: 'torso-a',
  nombre: 'Torso A',
  foco: 'Pecho, espalda y brazos',
  huecos: [h('empujeH', 'principal'), h('tironH', 'principal'), h('empujeV', 'basico'), h('tironV', 'basico'), h('hombroLat', 'aislado'), h('biceps', 'aislado'), h('triceps', 'aislado'), h('coreB', 'core')],
};
const PIERNA_A: Plantilla = {
  id: 'pierna-a',
  nombre: 'Pierna A',
  foco: 'Sentadilla y cuádriceps',
  huecos: [h('saltoV', 'salto'), h('rodilla', 'principal'), h('bisagra', 'basico'), h('unilateral', 'accesorio'), h('isquio', 'accesorio'), h('pantorrilla', 'aislado'), h('coreA', 'core')],
};
const TORSO_B: Plantilla = {
  id: 'torso-b',
  nombre: 'Torso B',
  foco: 'Espalda, hombro y pecho inclinado',
  huecos: [h('tironV', 'principal'), h('empujeH2', 'basico'), h('tironH2', 'basico'), h('empujeV', 'basico'), h('hombroPost', 'aislado'), h('triceps', 'aislado'), h('biceps', 'aislado'), h('coreA', 'core')],
};
const PIERNA_B: Plantilla = {
  id: 'pierna-b',
  nombre: 'Pierna B',
  foco: 'Cadera, glúteo e isquiotibiales',
  huecos: [h('saltoH', 'salto'), h('bisagra', 'principal'), h('rodilla2', 'basico'), h('gluteo', 'accesorio'), h('isquio', 'accesorio'), h('pantorrilla', 'aislado'), h('coreB', 'core')],
};
const BRAZOS: Plantilla = {
  id: 'hombro-brazos',
  nombre: 'Hombro, brazos y core',
  foco: 'Lo que en los otros días queda corto',
  huecos: [h('empujeV', 'basico'), h('tironH2', 'accesorio'), h('hombroLat', 'aislado'), h('hombroPost', 'aislado'), h('biceps', 'aislado'), h('triceps', 'aislado'), h('coreA', 'core'), h('coreB', 'core')],
};

/**
 * Hasta 3 dias, cuerpo completo; desde 4, torso y pierna. Sin equipo para
 * tirar o empujar con carga un dia de torso queda en dos ejercicios, asi que
 * ahi se sigue rotando cuerpo completo.
 */
function plantillasPara(dias: number, pocoEquipo: boolean): Plantilla[] {
  const completos = [FULL_A, FULL_B, FULL_C];
  if (dias <= 3 || pocoEquipo) {
    return Array.from({ length: dias }, (_, i) => {
      const p = completos[i % completos.length] ?? FULL_A;
      return i < completos.length ? p : { ...p, nombre: `${p.nombre} · 2` };
    });
  }
  if (dias === 4) return [TORSO_A, PIERNA_A, TORSO_B, PIERNA_B];
  return [TORSO_A, PIERNA_A, BRAZOS, TORSO_B, PIERNA_B];
}

/** Ejercicios por sesion segun los minutos; los saltos y el manguito son cortos y no cuentan. */
function cupoPorMinutos(minutos: number): number {
  if (minutos <= 45) return 5;
  if (minutos <= 60) return 6;
  return 8;
}

// ---------------------------------------------------------------- prescripcion

interface Dosis {
  series: number;
  reps: [number, number];
  rir: number;
}

const DOSIS: Record<Objetivo, Record<'principal' | 'basico' | 'accesorio' | 'aislado', Dosis>> = {
  fuerza: {
    principal: { series: 4, reps: [4, 6], rir: 2 },
    basico: { series: 3, reps: [6, 8], rir: 2 },
    accesorio: { series: 3, reps: [8, 10], rir: 2 },
    aislado: { series: 2, reps: [10, 12], rir: 2 },
  },
  musculo: {
    principal: { series: 3, reps: [6, 10], rir: 2 },
    basico: { series: 3, reps: [8, 12], rir: 2 },
    accesorio: { series: 3, reps: [10, 12], rir: 1 },
    aislado: { series: 3, reps: [12, 15], rir: 1 },
  },
  grasa: {
    principal: { series: 3, reps: [8, 10], rir: 2 },
    basico: { series: 3, reps: [10, 12], rir: 2 },
    accesorio: { series: 2, reps: [12, 15], rir: 2 },
    aislado: { series: 2, reps: [12, 15], rir: 1 },
  },
  deporte: {
    principal: { series: 4, reps: [4, 6], rir: 2 },
    basico: { series: 3, reps: [6, 8], rir: 2 },
    accesorio: { series: 3, reps: [8, 10], rir: 2 },
    aislado: { series: 2, reps: [10, 12], rir: 2 },
  },
  salud: {
    principal: { series: 3, reps: [8, 10], rir: 3 },
    basico: { series: 2, reps: [10, 12], rir: 3 },
    accesorio: { series: 2, reps: [10, 12], rir: 3 },
    aislado: { series: 2, reps: [12, 15], rir: 2 },
  },
};

const DESCANSOS: Record<Objetivo, DescansosPorDefecto> = {
  fuerza: { principal: 180, carga: 90, tiempo: 60, salto: 90, movilidad: 0 },
  musculo: { principal: 150, carga: 75, tiempo: 60, salto: 90, movilidad: 0 },
  grasa: { principal: 120, carga: 60, tiempo: 45, salto: 60, movilidad: 0 },
  deporte: { principal: 180, carga: 90, tiempo: 60, salto: 120, movilidad: 0 },
  salud: { principal: 120, carga: 75, tiempo: 60, salto: 90, movilidad: 0 },
};

const POR_LADO = /una-pierna|unilateral|bulgara|zancada|split-squat|subida-cajon|plancha-lateral|rotacion-externa|remo-kettlebell|elevacion-lateral-inclinado|rebote-lateral|pallof/;

function incrementoDe(e: EjercicioCatalogo, rol: Rol): number {
  if (e.tipo !== 'carga') return 0;
  const eq = e.equipo;
  if (eq.length === 1 && eq[0] === 'peso-corporal') return 0;
  if (eq.includes('barra') || eq.includes('trap-bar')) return rol === 'principal' && e.musculo !== 'pecho' && e.musculo !== 'hombros' ? 5 : 2.5;
  if (eq.includes('maquina')) return 5;
  if (eq.includes('polea')) return 2.5;
  if (eq.includes('mancuernas') || eq.includes('kettlebell')) return 2;
  return 0;
}

function recetar(e: EjercicioCatalogo, rol: Rol, r: Respuestas, bloque: string): EjercicioPlan {
  const porLado = POR_LADO.test(e.id) || undefined;
  if (rol === 'salto' || e.tipo === 'salto') {
    return { id: e.id, bloque, series: 3, reps: [3, 5], rirObjetivo: 0, incremento: 0, porLado };
  }
  if (e.tipo === 'tiempo') {
    const reps: [number, number] = e.id === 'paseo-granjero' ? [30, 45] : [20, 40];
    return { id: e.id, bloque, series: r.experiencia === 'nuevo' ? 2 : 3, reps, rirObjetivo: 0, incremento: e.id === 'paseo-granjero' ? 2 : 0, porLado };
  }
  if (rol === 'manguito') {
    return { id: e.id, bloque, series: 2, reps: [12, 15], rirObjetivo: 2, incremento: 1, porLado, rirFijo: 2 };
  }
  if (rol === 'condicion') {
    return { id: e.id, bloque, series: 3, reps: [12, 15], rirObjetivo: 2, incremento: incrementoDe(e, rol), descanso: 45 };
  }
  if (rol === 'core') {
    return { id: e.id, bloque, series: r.experiencia === 'nuevo' ? 2 : 3, reps: [8, 12], rirObjetivo: 2, incremento: incrementoDe(e, rol), porLado };
  }
  const d = DOSIS[r.objetivo][rol];
  let series = d.series;
  let rir = d.rir;
  if (r.experiencia === 'nuevo') {
    series = Math.max(2, series - 1);
    rir = Math.max(rir, 3);
  } else if (r.experiencia === 'avanzado' && rol === 'principal') {
    series += 1;
  }
  const plan: EjercicioPlan = { id: e.id, bloque, series, reps: d.reps, rirObjetivo: rir, incremento: incrementoDe(e, rol), porLado };
  if (rol === 'principal') plan.principal = true;
  if (!porLado) delete plan.porLado;
  return plan;
}

// ---------------------------------------------------------------- fases

function fasesPara(r: Respuestas): Fase[] {
  const tope = r.experiencia === 'nuevo' || r.objetivo === 'salud' ? 2 : 1;
  const descarga: Fase = {
    nombre: 'Descarga',
    semanas: [8, 8],
    rirTodos: 4,
    factorSeries: 0.6,
    seriesMinimas: 2,
    nota: 'Misma carga, menos series, 4 RIR. Llegas fresco al bloque siguiente.',
  };
  const aprender: Fase = {
    nombre: r.experiencia === 'nuevo' ? 'Aprendizaje' : 'Calibración',
    semanas: [1, 2],
    rirPrincipal: 3,
    nota:
      r.experiencia === 'nuevo'
        ? 'Aprende los movimientos con pesos cómodos: deja 3 repeticiones en reserva y anota cada serie.'
        : 'Principales a 3 RIR. Buscas tus cargas reales, no récords.',
  };
  if (r.objetivo === 'grasa' || r.objetivo === 'salud') {
    return [
      aprender,
      { nombre: 'Progresión', semanas: [3, 7], rirPrincipal: 2, nota: 'Sube el peso cuando llegues al tope de repeticiones con el RIR objetivo.' },
      descarga,
    ];
  }
  return [
    aprender,
    { nombre: r.objetivo === 'musculo' ? 'Acumulación' : 'Carga', semanas: [3, 5], rirPrincipal: 2, nota: 'Principales a 2 RIR. Doble progresión: primero reps, después peso.' },
    {
      nombre: r.objetivo === 'musculo' ? 'Intensificación' : 'Intensidad',
      semanas: [6, 7],
      rirPrincipal: tope,
      ...(r.objetivo === 'deporte' ? { seriesExtra: { salto: 1 } } : {}),
      nota:
        tope === 1
          ? `Principales a 1 RIR${r.objetivo === 'deporte' ? ' y una serie extra de salto' : ''}. Las semanas más exigentes.`
          : 'Principales a 2 RIR. Sigue subiendo de a poco, sin apurarte.',
    },
    descarga,
  ];
}

// ---------------------------------------------------------------- armado

const LUGAR_SESION: Record<Lugar, string> = {
  gimnasio: 'Gimnasio',
  'gimnasio-basico': 'Gimnasio',
  casa: 'Casa',
  'sin-equipo': 'Casa',
};

/**
 * El principal es el mismo levantamiento toda la semana: es el que se quiere
 * progresar. El resto prefiere algo que no este ya en la semana, para dar
 * variedad, y si no queda otro repite. Dentro de una sesion nunca repite. A
 * quien empieza, lo exigente solo se le da como principal sin alternativa.
 */
function elegir(
  patron: Patron,
  rol: Rol,
  r: Respuestas,
  equipo: ReadonlySet<Equipo>,
  enLaSemana: ReadonlySet<string>,
  enLaSesion: ReadonlySet<string>,
  catalogo: EjercicioCatalogo[],
): EjercicioCatalogo | null {
  const evitar = new Set(r.molestias.flatMap((m) => [...EVITAR[m]]));
  let lista = CANDIDATOS[patron]
    .map((id) => catalogoPorId(id, catalogo))
    .filter((e): e is EjercicioCatalogo => e !== undefined && sePuedeHacer(e, equipo) && !evitar.has(e.id) && !enLaSesion.has(e.id));
  if (r.experiencia === 'nuevo') {
    const faciles = lista.filter((e) => !EXIGENTES.has(e.id));
    if (faciles.length || rol !== 'principal') lista = faciles;
  }
  if (rol !== 'principal') {
    const nuevos = lista.filter((e) => !enLaSemana.has(e.id));
    if (nuevos.length) lista = nuevos;
  }
  return lista[0] ?? null;
}

function letraBloque(i: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + Math.min(i, 25));
}

/** Agrupa de a dos los ejercicios que no son principales: superseries A1/A2 ahorran tiempo. */
function ponerBloques(ejercicios: { plan: EjercicioPlan; rol: Rol }[]): EjercicioPlan[] {
  const out: EjercicioPlan[] = [];
  const va = (x: { plan: EjercicioPlan } | undefined) => Boolean(x?.plan.principal);
  let bloque = 0;
  for (let i = 0; i < ejercicios.length; bloque += 1) {
    const actual = ejercicios[i];
    const siguiente = ejercicios[i + 1];
    if (!actual) break;
    if (va(actual) || !siguiente || va(siguiente)) {
      out.push({ ...actual.plan, bloque: letraBloque(bloque) });
      i += 1;
    } else {
      out.push({ ...actual.plan, bloque: `${letraBloque(bloque)}1` });
      out.push({ ...siguiente.plan, bloque: `${letraBloque(bloque)}2` });
      i += 2;
    }
  }
  return out;
}

const NOMBRE_OBJETIVO: Record<Objetivo, string> = {
  fuerza: 'Fuerza',
  musculo: 'Músculo',
  grasa: 'Recomposición',
  deporte: 'Rendimiento',
  salud: 'Base y salud',
};

export interface OpcionesPlan {
  /** Semana absoluta en que arranca; con historial previo no se pisa lo anterior. */
  desde?: number;
  mesociclo?: number;
}

export function generarPrograma(r: Respuestas, catalogo: EjercicioCatalogo[], opciones: OpcionesPlan = {}): ProgramaDef {
  const dias = Math.min(5, Math.max(2, Math.round(r.dias)));
  const equipo = new Set<Equipo>(r.equipo);
  const cupo = cupoPorMinutos(r.minutos);
  const usados = new Set<string>();
  const conSaltos = r.objetivo === 'deporte' && !r.molestias.includes('rodilla');
  const cuidarHombro = r.molestias.includes('hombro');

  const conCarga = (['mancuernas', 'barra', 'kettlebell', 'maquina', 'polea'] as Equipo[]).filter((x) => equipo.has(x));
  const sesiones: SesionDef[] = plantillasPara(dias, conCarga.length === 0).map((p, n) => {
    const elegidos: { plan: EjercicioPlan; rol: Rol }[] = [];
    const enLaSesion = new Set<string>();
    const sumar = (patron: Patron, rol: Rol): boolean => {
      const e = elegir(patron, rol, r, equipo, usados, enLaSesion, catalogo);
      if (!e) return false;
      usados.add(e.id);
      enLaSesion.add(e.id);
      elegidos.push({ plan: recetar(e, rol, r, ''), rol });
      return true;
    };

    let cuenta = 0;
    for (const hueco of p.huecos) {
      if (hueco.rol === 'salto') {
        if (conSaltos) sumar(hueco.patron, hueco.rol);
        continue;
      }
      if (cuenta >= cupo) break;
      if (sumar(hueco.patron, hueco.rol)) cuenta += 1;
    }
    const trabajaTorso = p.huecos.some((x) => ['empujeH', 'empujeV', 'tironV', 'tironH'].includes(x.patron));
    // Con molestia de hombro, el manguito va en cada dia de torso aunque falte tiempo.
    if (cuidarHombro && trabajaTorso) sumar('manguito', 'manguito');
    if (r.objetivo === 'grasa' && r.minutos >= 60) sumar('condicion', 'condicion');

    return {
      id: `dia-${n + 1}`,
      nombre: p.nombre,
      lugar: LUGAR_SESION[r.lugar],
      foco: p.foco,
      ejercicios: ponerBloques(elegidos),
    };
  });

  return {
    nombre: `${NOMBRE_OBJETIVO[r.objetivo]} · ${dias} días`,
    semanas: 8,
    mesociclo: opciones.mesociclo ?? 1,
    desde: opciones.desde ?? 1,
    descansos: DESCANSOS[r.objetivo],
    fases: fasesPara(r),
    sesiones,
  };
}

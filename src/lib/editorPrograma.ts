import type { EjercicioCatalogo } from '../data/biblioteca';
import type { EjercicioPlan, Fase, ProgramaDef, SesionDef } from '../data/programa';
import { normalizarTexto } from '../data/biblioteca';

/**
 * Operaciones puras del editor: cada una recibe el programa y devuelve uno
 * nuevo, sin mutar el original. La pantalla solo las llama y guarda.
 */

const LIMITES = {
  semanas: [1, 52],
  series: [1, 20],
  reps: [0, 600],
  rir: [0, 10],
  incremento: [0, 50],
  descanso: [0, 900],
} as const;

/** Acota al rango. Solo redondea si se pide: redondear decimales al teclear rompe la escritura. */
function acotar(v: number, [min, max]: readonly [number, number], entero = false): number {
  const n = Number.isFinite(v) ? v : min;
  return Math.min(max, Math.max(min, entero ? Math.round(n) : n));
}

function clonar(def: ProgramaDef): ProgramaDef {
  return structuredClone(def);
}

function sesion(def: ProgramaDef, sesionId: string): SesionDef {
  const s = def.sesiones.find((x) => x.id === sesionId);
  if (!s) throw new Error(`No existe la sesion ${sesionId}`);
  return s;
}

export function slug(texto: string): string {
  return (
    normalizarTexto(texto)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'sesion'
  );
}

function idUnico(base: string, usados: Set<string>): string {
  if (!usados.has(base)) return base;
  let i = 2;
  while (usados.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export function actualizarDatosPrograma(
  def: ProgramaDef,
  cambios: Partial<Pick<ProgramaDef, 'nombre' | 'semanas' | 'descansos'>>,
): ProgramaDef {
  const nuevo = clonar(def);
  if (cambios.nombre !== undefined) nuevo.nombre = cambios.nombre.trim() || nuevo.nombre;
  if (cambios.semanas !== undefined) nuevo.semanas = acotar(cambios.semanas, LIMITES.semanas, true);
  if (cambios.descansos) {
    for (const [k, v] of Object.entries(cambios.descansos)) {
      nuevo.descansos[k as keyof ProgramaDef['descansos']] = acotar(v, LIMITES.descanso, true);
    }
  }
  return nuevo;
}

// ---------- sesiones ----------

export function agregarSesion(def: ProgramaDef, nombre: string): { programa: ProgramaDef; id: string } {
  const nuevo = clonar(def);
  const id = idUnico(slug(nombre), new Set(nuevo.sesiones.map((s) => s.id)));
  nuevo.sesiones.push({ id, nombre: nombre.trim() || 'Nueva sesión', lugar: '', foco: '', ejercicios: [] });
  return { programa: nuevo, id };
}

export function duplicarSesion(
  def: ProgramaDef,
  sesionId: string,
  nombre: string,
): { programa: ProgramaDef; id: string } {
  const nuevo = clonar(def);
  const origen = sesion(nuevo, sesionId);
  const id = idUnico(slug(nombre), new Set(nuevo.sesiones.map((s) => s.id)));
  const indice = nuevo.sesiones.indexOf(origen);
  nuevo.sesiones.splice(indice + 1, 0, { ...structuredClone(origen), id, nombre: nombre.trim() || origen.nombre });
  return { programa: nuevo, id };
}

export function actualizarSesion(
  def: ProgramaDef,
  sesionId: string,
  cambios: Partial<Pick<SesionDef, 'nombre' | 'lugar' | 'foco'>>,
): ProgramaDef {
  const nuevo = clonar(def);
  Object.assign(sesion(nuevo, sesionId), cambios);
  return nuevo;
}

export function eliminarSesion(def: ProgramaDef, sesionId: string): ProgramaDef {
  const nuevo = clonar(def);
  nuevo.sesiones = nuevo.sesiones.filter((s) => s.id !== sesionId);
  return nuevo;
}

function mover<T>(lista: T[], indice: number, delta: number): void {
  const destino = indice + delta;
  if (indice < 0 || destino < 0 || destino >= lista.length) return;
  const [item] = lista.splice(indice, 1);
  if (item !== undefined) lista.splice(destino, 0, item);
}

export function moverSesion(def: ProgramaDef, sesionId: string, delta: number): ProgramaDef {
  const nuevo = clonar(def);
  mover(nuevo.sesiones, nuevo.sesiones.findIndex((s) => s.id === sesionId), delta);
  return nuevo;
}

// ---------- ejercicios ----------

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
  const barra = e.equipo.includes('barra') || e.equipo.includes('trap-bar');
  return { id: e.id, bloque, series: 3, reps: [8, 10], rirObjetivo: 2, incremento: barra ? 2.5 : 2 };
}

export function agregarEjercicio(def: ProgramaDef, sesionId: string, e: EjercicioCatalogo): ProgramaDef {
  const nuevo = clonar(def);
  const s = sesion(nuevo, sesionId);
  // El id del ejercicio es la clave del historial: no puede repetirse en una sesion.
  if (s.ejercicios.some((x) => x.id === e.id)) throw new Error(`${e.nombre} ya está en esta sesión.`);
  s.ejercicios.push(planPorDefecto(e, siguienteBloque(s.ejercicios)));
  return nuevo;
}

export type CambiosEjercicio = Partial<Omit<EjercicioPlan, 'id'>>;

export function actualizarEjercicio(
  def: ProgramaDef,
  sesionId: string,
  ejercicioId: string,
  cambios: CambiosEjercicio,
): ProgramaDef {
  const nuevo = clonar(def);
  const s = sesion(nuevo, sesionId);
  const i = s.ejercicios.findIndex((x) => x.id === ejercicioId);
  const actual = s.ejercicios[i];
  if (!actual) throw new Error(`No existe ${ejercicioId} en ${sesionId}`);
  s.ejercicios[i] = normalizarPlan({ ...actual, ...cambios });
  return nuevo;
}

/**
 * Deja cada valor dentro de su rango y quita opcionales vacios. No cruza
 * campos (min <= max): se edita tecla a tecla y corregirlo al vuelo impediria
 * escribir; esas incoherencias las reporta `revisarPrograma`.
 */
export function normalizarPlan(p: EjercicioPlan): EjercicioPlan {
  const min = acotar(p.reps[0], LIMITES.reps, true);
  const max = acotar(p.reps[1], LIMITES.reps, true);
  const plan: EjercicioPlan = {
    id: p.id,
    bloque: p.bloque.trim().toUpperCase().slice(0, 4) || 'A',
    series: acotar(p.series, LIMITES.series, true),
    reps: [min, max],
    rirObjetivo: acotar(p.rirObjetivo, LIMITES.rir),
    incremento: acotar(p.incremento, LIMITES.incremento),
  };
  if (p.principal) plan.principal = true;
  if (p.rirFijo !== undefined && p.rirFijo !== null && Number.isFinite(p.rirFijo)) {
    plan.rirFijo = acotar(p.rirFijo, LIMITES.rir);
  }
  if (p.porLado) plan.porLado = true;
  if (p.descanso !== undefined && p.descanso !== null && Number.isFinite(p.descanso)) {
    plan.descanso = acotar(p.descanso, LIMITES.descanso, true);
  }
  return plan;
}

export function quitarEjercicio(def: ProgramaDef, sesionId: string, ejercicioId: string): ProgramaDef {
  const nuevo = clonar(def);
  const s = sesion(nuevo, sesionId);
  s.ejercicios = s.ejercicios.filter((x) => x.id !== ejercicioId);
  return nuevo;
}

export function moverEjercicio(def: ProgramaDef, sesionId: string, ejercicioId: string, delta: number): ProgramaDef {
  const nuevo = clonar(def);
  const s = sesion(nuevo, sesionId);
  mover(s.ejercicios, s.ejercicios.findIndex((x) => x.id === ejercicioId), delta);
  return nuevo;
}

/** Cambia el ejercicio de la biblioteca manteniendo la prescripcion. */
export function cambiarEjercicio(
  def: ProgramaDef,
  sesionId: string,
  ejercicioId: string,
  nuevo: EjercicioCatalogo,
): ProgramaDef {
  const copia = clonar(def);
  const s = sesion(copia, sesionId);
  if (s.ejercicios.some((x) => x.id === nuevo.id)) throw new Error(`${nuevo.nombre} ya está en esta sesión.`);
  const i = s.ejercicios.findIndex((x) => x.id === ejercicioId);
  const actual = s.ejercicios[i];
  if (!actual) throw new Error(`No existe ${ejercicioId} en ${sesionId}`);
  s.ejercicios[i] = { ...actual, id: nuevo.id };
  return copia;
}

// ---------- fases ----------

export function actualizarFase(def: ProgramaDef, indice: number, cambios: Partial<Fase>): ProgramaDef {
  const nuevo = clonar(def);
  const actual = nuevo.fases[indice];
  if (!actual) throw new Error(`No existe la fase ${indice}`);
  const fase: Fase = { ...actual, ...cambios };
  fase.semanas = [acotar(fase.semanas[0], [1, nuevo.semanas], true), acotar(fase.semanas[1], [1, nuevo.semanas], true)];
  for (const k of ['rirPrincipal', 'rirTodos', 'seriesMinimas', 'factorSeries'] as const) {
    const v = fase[k];
    if (v === undefined || v === null || !Number.isFinite(v)) delete fase[k];
  }
  nuevo.fases[indice] = fase;
  return nuevo;
}

export function agregarFase(def: ProgramaDef): ProgramaDef {
  const nuevo = clonar(def);
  const ultima = nuevo.fases[nuevo.fases.length - 1];
  const desde = Math.min(nuevo.semanas, (ultima?.semanas[1] ?? 0) + 1);
  nuevo.fases.push({ nombre: 'Nueva fase', nota: '', semanas: [desde, nuevo.semanas] });
  return nuevo;
}

export function quitarFase(def: ProgramaDef, indice: number): ProgramaDef {
  const nuevo = clonar(def);
  if (nuevo.fases.length <= 1) throw new Error('El programa necesita al menos una fase.');
  nuevo.fases.splice(indice, 1);
  return nuevo;
}

/** Avisos que no bloquean el guardado pero conviene mostrar. */
export function revisarPrograma(def: ProgramaDef): string[] {
  const avisos: string[] = [];
  for (let semana = 1; semana <= def.semanas; semana++) {
    const cubren = def.fases.filter((f) => semana >= f.semanas[0] && semana <= f.semanas[1]);
    if (cubren.length === 0) avisos.push(`La semana ${semana} no tiene fase: usará la última.`);
    if (cubren.length > 1) avisos.push(`La semana ${semana} está en ${cubren.length} fases: manda la primera.`);
  }
  for (const f of def.fases) {
    if (f.semanas[0] > f.semanas[1]) avisos.push(`La fase ${f.nombre} termina antes de empezar.`);
  }
  for (const s of def.sesiones) {
    if (!s.ejercicios.length) avisos.push(`La sesión ${s.nombre} no tiene ejercicios.`);
    for (const e of s.ejercicios) {
      if (e.reps[0] > e.reps[1]) avisos.push(`${s.nombre}: el rango de ${e.id} tiene el mínimo sobre el máximo.`);
    }
  }
  return avisos;
}

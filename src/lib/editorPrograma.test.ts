import { describe, expect, it } from 'vitest';
import { catalogoPorId, type EjercicioCatalogo } from '../data/biblioteca';
import { PROGRAMA_BASE } from '../data/programa';
import {
  actualizarEjercicio,
  actualizarFase,
  agregarEjercicio,
  agregarSesion,
  cambiarEjercicio,
  duplicarSesion,
  eliminarSesion,
  moverEjercicio,
  nuevoMesociclo,
  quitarFase,
  revisarPrograma,
  siguienteBloque,
  slug,
} from './editorPrograma';

const cat = (id: string): EjercicioCatalogo => {
  const e = catalogoPorId(id);
  if (!e) throw new Error(id);
  return e;
};

describe('editor de programa', () => {
  it('no modifica el programa original', () => {
    const copia = structuredClone(PROGRAMA_BASE);
    agregarEjercicio(PROGRAMA_BASE, 'martes', cat('extension-cuadriceps'));
    moverEjercicio(PROGRAMA_BASE, 'martes', 'sentadilla-barra', -1);
    expect(PROGRAMA_BASE).toEqual(copia);
  });

  it('agrega un ejercicio con prescripción por defecto y el siguiente bloque', () => {
    const p = agregarEjercicio(PROGRAMA_BASE, 'martes', cat('extension-cuadriceps'));
    const martes = p.sesiones.find((s) => s.id === 'martes');
    expect(martes?.ejercicios.at(-1)).toMatchObject({ id: 'extension-cuadriceps', bloque: 'E', series: 3, reps: [8, 10], rirObjetivo: 2 });
  });

  it('no permite repetir un ejercicio en la misma sesión', () => {
    expect(() => agregarEjercicio(PROGRAMA_BASE, 'martes', cat('sentadilla-barra'))).toThrow(/ya está/);
  });

  it('siguienteBloque salta las letras usadas', () => {
    expect(siguienteBloque([])).toBe('A');
    expect(siguienteBloque([{ id: 'a', bloque: 'A', series: 1, reps: [1, 1], rirObjetivo: 0, incremento: 0 }, { id: 'b', bloque: 'B1', series: 1, reps: [1, 1], rirObjetivo: 0, incremento: 0 }])).toBe('C');
  });

  it('acota valores sin impedir escribir', () => {
    const p = actualizarEjercicio(PROGRAMA_BASE, 'lunes', 'press-banca', { series: 99, reps: [12, 1], rirObjetivo: -3, descanso: 9 });
    const e = p.sesiones.find((s) => s.id === 'lunes')?.ejercicios.find((x) => x.id === 'press-banca');
    expect(e?.series).toBe(20);
    expect(e?.reps).toEqual([12, 1]); // mínimo sobre máximo: se avisa, no se corrige al vuelo
    expect(e?.rirObjetivo).toBe(0);
    expect(e?.descanso).toBe(9);
    expect(revisarPrograma(p).some((a) => a.includes('mínimo sobre el máximo'))).toBe(true);
  });

  it('quita opcionales al vaciarlos', () => {
    const p = actualizarEjercicio(PROGRAMA_BASE, 'jueves', 'bulgara', { rirFijo: undefined, descanso: undefined });
    const e = p.sesiones.find((s) => s.id === 'jueves')?.ejercicios.find((x) => x.id === 'bulgara');
    expect(e && 'rirFijo' in e).toBe(false);
    expect(e && 'descanso' in e).toBe(false);
  });

  it('cambiar el ejercicio mantiene la prescripción', () => {
    const p = cambiarEjercicio(PROGRAMA_BASE, 'martes', 'sentadilla-barra', cat('sentadilla-frontal'));
    const e = p.sesiones.find((s) => s.id === 'martes')?.ejercicios[1];
    expect(e).toMatchObject({ id: 'sentadilla-frontal', bloque: 'B', series: 4, reps: [5, 6], principal: true });
  });

  it('crea sesiones con ids únicos', () => {
    expect(slug('Jueves  Casa ñandú!')).toBe('jueves-casa-nandu');
    const a = agregarSesion(PROGRAMA_BASE, 'Lunes');
    expect(a.id).toBe('lunes-2');
    const b = duplicarSesion(a.programa, 'jueves', 'Jueves casa');
    expect(b.id).toBe('jueves-casa');
    const idx = b.programa.sesiones.findIndex((s) => s.id === 'jueves-casa');
    expect(b.programa.sesiones[idx - 1]?.id).toBe('jueves');
    expect(b.programa.sesiones[idx]?.ejercicios).toEqual(PROGRAMA_BASE.sesiones[2]?.ejercicios);
  });

  it('elimina sesiones y avisa si una queda vacía', () => {
    const p = eliminarSesion(PROGRAMA_BASE, 'lunes');
    expect(p.sesiones.map((s) => s.id)).toEqual(['martes', 'jueves', 'movilidad']);
    const vacia = agregarSesion(PROGRAMA_BASE, 'Sábado').programa;
    expect(revisarPrograma(vacia)).toContain('La sesión Sábado no tiene ejercicios.');
  });

  it('el mesociclo nuevo sigue las semanas del anterior', () => {
    const uno = nuevoMesociclo(PROGRAMA_BASE);
    expect(uno.desde).toBe(9);
    expect(uno.programa.mesociclo).toBe(2);
    expect(uno.programa.desde).toBe(9);
    // Las rutinas y las fases no se tocan.
    expect(uno.programa.sesiones).toEqual(PROGRAMA_BASE.sesiones);
    expect(uno.programa.fases).toEqual(PROGRAMA_BASE.fases);
    const dos = nuevoMesociclo(uno.programa);
    expect(dos.desde).toBe(17);
    expect(dos.programa.mesociclo).toBe(3);
  });

  it('un programa de fábrica sin mesociclo arranca el segundo en la semana siguiente', () => {
    const { mesociclo: _m, desde: _d, ...viejo } = PROGRAMA_BASE;
    const r = nuevoMesociclo(viejo);
    expect(r.desde).toBe(PROGRAMA_BASE.semanas + 1);
    expect(r.programa.mesociclo).toBe(2);
  });

  it('las fases avisan semanas sin cubrir y no se quedan sin ninguna', () => {
    const p = actualizarFase(PROGRAMA_BASE, 3, { semanas: [9, 9] });
    expect(p.fases[3]?.semanas).toEqual([8, 8]); // acotado al largo del programa
    const hueco = actualizarFase(PROGRAMA_BASE, 0, { semanas: [2, 2] });
    expect(revisarPrograma(hueco)).toContain('La semana 1 no tiene fase: usará la última.');
    expect(revisarPrograma(PROGRAMA_BASE)).toEqual([]);
    const una = { ...PROGRAMA_BASE, fases: PROGRAMA_BASE.fases.slice(0, 1) };
    expect(() => quitarFase(una, 0)).toThrow();
  });
});

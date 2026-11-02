import { describe, expect, it } from 'vitest';
import { BIBLIOTECA, catalogoPorId } from '../data/biblioteca';
import { revisarPrograma } from './editorPrograma';
import {
  CANDIDATOS,
  DIAS_POSIBLES,
  LUGARES,
  MINUTOS_POSIBLES,
  OBJETIVOS,
  RESPUESTAS_INICIALES,
  generarPrograma,
  sePuedeHacer,
  type Respuestas,
} from './planificador';

const con = (cambios: Partial<Respuestas>): Respuestas => ({ ...RESPUESTAS_INICIALES, ...cambios });
const ids = (r: Respuestas) => generarPrograma(r, BIBLIOTECA).sesiones.flatMap((s) => s.ejercicios.map((e) => e.id));

describe('planificador', () => {
  it('todos los candidatos existen en la biblioteca', () => {
    const faltan = Object.values(CANDIDATOS)
      .flat()
      .filter((id) => !catalogoPorId(id));
    expect(faltan).toEqual([]);
  });

  it('cualquier combinacion da un programa valido, sin repetir dentro de una sesion', () => {
    for (const objetivo of OBJETIVOS.map((o) => o.id))
      for (const dias of DIAS_POSIBLES)
        for (const minutos of MINUTOS_POSIBLES)
          for (const lugar of LUGARES) {
            const p = generarPrograma(con({ objetivo, dias, minutos, lugar: lugar.id, equipo: lugar.equipo }), BIBLIOTECA);
            expect(revisarPrograma(p)).toEqual([]);
            expect(p.sesiones).toHaveLength(dias);
            for (const s of p.sesiones) {
              expect(s.ejercicios.length).toBeGreaterThanOrEqual(3);
              expect(new Set(s.ejercicios.map((e) => e.id)).size).toBe(s.ejercicios.length);
            }
          }
  });

  it('solo usa lo que se puede hacer con el equipo marcado', () => {
    for (const lugar of LUGARES) {
      const equipo = new Set(lugar.equipo);
      for (const id of ids(con({ dias: 4, minutos: 75, lugar: lugar.id, equipo: lugar.equipo }))) {
        expect(sePuedeHacer(catalogoPorId(id)!, equipo), `${id} en ${lugar.id}`).toBe(true);
      }
    }
  });

  it('con menos minutos, menos ejercicios', () => {
    const corto = generarPrograma(con({ minutos: 45 }), BIBLIOTECA).sesiones[0]?.ejercicios.length ?? 0;
    const largo = generarPrograma(con({ minutos: 75 }), BIBLIOTECA).sesiones[0]?.ejercicios.length ?? 0;
    expect(corto).toBeLessThan(largo);
  });

  it('a quien empieza no le da la sentadilla con barra ni dominadas si hay alternativa', () => {
    const lista = ids(con({ experiencia: 'nuevo', dias: 4 }));
    expect(lista).not.toContain('sentadilla-barra');
    expect(lista).not.toContain('dominadas');
  });

  it('respeta las molestias y con hombro suma manguito en cada dia de torso', () => {
    const lista = ids(con({ dias: 4, molestias: ['hombro', 'lumbar'] }));
    expect(lista).not.toContain('press-banca');
    expect(lista).not.toContain('peso-muerto-rumano');
    const p = generarPrograma(con({ dias: 4, molestias: ['hombro'] }), BIBLIOTECA);
    for (const s of p.sesiones.filter((x) => x.nombre.startsWith('Torso'))) {
      expect(s.ejercicios.some((e) => e.id.startsWith('rotacion-externa'))).toBe(true);
    }
  });

  it('los saltos solo van para el deporte y nunca con molestia de rodilla', () => {
    const saltos = (r: Respuestas) => ids(r).filter((id) => catalogoPorId(id)?.tipo === 'salto');
    expect(saltos(con({ objetivo: 'musculo' }))).toEqual([]);
    expect(saltos(con({ objetivo: 'deporte' })).length).toBeGreaterThan(0);
    expect(saltos(con({ objetivo: 'deporte', molestias: ['rodilla'] }))).toEqual([]);
  });

  it('los principales siguen la fase y el programa arranca donde se le pide', () => {
    const p = generarPrograma(con({ objetivo: 'fuerza' }), BIBLIOTECA, { desde: 12, mesociclo: 2 });
    expect(p.desde).toBe(12);
    expect(p.mesociclo).toBe(2);
    expect(p.sesiones.every((s) => s.ejercicios.some((e) => e.principal))).toBe(true);
  });
});

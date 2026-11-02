import { describe, expect, it } from 'vitest';
import { BIBLIOTECA, catalogoPorId } from '../data/biblioteca';
import { revisarPrograma } from './editorPrograma';
import {
  CANDIDATOS,
  DEPORTES,
  LUGARES,
  MAX_DIAS,
  MIN_DIAS,
  MINUTOS_POSIBLES,
  OBJETIVOS,
  RESPUESTAS_INICIALES,
  diasSugeridos,
  generarPrograma,
  normalizarRespuestas,
  sePuedeHacer,
  type Respuestas,
} from './planificador';

const con = (cambios: Partial<Respuestas>): Respuestas => ({ ...RESPUESTAS_INICIALES, ...cambios });
const dias = (n: number) => ({ diasSemana: diasSugeridos(n) });
const ids = (r: Respuestas) => generarPrograma(r, BIBLIOTECA).sesiones.flatMap((s) => s.ejercicios.map((e) => e.id));
const tipo = (id: string) => catalogoPorId(id)?.tipo;

describe('planificador', () => {
  it('todos los candidatos existen en la biblioteca', () => {
    const faltan = Object.values(CANDIDATOS)
      .flat()
      .filter((id) => !catalogoPorId(id));
    expect(faltan).toEqual([]);
  });

  it('cualquier combinacion da un programa valido, sin repetir dentro de una sesion', () => {
    for (const objetivo of OBJETIVOS.map((o) => o.id))
      for (let n = MIN_DIAS; n <= MAX_DIAS; n += 1)
        for (const minutos of MINUTOS_POSIBLES)
          for (const lugar of LUGARES) {
            const p = generarPrograma(con({ objetivo, ...dias(n), minutos, lugar: lugar.id, equipo: lugar.equipo }), BIBLIOTECA);
            expect(revisarPrograma(p)).toEqual([]);
            expect(p.sesiones).toHaveLength(n);
            for (const s of p.sesiones) {
              expect(s.ejercicios.length).toBeGreaterThanOrEqual(3);
              expect(new Set(s.ejercicios.map((e) => e.id)).size).toBe(s.ejercicios.length);
            }
          }
  });

  it('cada deporte arma un programa valido', () => {
    for (const d of DEPORTES)
      for (const lugar of LUGARES) {
        const p = generarPrograma(con({ objetivo: 'deporte', deporte: d.id, ...dias(4), lugar: lugar.id, equipo: lugar.equipo, partidos: [5] }), BIBLIOTECA);
        expect(revisarPrograma(p), `${d.id} en ${lugar.id}`).toEqual([]);
      }
  });

  it('solo usa lo que se puede hacer con el equipo marcado', () => {
    for (const lugar of LUGARES) {
      const equipo = new Set(lugar.equipo);
      for (const id of ids(con({ objetivo: 'deporte', deporte: 'arquero', ...dias(4), minutos: 75, lugar: lugar.id, equipo: lugar.equipo }))) {
        expect(sePuedeHacer(catalogoPorId(id)!, equipo), `${id} en ${lugar.id}`).toBe(true);
      }
    }
  });

  it('las sesiones llevan el nombre de los dias elegidos, en orden', () => {
    const p = generarPrograma(con({ diasSemana: [5, 1, 3] }), BIBLIOTECA);
    expect(p.sesiones.map((s) => s.nombre)).toEqual(['Martes', 'Jueves', 'Sábado']);
    expect(p.sesiones.map((s) => s.id)).toEqual(['martes', 'jueves', 'sabado']);
  });

  it('con menos minutos, menos ejercicios', () => {
    const corto = generarPrograma(con({ minutos: 45 }), BIBLIOTECA).sesiones[0]?.ejercicios.length ?? 0;
    const largo = generarPrograma(con({ minutos: 75 }), BIBLIOTECA).sesiones[0]?.ejercicios.length ?? 0;
    expect(corto).toBeLessThan(largo);
  });

  it('a quien empieza no le da la sentadilla con barra, dominadas ni nordico si hay alternativa', () => {
    const lista = ids(con({ experiencia: 'nuevo', ...dias(4), objetivo: 'deporte', deporte: 'futbol' }));
    expect(lista).not.toContain('sentadilla-barra');
    expect(lista).not.toContain('dominadas');
    expect(lista).not.toContain('nordico');
  });

  it('respeta las molestias y con hombro suma manguito en cada dia de torso', () => {
    const lista = ids(con({ ...dias(4), molestias: ['hombro', 'lumbar'] }));
    expect(lista).not.toContain('press-banca');
    expect(lista).not.toContain('peso-muerto-rumano');
    const p = generarPrograma(con({ ...dias(4), molestias: ['hombro'] }), BIBLIOTECA);
    for (const s of p.sesiones.filter((x) => x.foco.startsWith('Torso'))) {
      expect(s.ejercicios.some((e) => e.id.startsWith('rotacion-externa'))).toBe(true);
    }
  });

  it('los saltos solo van para el deporte y nunca con molestia de rodilla', () => {
    const saltos = (r: Respuestas) => ids(r).filter((id) => tipo(id) === 'salto' && catalogoPorId(id)?.musculo !== 'pecho');
    expect(saltos(con({ objetivo: 'musculo' }))).toEqual([]);
    expect(saltos(con({ objetivo: 'deporte' })).length).toBeGreaterThan(0);
    expect(saltos(con({ objetivo: 'deporte', deporte: 'futbol', molestias: ['rodilla'] }))).toEqual([]);
  });

  it('el deporte cambia los saltos y la prevencion', () => {
    const futbol = ids(con({ objetivo: 'deporte', deporte: 'futbol', ...dias(4) }));
    expect(futbol).toContain('nordico');
    expect(futbol.some((id) => catalogoPorId(id)?.musculo === 'aductores')).toBe(true);
    const arquero = ids(con({ objetivo: 'deporte', deporte: 'arquero', ...dias(4) }));
    expect(arquero).toContain('salto-lateral-una-pierna');
    expect(arquero).toContain('lanzamiento-pecho-balon');
    const combate = ids(con({ objetivo: 'deporte', deporte: 'combate', ...dias(3) }));
    expect(combate.some((id) => id.startsWith('cuello'))).toBe(true);
    const running = ids(con({ objetivo: 'deporte', deporte: 'running', ...dias(3) }));
    expect(running).toContain('pogos');
  });

  it('con partido el sabado, la pierna pesada no cae el viernes y ese dia no hay saltos', () => {
    const p = generarPrograma(
      con({ objetivo: 'deporte', deporte: 'futbol', diasSemana: [0, 1, 3, 4], partidos: [5] }),
      BIBLIOTECA,
    );
    const viernes = p.sesiones.find((s) => s.nombre === 'Viernes');
    expect(viernes?.foco.startsWith('Torso')).toBe(true);
    const conPartido = generarPrograma(
      con({ objetivo: 'deporte', deporte: 'futbol', diasSemana: [1, 3, 5], partidos: [5] }),
      BIBLIOTECA,
    ).sesiones.find((s) => s.nombre === 'Sábado');
    expect(conPartido?.lugar).toContain('partido');
    expect(conPartido?.ejercicios.some((e) => tipo(e.id) === 'salto')).toBe(false);
  });

  it('completa respuestas de la version anterior, que guardaba solo la cantidad de dias', () => {
    const r = normalizarRespuestas({ objetivo: 'fuerza', dias: 4 } as Partial<Respuestas> & { dias: number });
    expect(r.diasSemana).toEqual(diasSugeridos(4));
    expect(r.partidos).toEqual([]);
  });

  it('los principales siguen la fase y el programa arranca donde se le pide', () => {
    const p = generarPrograma(con({ objetivo: 'fuerza' }), BIBLIOTECA, { desde: 12, mesociclo: 2 });
    expect(p.desde).toBe(12);
    expect(p.mesociclo).toBe(2);
    expect(p.sesiones.every((s) => s.ejercicios.some((e) => e.principal))).toBe(true);
  });
});

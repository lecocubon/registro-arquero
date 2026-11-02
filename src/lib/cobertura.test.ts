import { describe, expect, it } from 'vitest';
import { BIBLIOTECA } from '../data/biblioteca';
import { PROGRAMA_VACIO, type ProgramaDef } from '../data/programa';
import { revisarCobertura, sugerirPara } from './cobertura';
import { RESPUESTAS_INICIALES, diasSugeridos, evitadosPor, generarPrograma } from './planificador';

const conSesion = (ejercicios: { id: string; series: number }[]): ProgramaDef => ({
  ...PROGRAMA_VACIO,
  sesiones: [
    {
      id: 'lunes',
      nombre: 'Lunes',
      lugar: '',
      foco: '',
      ejercicios: ejercicios.map((e, i) => ({ ...e, bloque: String(i), reps: [8, 10], rirObjetivo: 2, incremento: 2 })),
    },
  ],
});

describe('cobertura', () => {
  it('un programa vacio no avisa nada', () => {
    expect(revisarCobertura(PROGRAMA_VACIO, BIBLIOTECA).faltas).toEqual([]);
  });

  it('cuenta 1 al principal y 0,5 a los secundarios', () => {
    const c = revisarCobertura(conSesion([{ id: 'press-banca', series: 4 }]), BIBLIOTECA);
    expect(c.series.pecho).toBe(4);
    expect(c.series.triceps).toBe(2);
  });

  it('avisa lo que falta y sugiere ejercicios que no estan en el programa', () => {
    const c = revisarCobertura(conSesion([{ id: 'press-banca', series: 4 }, { id: 'sentadilla-barra', series: 4 }]), BIBLIOTECA);
    const espalda = c.faltas.find((f) => f.grupo === 'espalda');
    expect(espalda?.series).toBe(0);
    expect(espalda?.sugeridos.length).toBeGreaterThan(0);
    expect(c.faltas.flatMap((f) => f.sugeridos.map((e) => e.id))).not.toContain('press-banca');
  });

  it('las sugerencias respetan el equipo', () => {
    const sinEquipo = sugerirPara('espalda', BIBLIOTECA, new Set(), { equipo: new Set(['bandas']) });
    expect(sinEquipo.length).toBeGreaterThan(0);
    expect(sinEquipo.every((e) => !e.equipo.includes('polea') || e.equipo.includes('bandas'))).toBe(true);
  });

  it('las sugerencias evitan lo que carga una molestia marcada', () => {
    const pecho = sugerirPara('pecho', BIBLIOTECA, new Set(), { evitar: evitadosPor(['hombro']) }, 10);
    expect(pecho.map((e) => e.id)).not.toContain('press-banca');
  });

  it('avisa cuando el empuje le gana al tiron', () => {
    const c = revisarCobertura(conSesion([{ id: 'press-banca', series: 4 }, { id: 'press-hombro-maquina', series: 4 }, { id: 'remo-pecho-apoyado', series: 2 }]), BIBLIOTECA);
    expect(c.desbalance).toMatch(/tirón/);
  });

  it('una rutina del planificador de 4 dias no deja grupos grandes sin cubrir', () => {
    const p = generarPrograma({ ...RESPUESTAS_INICIALES, diasSemana: diasSugeridos(4) }, BIBLIOTECA);
    const grandes = revisarCobertura(p, BIBLIOTECA).faltas.filter((f) => ['pecho', 'espalda', 'cuadriceps'].includes(f.grupo));
    expect(grandes).toEqual([]);
  });
});

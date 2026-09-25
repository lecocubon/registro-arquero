import { describe, expect, it } from 'vitest';
import { ejercicioPorId, type Ejercicio } from '../data/programa';
import type { RegistroSerie } from '../db/db';
import { cargaPara, redondearCarga, sugerirCarga } from './sugerencia';

const ej = (id: string): Ejercicio => {
  const e = ejercicioPorId(id);
  if (!e) throw new Error(`Falta ${id} en el programa`);
  return e;
};

let n = 0;
const serie = (kg: number, reps: number, rir: number | null): RegistroSerie => {
  n += 1;
  return {
    id: `s${n}`,
    semana: 1,
    sesionId: 'jueves',
    ejercicioId: 'sentadilla-barra',
    serie: n,
    kg,
    reps,
    rir,
    segundos: null,
    hecha: true,
    actualizado: 0,
  };
};

describe('carga sugerida', () => {
  it('estima los kilos para unas reps con margen', () => {
    // e1RM 63 -> 5 reps dejando 2 en el tanque
    expect(cargaPara(63, 5, 2)).toBeCloseTo(63 / (1 + 7 / 30), 6);
    expect(cargaPara(63, 5, 0)).toBeGreaterThan(cargaPara(63, 5, 2));
  });

  it('redondea hacia abajo al salto que se puede armar', () => {
    expect(redondearCarga(51.1, 5)).toBe(50);
    expect(redondearCarga(34.06, 2.5)).toBe(32.5);
    expect(redondearCarga(50, 5)).toBe(50);
  });

  it('avisa que falta carga cuando saca muchas mas reps que el rango', () => {
    // Su sentadilla real: 45 kg x 10 con 2 RIR para un rango de 5-6.
    const r = sugerirCarga(ej('sentadilla-barra'), [serie(45, 10, 2), serie(45, 10, 2)], 2);
    expect(r).toEqual({ kg: 50, direccion: 'subir', reps: 5 });
  });

  it('no dice nada si la carga ya es la que corresponde', () => {
    expect(sugerirCarga(ej('sentadilla-barra'), [serie(50, 6, 2), serie(50, 5, 2)], 2)).toBeNull();
  });

  it('sugiere bajar cuando la carga quedo grande', () => {
    const r = sugerirCarga(ej('sentadilla-barra'), [serie(60, 2, 0), serie(60, 2, 0)], 2);
    expect(r?.direccion).toBe('bajar');
    expect(r?.kg).toBeLessThan(60);
  });

  it('ignora calentamientos y series sin datos', () => {
    const calentamiento = { ...serie(20, 10, null), tipo: 'calentamiento' as const };
    const vacia = { ...serie(0, 0, null), kg: null, reps: null, hecha: false };
    expect(sugerirCarga(ej('sentadilla-barra'), [calentamiento, vacia], 2)).toBeNull();
  });

  it('no aplica a ejercicios sin carga ni a los que no suben de peso', () => {
    expect(sugerirCarga(ej('salto-contramovimiento'), [serie(0, 0, null)], 0)).toBeNull();
    expect(sugerirCarga(ej('core-antiextension'), [serie(10, 10, 2)], 2)).toBeNull(); // incremento 0
  });
});

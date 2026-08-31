import { describe, expect, it } from 'vitest';
import { e1rm, redondear1, variacionPorcentual } from './e1rm';

describe('e1rm (Epley ajustada por RIR)', () => {
  it('aplica kg * (1 + (reps + RIR) / 30)', () => {
    expect(e1rm(100, 5, 1)).toBeCloseTo(100 * (1 + 6 / 30), 10);
    expect(e1rm(60, 6, 2)).toBeCloseTo(60 * (1 + 8 / 30), 10);
  });

  it('con RIR 0 equivale a la Epley clasica', () => {
    expect(e1rm(100, 10, 0)).toBeCloseTo(133.3333333, 6);
  });

  it('trata RIR ausente o negativo como 0', () => {
    expect(e1rm(100, 5, null)).toBeCloseTo(e1rm(100, 5, 0), 10);
    expect(e1rm(100, 5, undefined)).toBeCloseTo(e1rm(100, 5, 0), 10);
    expect(e1rm(100, 5, -3)).toBeCloseTo(e1rm(100, 5, 0), 10);
  });

  it('una repeticion con 0 RIR devuelve la carga levantada', () => {
    expect(e1rm(120, 1, 0)).toBeCloseTo(124, 10);
  });

  it('devuelve 0 cuando no hay datos utiles', () => {
    expect(e1rm(null, 5, 1)).toBe(0);
    expect(e1rm(100, null, 1)).toBe(0);
    expect(e1rm(0, 5, 1)).toBe(0);
    expect(e1rm(100, 0, 1)).toBe(0);
    expect(e1rm(-50, 5, 1)).toBe(0);
    expect(e1rm(Number.NaN, 5, 1)).toBe(0);
  });

  it('crece con las reps y con el RIR', () => {
    expect(e1rm(100, 6, 2)).toBeGreaterThan(e1rm(100, 5, 2));
    expect(e1rm(100, 5, 3)).toBeGreaterThan(e1rm(100, 5, 2));
  });

  it('redondea a un decimal', () => {
    expect(redondear1(123.456)).toBe(123.5);
    expect(redondear1(120)).toBe(120);
  });
});

describe('variacionPorcentual', () => {
  it('compara la ultima semana con datos contra la primera con datos', () => {
    expect(variacionPorcentual([0, 100, 0, 110])).toBeCloseTo(10, 10);
  });

  it('devuelve negativo cuando baja', () => {
    expect(variacionPorcentual([200, 180])).toBeCloseTo(-10, 10);
  });

  it('es null con menos de dos semanas con datos', () => {
    expect(variacionPorcentual([0, 0, 0])).toBeNull();
    expect(variacionPorcentual([100, 0, 0])).toBeNull();
  });
});

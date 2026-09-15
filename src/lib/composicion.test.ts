import { describe, expect, it } from 'vitest';
import type { Medicion } from '../db/db';
import { grasaDe, grasaNavyHombre, imc, indiceCinturaCadera } from './composicion';

const abril: Medicion = {
  fecha: '2026-04-01',
  semana: 0,
  saltoVertical: null,
  lateralIzq: null,
  lateralDer: null,
  horizontalIzq: null,
  horizontalDer: null,
  peso: 87.8,
  cintura: 96,
  cuello: 40,
  cadera: 108,
};

describe('composición corporal con cinta', () => {
  it('US Navy hombre con la medición de abril da ~24,3 %', () => {
    expect(grasaNavyHombre(96, 40, 170)).toBe(24.3);
  });

  it('no estima con datos incompletos o imposibles', () => {
    expect(grasaNavyHombre(null, 40, 170)).toBeNull();
    expect(grasaNavyHombre(96, null, 170)).toBeNull();
    expect(grasaNavyHombre(96, 40, null)).toBeNull();
    expect(grasaNavyHombre(40, 40, 170)).toBeNull();
    expect(grasaNavyHombre(96, 40, 17)).toBeNull();
  });

  it('más cintura con el mismo cuello sube la estimación', () => {
    expect(grasaNavyHombre(100, 40, 170) ?? 0).toBeGreaterThan(grasaNavyHombre(96, 40, 170) ?? 0);
  });

  it('IMC e índice cintura/cadera', () => {
    expect(imc(87.8, 170)).toBe(30.4);
    expect(imc(87.8, null)).toBeNull();
    expect(indiceCinturaCadera(96, 108)).toBe(0.89);
    expect(indiceCinturaCadera(96, null)).toBeNull();
  });

  it('la grasa anotada manda sobre la estimada', () => {
    expect(grasaDe(abril, 170)).toEqual({ valor: 24.3, metodo: 'cinta' });
    expect(grasaDe({ ...abril, grasa: 22 }, 170)).toEqual({ valor: 22, metodo: 'medida' });
    expect(grasaDe({ ...abril, cuello: null }, 170)).toBeNull();
    expect(grasaDe(abril, null)).toBeNull();
  });
});

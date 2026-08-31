import { describe, expect, it } from 'vitest';
import { PROGRAMA, ejercicioPorId, type Ejercicio } from '../data/programa';
import { faseDe, limitarSemana, planSemana } from './periodizacion';

const ej = (id: string): Ejercicio => {
  const e = ejercicioPorId(id);
  if (!e) throw new Error(`Falta ${id} en el programa`);
  return e;
};

describe('faseDe', () => {
  it('mapea cada semana a su fase', () => {
    expect(faseDe(1).nombre).toBe('Calibracion');
    expect(faseDe(2).nombre).toBe('Calibracion');
    expect(faseDe(3).nombre).toBe('Carga');
    expect(faseDe(5).nombre).toBe('Carga');
    expect(faseDe(6).nombre).toBe('Acumulacion');
    expect(faseDe(8).nombre).toBe('Descarga y retest');
  });

  it('acota semanas fuera de rango', () => {
    expect(limitarSemana(0)).toBe(1);
    expect(limitarSemana(99)).toBe(PROGRAMA.semanas);
    expect(faseDe(0).nombre).toBe('Calibracion');
    expect(faseDe(99).nombre).toBe('Descarga y retest');
  });
});

describe('planSemana (semana, ejercicio) => series y RIR', () => {
  const sentadilla = ej('sentadilla-barra'); // principal, 4 series base
  const rumano = ej('peso-muerto-rumano'); // rirFijo 3, 3 series
  const facepull = ej('face-pull'); // accesorio, RIR 2
  const salto = ej('salto-contramovimiento'); // 3 series base
  const plancha = ej('plancha-lateral');

  it('los principales bajan de RIR al avanzar las fases', () => {
    expect(planSemana(1, sentadilla).rirObjetivo).toBe(3);
    expect(planSemana(2, sentadilla).rirObjetivo).toBe(3);
    expect(planSemana(3, sentadilla).rirObjetivo).toBe(2);
    expect(planSemana(5, sentadilla).rirObjetivo).toBe(2);
    expect(planSemana(6, sentadilla).rirObjetivo).toBe(1);
    expect(planSemana(7, sentadilla).rirObjetivo).toBe(1);
  });

  it('los accesorios mantienen su propio RIR', () => {
    for (const s of [1, 3, 6]) expect(planSemana(s, facepull).rirObjetivo).toBe(2);
  });

  it('el RIR fijo ignora la fase', () => {
    for (const s of [1, 3, 6]) expect(planSemana(s, rumano).rirObjetivo).toBe(3);
  });

  it('la descarga manda sobre el RIR fijo y sobre los principales', () => {
    expect(planSemana(8, sentadilla).rirObjetivo).toBe(4);
    expect(planSemana(8, rumano).rirObjetivo).toBe(4);
    expect(planSemana(8, facepull).rirObjetivo).toBe(4);
  });

  it('mantiene las series base fuera de la descarga', () => {
    expect(planSemana(1, sentadilla).series).toBe(4);
    expect(planSemana(5, sentadilla).series).toBe(4);
    expect(planSemana(1, rumano).series).toBe(3);
  });

  it('recorta series en la descarga sin bajar del minimo', () => {
    expect(planSemana(8, sentadilla).series).toBe(2); // round(4 * 0.6) = 2
    expect(planSemana(8, rumano).series).toBe(2); // round(3 * 0.6) = 2, minimo 2
    expect(planSemana(8, plancha).series).toBe(2);
  });

  it('agrega una serie de salto en acumulacion', () => {
    expect(planSemana(5, salto).series).toBe(3);
    expect(planSemana(6, salto).series).toBe(4);
    expect(planSemana(7, salto).series).toBe(4);
    expect(planSemana(7, sentadilla).series).toBe(4); // el extra es solo para saltos
  });

  it('no aplica RIR de fase a tiempo ni a salto', () => {
    expect(planSemana(6, salto).rirObjetivo).toBe(0);
    expect(planSemana(8, plancha).rirObjetivo).toBe(0);
  });

  it('es estable: la misma entrada da siempre el mismo plan', () => {
    expect(planSemana(3, sentadilla)).toEqual(planSemana(3, sentadilla));
  });

  it('cubre todas las semanas del programa para todos los ejercicios', () => {
    for (let s = 1; s <= PROGRAMA.semanas; s++) {
      for (const sesion of PROGRAMA.sesiones) {
        for (const e of sesion.ejercicios) {
          const plan = planSemana(s, e);
          expect(plan.series).toBeGreaterThanOrEqual(1);
          expect(Number.isInteger(plan.series)).toBe(true);
          expect(plan.rirObjetivo).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

import { describe, expect, it } from 'vitest';
import type { Ejercicio } from '../data/programa';
import { cumpleDobleProgresion, incrementoSugerido } from './progresion';

const sentadilla: Ejercicio = {
  id: 'sentadilla-barra',
  nombre: 'Sentadilla con barra',
  bloque: 'B',
  series: 3,
  reps: [5, 6],
  rirObjetivo: 2,
  incremento: 5,
  tipo: 'carga',
  principal: true,
};

const plancha: Ejercicio = {
  id: 'plancha-lateral',
  nombre: 'Plancha lateral',
  bloque: 'D2',
  series: 3,
  reps: [25, 40],
  rirObjetivo: 0,
  incremento: 0,
  tipo: 'tiempo',
};

const core: Ejercicio = { ...sentadilla, id: 'core', nombre: 'Core', incremento: 0 };

describe('doble progresion', () => {
  it('sube cuando todas las series llegan al tope con RIR >= objetivo', () => {
    const series = [
      { kg: 60, reps: 6, rir: 2 },
      { kg: 60, reps: 6, rir: 3 },
      { kg: 60, reps: 7, rir: 2 },
    ];
    expect(cumpleDobleProgresion(sentadilla, series, 2)).toBe(true);
    expect(incrementoSugerido(sentadilla, series, 2)).toBe(5);
  });

  it('no sube si una sola serie queda bajo el tope', () => {
    const series = [
      { kg: 60, reps: 6, rir: 2 },
      { kg: 60, reps: 6, rir: 2 },
      { kg: 60, reps: 5, rir: 2 },
    ];
    expect(cumpleDobleProgresion(sentadilla, series, 2)).toBe(false);
    expect(incrementoSugerido(sentadilla, series, 2)).toBeNull();
  });

  it('no sube si el RIR quedo bajo el objetivo', () => {
    const series = [
      { kg: 60, reps: 6, rir: 2 },
      { kg: 60, reps: 6, rir: 1 },
    ];
    expect(cumpleDobleProgresion(sentadilla, series, 2)).toBe(false);
  });

  it('exige RIR anotado en todas las series', () => {
    const series = [
      { kg: 60, reps: 6, rir: 2 },
      { kg: 60, reps: 6, rir: null },
    ];
    expect(cumpleDobleProgresion(sentadilla, series, 2)).toBe(false);
  });

  it('exige carga anotada', () => {
    expect(cumpleDobleProgresion(sentadilla, [{ kg: null, reps: 6, rir: 3 }], 2)).toBe(false);
    expect(cumpleDobleProgresion(sentadilla, [{ kg: 0, reps: 6, rir: 3 }], 2)).toBe(false);
  });

  it('no aplica a ejercicios de tiempo ni de salto', () => {
    expect(cumpleDobleProgresion(plancha, [{ kg: 10, reps: 40, rir: 4 }], 0)).toBe(false);
    expect(cumpleDobleProgresion({ ...plancha, tipo: 'salto' }, [{ kg: 10, reps: 40, rir: 4 }], 0)).toBe(
      false,
    );
  });

  it('sin series registradas no propone nada', () => {
    expect(cumpleDobleProgresion(sentadilla, [], 2)).toBe(false);
    expect(incrementoSugerido(sentadilla, [], 2)).toBeNull();
  });

  it('cumple el criterio pero sin incremento definido no sugiere kg', () => {
    const series = [{ kg: 20, reps: 6, rir: 2 }];
    expect(cumpleDobleProgresion(core, series, 2)).toBe(true);
    expect(incrementoSugerido(core, series, 2)).toBeNull();
  });

  it('usa el objetivo de la semana en que se registro, no el actual', () => {
    const series = [{ kg: 60, reps: 6, rir: 3 }];
    expect(cumpleDobleProgresion(sentadilla, series, 3)).toBe(true);
    expect(cumpleDobleProgresion(sentadilla, series, 4)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { BIBLIOTECA } from '../data/biblioteca';
import type { RegistroSerie } from '../db/db';
import { calcularDiscos } from './discos';
import { e1rm } from './e1rm';
import { seriesPorMusculo } from './musculos';
import { historialDe, metricaPorSemana, recordsDe, recordsNuevos } from './records';

let n = 0;
function s(p: Partial<RegistroSerie> & Pick<RegistroSerie, 'semana'>): RegistroSerie {
  n += 1;
  return {
    id: `r${n}`,
    sesionId: 'martes',
    ejercicioId: 'sentadilla-barra',
    serie: 1,
    kg: null,
    reps: null,
    rir: null,
    segundos: null,
    hecha: false,
    actualizado: 0,
    ...p,
  };
}

describe('récords personales', () => {
  const historial = [
    s({ semana: 1, serie: 1, kg: 60, reps: 6, rir: 3 }),
    s({ semana: 1, serie: 2, kg: 60, reps: 6, rir: 2 }),
    s({ semana: 2, serie: 1, kg: 65, reps: 5, rir: 2 }),
    s({ semana: 2, serie: 1, kg: 100, reps: 3, tipo: 'calentamiento' }),
  ];

  it('calcula mayor peso, e1RM y volúmenes ignorando calentamientos', () => {
    const r = recordsDe(historial, 'sentadilla-barra');
    expect(r.mayorPeso).toMatchObject({ valor: 65, semana: 2 });
    // 65×5 @2 (80,2) supera a 60×6 @3 (78) aunque tenga menos volumen.
    expect(r.mejorE1rm?.valor).toBeCloseTo(e1rm(65, 5, 2), 10);
    expect(r.mejorE1rm?.semana).toBe(2);
    expect(r.mejorVolumenSerie).toMatchObject({ valor: 360, semana: 1 });
    expect(r.mejorVolumenSesion).toMatchObject({ valor: 720, semana: 1 });
  });

  it('sin datos no hay récords', () => {
    expect(recordsDe([], 'sentadilla-barra')).toEqual({
      mayorPeso: null,
      mejorE1rm: null,
      mejorVolumenSerie: null,
      mejorVolumenSesion: null,
    });
  });

  it('detecta una serie que supera el historial', () => {
    const nueva = s({ semana: 3, serie: 1, kg: 70, reps: 5, rir: 2 });
    expect(recordsNuevos([...historial, nueva], nueva)).toEqual(['mayorPeso', 'mejorE1rm']);
  });

  it('igualar un récord no es récord', () => {
    const igual = s({ semana: 3, serie: 1, kg: 65, reps: 5, rir: 2 });
    expect(recordsNuevos([...historial, igual], igual)).toEqual([]);
  });

  it('la primera vez que se hace un ejercicio no se celebra', () => {
    const primera = s({ semana: 1, serie: 1, kg: 40, reps: 8 });
    expect(recordsNuevos([primera], primera)).toEqual([]);
  });

  it('un calentamiento nunca es récord', () => {
    const w = s({ semana: 3, serie: 1, kg: 200, reps: 1, tipo: 'calentamiento' });
    expect(recordsNuevos([...historial, w], w)).toEqual([]);
  });

  it('agrupa la métrica por semana', () => {
    expect(metricaPorSemana(historial, 'sentadilla-barra', 'peso', 4)).toEqual([60, 65, 0, 0]);
    expect(metricaPorSemana(historial, 'sentadilla-barra', 'volumenSesion', 3)).toEqual([720, 325, 0]);
  });

  it('el historial va de lo más reciente a lo más antiguo, calentamientos primero', () => {
    const h = historialDe(historial, 'sentadilla-barra');
    expect(h.map((x) => x.semana)).toEqual([2, 1]);
    expect(h[0]?.series[0]?.tipo).toBe('calentamiento');
  });
});

describe('calculadora de discos', () => {
  it('reparte por lado de mayor a menor', () => {
    expect(calcularDiscos(100, 20)).toEqual({ porLado: [25, 15], logrado: 100, faltante: 0 });
    expect(calcularDiscos(62.5, 20).porLado).toEqual([20, 1.25]);
  });

  it('informa lo que no se puede armar', () => {
    const r = calcularDiscos(101, 20);
    expect(r.logrado).toBe(100);
    expect(r.faltante).toBe(1);
  });

  it('con la barra sola o menos no pone discos', () => {
    expect(calcularDiscos(20, 20).porLado).toEqual([]);
    expect(calcularDiscos(15, 20)).toMatchObject({ porLado: [], logrado: 20, faltante: 0 });
  });

  it('respeta los discos disponibles', () => {
    expect(calcularDiscos(60, 20, [10, 5]).porLado).toEqual([10, 10]);
  });
});

describe('series por músculo', () => {
  it('suma 1 al principal y 0,5 a secundarios, solo la semana pedida', () => {
    const registros = [
      s({ semana: 1, serie: 1, ejercicioId: 'press-banca', kg: 60, reps: 5 }),
      s({ semana: 1, serie: 2, ejercicioId: 'press-banca', kg: 60, reps: 5 }),
      s({ semana: 1, serie: 1, ejercicioId: 'press-banca', kg: 40, reps: 8, tipo: 'calentamiento' }),
      s({ semana: 2, serie: 1, ejercicioId: 'press-banca', kg: 60, reps: 5 }),
      s({ semana: 1, serie: 1, ejercicioId: 'plancha-lateral', segundos: 30 }),
    ];
    const r = seriesPorMusculo(registros, 1, BIBLIOTECA);
    expect(r.find((m) => m.musculo === 'pecho')?.series).toBe(2);
    expect(r.find((m) => m.musculo === 'triceps')?.series).toBe(1);
    expect(r.find((m) => m.musculo === 'abdominales')).toBeUndefined();
  });
});

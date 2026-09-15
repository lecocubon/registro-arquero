import { describe, expect, it } from 'vitest';
import { ejercicioPorId, type Ejercicio } from '../data/programa';
import type { RegistroSerie } from '../db/db';
import { progresoPorEjercicio } from './progreso';
import {
  MINUTOS_SESION_ABIERTA,
  resumenSesion,
  serieAnterior,
  ultimoRegistro,
  valoresParaCopiar,
} from './series';

const ej = (id: string): Ejercicio => {
  const e = ejercicioPorId(id);
  if (!e) throw new Error(id);
  return e;
};

let n = 0;
function serie(p: Partial<RegistroSerie> & Pick<RegistroSerie, 'semana' | 'serie'>): RegistroSerie {
  n += 1;
  return {
    id: `x${n}`,
    sesionId: 'martes',
    ejercicioId: 'sentadilla-barra',
    kg: null,
    reps: null,
    rir: null,
    segundos: null,
    hecha: false,
    actualizado: 0,
    ...p,
  };
}

describe('ultimoRegistro', () => {
  it('ignora calentamientos y series vacias', () => {
    const todas = [
      serie({ semana: 1, serie: 1, kg: 60, reps: 6, rir: 3 }),
      serie({ semana: 2, serie: 1, kg: 40, reps: 8, tipo: 'calentamiento' }),
      serie({ semana: 2, serie: 2 }),
    ];
    const r = ultimoRegistro(todas, 'sentadilla-barra', 3);
    expect(r?.semana).toBe(1);
    expect(r?.series).toHaveLength(1);
  });

  it('solo mira semanas anteriores a la actual', () => {
    const todas = [serie({ semana: 3, serie: 1, kg: 70, reps: 5 })];
    expect(ultimoRegistro(todas, 'sentadilla-barra', 3)).toBeNull();
  });
});

describe('serieAnterior', () => {
  const previas = [
    serie({ semana: 1, serie: 1, kg: 60, reps: 6 }),
    serie({ semana: 1, serie: 2, kg: 62.5, reps: 5 }),
  ];

  it('toma la misma serie de la vez anterior', () => {
    expect(serieAnterior(previas, 2)?.kg).toBe(62.5);
  });

  it('si hoy hay mas series, repite la ultima', () => {
    expect(serieAnterior(previas, 4)?.kg).toBe(62.5);
  });

  it('sin historial no hay anterior', () => {
    expect(serieAnterior([], 1)).toBeUndefined();
  });
});

describe('valoresParaCopiar', () => {
  it('copia kg, reps y RIR en ejercicios de carga', () => {
    const r = serie({ semana: 1, serie: 1, kg: 60, reps: 6, rir: 2 });
    expect(valoresParaCopiar(ej('sentadilla-barra'), r)).toEqual({ kg: 60, reps: 6, rir: 2 });
  });

  it('copia segundos en ejercicios de tiempo', () => {
    const r = serie({ semana: 1, serie: 1, segundos: 35 });
    expect(valoresParaCopiar(ej('plancha-lateral'), r)).toEqual({ segundos: 35 });
  });

  it('no copia nada en saltos ni desde series vacias', () => {
    const marcada = serie({ semana: 1, serie: 1, hecha: true });
    expect(valoresParaCopiar(ej('salto-contramovimiento'), marcada)).toBeUndefined();
    expect(valoresParaCopiar(ej('sentadilla-barra'), marcada)).toBeUndefined();
    expect(valoresParaCopiar(ej('sentadilla-barra'), undefined)).toBeUndefined();
  });
});

describe('resumenSesion', () => {
  const t0 = 1_000_000;

  it('sin registros no hay duracion', () => {
    const r = resumenSesion([], 20, undefined, t0);
    expect(r.duracionMs).toBeNull();
    expect(r.seriesHechas).toBe(0);
    expect(r.seriesPlanificadas).toBe(20);
  });

  it('suma volumen solo de series de trabajo', () => {
    const registros = [
      serie({ semana: 1, serie: 1, kg: 40, reps: 8, tipo: 'calentamiento', actualizado: t0 }),
      serie({ semana: 1, serie: 1, kg: 60, reps: 6, actualizado: t0 + 60_000 }),
      serie({ semana: 1, serie: 2, kg: 60, reps: 5, actualizado: t0 + 120_000 }),
    ];
    const r = resumenSesion(registros, 4, undefined, t0 + 180_000);
    expect(r.volumenKg).toBe(60 * 6 + 60 * 5);
    expect(r.seriesHechas).toBe(2);
  });

  it('cuenta como hecha una serie marcada sin numeros (saltos)', () => {
    const r = resumenSesion([serie({ semana: 1, serie: 1, hecha: true, actualizado: t0 })], 3, undefined, t0);
    expect(r.seriesHechas).toBe(1);
  });

  it('mientras hay actividad reciente la duracion corre hasta ahora', () => {
    const registros = [serie({ semana: 1, serie: 1, kg: 60, reps: 6, actualizado: t0 })];
    const r = resumenSesion(registros, 4, t0 - 30_000, t0 + 600_000);
    expect(r.enCurso).toBe(true);
    expect(r.duracionMs).toBe(630_000);
  });

  it('pasada la ventana de actividad, la duracion queda congelada', () => {
    const registros = [
      serie({ semana: 1, serie: 1, kg: 60, reps: 6, actualizado: t0 }),
      serie({ semana: 1, serie: 2, kg: 60, reps: 6, actualizado: t0 + 45 * 60_000 }),
    ];
    const muchoDespues = t0 + 45 * 60_000 + (MINUTOS_SESION_ABIERTA + 1) * 60_000;
    const r = resumenSesion(registros, 4, undefined, muchoDespues);
    expect(r.enCurso).toBe(false);
    expect(r.duracionMs).toBe(45 * 60_000);
  });
});

describe('progreso con calentamientos', () => {
  it('el e1RM ignora las series de calentamiento', () => {
    const filas = progresoPorEjercicio([
      serie({ semana: 1, serie: 1, kg: 100, reps: 5, tipo: 'calentamiento' }),
      serie({ semana: 1, serie: 1, kg: 60, reps: 6, rir: 3 }),
    ]);
    expect(filas[0]?.porSemana[0]).toBeCloseTo(60 * (1 + 9 / 30), 10);
  });
});

import { describe, expect, it } from 'vitest';
import { PROGRAMA, ejercicioPorId, type Ejercicio } from '../data/programa';
import {
  ajustarDescanso,
  descansoDe,
  formatoDuracion,
  formatoReloj,
  nuevoDescanso,
  restanteMs,
} from './descanso';

const ej = (id: string): Ejercicio => {
  const e = ejercicioPorId(id);
  if (!e) throw new Error(id);
  return e;
};

describe('descansoDe', () => {
  it('los principales usan el descanso de principales', () => {
    expect(descansoDe(ej('sentadilla-barra'))).toBe(PROGRAMA.descansos.principal);
  });

  it('los accesorios, tiempo y salto usan el de su tipo', () => {
    expect(descansoDe(ej('face-pull'))).toBe(PROGRAMA.descansos.carga);
    expect(descansoDe(ej('plancha-lateral'))).toBe(PROGRAMA.descansos.tiempo);
    expect(descansoDe(ej('salto-contramovimiento'))).toBe(PROGRAMA.descansos.salto);
  });

  it('el descanso propio del ejercicio manda', () => {
    expect(descansoDe(ej('bulgara'))).toBe(120);
    expect(descansoDe({ ...ej('sentadilla-barra'), descanso: 240 })).toBe(240);
  });
});

describe('temporizador de descanso', () => {
  const t0 = 10_000;

  it('calcula lo que queda a partir de la hora de termino', () => {
    const d = nuevoDescanso(90, 'face-pull', t0);
    expect(restanteMs(d, t0)).toBe(90_000);
    expect(restanteMs(d, t0 + 30_000)).toBe(60_000);
    expect(restanteMs(d, t0 + 200_000)).toBe(0);
  });

  it('+15 alarga el termino y la barra de progreso', () => {
    const d = nuevoDescanso(90, 'face-pull', t0);
    const mas = ajustarDescanso(d, 15, t0);
    expect(mas?.fin).toBe(d.fin + 15_000);
    expect(mas?.total).toBe(105_000);
  });

  it('-15 acorta sin tocar el total', () => {
    const d = nuevoDescanso(90, 'face-pull', t0);
    const menos = ajustarDescanso(d, -15, t0);
    expect(menos?.fin).toBe(d.fin - 15_000);
    expect(menos?.total).toBe(90_000);
  });

  it('restar mas de lo que queda termina el descanso', () => {
    const d = nuevoDescanso(10, 'face-pull', t0);
    expect(ajustarDescanso(d, -15, t0)).toBeNull();
  });
});

describe('formatos de tiempo', () => {
  it('reloj de descanso en m:ss, redondeando hacia arriba', () => {
    expect(formatoReloj(180_000)).toBe('3:00');
    expect(formatoReloj(95_000)).toBe('1:35');
    expect(formatoReloj(500)).toBe('0:01');
    expect(formatoReloj(0)).toBe('0:00');
  });

  it('duracion de sesion con horas cuando corresponde', () => {
    expect(formatoDuracion(125_000)).toBe('2:05');
    expect(formatoDuracion(3_725_000)).toBe('1:02:05');
  });
});

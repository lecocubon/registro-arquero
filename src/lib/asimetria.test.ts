import { describe, expect, it } from 'vitest';
import { asimetria, asimetriaAlta, UMBRAL_ASIMETRIA } from './asimetria';

describe('asimetria entre lados', () => {
  it('calcula |izq - der| / max(izq, der)', () => {
    expect(asimetria(100, 90)).toBeCloseTo(0.1, 10);
    expect(asimetria(90, 100)).toBeCloseTo(0.1, 10);
  });

  it('es 0 cuando los lados son iguales', () => {
    expect(asimetria(140, 140)).toBe(0);
  });

  it('es null si falta un lado o el dato no sirve', () => {
    expect(asimetria(null, 100)).toBeNull();
    expect(asimetria(100, null)).toBeNull();
    expect(asimetria(0, 100)).toBeNull();
    expect(asimetria(Number.NaN, 100)).toBeNull();
  });

  it('marca solo cuando supera el 12%', () => {
    expect(UMBRAL_ASIMETRIA).toBe(0.12);
    expect(asimetriaAlta(asimetria(100, 88))).toBe(false); // exactamente 12%
    expect(asimetriaAlta(asimetria(100, 87))).toBe(true); // 13%
    expect(asimetriaAlta(asimetria(100, 95))).toBe(false);
    expect(asimetriaAlta(null)).toBe(false);
  });

  it('el porcentaje no depende del orden de los lados', () => {
    expect(asimetriaAlta(asimetria(87, 100))).toBe(true);
  });
});

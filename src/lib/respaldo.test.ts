import { describe, expect, it } from 'vitest';
import type { Medicion, RegistroSerie, RegistroSesion } from '../db/db';
import { construirRespaldo, medicionesACsv, seriesACsv, validarRespaldo } from './respaldo';

const serie: RegistroSerie = {
  id: '3|martes|sentadilla-barra|1',
  semana: 3,
  sesionId: 'martes',
  ejercicioId: 'sentadilla-barra',
  serie: 1,
  kg: 60,
  reps: 6,
  rir: 2,
  segundos: null,
  hecha: false,
  actualizado: 1,
};

const sesion: RegistroSesion = {
  id: '3|martes',
  semana: 3,
  sesionId: 'martes',
  fecha: '2026-08-31',
  nota: 'dormi mal, "cansado"',
  actualizado: 1,
};

const medicion: Medicion = {
  id: 1,
  fecha: '2026-08-31',
  semana: 3,
  saltoVertical: 52,
  lateralIzq: 100,
  lateralDer: 87,
  horizontalIzq: null,
  horizontalDer: null,
  peso: 78.5,
  cintura: 82,
};

describe('respaldo JSON', () => {
  it('sobrevive un viaje de ida y vuelta', () => {
    const original = construirRespaldo({
      semana: 3,
      series: [serie],
      sesiones: [sesion],
      mediciones: [medicion],
    });
    const vuelta = validarRespaldo(JSON.parse(JSON.stringify(original)));
    expect(vuelta.series).toEqual([serie]);
    expect(vuelta.mediciones).toEqual([medicion]);
    expect(vuelta.semana).toBe(3);
  });

  it('rechaza archivos que no son de esta app', () => {
    expect(() => validarRespaldo({ app: 'otra-cosa' })).toThrow(/no es un respaldo/i);
    expect(() => validarRespaldo(null)).toThrow();
    expect(() => validarRespaldo({ app: 'registro-arquero' })).toThrow(/faltan/i);
  });
});

describe('CSV', () => {
  it('exporta el entrenamiento con e1RM y fecha de la sesion', () => {
    const csv = seriesACsv([serie], [sesion]);
    const [cabecera, fila] = csv.split('\n');
    expect(cabecera).toContain('e1rm');
    expect(fila).toContain('Sentadilla con barra');
    expect(fila).toContain('2026-08-31');
    expect(fila?.endsWith('76')).toBe(true); // 60 * (1 + 8/30) = 76
  });

  it('escapa comillas y comas en las celdas', () => {
    const csv = seriesACsv([serie], [{ ...sesion, fecha: 'a,b' }]);
    expect(csv).toContain('"a,b"');
  });

  it('exporta mediciones con la asimetria en porcentaje', () => {
    const csv = medicionesACsv([medicion]);
    const fila = csv.split('\n')[1];
    expect(fila).toContain('13'); // |100-87| / 100 = 13%
  });
});

import { describe, expect, it } from 'vitest';
import type { Medicion, RegistroSerie, RegistroSesion } from '../db/db';
import { PROGRAMA_BASE } from '../data/programa';
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

describe('respaldo v2', () => {
  it('incluye programa editado, ejercicios propios, notas y fotos', () => {
    const definicion = structuredClone(PROGRAMA_BASE);
    definicion.nombre = 'Pretemporada';
    const original = construirRespaldo({
      semana: 2,
      series: [serie],
      sesiones: [sesion],
      mediciones: [],
      definicionPrograma: definicion,
      ejerciciosPropios: [{ id: 'propio-x', nombre: 'Mío', tipo: 'carga', musculo: 'pecho', secundarios: [], equipo: ['otro'], indicaciones: [], propio: true }],
      notas: { 'press-banca': 'agarre 81 cm' },
      fotos: [{ ejercicioId: 'press-banca', dataUrl: 'data:image/jpeg;base64,AAAA' }],
    });
    const vuelta = validarRespaldo(JSON.parse(JSON.stringify(original)));
    expect(vuelta.version).toBe(2);
    expect(vuelta.definicionPrograma?.nombre).toBe('Pretemporada');
    expect(vuelta.ejerciciosPropios[0]?.id).toBe('propio-x');
    expect(vuelta.notas).toEqual({ 'press-banca': 'agarre 81 cm' });
    expect(vuelta.fotos).toHaveLength(1);
  });

  it('acepta respaldos v1 sin los campos nuevos', () => {
    const v1 = { app: 'registro-arquero', version: 1, semana: 3, series: [serie], sesiones: [], mediciones: [] };
    const r = validarRespaldo(v1);
    expect(r.version).toBe(1);
    expect(r.definicionPrograma).toBeNull();
    expect(r.ejerciciosPropios).toEqual([]);
    expect(r.fotos).toEqual([]);
  });

  it('rechaza un programa dañado y descarta fotos que no son imágenes', () => {
    const base = { app: 'registro-arquero', version: 2, series: [], mediciones: [] };
    expect(() => validarRespaldo({ ...base, definicionPrograma: { nombre: 'x' } })).toThrow(/dañado/);
    const r = validarRespaldo({ ...base, fotos: [{ ejercicioId: 'a', dataUrl: 'javascript:alert(1)' }] });
    expect(r.fotos).toEqual([]);
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

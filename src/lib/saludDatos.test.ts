import { describe, expect, it } from 'vitest';
import type { Medicion, RegistroSesion } from '../db/db';
import {
  fechaLocal,
  formatoHorasMinutos,
  idEntrenamientoSalud,
  medicionesDesdeSalud,
  resumenPulso,
  resumenSueno,
  semanaParaFecha,
  ultimoValor,
  type MuestraSalud,
} from './saludDatos';

/** ISO en hora local, para que la prueba no dependa de la zona horaria de quien la corre. */
const local = (anio: number, mes: number, dia: number, h = 8, min = 0) => new Date(anio, mes - 1, dia, h, min).toISOString();
const muestra = (value: number, inicio: string, fin = inicio, extra: Partial<MuestraSalud> = {}): MuestraSalud => ({
  value,
  startDate: inicio,
  endDate: fin,
  ...extra,
});

const sesion = (semana: number, fecha: string): RegistroSesion => ({
  id: `${semana}|martes`,
  semana,
  sesionId: 'martes',
  fecha,
  nota: '',
  actualizado: 0,
});

const medicionManual: Medicion = {
  id: 1,
  fecha: '2026-09-02',
  semana: 1,
  saltoVertical: 50,
  lateralIzq: null,
  lateralDer: null,
  horizontalIzq: null,
  horizontalDer: null,
  peso: 89.2,
  cintura: null,
};

describe('peso y grasa desde el reloj', () => {
  const pesos = [
    muestra(89.46, local(2026, 9, 1, 7)),
    muestra(89.9, local(2026, 9, 1, 21)),
    muestra(89.0, local(2026, 9, 2, 7)),
    muestra(88.71, local(2026, 9, 9, 7)),
  ];
  const grasas = [muestra(18.44, local(2026, 9, 9, 7)), muestra(19, local(2026, 9, 10, 7))];
  const sesiones = [sesion(1, '2026-09-01'), sesion(2, '2026-09-08')];

  it('crea una medición por día con la última lectura, redondeada', () => {
    const r = medicionesDesdeSalud(pesos, grasas, [], sesiones, 3);
    expect(r.map((m) => [m.fecha, m.peso, m.grasa])).toEqual([
      ['2026-09-01', 89.9, null],
      ['2026-09-02', 89, null],
      ['2026-09-09', 88.7, 18.4],
      ['2026-09-10', null, 19],
    ]);
    expect(r.every((m) => m.origen === 'reloj')).toBe(true);
  });

  it('no duplica días que ya tienen peso anotado', () => {
    const r = medicionesDesdeSalud(pesos, grasas, [medicionManual], sesiones, 3);
    expect(r.map((m) => m.fecha)).not.toContain('2026-09-02');
  });

  it('asigna la semana según las sesiones registradas', () => {
    expect(semanaParaFecha('2026-09-09', sesiones, 5)).toBe(2);
    expect(semanaParaFecha('2026-09-01', sesiones, 5)).toBe(1);
    expect(semanaParaFecha('2026-08-20', sesiones, 5)).toBe(1);
    expect(semanaParaFecha('2026-08-20', [], 5)).toBe(5);
  });

  it('descarta lecturas inválidas', () => {
    expect(medicionesDesdeSalud([muestra(0, local(2026, 9, 1)), muestra(Number.NaN, local(2026, 9, 2))], [], [], [], 1)).toEqual([]);
  });

  it('agrupa por fecha local', () => {
    expect(fechaLocal(local(2026, 9, 1, 23, 50))).toBe('2026-09-01');
  });
});

describe('sueño de anoche', () => {
  const ahora = new Date(2026, 8, 15, 9, 0).getTime();

  it('suma las fases dormidas y descarta el tiempo despierto', () => {
    const noche = muestra(480, local(2026, 9, 14, 23, 0), local(2026, 9, 15, 7, 0), {
      stages: [
        { stage: 'light', durationMinutes: 240 },
        { stage: 'deep', durationMinutes: 90 },
        { stage: 'rem', durationMinutes: 80 },
        { stage: 'awake', durationMinutes: 70 },
      ],
    });
    expect(resumenSueno([noche], ahora)).toMatchObject({ minutos: 410 });
  });

  it('sin fases usa el estado de cada muestra', () => {
    const tramos = [
      muestra(300, local(2026, 9, 14, 23), local(2026, 9, 15, 4), { sleepState: 'asleep' }),
      muestra(20, local(2026, 9, 15, 4), local(2026, 9, 15, 4, 20), { sleepState: 'awake' }),
      muestra(100, local(2026, 9, 15, 4, 20), local(2026, 9, 15, 6), { sleepState: 'asleep' }),
    ];
    expect(resumenSueno(tramos, ahora)?.minutos).toBe(400);
  });

  it('ignora noches anteriores', () => {
    const vieja = muestra(420, local(2026, 9, 12, 23), local(2026, 9, 13, 6), { sleepState: 'asleep' });
    expect(resumenSueno([vieja], ahora)).toBeNull();
  });

  it('formatea horas y minutos', () => {
    expect(formatoHorasMinutos(400)).toBe('6 h 40 min');
    expect(formatoHorasMinutos(420)).toBe('7 h');
    expect(formatoHorasMinutos(45)).toBe('45 min');
  });
});

describe('pulso y otros', () => {
  it('resume pulso promedio y máximo ignorando lecturas absurdas', () => {
    const lecturas = [100, 140, 160, 0, 400].map((v, i) => muestra(v, local(2026, 9, 15, 8, i)));
    expect(resumenPulso(lecturas)).toEqual({ promedio: 133, maximo: 160, lecturas: 3 });
    expect(resumenPulso([])).toBeNull();
  });

  it('toma el último valor por fecha', () => {
    expect(ultimoValor([muestra(58, local(2026, 9, 13)), muestra(55.6, local(2026, 9, 14)), muestra(60, local(2026, 9, 12))])).toBe(56);
    expect(ultimoValor([])).toBeNull();
  });

  it('el id del entrenamiento es estable por semana y sesión', () => {
    expect(idEntrenamientoSalud(3, 'martes')).toBe('arquero|3|martes');
  });
});

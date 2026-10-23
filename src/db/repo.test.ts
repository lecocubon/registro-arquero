import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, idSerie, serieVacia, type RegistroSerie } from './db';
import {
  agregarSerie,
  leerPrograma,
  moverSeries,
  prepararPrimerUso,
  quitarSerie,
  reabrirSesion,
  terminarSesion,
} from './repo';

const SEMANA = 2;
const SESION = 'martes';

function serie(ejercicioId: string, numero: number, kg: number | null): RegistroSerie {
  return {
    ...serieVacia(SEMANA, SESION, ejercicioId, numero),
    kg,
    reps: kg === null ? null : 10,
    rir: kg === null ? null : 2,
    actualizado: Date.now(),
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('series extra', () => {
  it('agrega una serie vacia y la puede quitar', async () => {
    await agregarSerie(SEMANA, SESION, 'press-banca', 5);
    const id = idSerie(SEMANA, SESION, 'press-banca', 5);
    expect((await db.series.get(id))?.kg).toBeNull();
    await quitarSerie(SEMANA, SESION, 'press-banca', 5);
    expect(await db.series.get(id)).toBeUndefined();
  });
});

describe('mover series a otro ejercicio', () => {
  it('cambia el ejercicio conservando numero y valores', async () => {
    await db.series.bulkPut([serie('press-banca', 1, 40), serie('press-banca', 2, 40)]);

    const movidas = await moverSeries(SEMANA, SESION, 'press-banca', 'press-banca-smith');

    expect(movidas).toBe(2);
    expect(await db.series.where('ejercicioId').equals('press-banca').count()).toBe(0);
    const nuevas = await db.series.where('ejercicioId').equals('press-banca-smith').sortBy('serie');
    expect(nuevas.map((r) => [r.id, r.serie, r.kg])).toEqual([
      [idSerie(SEMANA, SESION, 'press-banca-smith', 1), 1, 40],
      [idSerie(SEMANA, SESION, 'press-banca-smith', 2), 2, 40],
    ]);
  });

  it('no pisa un ejercicio que ya tiene series anotadas ese dia', async () => {
    await db.series.bulkPut([serie('press-banca', 1, 40), serie('press-banca-smith', 1, 60)]);

    await expect(moverSeries(SEMANA, SESION, 'press-banca', 'press-banca-smith')).rejects.toThrow(/ya tiene series/);
    expect(await db.series.where('ejercicioId').equals('press-banca').count()).toBe(1);
  });

  it('reemplaza las filas vacias que el destino tuviera abiertas', async () => {
    await db.series.bulkPut([serie('press-banca', 1, 40), serie('press-banca-smith', 1, null)]);

    expect(await moverSeries(SEMANA, SESION, 'press-banca', 'press-banca-smith')).toBe(1);
    const nuevas = await db.series.where('ejercicioId').equals('press-banca-smith').toArray();
    expect(nuevas.map((r) => r.kg)).toEqual([40]);
  });

  it('no hace nada si es el mismo ejercicio o no hay series', async () => {
    expect(await moverSeries(SEMANA, SESION, 'press-banca', 'press-banca')).toBe(0);
    expect(await moverSeries(SEMANA, SESION, 'press-banca', 'press-banca-smith')).toBe(0);
  });
});

describe('primer uso', () => {
  it('un telefono sin nada arranca sin sesiones', async () => {
    await prepararPrimerUso();
    expect((await leerPrograma())?.sesiones).toEqual([]);
  });

  it('un telefono con historial se queda con el programa de fabrica', async () => {
    await agregarSerie(SEMANA, SESION, 'press-banca', 1);
    await prepararPrimerUso();
    expect(await leerPrograma()).toBeNull();
  });

  it('no pisa el programa que ya habia', async () => {
    await prepararPrimerUso();
    await agregarSerie(SEMANA, SESION, 'press-banca', 1);
    await prepararPrimerUso();
    expect((await leerPrograma())?.sesiones).toEqual([]);
  });
});

describe('terminar sesion', () => {
  const t0 = Date.UTC(2026, 9, 23, 10, 0);
  const minuto = 60_000;
  const entreno = Array.from({ length: 20 }, (_, i) => ({
    ...serie('sentadilla-barra', i + 1, 60),
    actualizado: t0 + i * 2 * minuto,
  }));
  const correccion = { ...serie('sentadilla-barra', 21, 60), actualizado: t0 + 5 * 60 * minuto };

  it('congela el final en el bloque de entrenamiento, no en la correccion posterior', async () => {
    await db.sesiones.put({
      id: `${SEMANA}|${SESION}`,
      semana: SEMANA,
      sesionId: SESION,
      fecha: '2026-10-23',
      nota: '',
      inicio: t0,
      actualizado: t0,
    });
    await terminarSesion(SEMANA, SESION, [...entreno, correccion]);
    expect((await db.sesiones.get(`${SEMANA}|${SESION}`))?.fin).toBe(t0 + 19 * 2 * minuto);
  });

  it('reabrirla borra el final', async () => {
    await db.sesiones.put({
      id: `${SEMANA}|${SESION}`,
      semana: SEMANA,
      sesionId: SESION,
      fecha: '2026-10-23',
      nota: '',
      inicio: t0,
      fin: t0 + minuto,
      actualizado: t0,
    });
    await reabrirSesion(SEMANA, SESION);
    expect((await db.sesiones.get(`${SEMANA}|${SESION}`))?.fin).toBeUndefined();
  });
});

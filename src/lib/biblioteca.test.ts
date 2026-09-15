import { describe, expect, it } from 'vitest';
import { BIBLIOTECA, catalogoPorId, filtrarBiblioteca, normalizarTexto } from '../data/biblioteca';
import { PROGRAMA, PROGRAMA_BASE, ejerciciosDelDia, resolverPrograma } from '../data/programa';

describe('biblioteca', () => {
  it('no repite ids', () => {
    const ids = BIBLIOTECA.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contiene todos los ejercicios del programa de fábrica', () => {
    for (const s of PROGRAMA_BASE.sesiones) {
      for (const e of s.ejercicios) expect(catalogoPorId(e.id), e.id).toBeDefined();
    }
  });

  it('cada ejercicio tiene músculo, equipo e indicaciones', () => {
    for (const e of BIBLIOTECA) {
      expect(e.equipo.length, e.id).toBeGreaterThan(0);
      expect(e.indicaciones.length, e.id).toBeGreaterThan(0);
      expect(e.secundarios, e.id).not.toContain(e.musculo);
    }
  });

  it('busca sin importar tildes ni mayúsculas', () => {
    expect(normalizarTexto('Bíceps')).toBe('biceps');
    const r = filtrarBiblioteca(BIBLIOTECA, { texto: 'JALON' });
    expect(r.map((e) => e.id)).toContain('jalon-pecho');
  });

  it('todas las palabras deben coincidir', () => {
    const r = filtrarBiblioteca(BIBLIOTECA, { texto: 'press barra' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => normalizarTexto(`${e.nombre} ${e.equipo.join(' ')}`).includes('press'))).toBe(true);
  });

  it('filtra por músculo mostrando primero los que lo tienen como principal', () => {
    const r = filtrarBiblioteca(BIBLIOTECA, { musculo: 'triceps' });
    const primerSecundario = r.findIndex((e) => e.musculo !== 'triceps');
    const ultimoPrincipal = r.map((e) => e.musculo).lastIndexOf('triceps');
    expect(primerSecundario).toBeGreaterThan(ultimoPrincipal);
    expect(r.some((e) => e.id === 'press-banca')).toBe(true); // secundario
  });

  it('filtra por equipo y tipo', () => {
    expect(filtrarBiblioteca(BIBLIOTECA, { equipo: 'polea' }).every((e) => e.equipo.includes('polea'))).toBe(true);
    expect(filtrarBiblioteca(BIBLIOTECA, { tipo: 'tiempo' }).every((e) => e.tipo === 'tiempo')).toBe(true);
  });
});

describe('programa resuelto', () => {
  it('toma nombre y tipo de la biblioteca', () => {
    const sentadilla = PROGRAMA.sesiones[1]?.ejercicios.find((e) => e.id === 'sentadilla-barra');
    expect(sentadilla?.nombre).toBe('Sentadilla con barra');
    expect(sentadilla?.tipo).toBe('carga');
    expect(PROGRAMA.sesiones[0]?.ejercicios.find((e) => e.id === 'plancha-lateral')?.tipo).toBe('tiempo');
  });

  it('un ejercicio que ya no está en la biblioteca no rompe la sesión', () => {
    const p = resolverPrograma({
      ...PROGRAMA_BASE,
      sesiones: [{ id: 'x', nombre: 'X', lugar: '', foco: '', ejercicios: [{ id: 'borrado', bloque: 'A', series: 3, reps: [5, 5], rirObjetivo: 2, incremento: 2 }] }],
    });
    expect(p.sesiones[0]?.ejercicios[0]).toMatchObject({ nombre: 'borrado', tipo: 'carga' });
  });

  it('el reemplazo del día hereda la prescripción del original', () => {
    const martes = PROGRAMA.sesiones.find((s) => s.id === 'martes');
    if (!martes) throw new Error('falta martes');
    const dia = ejerciciosDelDia(martes, { 'sentadilla-barra': 'prensa' }, BIBLIOTECA);
    const fila = dia.find((d) => d.original?.id === 'sentadilla-barra');
    expect(fila?.ejercicio).toMatchObject({ id: 'prensa', nombre: 'Prensa de piernas', series: 4, reps: [5, 6], principal: true });
    expect(dia.filter((d) => d.original)).toHaveLength(1);
  });
});

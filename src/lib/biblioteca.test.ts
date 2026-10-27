import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BIBLIOTECA, catalogoPorId, filtrarBiblioteca, normalizarTexto } from '../data/biblioteca';
import { PROGRAMA, PROGRAMA_BASE, PROGRAMA_MESO2, ejerciciosDelDia, resolverPrograma } from '../data/programa';

describe('biblioteca', () => {
  it('no repite ids', () => {
    const ids = BIBLIOTECA.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contiene todos los ejercicios de los dos mesociclos de fábrica', () => {
    for (const p of [PROGRAMA_BASE, PROGRAMA_MESO2]) {
      for (const s of p.sesiones) {
        for (const e of s.ejercicios) expect(catalogoPorId(e.id), e.id).toBeDefined();
      }
    }
  });

  it('cada ejercicio tiene músculo, equipo, claves y pasos', () => {
    for (const e of BIBLIOTECA) {
      expect(e.equipo.length, e.id).toBeGreaterThan(0);
      expect(e.indicaciones.length, e.id).toBeGreaterThan(0);
      expect(e.pasos?.length ?? 0, e.id).toBeGreaterThan(0);
      expect(e.secundarios, e.id).not.toContain(e.musculo);
    }
  });

  it('cada ejercicio explica el movimiento y sus errores', () => {
    for (const e of BIBLIOTECA) {
      expect(e.movimiento?.length ?? 0, e.id).toBeGreaterThan(80);
      expect(e.errores?.length ?? 0, e.id).toBeGreaterThan(1);
    }
  });

  it('cada ejercicio tiene imagen: dos fotos o un dibujo propio', () => {
    for (const e of BIBLIOTECA) {
      if (e.dibujo) {
        // Un dibujo en secuencia necesita todos sus cuadros: <id>.svg, <id>-2.svg...
        for (let n = 1; n <= (e.dibujos ?? 1); n += 1) {
          const archivo = `${e.id}${n > 1 ? `-${n}` : ''}.svg`;
          expect(existsSync(`public/ejercicios/${archivo}`), archivo).toBe(true);
        }
        continue;
      }
      expect(Boolean(e.fuenteImagen), `${e.id} sin imagen`).toBe(true);
      for (const sufijo of ['', '-fin']) {
        expect(existsSync(`public/ejercicios/${e.id}${sufijo}.webp`), `${e.id}${sufijo}`).toBe(true);
      }
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
    const sesion = (id: string) => PROGRAMA.sesiones.find((s) => s.id === id);
    const sentadilla = sesion('jueves')?.ejercicios.find((e) => e.id === 'sentadilla-barra');
    expect(sentadilla?.nombre).toBe('Sentadilla con barra');
    expect(sentadilla?.tipo).toBe('carga');
    expect(sesion('martes')?.ejercicios.find((e) => e.id === 'plancha-lateral')?.tipo).toBe('tiempo');
    expect(sesion('movilidad')?.ejercicios.find((e) => e.id === 'arco-corto')?.tipo).toBe('movilidad');
  });

  it('un ejercicio que ya no está en la biblioteca no rompe la sesión', () => {
    const p = resolverPrograma({
      ...PROGRAMA_BASE,
      sesiones: [{ id: 'x', nombre: 'X', lugar: '', foco: '', ejercicios: [{ id: 'borrado', bloque: 'A', series: 3, reps: [5, 5], rirObjetivo: 2, incremento: 2 }] }],
    });
    expect(p.sesiones[0]?.ejercicios[0]).toMatchObject({ nombre: 'borrado', tipo: 'carga' });
  });

  it('un ejercicio agregado hoy va al final, con prescripción por defecto', () => {
    const jueves = PROGRAMA.sesiones.find((s) => s.id === 'jueves');
    if (!jueves) throw new Error('falta jueves');
    const dia = ejerciciosDelDia(jueves, undefined, BIBLIOTECA, [
      { id: 'extension-cuadriceps' },
      { id: 'press-banca-smith', calentamiento: true },
    ]);
    expect(dia).toHaveLength(jueves.ejercicios.length + 2);
    const agregado = dia.at(-2);
    expect(agregado?.ejercicio).toMatchObject({ id: 'extension-cuadriceps', series: 3, reps: [8, 10] });
    expect(agregado?.extra).toEqual({ id: 'extension-cuadriceps' });
    expect(dia.at(-1)?.extra?.calentamiento).toBe(true);
    // Bloques nuevos, sin repetir los que ya usa la sesión.
    const bloques = dia.map((f) => f.ejercicio.bloque);
    expect(new Set(bloques).size).toBe(bloques.length);
  });

  it('ignora un agregado que ya no existe en la biblioteca', () => {
    const jueves = PROGRAMA.sesiones.find((s) => s.id === 'jueves');
    if (!jueves) throw new Error('falta jueves');
    expect(ejerciciosDelDia(jueves, undefined, BIBLIOTECA, [{ id: 'borrado' }])).toHaveLength(jueves.ejercicios.length);
  });

  it('el reemplazo del día hereda la prescripción del original', () => {
    const jueves = PROGRAMA.sesiones.find((s) => s.id === 'jueves');
    if (!jueves) throw new Error('falta jueves');
    const dia = ejerciciosDelDia(jueves, { 'sentadilla-barra': 'sentadilla-hack' }, BIBLIOTECA);
    const fila = dia.find((d) => d.original?.id === 'sentadilla-barra');
    expect(fila?.ejercicio).toMatchObject({ id: 'sentadilla-hack', nombre: 'Sentadilla hack en máquina', series: 4, reps: [5, 6], principal: true });
    expect(dia.filter((d) => d.original)).toHaveLength(1);
  });
});

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BIBLIOTECA, type EjercicioCatalogo } from '../data/biblioteca';
import { PROGRAMA_BASE, resolverPrograma, type Programa, type ProgramaDef } from '../data/programa';
import { db } from '../db/db';
import { leerPrograma } from '../db/repo';

interface EstadoArquero {
  /** Programa en uso, con nombres y tipos resueltos. */
  programa: Programa;
  /** Definicion editable del programa en uso. */
  definicion: ProgramaDef;
  /** true si el programa fue editado en la app. */
  personalizado: boolean;
  /** Biblioteca de fabrica mas los ejercicios propios. */
  catalogo: EjercicioCatalogo[];
  /** Ids con foto propia, para no consultar la base por cada miniatura. */
  conFoto: Set<string>;
}

const Contexto = createContext<EstadoArquero | null>(null);

export function ProveedorArquero({ children }: { children: ReactNode }) {
  const guardado = useLiveQuery(() => leerPrograma(), [], undefined);
  const propios = useLiveQuery(() => db.ejerciciosPropios.toArray(), [], []);
  const fotos = useLiveQuery(() => db.fotos.toCollection().primaryKeys(), [], []);

  const valor = useMemo<EstadoArquero>(() => {
    const catalogo = [...BIBLIOTECA, ...propios.filter((p) => !BIBLIOTECA.some((b) => b.id === p.id))];
    const definicion = guardado ?? PROGRAMA_BASE;
    return {
      programa: resolverPrograma(definicion, catalogo),
      definicion,
      personalizado: Boolean(guardado),
      catalogo,
      conFoto: new Set(fotos),
    };
  }, [guardado, propios, fotos]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useArquero(): EstadoArquero {
  const v = useContext(Contexto);
  if (!v) throw new Error('useArquero fuera de ProveedorArquero');
  return v;
}

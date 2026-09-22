import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Pantalla superpuesta (ficha, editor, selector). Agrega una entrada al
 * historial para que el gesto "atras" de Android cierre la capa de arriba en
 * vez de salir de la app.
 */
const pila: number[] = [];
const cierres = new Map<number, () => void>();
let siguiente = 1;
/** "Atras" disparados por la app al cerrar una capa por codigo: no cierran otra. */
let atrasPropios = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (atrasPropios > 0) {
      atrasPropios -= 1;
      return;
    }
    const arriba = pila.pop();
    if (arriba !== undefined) cierres.get(arriba)?.();
  });
}

/** Hay alguna pantalla superpuesta abierta (la cierra el "atras"). */
export function hayCapas(): boolean {
  return pila.length > 0;
}

interface Props {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  accion?: ReactNode;
}

export function Capa({ titulo, onCerrar, children, accion }: Props) {
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    const id = siguiente++;
    pila.push(id);
    cierres.set(id, () => cerrar.current());
    window.history.pushState({ capa: id }, '');

    return () => {
      cierres.delete(id);
      const i = pila.lastIndexOf(id);
      if (i >= 0) {
        // Se cerro por codigo: consumir la entrada de historial sin cerrar otra capa.
        pila.splice(i, 1);
        atrasPropios += 1;
        window.history.back();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ground" role="dialog" aria-label={titulo}>
      <header className="pad-top-safe flex items-center gap-2 border-b border-line bg-surface px-2 pb-2">
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[26px] leading-none text-ink2"
        >
          ‹
        </button>
        <h2 className="min-w-0 flex-1 truncate font-display text-[18px] font-bold tracking-[0.03em] uppercase">
          {titulo}
        </h2>
        {accion}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[640px] px-3.5 pt-3.5 pb-[140px]">{children}</div>
      </div>
    </div>
  );
}

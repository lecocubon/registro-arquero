import { useState } from 'react';
import { useInstalacion } from '../lib/instalacion';

const CLAVE_OCULTO = 'arquero-aviso-instalar-oculto';

/** Banner de instalacion. Desaparece solo cuando la app ya esta instalada. */
export function AvisoInstalar() {
  const { instalada, puedeInstalar, ios, instalar } = useInstalacion();
  const [oculto, setOculto] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_OCULTO) === '1';
    } catch {
      return false;
    }
  });

  if (instalada || oculto) return null;

  const ocultar = () => {
    setOculto(true);
    try {
      localStorage.setItem(CLAVE_OCULTO, '1');
    } catch {
      /* modo privado: se vuelve a mostrar, no pasa nada */
    }
  };

  return (
    <div className="mb-3.5 rounded-lg border border-line bg-surface px-3.5 py-3">
      <p className="font-display text-[13px] font-bold tracking-[0.13em] text-ink3 uppercase">
        Instalar en el telefono
      </p>
      {puedeInstalar ? (
        <>
          <p className="mt-1.5 text-[13.5px] leading-snug text-ink2">
            Queda como una app mas, con su icono, y despues funciona sin conexion.
          </p>
          <button
            type="button"
            onClick={() => void instalar()}
            className="mt-2.5 h-[46px] w-full rounded-[10px] bg-accent font-display text-[15px] font-bold tracking-[0.1em] text-on-accent uppercase"
          >
            Instalar
          </button>
        </>
      ) : ios ? (
        <p className="mt-1.5 text-[13.5px] leading-snug text-ink2">
          En Safari: boton <b className="font-semibold text-ink">Compartir</b> (el cuadrado con la
          flecha) → <b className="font-semibold text-ink">Anadir a pantalla de inicio</b>. Despues
          abrela desde el icono, no desde Safari.
        </p>
      ) : (
        <p className="mt-1.5 text-[13.5px] leading-snug text-ink2">
          En Chrome: menu <b className="font-semibold text-ink">⋮</b> →{' '}
          <b className="font-semibold text-ink">Instalar aplicacion</b> (o "Anadir a pantalla de
          inicio").
        </p>
      )}
      <button
        type="button"
        onClick={ocultar}
        className="mt-2 text-[12.5px] text-ink3 underline"
      >
        Ya la instale, no mostrar mas
      </button>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { vibrar } from '../lib/dispositivo';
import { CampoNumero } from './CampoNumero';

interface Props {
  ariaLabel: string;
  valor: number | null;
  /** Rango objetivo en segundos: vibra al llegar al minimo y al maximo. */
  objetivo: [number, number];
  onCambio: (segundos: number | null) => void;
  onTerminar: (segundos: number) => void;
}

/** Campo de segundos con cronometro. Al detenerlo guarda el tiempo. */
export function CampoTiempo({ ariaLabel, valor, objetivo, onCambio, onTerminar }: Props) {
  const [inicio, setInicio] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const avisos = useRef({ minimo: false, maximo: false });

  useEffect(() => {
    if (inicio === null) return;
    const t = setInterval(() => setAhora(Date.now()), 200);
    return () => clearInterval(t);
  }, [inicio]);

  const transcurrido = inicio === null ? 0 : Math.floor((ahora - inicio) / 1000);
  const [minimo, maximo] = objetivo;

  useEffect(() => {
    if (inicio === null) return;
    if (!avisos.current.minimo && transcurrido >= minimo) {
      avisos.current.minimo = true;
      vibrar(150);
    }
    if (!avisos.current.maximo && transcurrido >= maximo) {
      avisos.current.maximo = true;
      vibrar([150, 100, 150]);
    }
  }, [inicio, transcurrido, minimo, maximo]);

  const alternar = () => {
    if (inicio === null) {
      avisos.current = { minimo: false, maximo: false };
      const t = Date.now();
      setAhora(t);
      setInicio(t);
      return;
    }
    const segundos = Math.floor((Date.now() - inicio) / 1000);
    setInicio(null);
    if (segundos >= 1) onTerminar(segundos);
  };

  return (
    <div className="flex min-w-0 gap-1.5">
      {inicio === null ? (
        <CampoNumero etiqueta="Segundos" ariaLabel={ariaLabel} valor={valor} onCambio={onCambio} />
      ) : (
        <div
          role="timer"
          className="relative flex h-[52px] min-w-0 flex-1 items-center justify-center rounded-[10px] border border-accent bg-field pt-3"
        >
          <span className="absolute inset-x-0 top-1 text-center text-[9.5px] font-medium tracking-[0.11em] text-accent uppercase">
            {transcurrido >= minimo ? `En rango · ${minimo}–${maximo}s` : `Meta ${minimo}–${maximo}s`}
          </span>
          <span className="text-[17px] font-semibold text-ink tabular-nums">{transcurrido}s</span>
        </div>
      )}
      <button
        type="button"
        onClick={alternar}
        aria-label={inicio === null ? `${ariaLabel}: iniciar cronometro` : `${ariaLabel}: detener y guardar`}
        className={`flex h-[52px] w-12 shrink-0 items-center justify-center rounded-[10px] border text-[18px] ${
          inicio === null ? 'border-line text-accent' : 'border-accent bg-accent text-on-accent'
        }`}
      >
        {inicio === null ? '▶' : '■'}
      </button>
    </div>
  );
}

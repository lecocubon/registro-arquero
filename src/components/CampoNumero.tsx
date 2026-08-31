import { useEffect, useRef, useState } from 'react';
import { aNumero, textoDe } from '../lib/numeros';

interface Props {
  etiqueta: string;
  valor: number | null | undefined;
  onCambio: (valor: number | null) => void;
  alto?: 'normal' | 'alto';
  ariaLabel?: string;
}

export function CampoNumero({ etiqueta, valor, onCambio, alto = 'normal', ariaLabel }: Props) {
  const [texto, setTexto] = useState(() => textoDe(valor));
  const propio = useRef<number | null>(valor ?? null);

  // Solo re-sincroniza cuando el valor cambia por fuera (import, cambio de semana).
  useEffect(() => {
    const externo = valor ?? null;
    if (externo !== propio.current) {
      propio.current = externo;
      setTexto(textoDe(externo));
    }
  }, [valor]);

  return (
    <label className="relative min-w-0 flex-1">
      <span className="pointer-events-none absolute inset-x-0 top-1 text-center text-[9.5px] font-medium tracking-[0.11em] text-ink3 uppercase">
        {etiqueta}
      </span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel ?? etiqueta}
        value={texto}
        onChange={(e) => {
          const t = e.target.value;
          setTexto(t);
          const n = aNumero(t);
          propio.current = n;
          onCambio(n);
        }}
        className={`w-full rounded-[10px] border border-line bg-field px-1 pt-4 pb-0.5 text-center text-[17px] font-semibold text-ink tabular-nums outline-none focus:border-accent ${
          alto === 'alto' ? 'h-[58px]' : 'h-[52px]'
        }`}
      />
    </label>
  );
}

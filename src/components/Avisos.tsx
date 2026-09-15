import { useEffect, useState } from 'react';
import { vibrar } from '../lib/dispositivo';

interface Aviso {
  id: number;
  texto: string;
  tono: 'record' | 'info' | 'error';
}

const EVENTO = 'arquero:aviso';
let siguiente = 1;

/** Muestra un aviso breve desde cualquier parte de la app. */
export function avisar(texto: string, tono: Aviso['tono'] = 'info'): void {
  window.dispatchEvent(new CustomEvent<Aviso>(EVENTO, { detail: { id: siguiente++, texto, tono } }));
}

const DURACION_MS = 3200;

export function Avisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    const alAvisar = (e: Event) => {
      const aviso = (e as CustomEvent<Aviso>).detail;
      if (aviso.tono === 'record') vibrar([80, 60, 80, 60, 160]);
      setAvisos((a) => [...a.slice(-2), aviso]);
      setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== aviso.id)), DURACION_MS);
    };
    window.addEventListener(EVENTO, alAvisar);
    return () => window.removeEventListener(EVENTO, alAvisar);
  }, []);

  if (!avisos.length) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}
    >
      {avisos.map((a) => (
        <div
          key={a.id}
          className={`max-w-[440px] rounded-xl px-4 py-2.5 text-center text-[14px] font-semibold shadow-lg ${
            a.tono === 'record'
              ? 'bg-accent text-on-accent'
              : a.tono === 'error'
                ? 'bg-warn text-on-accent'
                : 'bg-ink text-ground'
          }`}
        >
          {a.texto}
        </div>
      ))}
    </div>
  );
}

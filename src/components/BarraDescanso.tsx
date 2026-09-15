import { useEffect, useRef, useState } from 'react';
import { catalogoPorId } from '../data/biblioteca';
import { sumarDescanso, terminarDescanso } from '../db/repo';
import { formatoReloj, restanteMs, type EstadoDescanso } from '../lib/descanso';
import { vibrar } from '../lib/dispositivo';
import { useArquero } from '../estado/arquero';

/** Si al volver a la app el descanso termino hace mas que esto, no se avisa. */
const MARGEN_AVISO_MS = 5000;
const PERMANENCIA_AL_TERMINAR_MS = 4000;

const BOTON =
  'flex h-11 min-w-12 items-center justify-center rounded-[10px] border border-line px-2.5 font-display text-[15px] font-bold tracking-[0.04em] text-ink2';

export function BarraDescanso({ estado }: { estado: EstadoDescanso }) {
  const { catalogo } = useArquero();
  const [ahora, setAhora] = useState(() => Date.now());
  const avisado = useRef<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const restante = restanteMs(estado, ahora);
  const terminado = restante === 0;

  useEffect(() => {
    if (!terminado || avisado.current === estado.fin) return;
    avisado.current = estado.fin;
    const reciente = Date.now() - estado.fin < MARGEN_AVISO_MS;
    if (reciente && document.visibilityState === 'visible') vibrar([300, 150, 300]);
    const t = setTimeout(
      () => void terminarDescanso(estado.fin),
      reciente ? PERMANENCIA_AL_TERMINAR_MS : 0,
    );
    return () => clearTimeout(t);
  }, [terminado, estado.fin]);

  const progreso = estado.total > 0 ? Math.min(1, restante / estado.total) : 0;
  const nombre = catalogoPorId(estado.ejercicioId, catalogo)?.nombre;

  return (
    <div
      role="timer"
      aria-label="Descanso"
      className="fixed inset-x-0 z-40 border-t border-line bg-surface"
      style={{ bottom: 'calc(var(--spacing-tab) + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="h-[3px] bg-accent" style={{ width: `${progreso * 100}%` }} />
      <div className="mx-auto flex max-w-[640px] items-center gap-2 px-3.5 py-2">
        <button type="button" className={BOTON} onClick={() => void sumarDescanso(-15)} aria-label="Restar 15 segundos">
          −15
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div
            className={`font-display text-[30px] leading-none font-bold tabular-nums ${terminado ? 'text-accent' : 'text-ink'}`}
          >
            {terminado ? 'A la serie' : formatoReloj(restante)}
          </div>
          {nombre && (
            <div className="mt-0.5 truncate text-[10.5px] tracking-[0.06em] text-ink3 uppercase">
              Descanso · {nombre}
            </div>
          )}
        </div>
        <button type="button" className={BOTON} onClick={() => void sumarDescanso(15)} aria-label="Sumar 15 segundos">
          +15
        </button>
        <button
          type="button"
          onClick={() => void terminarDescanso()}
          className="flex h-11 items-center justify-center rounded-[10px] bg-accent px-3 font-display text-[15px] font-bold tracking-[0.08em] text-on-accent uppercase"
        >
          Omitir
        </button>
      </div>
    </div>
  );
}

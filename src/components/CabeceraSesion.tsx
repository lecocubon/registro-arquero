import { useEffect, useState } from 'react';
import type { RegistroSerie } from '../db/db';
import { formatoDuracion } from '../lib/descanso';
import { resumenSesion } from '../lib/series';

interface Props {
  registros: RegistroSerie[];
  seriesPlanificadas: number;
  inicio: number | undefined;
}

const KG = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

function Dato({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] tracking-[0.08em] text-ink3 uppercase">{etiqueta}</div>
      <div
        className={`truncate font-display text-[19px] leading-tight font-bold tabular-nums ${destacado ? 'text-accent' : 'text-ink'}`}
      >
        {valor}
      </div>
    </div>
  );
}

/** Duracion, volumen de trabajo y series registradas. Fija bajo la barra superior. */
export function CabeceraSesion({ registros, seriesPlanificadas, inicio }: Props) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const r = resumenSesion(registros, seriesPlanificadas, inicio, ahora);

  return (
    <div
      className="sticky z-20 -mx-3.5 mb-3 grid grid-cols-3 gap-2 border-b border-line bg-ground px-3.5 py-2"
      style={{ top: 'var(--alto-cabecera, 57px)' }}
    >
      <Dato
        etiqueta="Duracion"
        valor={r.duracionMs === null ? '—' : formatoDuracion(r.duracionMs)}
        destacado={r.enCurso}
      />
      <Dato etiqueta="Volumen" valor={`${KG.format(r.volumenKg)} kg`} />
      <Dato etiqueta="Series" valor={`${r.seriesHechas}/${r.seriesPlanificadas}`} />
    </div>
  );
}

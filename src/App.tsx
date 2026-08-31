import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarraPestanas, type Pestana } from './components/BarraPestanas';
import { PROGRAMA } from './data/programa';
import { db } from './db/db';
import { fijarSemana, semanaActual } from './db/repo';
import { faseDe, limitarSemana } from './lib/periodizacion';
import { PantallaDatos } from './screens/PantallaDatos';
import { PantallaHoy } from './screens/PantallaHoy';
import { PantallaMedidas } from './screens/PantallaMedidas';
import { PantallaProgreso } from './screens/PantallaProgreso';

export default function App() {
  const [pestana, setPestana] = useState<Pestana>('hoy');
  const [dia, setDia] = useState<string | null>(null);

  const semana = useLiveQuery(() => semanaActual(), [], 1);
  const todas = useLiveQuery(() => db.series.toArray(), [], []);
  const sesiones = useLiveQuery(() => db.sesiones.toArray(), [], []);
  const mediciones = useLiveQuery(() => db.mediciones.toArray(), [], []);

  const fase = faseDe(semana);

  const cambiarSemana = (delta: number) => {
    const nueva = limitarSemana(semana + delta);
    if (nueva !== semana) void fijarSemana(nueva);
  };

  return (
    <>
      <header className="pad-top-safe sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface px-3.5 pb-2.5">
        <h1 className="min-w-0 flex-1 truncate font-display text-[18px] leading-none font-bold tracking-[0.02em] uppercase">
          {PROGRAMA.nombre}
          <small className="mt-1 block font-sans text-[10.5px] font-normal tracking-[0.07em] text-ink3 uppercase">
            Semana {semana} · {fase.nombre}
          </small>
        </h1>
        <div className="flex items-center gap-0.5 rounded-full bg-surface2 p-[3px]">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => cambiarSemana(-1)}
            className="flex size-[30px] items-center justify-center rounded-full text-[17px] font-semibold text-ink2"
          >
            −
          </button>
          <span className="min-w-[52px] px-1 text-center font-display text-[14px] font-bold tracking-[0.08em] uppercase">
            Sem {semana}
          </span>
          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={() => cambiarSemana(1)}
            className="flex size-[30px] items-center justify-center rounded-full text-[17px] font-semibold text-ink2"
          >
            +
          </button>
        </div>
      </header>

      <main
        className="mx-auto max-w-[640px] px-3.5 py-3.5"
        style={{ paddingBottom: 'calc(var(--spacing-tab) + 24px + env(safe-area-inset-bottom, 0px))' }}
      >
        {pestana === 'hoy' && (
          <PantallaHoy
            semana={semana}
            dia={dia}
            onAbrir={setDia}
            todas={todas}
            sesiones={sesiones}
          />
        )}
        {pestana === 'progreso' && <PantallaProgreso todas={todas} />}
        {pestana === 'medidas' && <PantallaMedidas semana={semana} mediciones={mediciones} />}
        {pestana === 'datos' && (
          <PantallaDatos
            semana={semana}
            todas={todas}
            sesiones={sesiones}
            mediciones={mediciones}
          />
        )}
      </main>

      <BarraPestanas
        activa={pestana}
        onCambio={(p) => {
          setPestana(p);
          setDia(null);
          window.scrollTo(0, 0);
        }}
      />
    </>
  );
}

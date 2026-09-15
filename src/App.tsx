import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Avisos } from './components/Avisos';
import { BarraDescanso } from './components/BarraDescanso';
import { BarraPestanas, type Pestana } from './components/BarraPestanas';
import { db } from './db/db';
import { fijarSemana, leerDescanso, semanaActual } from './db/repo';
import { useArquero } from './estado/arquero';
import { usePantallaActiva } from './lib/dispositivo';
import { faseDe, limitarSemana } from './lib/periodizacion';
import { PantallaDatos } from './screens/PantallaDatos';
import { PantallaHoy } from './screens/PantallaHoy';
import { PantallaMedidas } from './screens/PantallaMedidas';
import { PantallaPrograma } from './screens/PantallaPrograma';
import { PantallaProgreso } from './screens/PantallaProgreso';

export default function App() {
  const { programa } = useArquero();
  const [pestana, setPestana] = useState<Pestana>('hoy');
  const [dia, setDia] = useState<string | null>(null);

  const semanaGuardada = useLiveQuery(() => semanaActual(), [], 1);
  // Si el programa se acorta, la semana guardada puede quedar fuera de rango.
  const semana = limitarSemana(semanaGuardada, programa);
  const todas = useLiveQuery(() => db.series.toArray(), [], []);
  const sesiones = useLiveQuery(() => db.sesiones.toArray(), [], []);
  const mediciones = useLiveQuery(() => db.mediciones.toArray(), [], []);
  const descanso = useLiveQuery(() => leerDescanso(), [], null);
  const cabecera = useRef<HTMLElement>(null);

  usePantallaActiva(dia !== null || descanso !== null);

  // La cabecera de la sesion se pega justo debajo de la barra superior.
  useEffect(() => {
    const el = cabecera.current;
    if (!el) return;
    const medir = () =>
      document.documentElement.style.setProperty('--alto-cabecera', `${el.offsetHeight}px`);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const fase = faseDe(semana, programa);

  const cambiarSemana = (delta: number) => {
    const nueva = limitarSemana(semana + delta, programa);
    if (nueva !== semana) void fijarSemana(nueva);
  };

  return (
    <>
      <header ref={cabecera} className="pad-top-safe sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface px-3.5 pb-2.5">
        <h1 className="min-w-0 flex-1 truncate font-display text-[18px] leading-none font-bold tracking-[0.02em] uppercase">
          {programa.nombre}
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
        style={{
          paddingBottom: `calc(var(--spacing-tab) + ${descanso ? 96 : 24}px + env(safe-area-inset-bottom, 0px))`,
        }}
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
        {pestana === 'progreso' && <PantallaProgreso semana={semana} todas={todas} />}
        {pestana === 'programa' && <PantallaPrograma todas={todas} />}
        {pestana === 'medidas' && <PantallaMedidas semana={semana} mediciones={mediciones} sesiones={sesiones} />}
        {pestana === 'datos' && (
          <PantallaDatos
            semana={semana}
            todas={todas}
            sesiones={sesiones}
            mediciones={mediciones}
          />
        )}
      </main>

      {descanso && <BarraDescanso key={descanso.fin} estado={descanso} />}
      <Avisos />

      <BarraPestanas
        activa={pestana}
        onCambio={(p) => {
          // Cambiar de pestana no cierra la sesion abierta; tocar Hoy estando en Hoy vuelve a la lista.
          if (p === 'hoy' && pestana === 'hoy') setDia(null);
          setPestana(p);
          window.scrollTo(0, 0);
        }}
      />
    </>
  );
}

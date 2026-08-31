import { PROGRAMA } from '../data/programa';
import { idSesion, tieneDatos, type RegistroSerie, type RegistroSesion } from '../db/db';
import { guardarNota } from '../db/repo';
import { faseDe } from '../lib/periodizacion';
import { fechaCorta } from '../lib/numeros';
import { AvisoInstalar } from '../components/AvisoInstalar';
import { TarjetaEjercicio } from '../components/TarjetaEjercicio';
import { useState } from 'react';

interface Props {
  semana: number;
  dia: string | null;
  onAbrir: (dia: string | null) => void;
  todas: RegistroSerie[];
  sesiones: RegistroSesion[];
}

function NotaDeSesion({ semana, sesionId, valor }: { semana: number; sesionId: string; valor: string }) {
  // Se remonta con key={semana|sesionId}, asi que el estado inicial siempre
  // corresponde a la sesion abierta.
  const [texto, setTexto] = useState(valor);
  return (
    <input
      type="text"
      value={texto}
      aria-label="Notas de la sesion"
      placeholder="Notas de la sesion (sueno, energia, molestias)"
      onChange={(e) => {
        setTexto(e.target.value);
        void guardarNota(semana, sesionId, e.target.value);
      }}
      className="mt-1 h-[46px] w-full rounded-[10px] border border-line bg-field px-3 text-[14px] text-ink outline-none focus:border-accent"
    />
  );
}

export function PantallaHoy({ semana, dia, onAbrir, todas, sesiones }: Props) {
  const fase = faseDe(semana);

  if (dia) {
    const plan = PROGRAMA.sesiones.find((s) => s.id === dia);
    if (!plan) return <p className="py-6 text-ink3">Sesion no encontrada.</p>;

    const registros = new Map(
      todas.filter((r) => r.semana === semana && r.sesionId === dia).map((r) => [r.id, r]),
    );
    const nota = sesiones.find((s) => s.id === idSesion(semana, dia))?.nota ?? '';

    return (
      <>
        <button
          type="button"
          onClick={() => onAbrir(null)}
          className="mb-3 inline-flex items-center gap-1.5 font-display text-[13px] font-semibold tracking-[0.12em] text-ink3 uppercase"
        >
          ‹ Volver
        </button>
        <p className="mb-2.5 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">
          {plan.nombre} · {plan.lugar}
        </p>

        {plan.ejercicios.map((ej) => (
          <TarjetaEjercicio
            key={ej.id}
            semana={semana}
            sesionId={dia}
            ejercicio={ej}
            registros={registros}
            todas={todas}
          />
        ))}

        <NotaDeSesion key={`${semana}|${dia}`} semana={semana} sesionId={dia} valor={nota} />
        <p className="mt-3 mb-2 text-[12.5px] leading-relaxed text-ink3">
          Todo se guarda solo, tecla a tecla. Puedes cerrar la app cuando quieras.
        </p>
      </>
    );
  }

  return (
    <>
      <AvisoInstalar />
      <p className="mb-3.5 rounded-lg bg-accent-soft px-3.5 py-2.5 text-[13.5px] leading-snug text-accent-ink">
        {fase.nota}
      </p>
      <p className="mb-2.5 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">
        Sesiones de la semana
      </p>
      <div className="grid gap-2.5">
        {PROGRAMA.sesiones.map((s) => {
          const registradas = todas.filter(
            (r) => r.semana === semana && r.sesionId === s.id && tieneDatos(r),
          ).length;
          const meta = sesiones.find((x) => x.id === idSesion(semana, s.id));
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onAbrir(s.id);
                window.scrollTo(0, 0);
              }}
              className="flex w-full items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-3.5 text-left"
            >
              <span
                className={`size-2.5 shrink-0 rounded-full ${registradas ? 'bg-accent' : 'bg-line2'}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[19px] font-bold tracking-[0.05em] uppercase">
                  {s.nombre}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink2">{s.foco}</span>
                <span
                  className={`mt-1 block text-[11.5px] tracking-[0.03em] ${registradas ? 'text-accent-ink' : 'text-ink3'}`}
                >
                  {registradas
                    ? `Registrada ${meta ? fechaCorta(meta.fecha) : ''} · ${registradas} ${registradas === 1 ? 'serie' : 'series'}`
                    : s.lugar}
                </span>
              </span>
              <span className="shrink-0 text-[20px] text-ink3">›</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

import { useState } from 'react';
import { CampoNumero } from '../components/CampoNumero';
import { hoy, type Medicion } from '../db/db';
import { borrarMedicion, guardarMedicion } from '../db/repo';
import { asimetria, asimetriaAlta } from '../lib/asimetria';
import { fechaCorta } from '../lib/numeros';
import { redondear1 } from '../lib/e1rm';

type Campos = Omit<Medicion, 'id' | 'fecha' | 'semana'>;

const VACIO: Campos = {
  saltoVertical: null,
  lateralIzq: null,
  lateralDer: null,
  horizontalIzq: null,
  horizontalDer: null,
  peso: null,
  cintura: null,
};

function Asimetria({ izq, der }: { izq: number | null; der: number | null }) {
  const v = asimetria(izq, der);
  if (v === null) return null;
  const alta = asimetriaAlta(v);
  return (
    <span
      className={`ml-1 inline-block rounded-full px-2 py-px text-[11.5px] font-semibold ${
        alta ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent-ink'
      }`}
    >
      {redondear1(v * 100)}%{alta ? ' ⚠' : ''}
    </span>
  );
}

export function PantallaMedidas({ semana, mediciones }: { semana: number; mediciones: Medicion[] }) {
  const [campos, setCampos] = useState<Campos>(VACIO);
  const [aviso, setAviso] = useState('');

  const set = (k: keyof Campos) => (v: number | null) => setCampos((c) => ({ ...c, [k]: v }));
  const hayAlgo = Object.values(campos).some((v) => v !== null);

  return (
    <>
      <p className="mb-2.5 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">
        Nueva medicion
      </p>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <div className="col-span-2 flex">
          <CampoNumero
            etiqueta="Salto vertical (cm)"
            alto="alto"
            valor={campos.saltoVertical}
            onCambio={set('saltoVertical')}
          />
        </div>
        <div className="flex">
          <CampoNumero
            etiqueta="Lateral izq (cm)"
            alto="alto"
            valor={campos.lateralIzq}
            onCambio={set('lateralIzq')}
          />
        </div>
        <div className="flex">
          <CampoNumero
            etiqueta="Lateral der (cm)"
            alto="alto"
            valor={campos.lateralDer}
            onCambio={set('lateralDer')}
          />
        </div>
        <div className="flex">
          <CampoNumero
            etiqueta="Horizontal izq (cm)"
            alto="alto"
            valor={campos.horizontalIzq}
            onCambio={set('horizontalIzq')}
          />
        </div>
        <div className="flex">
          <CampoNumero
            etiqueta="Horizontal der (cm)"
            alto="alto"
            valor={campos.horizontalDer}
            onCambio={set('horizontalDer')}
          />
        </div>
        <div className="flex">
          <CampoNumero etiqueta="Peso (kg)" alto="alto" valor={campos.peso} onCambio={set('peso')} />
        </div>
        <div className="flex">
          <CampoNumero
            etiqueta="Cintura (cm)"
            alto="alto"
            valor={campos.cintura}
            onCambio={set('cintura')}
          />
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink3">
        <span>
          Asimetria lateral
          <Asimetria izq={campos.lateralIzq} der={campos.lateralDer} />
        </span>
        <span>
          Asimetria horizontal
          <Asimetria izq={campos.horizontalIzq} der={campos.horizontalDer} />
        </span>
      </div>

      <button
        type="button"
        disabled={!hayAlgo}
        onClick={() => {
          void guardarMedicion({ fecha: hoy(), semana, ...campos }).then(() => {
            setCampos(VACIO);
            setAviso('Medicion guardada');
            setTimeout(() => setAviso(''), 2200);
          });
        }}
        className="h-[52px] w-full rounded-[11px] bg-accent font-display text-[17px] font-bold tracking-[0.1em] text-on-accent uppercase disabled:opacity-50"
      >
        Guardar medicion
      </button>
      {aviso && <p className="mt-2 text-[13px] text-accent-ink">{aviso}</p>}

      {mediciones.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2.5 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">
            Historial
          </p>
          {[...mediciones]
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
            .map((m) => (
              <article
                key={m.id}
                className="mb-2 rounded-[11px] border border-line bg-surface px-3.5 py-3 text-[13.5px]"
              >
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="font-display text-[14px] font-bold tracking-[0.08em] text-accent uppercase">
                    Semana {m.semana} · {fechaCorta(m.fecha)}
                  </span>
                  <button
                    type="button"
                    onClick={() => m.id !== undefined && void borrarMedicion(m.id)}
                    className="text-[12px] text-ink3 underline"
                  >
                    Borrar
                  </button>
                </div>
                <div className="leading-relaxed text-ink2">
                  {m.saltoVertical !== null && (
                    <span>
                      Vertical <b className="font-semibold text-ink tabular-nums">{m.saltoVertical} cm</b>
                      {' · '}
                    </span>
                  )}
                  {(m.lateralIzq !== null || m.lateralDer !== null) && (
                    <span>
                      Lateral{' '}
                      <b className="font-semibold text-ink tabular-nums">
                        {m.lateralIzq ?? '?'} / {m.lateralDer ?? '?'}
                      </b>
                      <Asimetria izq={m.lateralIzq} der={m.lateralDer} />
                      {' · '}
                    </span>
                  )}
                  {(m.horizontalIzq !== null || m.horizontalDer !== null) && (
                    <span>
                      Horizontal{' '}
                      <b className="font-semibold text-ink tabular-nums">
                        {m.horizontalIzq ?? '?'} / {m.horizontalDer ?? '?'}
                      </b>
                      <Asimetria izq={m.horizontalIzq} der={m.horizontalDer} />
                      {' · '}
                    </span>
                  )}
                  {m.peso !== null && (
                    <span>
                      Peso <b className="font-semibold text-ink tabular-nums">{m.peso} kg</b>
                      {' · '}
                    </span>
                  )}
                  {m.cintura !== null && (
                    <span>
                      Cintura <b className="font-semibold text-ink tabular-nums">{m.cintura} cm</b>
                    </span>
                  )}
                </div>
              </article>
            ))}
        </div>
      ) : (
        <p className="mt-5 text-[14px] leading-relaxed text-ink3">
          Haz la linea base antes de la primera sesion: salto vertical contra la pared, salto lateral
          y horizontal a una pierna (3 intentos por lado, aterrizando y sosteniendo 2 s), peso y
          cintura. Se marca la asimetria cuando supera el 12%.
        </p>
      )}
    </>
  );
}

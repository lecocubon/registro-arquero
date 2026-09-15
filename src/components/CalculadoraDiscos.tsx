import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { fijarBarraKg, leerBarraKg } from '../db/repo';
import { BARRAS, calcularDiscos, DISCOS_ESTANDAR } from '../lib/discos';
import { aNumero, textoDe } from '../lib/numeros';
import { Capa } from './Capa';

const NUM = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });

/** Alto de cada disco en la vista, proporcional a su peso. */
function altoDisco(kg: number): number {
  return 44 + Math.min(1, kg / 25) * 76;
}

export function CalculadoraDiscos({ kgInicial, onCerrar }: { kgInicial: number | null; onCerrar: () => void }) {
  const barra = useLiveQuery(() => leerBarraKg(), [], 20);
  const [texto, setTexto] = useState(textoDe(kgInicial));
  const objetivo = aNumero(texto) ?? 0;
  const r = calcularDiscos(objetivo, barra, DISCOS_ESTANDAR);

  return (
    <Capa titulo="Calculadora de discos" onCerrar={onCerrar}>
      <label className="mb-1.5 block font-display text-[12.5px] font-bold tracking-[0.13em] text-ink3 uppercase" htmlFor="discos-kg">
        Peso total (kg)
      </label>
      <input
        id="discos-kg"
        inputMode="decimal"
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="mb-4 h-14 w-full rounded-[10px] border border-line bg-field px-3 text-center font-display text-[28px] font-bold text-ink tabular-nums outline-none focus:border-accent"
      />

      <span className="mb-1.5 block font-display text-[12.5px] font-bold tracking-[0.13em] text-ink3 uppercase">Barra</span>
      <div className="mb-5 grid grid-cols-4 gap-1.5">
        {BARRAS.map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={barra === b}
            onClick={() => void fijarBarraKg(b)}
            className={`h-11 rounded-[10px] border text-[14px] font-semibold ${
              barra === b ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink2'
            }`}
          >
            {b === 0 ? 'Sin barra' : `${b} kg`}
          </button>
        ))}
      </div>

      {objetivo <= 0 ? (
        <p className="text-[14px] text-ink3">Escribe el peso total que quieres levantar.</p>
      ) : objetivo < barra ? (
        <p className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-[14px] text-warn">
          {NUM.format(objetivo)} kg es menos que la barra de {barra} kg.
        </p>
      ) : (
        <>
          <p className="mb-2 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">En cada lado</p>
          {r.porLado.length ? (
            <div className="mb-3 flex min-h-[130px] items-center gap-1.5 overflow-x-auto rounded-xl border border-line bg-surface px-3 py-2">
              <div className="h-2.5 w-8 shrink-0 rounded-full bg-line2" aria-hidden="true" />
              {r.porLado.map((d, i) => (
                <div
                  key={i}
                  className="flex w-10 shrink-0 items-center justify-center rounded-md bg-accent font-display text-[14px] font-bold text-on-accent"
                  style={{ height: altoDisco(d) }}
                >
                  {NUM.format(d)}
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-3 text-[14px] text-ink3">Solo la barra.</p>
          )}
          <p className="text-[15px] text-ink">
            {r.porLado.length ? `${r.porLado.map((d) => NUM.format(d)).join(' + ')} por lado` : ''}
          </p>
          <p className="mt-1 text-[13.5px] text-ink3">
            Total armado: <b className="font-semibold text-ink">{NUM.format(r.logrado)} kg</b>
            {r.faltante > 0 && (
              <span className="text-warn"> · faltan {NUM.format(r.faltante)} kg (no hay discos para eso)</span>
            )}
          </p>
        </>
      )}
      <p className="mt-6 text-[12px] leading-relaxed text-ink3">
        Discos considerados: {DISCOS_ESTANDAR.map((d) => NUM.format(d)).join(', ')} kg.
      </p>
    </Capa>
  );
}

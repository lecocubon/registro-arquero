import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { avisar } from '../components/Avisos';
import { CampoNumero } from '../components/CampoNumero';
import { importarMedicionesDelReloj } from '../components/Reloj';
import { hoy, type Medicion, type RegistroSesion } from '../db/db';
import { borrarMedicion, fijarAlturaCm, guardarMedicion, leerAlturaCm } from '../db/repo';
import { asimetria, asimetriaAlta } from '../lib/asimetria';
import { grasaDe, grasaNavyHombre, imc, indiceCinturaCadera } from '../lib/composicion';
import { redondear1 } from '../lib/e1rm';
import { fechaCorta } from '../lib/numeros';
import { useSalud } from '../lib/salud';
import { semanaParaFecha } from '../lib/saludDatos';

type Numericos = Pick<
  Medicion,
  'saltoVertical' | 'lateralIzq' | 'lateralDer' | 'horizontalIzq' | 'horizontalDer' | 'peso' | 'cintura'
> & { grasa: number | null; cuello: number | null; cadera: number | null };

const VACIO: Numericos = {
  saltoVertical: null,
  lateralIzq: null,
  lateralDer: null,
  horizontalIzq: null,
  horizontalDer: null,
  peso: null,
  cintura: null,
  grasa: null,
  cuello: null,
  cadera: null,
};

const ETIQUETA = 'mb-2.5 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase';
const NUM = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });

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

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <span>
      {nombre} <b className="font-semibold text-ink tabular-nums">{valor}</b>
    </span>
  );
}

function Campo({ nombre, valor, onCambio, ancho }: { nombre: string; valor: number | null; onCambio: (v: number | null) => void; ancho?: boolean }) {
  return (
    <div className={`flex ${ancho ? 'col-span-2' : ''}`}>
      <CampoNumero etiqueta={nombre} alto="alto" valor={valor} onCambio={onCambio} />
    </div>
  );
}

export function PantallaMedidas({
  semana,
  mediciones,
  sesiones,
}: {
  semana: number;
  mediciones: Medicion[];
  sesiones: RegistroSesion[];
}) {
  const { estado, tiene } = useSalud();
  const altura = useLiveQuery(() => leerAlturaCm(), [], null);
  const [campos, setCampos] = useState<Numericos>(VACIO);
  const [fecha, setFecha] = useState(hoy());
  const [nota, setNota] = useState('');

  const set = (k: keyof Numericos) => (v: number | null) => setCampos((c) => ({ ...c, [k]: v }));
  const hayAlgo = Object.values(campos).some((v) => v !== null);

  const grasaEstimada = grasaNavyHombre(campos.cintura, campos.cuello, altura);
  const imcActual = imc(campos.peso, altura);
  const icc = indiceCinturaCadera(campos.cintura, campos.cadera);

  const guardar = () => {
    void guardarMedicion({
      ...campos,
      fecha,
      // Antes de la primera sesion registrada cuenta como "antes del programa" (semana 0).
      semana: fecha === hoy() ? semana : semanaParaFecha(fecha, sesiones, semana),
      origen: 'manual',
      ...(nota.trim() ? { nota: nota.trim() } : {}),
    }).then(() => {
      setCampos(VACIO);
      setNota('');
      setFecha(hoy());
      avisar('Medición guardada');
    });
  };

  const ordenadas = [...mediciones].sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.id ?? 0) - (a.id ?? 0));

  return (
    <>
      <p className={ETIQUETA}>Nueva medición</p>

      <div className="mb-2.5 grid grid-cols-2 gap-2.5">
        <label className="relative flex min-w-0">
          <span className="pointer-events-none absolute inset-x-0 top-1 text-center text-[9.5px] font-medium tracking-[0.11em] text-ink3 uppercase">
            Fecha
          </span>
          <input
            type="date"
            value={fecha}
            max={hoy()}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
            className="h-[58px] w-full min-w-0 rounded-[10px] border border-line bg-field px-1 pt-4 pb-0.5 text-center text-[15px] font-semibold text-ink outline-none focus:border-accent"
          />
        </label>
        <div className="flex">
          <CampoNumero
            etiqueta="Tu altura (cm)"
            alto="alto"
            valor={altura}
            onCambio={(v) => v !== null && v >= 100 && void fijarAlturaCm(v)}
          />
        </div>
      </div>

      <p className="mt-4 mb-2 text-[12px] font-medium tracking-[0.08em] text-ink3 uppercase">Peso y cinta métrica</p>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <Campo nombre="Peso (kg)" valor={campos.peso} onCambio={set('peso')} />
        <Campo nombre="Cintura (cm)" valor={campos.cintura} onCambio={set('cintura')} />
        <Campo nombre="Cuello (cm)" valor={campos.cuello} onCambio={set('cuello')} />
        <Campo nombre="Cadera (cm)" valor={campos.cadera} onCambio={set('cadera')} />
        <Campo nombre="Grasa medida (%) · opcional" valor={campos.grasa} onCambio={set('grasa')} ancho />
      </div>

      {(grasaEstimada !== null || imcActual !== null || icc !== null) && (
        <div className="mb-3 grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
          <div>
            <div className="text-[10px] tracking-[0.08em] text-ink3 uppercase">Grasa (cinta)</div>
            <div className="font-display text-[19px] font-bold text-ink tabular-nums">
              {grasaEstimada !== null ? `≈${NUM.format(grasaEstimada)} %` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.08em] text-ink3 uppercase">IMC</div>
            <div className="font-display text-[19px] font-bold text-ink tabular-nums">
              {imcActual !== null ? NUM.format(imcActual) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.08em] text-ink3 uppercase">Cint./cadera</div>
            <div className="font-display text-[19px] font-bold text-ink tabular-nums">
              {icc !== null ? NUM.format(icc) : '—'}
            </div>
          </div>
        </div>
      )}
      {altura === null && (campos.cuello !== null || campos.peso !== null) && (
        <p className="mb-3 text-[12.5px] text-warn">Anota tu altura para calcular grasa estimada e IMC.</p>
      )}

      <p className="mt-4 mb-2 text-[12px] font-medium tracking-[0.08em] text-ink3 uppercase">Saltos</p>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <Campo nombre="Salto vertical (cm)" valor={campos.saltoVertical} onCambio={set('saltoVertical')} ancho />
        <Campo nombre="Lateral izq (cm)" valor={campos.lateralIzq} onCambio={set('lateralIzq')} />
        <Campo nombre="Lateral der (cm)" valor={campos.lateralDer} onCambio={set('lateralDer')} />
        <Campo nombre="Horizontal izq (cm)" valor={campos.horizontalIzq} onCambio={set('horizontalIzq')} />
        <Campo nombre="Horizontal der (cm)" valor={campos.horizontalDer} onCambio={set('horizontalDer')} />
      </div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink3">
        <span>
          Asimetría lateral
          <Asimetria izq={campos.lateralIzq} der={campos.lateralDer} />
        </span>
        <span>
          Asimetría horizontal
          <Asimetria izq={campos.horizontalIzq} der={campos.horizontalDer} />
        </span>
      </div>

      <input
        type="text"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        aria-label="Nota de la medición"
        placeholder="Nota (quién midió, condiciones, en ayunas…)"
        className="mb-3 h-[46px] w-full rounded-[10px] border border-line bg-field px-3 text-[14px] text-ink outline-none focus:border-accent"
      />

      <button
        type="button"
        disabled={!hayAlgo}
        onClick={guardar}
        className="h-[52px] w-full rounded-[11px] bg-accent font-display text-[17px] font-bold tracking-[0.1em] text-on-accent uppercase disabled:opacity-50"
      >
        Guardar medición
      </button>
      {estado?.disponible && tiene('peso') && (
        <button
          type="button"
          onClick={() =>
            void importarMedicionesDelReloj(sesiones, semana)
              .then((n) =>
                avisar(n ? `${n} ${n === 1 ? 'medición importada' : 'mediciones importadas'}` : 'No hay lecturas nuevas'),
              )
              .catch(() => avisar('No se pudo leer Health Connect', 'error'))
          }
          className="mt-2 h-11 w-full rounded-[10px] border border-line bg-surface text-[14px] font-semibold text-ink2"
        >
          Traer peso y grasa de Health Connect
        </button>
      )}
      <p className="mt-2 text-[12px] leading-relaxed text-ink3">
        La grasa con cinta usa el método US Navy para hombre (cuello, cintura y altura): error típico de ±3–4 puntos,
        útil para ver la tendencia. Mide siempre en las mismas condiciones.
      </p>

      {ordenadas.length > 0 ? (
        <div className="mt-6">
          <p className={ETIQUETA}>Historial</p>
          {ordenadas.map((m) => {
            const grasa = grasaDe(m, altura);
            const imcM = imc(m.peso, altura);
            const iccM = indiceCinturaCadera(m.cintura, m.cadera);
            const datos: { nombre: string; valor: string; extra?: ReactNode }[] = [];
            if (m.peso !== null) datos.push({ nombre: 'Peso', valor: `${NUM.format(m.peso)} kg` });
            if (grasa) datos.push({ nombre: 'Grasa', valor: `${grasa.metodo === 'cinta' ? '≈' : ''}${NUM.format(grasa.valor)} %` });
            if (imcM !== null) datos.push({ nombre: 'IMC', valor: NUM.format(imcM) });
            if (m.cintura !== null) datos.push({ nombre: 'Cintura', valor: `${NUM.format(m.cintura)} cm` });
            if (m.cuello !== null && m.cuello !== undefined) datos.push({ nombre: 'Cuello', valor: `${NUM.format(m.cuello)} cm` });
            if (m.cadera !== null && m.cadera !== undefined) datos.push({ nombre: 'Cadera', valor: `${NUM.format(m.cadera)} cm` });
            if (iccM !== null) datos.push({ nombre: 'Cint./cadera', valor: NUM.format(iccM) });
            if (m.saltoVertical !== null) datos.push({ nombre: 'Vertical', valor: `${NUM.format(m.saltoVertical)} cm` });
            if (m.lateralIzq !== null || m.lateralDer !== null) {
              datos.push({
                nombre: 'Lateral',
                valor: `${m.lateralIzq ?? '?'} / ${m.lateralDer ?? '?'}`,
                extra: <Asimetria izq={m.lateralIzq} der={m.lateralDer} />,
              });
            }
            if (m.horizontalIzq !== null || m.horizontalDer !== null) {
              datos.push({
                nombre: 'Horizontal',
                valor: `${m.horizontalIzq ?? '?'} / ${m.horizontalDer ?? '?'}`,
                extra: <Asimetria izq={m.horizontalIzq} der={m.horizontalDer} />,
              });
            }

            return (
              <article key={m.id} className="mb-2 rounded-[11px] border border-line bg-surface px-3.5 py-3 text-[13.5px]">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="font-display text-[14px] font-bold tracking-[0.08em] text-accent uppercase">
                    {m.semana > 0 ? `Semana ${m.semana}` : 'Antes del programa'} · {fechaCorta(m.fecha)}
                    {m.fecha.slice(0, 4) !== hoy().slice(0, 4) ? `/${m.fecha.slice(2, 4)}` : ''}
                    {m.origen === 'reloj' && (
                      <span className="ml-2 rounded-full bg-surface2 px-2 py-px font-sans text-[10.5px] font-semibold tracking-normal text-ink3 normal-case">
                        Health Connect
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (m.id !== undefined && window.confirm(`¿Borrar la medición del ${fechaCorta(m.fecha)}?`)) {
                        void borrarMedicion(m.id);
                      }
                    }}
                    className="shrink-0 text-[12px] text-ink3 underline"
                  >
                    Borrar
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 leading-relaxed text-ink2">
                  {datos.map((d) => (
                    <span key={d.nombre}>
                      <Dato nombre={d.nombre} valor={d.valor} />
                      {d.extra}
                    </span>
                  ))}
                </div>
                {m.nota && <p className="mt-1 text-[12.5px] text-ink3">{m.nota}</p>}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 text-[14px] leading-relaxed text-ink3">
          Haz la línea base antes de la primera sesión: peso, cintura, cuello y cadera con cinta; salto vertical contra
          la pared, y salto lateral y horizontal a una pierna (3 intentos por lado, aterrizando y sosteniendo 2 s). Se
          marca la asimetría cuando supera el 12%.
        </p>
      )}
    </>
  );
}

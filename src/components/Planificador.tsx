import { useMemo, useState, type ReactNode } from 'react';
import { EQUIPOS, catalogoPorId, type Equipo } from '../data/biblioteca';
import { db } from '../db/db';
import { guardarPlanificador, guardarPrograma, semanaActual } from '../db/repo';
import { useArquero } from '../estado/arquero';
import { numeroMesociclo } from '../lib/periodizacion';
import {
  DEPORTES,
  DIAS_CORTOS,
  DIAS_SEMANA,
  EXPERIENCIAS,
  LUGARES,
  MAX_DIAS,
  MIN_DIAS,
  MINUTOS_POSIBLES,
  MOLESTIAS,
  OBJETIVOS,
  RESPUESTAS_INICIALES,
  generarPrograma,
  normalizarRespuestas,
  type Respuestas,
} from '../lib/planificador';
import { avisar } from './Avisos';
import { Capa } from './Capa';

const EVENTO = 'arquero:planificador';

/** Abre el cuestionario desde cualquier pantalla (lo escucha App). */
export function abrirPlanificador(): void {
  window.dispatchEvent(new CustomEvent(EVENTO));
}

export function escucharPlanificador(abrir: () => void): () => void {
  window.addEventListener(EVENTO, abrir);
  return () => window.removeEventListener(EVENTO, abrir);
}

/** Lo que no se elige: el cuerpo siempre esta y "otro" no dice nada. */
const EQUIPO_ELEGIBLE = EQUIPOS.filter((e) => e.id !== 'peso-corporal' && e.id !== 'otro');

type Paso = 'objetivo' | 'deporte' | 'dias' | 'lugar' | 'equipo' | 'experiencia' | 'molestias' | 'rutina';

/** La pregunta del deporte solo aparece si el objetivo es rendir en uno. */
function pasosPara(r: Respuestas): Paso[] {
  return ['objetivo', ...(r.objetivo === 'deporte' ? (['deporte'] as const) : []), 'dias', 'lugar', 'equipo', 'experiencia', 'molestias', 'rutina'];
}

const BOTON_PRIMARIO =
  'h-12 w-full rounded-[11px] bg-accent font-display text-[16px] font-bold tracking-[0.1em] text-on-accent uppercase disabled:opacity-40';
const BOTON_SEC = 'h-12 w-full rounded-[11px] border border-line text-[14.5px] font-semibold text-ink2';
const SUBTITULO = 'mb-2 text-[13px] font-medium tracking-[0.06em] text-ink3 uppercase';

function Opcion({ activa, titulo, detalle, onClick }: { activa: boolean; titulo: string; detalle?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      onClick={onClick}
      className={`mb-2 flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left ${
        activa ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
      }`}
    >
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${activa ? 'border-accent' : 'border-line2'}`}
      >
        {activa && <span className="size-2.5 rounded-full bg-accent" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{titulo}</span>
        {detalle && <span className="block text-[13px] leading-snug text-ink3">{detalle}</span>}
      </span>
    </button>
  );
}

function Ficha({ activa, children, onClick, rol = 'checkbox' }: { activa: boolean; children: ReactNode; onClick: () => void; rol?: 'checkbox' | 'radio' }) {
  return (
    <button
      type="button"
      role={rol}
      aria-checked={activa}
      onClick={onClick}
      className={`h-11 rounded-full border px-4 text-[14px] font-semibold ${
        activa ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface text-ink2'
      }`}
    >
      {children}
    </button>
  );
}

/** Siete fichas de dia; con `maximo`, las no marcadas se apagan al llegar al tope. */
function Semana({ marcados, onCambio, maximo, tono = 'accent' }: { marcados: number[]; onCambio: (d: number[]) => void; maximo?: number; tono?: 'accent' | 'warn' }) {
  return (
    <div className="mb-2 grid grid-cols-7 gap-1.5">
      {DIAS_CORTOS.map((corto, d) => {
        const activa = marcados.includes(d);
        const lleno = maximo !== undefined && marcados.length >= maximo && !activa;
        return (
          <button
            key={corto}
            type="button"
            role="checkbox"
            aria-checked={activa}
            aria-label={DIAS_SEMANA[d]}
            disabled={lleno}
            onClick={() => onCambio(activa ? marcados.filter((x) => x !== d) : [...marcados, d].sort((a, b) => a - b))}
            className={`h-12 rounded-lg border text-[14px] font-semibold disabled:opacity-35 ${
              activa
                ? tono === 'warn'
                  ? 'border-warn bg-warn text-on-accent'
                  : 'border-accent bg-accent text-on-accent'
                : 'border-line bg-surface text-ink2'
            }`}
          >
            {corto}
          </button>
        );
      })}
    </div>
  );
}

function Pregunta({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: ReactNode }) {
  return (
    <>
      <h3 className="mb-1 font-display text-[22px] leading-tight font-bold tracking-[0.02em] uppercase">{titulo}</h3>
      {ayuda && <p className="mb-4 text-[14px] leading-relaxed text-ink2">{ayuda}</p>}
      {!ayuda && <div className="mb-3" />}
      {children}
    </>
  );
}

const lista = (dias: number[]) => {
  const nombres = dias.map((d) => DIAS_SEMANA[d]?.toLowerCase() ?? '');
  return nombres.length <= 1 ? nombres.join('') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
};

interface Props {
  /** Respuestas de una vez anterior, para no empezar de cero. */
  previas?: Partial<Respuestas>;
  onCerrar: () => void;
}

export function Planificador({ previas, onCerrar }: Props) {
  const { catalogo, definicion, programa } = useArquero();
  const [r, setR] = useState<Respuestas>(() => (previas ? normalizarRespuestas(previas) : RESPUESTAS_INICIALES));
  const [paso, setPaso] = useState<Paso | 'inicio'>(previas ? 'objetivo' : 'inicio');
  const [guardando, setGuardando] = useState(false);
  const cambiar = (c: Partial<Respuestas>) => setR((x) => ({ ...x, ...c }));

  const propuesta = useMemo(() => generarPrograma(r, catalogo), [r, catalogo]);
  const pasos = pasosPara(r);
  const preguntas = pasos.length - 1;
  const i = paso === 'inicio' ? -1 : pasos.indexOf(paso);
  const siguiente = () => setPaso(pasos[i + 1] ?? 'rutina');
  const anterior = () => setPaso(pasos[i - 1] ?? 'inicio');
  const puedeSeguir = paso !== 'dias' || r.diasSemana.length >= MIN_DIAS;

  const alternar = <T,>(xs: T[], v: T): T[] => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);

  const omitir = async () => {
    await guardarPlanificador({ estado: 'omitido', respuestas: previas ? normalizarRespuestas(previas) : undefined });
    onCerrar();
  };

  const usar = async () => {
    setGuardando(true);
    try {
      // Con historial, la rutina nueva parte en la semana en curso como un
      // mesociclo nuevo, para no mezclarse con lo ya registrado.
      const [semana, series] = await Promise.all([semanaActual(), db.series.count()]);
      const opciones = series > 0 ? { desde: semana, mesociclo: numeroMesociclo(programa) + 1 } : {};
      await guardarPrograma(generarPrograma(r, catalogo, opciones));
      await guardarPlanificador({ estado: 'hecho', respuestas: r });
      avisar('Rutina lista. Puedes cambiar cualquier ejercicio en Programa.');
      onCerrar();
    } catch {
      avisar('No se pudo guardar la rutina', 'error');
      setGuardando(false);
    }
  };

  const tieneSesiones = definicion.sesiones.length > 0;
  const deporte = DEPORTES.find((d) => d.id === r.deporte);

  return (
    <Capa titulo="Armar mi rutina" onCerrar={paso === 'inicio' && !previas ? () => void omitir() : onCerrar}>
      {i >= 0 && (
        <div className="mb-5">
          <p className="mb-1.5 text-[12px] font-medium tracking-[0.06em] text-ink3 uppercase">
            {paso === 'rutina' ? 'Tu rutina' : `Pregunta ${i + 1} de ${preguntas}`}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(Math.min(i + 1, preguntas) / preguntas) * 100}%` }} />
          </div>
        </div>
      )}

      {paso === 'inicio' && (
        <>
          <h3 className="mb-2 font-display text-[26px] leading-tight font-bold tracking-[0.02em] uppercase">Armemos tu rutina</h3>
          <p className="mb-3 text-[15px] leading-relaxed text-ink2">
            Unas preguntas cortas: qué buscas, qué días entrenas, con qué equipo cuentas y si algo te molesta. Con eso te
            propongo un plan de 8 semanas con sus fases, que ves antes de aceptar y puedes cambiar cuando quieras.
          </p>
          <p className="mb-6 text-[13.5px] leading-relaxed text-ink3">Toma un par de minutos.</p>
          <button type="button" onClick={() => setPaso('objetivo')} className={BOTON_PRIMARIO}>
            Empezar
          </button>
          <button type="button" onClick={() => void omitir()} className={`${BOTON_SEC} mt-2`}>
            Prefiero armarla yo
          </button>
        </>
      )}

      {paso === 'objetivo' && (
        <Pregunta titulo="¿Qué buscas?" ayuda="Elige lo principal. Define las repeticiones, los descansos y las fases.">
          <div role="radiogroup">
            {OBJETIVOS.map((o) => (
              <Opcion key={o.id} activa={r.objetivo === o.id} titulo={o.nombre} detalle={o.detalle} onClick={() => cambiar({ objetivo: o.id })} />
            ))}
          </div>
        </Pregunta>
      )}

      {paso === 'deporte' && (
        <Pregunta titulo="¿Qué deporte?" ayuda="Cambia los saltos y el trabajo preventivo: lo que más se lesiona en cada deporte.">
          <div role="radiogroup" className="mb-5">
            {DEPORTES.map((d) => (
              <Opcion key={d.id} activa={r.deporte === d.id} titulo={d.nombre} detalle={d.detalle} onClick={() => cambiar({ deporte: d.id })} />
            ))}
          </div>
          <p className={SUBTITULO}>¿Qué días juegas o compites?</p>
          <Semana marcados={r.partidos} onCambio={(partidos) => cambiar({ partidos })} tono="warn" />
          <p className="text-[13px] leading-relaxed text-ink3">
            {r.partidos.length
              ? `La pierna pesada se aleja de ${lista(r.partidos)}: nada de saltos la víspera ni el mismo día.`
              : 'Opcional. Si marcas tus partidos, ordeno la semana para que llegues con las piernas frescas.'}
          </p>
        </Pregunta>
      )}

      {paso === 'dias' && (
        <Pregunta titulo="¿Qué días entrenas?" ayuda={`Marca entre ${MIN_DIAS} y ${MAX_DIAS} días. Si puedes, deja uno de descanso entre medio.`}>
          <Semana marcados={r.diasSemana} onCambio={(diasSemana) => cambiar({ diasSemana })} maximo={MAX_DIAS} />
          <p className="mb-5 text-[13px] leading-relaxed text-ink3">
            {r.diasSemana.length < MIN_DIAS
              ? `Marca al menos ${MIN_DIAS} días.`
              : r.diasSemana.length <= 3
                ? `${r.diasSemana.length} días: cuerpo completo, cada músculo se trabaja en todas las sesiones.`
                : `${r.diasSemana.length} días: torso y pierna por separado, más volumen por músculo sin sesiones eternas.`}
            {r.objetivo === 'deporte' && r.diasSemana.some((d) => r.partidos.includes(d)) && ' Los días de partido van sin saltos y con pierna suave.'}
          </p>
          <p className={SUBTITULO}>Minutos por sesión</p>
          <div role="radiogroup" className="flex flex-wrap gap-2">
            {MINUTOS_POSIBLES.map((m) => (
              <Ficha key={m} rol="radio" activa={r.minutos === m} onClick={() => cambiar({ minutos: m })}>
                {m === 75 ? '75 o más' : `${m} min`}
              </Ficha>
            ))}
          </div>
        </Pregunta>
      )}

      {paso === 'lugar' && (
        <Pregunta titulo="¿Dónde entrenas?" ayuda="Marca lo más parecido. En el paso siguiente ajustas el equipo exacto.">
          <div role="radiogroup">
            {LUGARES.map((l) => (
              <Opcion key={l.id} activa={r.lugar === l.id} titulo={l.nombre} detalle={l.detalle} onClick={() => cambiar({ lugar: l.id, equipo: l.equipo })} />
            ))}
          </div>
        </Pregunta>
      )}

      {paso === 'equipo' && (
        <Pregunta titulo="¿Qué equipo tienes?" ayuda="Solo se eligen ejercicios que puedas hacer con lo que marques.">
          <div className="mb-4 flex flex-wrap gap-2">
            {EQUIPO_ELEGIBLE.map((e) => (
              <Ficha key={e.id} activa={r.equipo.includes(e.id)} onClick={() => cambiar({ equipo: alternar<Equipo>(r.equipo, e.id) })}>
                {e.nombre}
              </Ficha>
            ))}
          </div>
          {!r.equipo.some((e) => ['barra-dominadas', 'polea', 'bandas', 'maquina', 'mancuernas', 'kettlebell', 'barra'].includes(e)) && (
            <p className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-[13.5px] leading-snug text-warn">
              Sin nada para tirar (barra, banda, polea) la espalda queda corta. Una banda elástica es lo más barato que lo
              arregla.
            </p>
          )}
          {r.objetivo === 'deporte' && !r.equipo.includes('balon-medicinal') && ['arquero', 'combate', 'raqueta'].includes(r.deporte) && (
            <p className="mt-2 text-[13px] leading-relaxed text-ink3">Con balón medicinal suman lanzamientos para la potencia del tren superior.</p>
          )}
        </Pregunta>
      )}

      {paso === 'experiencia' && (
        <Pregunta titulo="¿Cuánta experiencia tienes?" ayuda="Si empiezas, salen menos series, ejercicios más fáciles de aprender y nunca cerca del fallo.">
          <div role="radiogroup">
            {EXPERIENCIAS.map((x) => (
              <Opcion key={x.id} activa={r.experiencia === x.id} titulo={x.nombre} detalle={x.detalle} onClick={() => cambiar({ experiencia: x.id })} />
            ))}
          </div>
        </Pregunta>
      )}

      {paso === 'molestias' && (
        <Pregunta titulo="¿Algo te molesta?" ayuda="Se evitan los ejercicios que más cargan esa zona. Si no tienes nada, sigue sin marcar.">
          <div className="mb-4 flex flex-wrap gap-2">
            {MOLESTIAS.map((m) => (
              <Ficha key={m.id} activa={r.molestias.includes(m.id)} onClick={() => cambiar({ molestias: alternar(r.molestias, m.id) })}>
                {m.nombre}
              </Ficha>
            ))}
          </div>
          <p className="text-[13px] leading-relaxed text-ink3">
            Esto no reemplaza a un kinesiólogo: si algo duele al entrenar, para ese ejercicio y consúltalo.
            {r.molestias.includes('hombro') && ' Con hombro, cada día de torso suma rotación externa para el manguito.'}
            {r.molestias.includes('rodilla') && r.objetivo === 'deporte' && ' Con rodilla no hay saltos: vuelven cuando entrenes sin dolor.'}
          </p>
        </Pregunta>
      )}

      {paso === 'rutina' && (
        <>
          <h3 className="mb-1 font-display text-[22px] leading-tight font-bold tracking-[0.02em] uppercase">{propuesta.nombre}</h3>
          <p className="mb-3 text-[13.5px] leading-relaxed text-ink2">
            8 semanas: {propuesta.fases.map((f) => `${f.nombre.toLowerCase()} (sem ${f.semanas[0] === f.semanas[1] ? f.semanas[0] : f.semanas.join('–')})`).join(', ')}.
            {r.objetivo === 'deporte' && deporte && ` Saltos y prevención pensados para ${deporte.nombre.toLowerCase()}.`}
          </p>
          <ul className="mb-4 grid gap-2.5">
            {propuesta.sesiones.map((s) => (
              <li key={s.id} className="rounded-xl border border-line bg-surface px-3.5 py-3">
                <p className="font-display text-[17px] font-bold tracking-[0.04em] uppercase">{s.nombre}</p>
                <p className="text-[12.5px] text-ink3">{s.foco}</p>
                {s.lugar.includes('partido') && <p className="text-[12.5px] font-semibold text-warn">{s.lugar.split(' · ').slice(1).join(' · ')}</p>}
                <ul className="mt-2 grid gap-1">
                  {s.ejercicios.map((e) => {
                    const info = catalogoPorId(e.id, catalogo);
                    const unidad = info?.tipo === 'tiempo' ? ' s' : '';
                    return (
                      <li key={e.id} className="flex gap-2 text-[14px] leading-snug">
                        <span className="w-6 shrink-0 font-display font-bold text-accent">{e.bloque}</span>
                        <span className="min-w-0 flex-1 text-ink">
                          {info?.nombre ?? e.id}
                          {e.principal && <span className="ml-1.5 text-[11px] font-semibold tracking-[0.06em] text-accent-ink uppercase">principal</span>}
                        </span>
                        <span className="shrink-0 text-ink3">
                          {e.series}×{e.reps[0] === e.reps[1] ? e.reps[0] : `${e.reps[0]}–${e.reps[1]}`}
                          {unidad}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mb-4 text-[13px] leading-relaxed text-ink3">
            Los <b className="text-ink2">principales</b> siguen el esfuerzo de cada fase; los A1/A2 se hacen alternados para
            ahorrar tiempo. Cualquier ejercicio se cambia después en Programa.
            {tieneSesiones && ' Reemplaza tu programa actual; lo ya registrado no se borra.'}
          </p>
          <button type="button" disabled={guardando} onClick={() => void usar()} className={BOTON_PRIMARIO}>
            Usar esta rutina
          </button>
          <button type="button" onClick={() => setPaso('objetivo')} className={`${BOTON_SEC} mt-2`}>
            Cambiar respuestas
          </button>
        </>
      )}

      {i >= 0 && paso !== 'rutina' && (
        <div className="mt-6 grid grid-cols-[1fr_2fr] gap-2">
          <button type="button" onClick={anterior} className={BOTON_SEC}>
            Atrás
          </button>
          <button type="button" disabled={!puedeSeguir} onClick={siguiente} className={BOTON_PRIMARIO}>
            {paso === 'molestias' ? 'Ver mi rutina' : 'Siguiente'}
          </button>
        </div>
      )}
    </Capa>
  );
}

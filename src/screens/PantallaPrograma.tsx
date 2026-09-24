import { useState } from 'react';
import { catalogoPorId } from '../data/biblioteca';
import type { ProgramaDef } from '../data/programa';
import type { RegistroSerie } from '../db/db';
import { fijarSemana, guardarPrograma, restaurarPrograma } from '../db/repo';
import { useArquero } from '../estado/arquero';
import { avisar } from '../components/Avisos';
import { Capa } from '../components/Capa';
import { CampoNumero } from '../components/CampoNumero';
import { FichaEjercicio } from '../components/FichaEjercicio';
import { FormEjercicioPropio } from '../components/FormEjercicioPropio';
import { ListaEjercicios } from '../components/ListaEjercicios';
import { descansoDe, formatoReloj } from '../lib/descanso';
import { finMesociclo, inicioMesociclo, numeroMesociclo } from '../lib/periodizacion';
import {
  actualizarDatosPrograma,
  actualizarEjercicio,
  actualizarFase,
  actualizarSesion,
  agregarEjercicio,
  agregarFase,
  agregarSesion,
  cambiarEjercicio,
  duplicarSesion,
  eliminarSesion,
  moverEjercicio,
  moverSesion,
  nuevoMesociclo,
  quitarEjercicio,
  quitarFase,
  revisarPrograma,
  type CambiosEjercicio,
} from '../lib/editorPrograma';

const ETIQUETA = 'mb-2 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase';
const TEXTO =
  'h-12 w-full rounded-[10px] border border-line bg-field px-3 text-[15px] text-ink outline-none focus:border-accent';
const BOTON_SEC = 'h-11 rounded-[10px] border border-line px-3 text-[14px] font-semibold text-ink2';
const FLECHA =
  'flex h-11 w-10 items-center justify-center rounded-lg text-[18px] text-ink3 disabled:opacity-25';

/** Guarda y avisa si algo falla (ej. ejercicio repetido en la sesion). */
function useGuardar() {
  return (cambio: () => ProgramaDef) => {
    try {
      void guardarPrograma(cambio());
      return true;
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo guardar', 'error');
      return false;
    }
  };
}

function CampoTexto({ etiqueta, valor, onCambio }: { etiqueta: string; valor: string; onCambio: (v: string) => void }) {
  // Estado local: el guardado recorta espacios y no debe pisar lo que se escribe.
  const [texto, setTexto] = useState(valor);
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[12px] font-medium tracking-[0.06em] text-ink3 uppercase">{etiqueta}</span>
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          onCambio(e.target.value);
        }}
        className={TEXTO}
      />
    </label>
  );
}

function Interruptor({ etiqueta, detalle, activo, onCambio }: { etiqueta: string; detalle: string; activo: boolean; onCambio: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onCambio(!activo)}
      className="mb-2 flex w-full items-center gap-3 rounded-[10px] border border-line bg-surface px-3 py-2.5 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-ink">{etiqueta}</span>
        <span className="block text-[12.5px] leading-snug text-ink3">{detalle}</span>
      </span>
      <span
        className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 ${activo ? 'justify-end bg-accent' : 'justify-start bg-line2'}`}
      >
        <span className="size-5 rounded-full bg-surface" />
      </span>
    </button>
  );
}

// ---------------- ejercicio dentro de una sesion ----------------

function EditorEjercicio({ sesionId, ejercicioId, onCerrar }: { sesionId: string; ejercicioId: string; onCerrar: () => void }) {
  const { definicion, programa, catalogo } = useArquero();
  const guardar = useGuardar();
  const [capa, setCapa] = useState<null | 'ficha' | 'cambiar'>(null);
  const sesion = definicion.sesiones.find((s) => s.id === sesionId);
  const plan = sesion?.ejercicios.find((e) => e.id === ejercicioId);
  const resuelto = programa.sesiones.find((s) => s.id === sesionId)?.ejercicios.find((e) => e.id === ejercicioId);
  if (!sesion || !plan || !resuelto) return null;
  const info = catalogoPorId(ejercicioId, catalogo);

  const cambiar = (c: CambiosEjercicio) => guardar(() => actualizarEjercicio(definicion, sesionId, ejercicioId, c));
  /** Campos obligatorios: vacio mientras se escribe no se guarda. */
  const numero = (f: (v: number) => CambiosEjercicio) => (v: number | null) => {
    if (v !== null) cambiar(f(v));
  };
  const esCarga = resuelto.tipo === 'carga';

  return (
    <Capa titulo={resuelto.nombre} onCerrar={onCerrar}>
      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setCapa('ficha')} className={`${BOTON_SEC} flex-1`}>
          Ver ficha
        </button>
        <button type="button" onClick={() => setCapa('cambiar')} className={`${BOTON_SEC} flex-1`}>
          Cambiar ejercicio
        </button>
      </div>

      <p className={ETIQUETA}>Prescripción</p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <div className="flex">
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-x-0 top-1 text-center text-[9.5px] font-medium tracking-[0.11em] text-ink3 uppercase">
              Bloque
            </span>
            <input
              defaultValue={plan.bloque}
              onChange={(e) => e.target.value.trim() && cambiar({ bloque: e.target.value })}
              className="h-[52px] w-full rounded-[10px] border border-line bg-field px-1 pt-4 pb-0.5 text-center text-[17px] font-semibold text-ink uppercase outline-none focus:border-accent"
            />
          </label>
        </div>
        <div className="flex">
          <CampoNumero etiqueta="Series base" valor={plan.series} onCambio={numero((v) => ({ series: v }))} />
        </div>
        <div className="flex">
          <CampoNumero
            etiqueta={resuelto.tipo === 'tiempo' ? 'Segundos mín' : 'Reps mín'}
            valor={plan.reps[0]}
            onCambio={numero((v) => ({ reps: [v, plan.reps[1]] }))}
          />
        </div>
        <div className="flex">
          <CampoNumero
            etiqueta={resuelto.tipo === 'tiempo' ? 'Segundos máx' : 'Reps máx'}
            valor={plan.reps[1]}
            onCambio={numero((v) => ({ reps: [plan.reps[0], v] }))}
          />
        </div>
        {esCarga && (
          <>
            <div className="flex">
              <CampoNumero etiqueta="RIR objetivo" valor={plan.rirObjetivo} onCambio={numero((v) => ({ rirObjetivo: v }))} />
            </div>
            <div className="flex">
              <CampoNumero etiqueta="Subir (kg)" valor={plan.incremento} onCambio={numero((v) => ({ incremento: v }))} />
            </div>
          </>
        )}
        <div className="col-span-2 flex">
          <CampoNumero
            etiqueta={`Descanso (s) · vacío = ${formatoReloj(descansoDe({ ...resuelto, descanso: undefined }, programa) * 1000)}`}
            valor={plan.descanso ?? null}
            onCambio={(v) => cambiar({ descanso: v ?? undefined })}
          />
        </div>
      </div>

      {esCarga && (
        <>
          <Interruptor
            etiqueta="Principal"
            detalle="Sigue el RIR de cada fase (calibración, carga, acumulación…)."
            activo={Boolean(plan.principal)}
            onCambio={(v) => cambiar({ principal: v })}
          />
          <div className="mb-2 flex">
            <CampoNumero
              etiqueta="RIR fijo · vacío = sigue la fase"
              valor={plan.rirFijo ?? null}
              onCambio={(v) => cambiar({ rirFijo: v ?? undefined })}
            />
          </div>
        </>
      )}
      <Interruptor
        etiqueta="Por lado"
        detalle="Las reps o segundos se cuentan por cada lado."
        activo={Boolean(plan.porLado)}
        onCambio={(v) => cambiar({ porLado: v })}
      />

      <button
        type="button"
        onClick={() => {
          if (!window.confirm(`¿Quitar ${resuelto.nombre} de ${sesion.nombre}? El historial se conserva.`)) return;
          if (guardar(() => quitarEjercicio(definicion, sesionId, ejercicioId))) onCerrar();
        }}
        className="mt-6 h-11 w-full rounded-[10px] border border-warn text-[14px] font-semibold text-warn"
      >
        Quitar de la sesión
      </button>

      {capa === 'ficha' && <FichaEjercicio ejercicioId={ejercicioId} onCerrar={() => setCapa(null)} />}
      {capa === 'cambiar' && (
        <Capa titulo={`Reemplazar ${resuelto.nombre}`} onCerrar={() => setCapa(null)}>
          <p className="mb-3 text-[13.5px] leading-relaxed text-ink2">
            Cambia el ejercicio en el programa y mantiene la prescripción. El historial del anterior se conserva
            en su ficha.
          </p>
          <ListaEjercicios
            filtroInicial={{ musculo: info?.musculo ?? '' }}
            tipoFijo={resuelto.tipo}
            deshabilitados={new Set(sesion.ejercicios.map((e) => e.id))}
            onElegir={(e) => {
              if (guardar(() => cambiarEjercicio(definicion, sesionId, ejercicioId, e))) {
                avisar(`Ahora es ${e.nombre}`);
                onCerrar();
              }
            }}
          />
        </Capa>
      )}
    </Capa>
  );
}

// ---------------- sesion ----------------

function EditorSesion({ sesionId, todas, onCerrar }: { sesionId: string; todas: RegistroSerie[]; onCerrar: () => void }) {
  const { definicion, programa } = useArquero();
  const guardar = useGuardar();
  const [capa, setCapa] = useState<null | 'agregar' | { ejercicio: string }>(null);
  const sesion = programa.sesiones.find((s) => s.id === sesionId);
  if (!sesion) return null;

  return (
    <Capa titulo={sesion.nombre} onCerrar={onCerrar}>
      <CampoTexto etiqueta="Nombre" valor={sesion.nombre} onCambio={(v) => v.trim() && guardar(() => actualizarSesion(definicion, sesionId, { nombre: v.trim() }))} />
      <CampoTexto etiqueta="Lugar" valor={sesion.lugar} onCambio={(v) => guardar(() => actualizarSesion(definicion, sesionId, { lugar: v }))} />
      <CampoTexto etiqueta="Foco" valor={sesion.foco} onCambio={(v) => guardar(() => actualizarSesion(definicion, sesionId, { foco: v }))} />

      <p className={`${ETIQUETA} mt-5`}>Ejercicios</p>
      <ul className="mb-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {sesion.ejercicios.map((e, i) => (
          <li key={e.id} className="flex items-center gap-1 pl-3">
            <button type="button" onClick={() => setCapa({ ejercicio: e.id })} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
              <span className="w-7 shrink-0 font-display text-[15px] font-bold text-accent">{e.bloque}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] leading-snug font-semibold text-ink">{e.nombre}</span>
                <span className="block text-[12.5px] text-ink3">
                  {e.series} × {e.reps[0] === e.reps[1] ? e.reps[0] : `${e.reps[0]}–${e.reps[1]}`}
                  {e.tipo === 'tiempo' ? ' s' : ''}
                  {e.tipo === 'carga' ? ` · RIR ${e.rirFijo ?? (e.principal ? 'fase' : e.rirObjetivo)}` : ''}
                  {` · ⏱ ${formatoReloj(descansoDe(e, programa) * 1000)}`}
                </span>
              </span>
            </button>
            <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => guardar(() => moverEjercicio(definicion, sesionId, e.id, -1))} className={FLECHA}>
              ↑
            </button>
            <button type="button" aria-label="Bajar" disabled={i === sesion.ejercicios.length - 1} onClick={() => guardar(() => moverEjercicio(definicion, sesionId, e.id, 1))} className={FLECHA}>
              ↓
            </button>
          </li>
        ))}
        {!sesion.ejercicios.length && <li className="px-3.5 py-4 text-[14px] text-ink3">Todavía sin ejercicios.</li>}
      </ul>
      <button
        type="button"
        onClick={() => setCapa('agregar')}
        className="h-12 w-full rounded-[11px] bg-accent font-display text-[16px] font-bold tracking-[0.1em] text-on-accent uppercase"
      >
        + Agregar ejercicio
      </button>

      <div className="mt-8 grid grid-cols-2 gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => {
            const nombre = window.prompt('Nombre de la copia (ej. "Jueves casa")', `${sesion.nombre} (copia)`);
            if (nombre === null) return;
            guardar(() => {
              const r = duplicarSesion(definicion, sesionId, nombre);
              avisar(`Sesión "${nombre}" creada`);
              return r.programa;
            });
          }}
          className={BOTON_SEC}
        >
          Duplicar
        </button>
        <button
          type="button"
          onClick={() => {
            const registradas = todas.filter((r) => r.sesionId === sesionId).length;
            const aviso = registradas
              ? `¿Eliminar ${sesion.nombre}? Tiene ${registradas} series registradas: quedan en el respaldo y en las fichas, pero no en la lista de sesiones.`
              : `¿Eliminar ${sesion.nombre}?`;
            if (!window.confirm(aviso)) return;
            if (guardar(() => eliminarSesion(definicion, sesionId))) onCerrar();
          }}
          className="h-11 rounded-[10px] border border-warn px-3 text-[14px] font-semibold text-warn"
        >
          Eliminar
        </button>
      </div>

      {capa === 'agregar' && (
        <Capa titulo={`Agregar a ${sesion.nombre}`} onCerrar={() => setCapa(null)}>
          <ListaEjercicios
            deshabilitados={new Set(sesion.ejercicios.map((e) => e.id))}
            onElegir={(e) => {
              if (guardar(() => agregarEjercicio(definicion, sesionId, e))) {
                avisar(`${e.nombre} agregado`);
                setCapa({ ejercicio: e.id });
              }
            }}
          />
        </Capa>
      )}
      {capa && typeof capa === 'object' && (
        <EditorEjercicio key={capa.ejercicio} sesionId={sesionId} ejercicioId={capa.ejercicio} onCerrar={() => setCapa(null)} />
      )}
    </Capa>
  );
}

// ---------------- fases y descansos ----------------

function EditorFases({ onCerrar }: { onCerrar: () => void }) {
  const { definicion } = useArquero();
  const guardar = useGuardar();
  const d = definicion;

  return (
    <Capa titulo="Fases y descansos" onCerrar={onCerrar}>
      <p className={ETIQUETA}>Mesociclo</p>
      <CampoTexto etiqueta="Nombre del programa" valor={d.nombre} onCambio={(v) => v.trim() && guardar(() => actualizarDatosPrograma(d, { nombre: v }))} />
      <div className="mb-5 flex">
        <CampoNumero etiqueta="Semanas" valor={d.semanas} onCambio={(v) => v !== null && guardar(() => actualizarDatosPrograma(d, { semanas: v }))} />
      </div>

      <p className={ETIQUETA}>Descansos por defecto (segundos)</p>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {(
          [
            ['principal', 'Principales'],
            ['carga', 'Accesorios'],
            ['tiempo', 'Tiempo'],
            ['salto', 'Saltos'],
            ['movilidad', 'Movilidad'],
          ] as const
        ).map(([clave, nombre]) => (
          <div key={clave} className="flex">
            <CampoNumero
              etiqueta={nombre}
              valor={d.descansos[clave] ?? 0}
              onCambio={(v) => v !== null && guardar(() => actualizarDatosPrograma(d, { descansos: { ...d.descansos, [clave]: v } }))}
            />
          </div>
        ))}
      </div>

      <p className={ETIQUETA}>Fases</p>
      {d.fases.map((f, i) => (
        <section key={i} className="mb-3 rounded-xl border border-line bg-surface px-3 pt-3 pb-2">
          <CampoTexto etiqueta="Nombre" valor={f.nombre} onCambio={(v) => guardar(() => actualizarFase(d, i, { nombre: v }))} />
          <CampoTexto etiqueta="Nota para la pantalla Hoy" valor={f.nota} onCambio={(v) => guardar(() => actualizarFase(d, i, { nota: v }))} />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex">
              <CampoNumero etiqueta="Desde semana" valor={f.semanas[0]} onCambio={(v) => v !== null && guardar(() => actualizarFase(d, i, { semanas: [v, f.semanas[1]] }))} />
            </div>
            <div className="flex">
              <CampoNumero etiqueta="Hasta semana" valor={f.semanas[1]} onCambio={(v) => v !== null && guardar(() => actualizarFase(d, i, { semanas: [f.semanas[0], v] }))} />
            </div>
            <div className="flex">
              <CampoNumero etiqueta="RIR principales" valor={f.rirPrincipal ?? null} onCambio={(v) => guardar(() => actualizarFase(d, i, { rirPrincipal: v ?? undefined }))} />
            </div>
            <div className="flex">
              <CampoNumero etiqueta="RIR para todos" valor={f.rirTodos ?? null} onCambio={(v) => guardar(() => actualizarFase(d, i, { rirTodos: v ?? undefined }))} />
            </div>
            <div className="flex">
              <CampoNumero etiqueta="Factor series" valor={f.factorSeries ?? null} onCambio={(v) => guardar(() => actualizarFase(d, i, { factorSeries: v ?? undefined }))} />
            </div>
            <div className="flex">
              <CampoNumero etiqueta="Series mínimas" valor={f.seriesMinimas ?? null} onCambio={(v) => guardar(() => actualizarFase(d, i, { seriesMinimas: v ?? undefined }))} />
            </div>
            <div className="col-span-2 flex">
              <CampoNumero
                etiqueta="Series extra en saltos"
                valor={f.seriesExtra?.salto ?? null}
                onCambio={(v) => guardar(() => actualizarFase(d, i, { seriesExtra: v ? { ...f.seriesExtra, salto: v } : undefined }))}
              />
            </div>
          </div>
          <button
            type="button"
            disabled={d.fases.length <= 1}
            onClick={() => window.confirm(`¿Quitar la fase ${f.nombre}?`) && guardar(() => quitarFase(d, i))}
            className="mt-2 h-10 text-[13px] font-medium text-warn underline disabled:opacity-30"
          >
            Quitar fase
          </button>
        </section>
      ))}
      <button type="button" onClick={() => guardar(() => agregarFase(d))} className={`${BOTON_SEC} w-full`}>
        + Agregar fase
      </button>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink3">
        Campos vacíos no se aplican. «RIR para todos» manda sobre todo (útil en descarga). «Factor series»
        multiplica las series base: 0,6 deja 4 series en 2.
      </p>
    </Capa>
  );
}

// ---------------- pantalla ----------------

export function PantallaPrograma({ todas }: { todas: RegistroSerie[] }) {
  const { definicion, programa, personalizado } = useArquero();
  const guardar = useGuardar();
  const [seccion, setSeccion] = useState<'rutinas' | 'ejercicios'>('rutinas');
  const [capa, setCapa] = useState<null | 'fases' | 'nuevo-ejercicio' | { sesion: string } | { ficha: string }>(null);
  const avisos = revisarPrograma(definicion);

  /**
   * Cierra el bloque actual y abre el siguiente. Las semanas del historial no
   * se reinician: siguen subiendo, asi que los dos mesociclos se pueden
   * comparar y nada se sobreescribe.
   */
  const empezarMesociclo = () => {
    const numero = numeroMesociclo(programa);
    const proxima = finMesociclo(programa) + 1;
    const aviso =
      `¿Cerrar el mesociclo ${numero} (semanas ${inicioMesociclo(programa)} a ${finMesociclo(programa)}) y empezar el ${numero + 1}?

` +
      `Lo registrado queda tal cual y el programa no cambia: el nuevo bloque parte en la semana ${proxima} y vuelve a la primera fase.`;
    if (!window.confirm(aviso)) return;
    let desde = proxima;
    if (
      guardar(() => {
        const r = nuevoMesociclo(definicion);
        desde = r.desde;
        return r.programa;
      })
    ) {
      void fijarSemana(desde).then(() => avisar(`Mesociclo ${numero + 1} · semana ${desde}`));
    }
  };

  return (
    <>
      <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface2 p-1">
        {(
          [
            ['rutinas', 'Rutinas'],
            ['ejercicios', 'Ejercicios'],
          ] as const
        ).map(([id, nombre]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={seccion === id}
            onClick={() => setSeccion(id)}
            className={`h-11 rounded-lg font-display text-[15px] font-bold tracking-[0.08em] uppercase ${
              seccion === id ? 'bg-surface text-ink' : 'text-ink3'
            }`}
          >
            {nombre}
          </button>
        ))}
      </div>

      {seccion === 'rutinas' ? (
        <>
          <section className="mb-4 rounded-xl border border-line bg-surface px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-[19px] font-bold tracking-[0.04em] uppercase">{programa.nombre}</span>
              <span className={`text-[11.5px] font-semibold ${personalizado ? 'text-accent-ink' : 'text-ink3'}`}>
                {personalizado ? 'Editado en la app' : 'De fábrica'}
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-ink3">
              {programa.semanas} semanas · {programa.fases.length} fases · {programa.sesiones.length} sesiones
            </p>
            <p className="mt-0.5 text-[13px] text-ink3">
              Mesociclo {numeroMesociclo(programa)} · semanas {inicioMesociclo(programa)} a {finMesociclo(programa)} del
              historial
            </p>
            <button type="button" onClick={() => setCapa('fases')} className={`${BOTON_SEC} mt-3 w-full`}>
              Fases, semanas y descansos
            </button>
            <button type="button" onClick={empezarMesociclo} className={`${BOTON_SEC} mt-2 w-full`}>
              Empezar mesociclo {numeroMesociclo(programa) + 1}
            </button>
          </section>

          {avisos.length > 0 && (
            <ul className="mb-3 rounded-lg bg-warn-soft px-3.5 py-2.5 text-[13px] leading-snug text-warn">
              {avisos.slice(0, 4).map((a) => (
                <li key={a}>{a}</li>
              ))}
              {avisos.length > 4 && <li>…y {avisos.length - 4} más.</li>}
            </ul>
          )}

          <p className={ETIQUETA}>Sesiones</p>
          <ul className="mb-3 grid gap-2">
            {programa.sesiones.map((s, i) => (
              <li key={s.id} className="flex items-center gap-1 rounded-xl border border-line bg-surface pl-3.5">
                <button type="button" onClick={() => setCapa({ sesion: s.id })} className="min-w-0 flex-1 py-3 text-left">
                  <span className="block font-display text-[18px] font-bold tracking-[0.05em] uppercase">{s.nombre}</span>
                  <span className="block truncate text-[12.5px] text-ink3">
                    {[s.lugar, `${s.ejercicios.length} ejercicios`].filter(Boolean).join(' · ')}
                  </span>
                </button>
                <button type="button" aria-label="Subir sesión" disabled={i === 0} onClick={() => guardar(() => moverSesion(definicion, s.id, -1))} className={FLECHA}>
                  ↑
                </button>
                <button type="button" aria-label="Bajar sesión" disabled={i === programa.sesiones.length - 1} onClick={() => guardar(() => moverSesion(definicion, s.id, 1))} className={FLECHA}>
                  ↓
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              const nombre = window.prompt('Nombre de la sesión (ej. "Sábado casa")');
              if (!nombre?.trim()) return;
              let id = '';
              if (guardar(() => {
                const r = agregarSesion(definicion, nombre);
                id = r.id;
                return r.programa;
              })) setCapa({ sesion: id });
            }}
            className="h-12 w-full rounded-[11px] bg-accent font-display text-[16px] font-bold tracking-[0.1em] text-on-accent uppercase"
          >
            + Nueva sesión
          </button>

          <p className="mt-5 text-[12.5px] leading-relaxed text-ink3">
            Los cambios se guardan solos. El historial va ligado a cada ejercicio, así que editar el programa no
            borra lo registrado.
          </p>
          {personalizado && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('¿Volver al programa de fábrica? Se pierden tus cambios en rutinas y fases; el historial queda intacto.')) return;
                void restaurarPrograma().then(() => avisar('Programa de fábrica restaurado'));
              }}
              className="mt-3 h-11 w-full rounded-[10px] border border-line text-[14px] font-medium text-ink3"
            >
              Restaurar programa de fábrica
            </button>
          )}
        </>
      ) : (
        <>
          <button type="button" onClick={() => setCapa('nuevo-ejercicio')} className={`${BOTON_SEC} mb-3 w-full`}>
            + Crear ejercicio propio
          </button>
          <ListaEjercicios onElegir={(e) => setCapa({ ficha: e.id })} />
          <p className="mt-4 text-[12px] leading-relaxed text-ink3">
            Fotos de la biblioteca: free-exercise-db, dominio público. Puedes reemplazar cualquiera por una tuya
            desde la ficha.
          </p>
        </>
      )}

      {capa === 'fases' && <EditorFases onCerrar={() => setCapa(null)} />}
      {capa === 'nuevo-ejercicio' && (
        <FormEjercicioPropio onCerrar={() => setCapa(null)} />
      )}
      {capa && typeof capa === 'object' && 'sesion' in capa && (
        <EditorSesion sesionId={capa.sesion} todas={todas} onCerrar={() => setCapa(null)} />
      )}
      {capa && typeof capa === 'object' && 'ficha' in capa && (
        <FichaEjercicio ejercicioId={capa.ficha} onCerrar={() => setCapa(null)} />
      )}
    </>
  );
}

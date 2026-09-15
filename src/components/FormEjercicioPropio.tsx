import { useState } from 'react';
import { EQUIPOS, MUSCULOS, TIPOS, type EjercicioCatalogo, type Equipo, type Musculo } from '../data/biblioteca';
import { borrarEjercicioPropio, guardarEjercicioPropio } from '../db/repo';
import { useArquero } from '../estado/arquero';
import { slug } from '../lib/editorPrograma';
import { avisar } from './Avisos';
import { Capa } from './Capa';

interface Props {
  existente?: EjercicioCatalogo;
  onCerrar: () => void;
  onGuardado?: (e: EjercicioCatalogo) => void;
  onBorrado?: () => void;
}

const ETIQUETA = 'mb-1.5 block font-display text-[12.5px] font-bold tracking-[0.13em] text-ink3 uppercase';
const CHIP = 'h-9 rounded-full border px-3 text-[13px] font-medium';

function alternar<T>(lista: T[], v: T): T[] {
  return lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v];
}

export function FormEjercicioPropio({ existente, onCerrar, onGuardado, onBorrado }: Props) {
  const { catalogo, definicion } = useArquero();
  const [nombre, setNombre] = useState(existente?.nombre ?? '');
  const [tipo, setTipo] = useState<EjercicioCatalogo['tipo']>(existente?.tipo ?? 'carga');
  const [musculo, setMusculo] = useState<Musculo>(existente?.musculo ?? 'pecho');
  const [secundarios, setSecundarios] = useState<Musculo[]>(existente?.secundarios ?? []);
  const [equipo, setEquipo] = useState<Equipo[]>(existente?.equipo ?? []);
  const [indicaciones, setIndicaciones] = useState((existente?.indicaciones ?? []).join('\n'));
  const [error, setError] = useState('');

  const usadoEn = existente
    ? definicion.sesiones.filter((s) => s.ejercicios.some((e) => e.id === existente.id)).map((s) => s.nombre)
    : [];

  const guardar = async () => {
    const limpio = nombre.trim();
    if (!limpio) return setError('Ponle un nombre.');
    const repetido = catalogo.find(
      (e) => e.id !== existente?.id && e.nombre.toLowerCase() === limpio.toLowerCase(),
    );
    if (repetido) return setError(`Ya existe "${repetido.nombre}" en la biblioteca.`);

    const id = existente?.id ?? `propio-${slug(limpio)}-${Date.now().toString(36)}`;
    const e: EjercicioCatalogo = {
      id,
      nombre: limpio,
      // El tipo define que se registra: cambiarlo con historial lo dejaria incoherente.
      tipo: existente ? existente.tipo : tipo,
      musculo,
      secundarios: secundarios.filter((m) => m !== musculo),
      equipo: equipo.length ? equipo : ['otro'],
      indicaciones: indicaciones
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      propio: true,
    };
    await guardarEjercicioPropio(e);
    avisar(existente ? 'Ejercicio actualizado' : 'Ejercicio creado');
    onGuardado?.(e);
    onCerrar();
  };

  return (
    <Capa
      titulo={existente ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      onCerrar={onCerrar}
      accion={
        <button
          type="button"
          onClick={() => void guardar()}
          className="h-11 shrink-0 rounded-lg bg-accent px-4 font-display text-[15px] font-bold tracking-[0.08em] text-on-accent uppercase"
        >
          Guardar
        </button>
      }
    >
      <label className={ETIQUETA} htmlFor="ej-nombre">
        Nombre
      </label>
      <input
        id="ej-nombre"
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value);
          setError('');
        }}
        className="mb-4 h-12 w-full rounded-[10px] border border-line bg-field px-3 text-[15px] text-ink outline-none focus:border-accent"
      />

      <span className={ETIQUETA}>Qué se registra</span>
      <div className="mb-1 grid grid-cols-3 gap-1.5">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={Boolean(existente) && existente?.tipo !== t.id}
            aria-pressed={tipo === t.id}
            onClick={() => setTipo(t.id)}
            className={`flex h-14 flex-col items-center justify-center rounded-[10px] border text-[13px] font-semibold disabled:opacity-35 ${
              tipo === t.id ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink2'
            }`}
          >
            {t.nombre}
            <span className="text-[10.5px] font-normal">{t.detalle}</span>
          </button>
        ))}
      </div>
      {existente && <p className="mb-4 text-[12px] text-ink3">El tipo no se puede cambiar después de crearlo.</p>}
      {!existente && <div className="mb-4" />}

      <label className={ETIQUETA} htmlFor="ej-musculo">
        Músculo principal
      </label>
      <select
        id="ej-musculo"
        value={musculo}
        onChange={(e) => setMusculo(e.target.value as Musculo)}
        className="mb-4 h-12 w-full rounded-[10px] border border-line bg-field px-2 text-[15px] text-ink"
      >
        {MUSCULOS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
          </option>
        ))}
      </select>

      <span className={ETIQUETA}>Secundarios</span>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {MUSCULOS.filter((m) => m.id !== musculo).map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={secundarios.includes(m.id)}
            onClick={() => setSecundarios((s) => alternar(s, m.id))}
            className={`${CHIP} ${secundarios.includes(m.id) ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink2'}`}
          >
            {m.nombre}
          </button>
        ))}
      </div>

      <span className={ETIQUETA}>Equipo</span>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {EQUIPOS.map((q) => (
          <button
            key={q.id}
            type="button"
            aria-pressed={equipo.includes(q.id)}
            onClick={() => setEquipo((s) => alternar(s, q.id))}
            className={`${CHIP} ${equipo.includes(q.id) ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink2'}`}
          >
            {q.nombre}
          </button>
        ))}
      </div>

      <label className={ETIQUETA} htmlFor="ej-indicaciones">
        Indicaciones de técnica
      </label>
      <textarea
        id="ej-indicaciones"
        rows={4}
        value={indicaciones}
        onChange={(e) => setIndicaciones(e.target.value)}
        placeholder="Una indicación por línea"
        className="w-full rounded-[10px] border border-line bg-field px-3 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-accent"
      />

      {error && <p className="mt-3 rounded-lg bg-warn-soft px-3.5 py-2.5 text-[13.5px] text-warn">{error}</p>}

      {existente && (
        <div className="mt-8 border-t border-line pt-4">
          {usadoEn.length ? (
            <p className="text-[13px] leading-relaxed text-ink3">
              Para borrarlo, primero quítalo de: {usadoEn.join(', ')}.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`¿Borrar "${existente.nombre}"? Su historial se conserva pero ya no tendrá nombre.`)) return;
                void borrarEjercicioPropio(existente.id).then(() => {
                  avisar('Ejercicio borrado');
                  (onBorrado ?? onCerrar)();
                });
              }}
              className="h-11 w-full rounded-[10px] border border-warn text-[14px] font-semibold text-warn"
            >
              Borrar ejercicio
            </button>
          )}
        </div>
      )}
    </Capa>
  );
}

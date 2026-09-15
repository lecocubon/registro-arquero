import { useMemo, useState } from 'react';
import {
  EQUIPOS,
  MUSCULOS,
  filtrarBiblioteca,
  nombreEquipo,
  nombreMusculo,
  type EjercicioCatalogo,
  type FiltroBiblioteca,
} from '../data/biblioteca';
import { useArquero } from '../estado/arquero';
import { ImagenEjercicio } from './ImagenEjercicio';

interface Props {
  onElegir: (e: EjercicioCatalogo) => void;
  filtroInicial?: FiltroBiblioteca;
  /** Ids que no se pueden elegir (ya estan en la sesion). */
  deshabilitados?: Set<string>;
  /** Fija el tipo: un reemplazo debe registrar lo mismo que el original. */
  tipoFijo?: EjercicioCatalogo['tipo'];
}

const SELECT =
  'h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-field px-2 text-[14px] text-ink outline-none focus:border-accent';

export function ListaEjercicios({ onElegir, filtroInicial, deshabilitados, tipoFijo }: Props) {
  const { catalogo, programa } = useArquero();
  const [filtro, setFiltro] = useState<FiltroBiblioteca>({ texto: '', musculo: '', equipo: '', ...filtroInicial });

  const enPrograma = useMemo(
    () => new Set(programa.sesiones.flatMap((s) => s.ejercicios.map((e) => e.id))),
    [programa],
  );
  const lista = useMemo(
    () => filtrarBiblioteca(catalogo, { ...filtro, tipo: tipoFijo ?? filtro.tipo }),
    [catalogo, filtro, tipoFijo],
  );

  return (
    <>
      <input
        type="search"
        value={filtro.texto}
        onChange={(e) => setFiltro((f) => ({ ...f, texto: e.target.value }))}
        placeholder="Buscar ejercicio"
        aria-label="Buscar ejercicio"
        className="mb-2 h-12 w-full rounded-[10px] border border-line bg-field px-3 text-[15px] text-ink outline-none focus:border-accent"
      />
      <div className="mb-3 flex gap-2">
        <select
          aria-label="Filtrar por músculo"
          value={filtro.musculo}
          onChange={(e) => setFiltro((f) => ({ ...f, musculo: e.target.value as FiltroBiblioteca['musculo'] }))}
          className={SELECT}
        >
          <option value="">Todos los músculos</option>
          {MUSCULOS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por equipo"
          value={filtro.equipo}
          onChange={(e) => setFiltro((f) => ({ ...f, equipo: e.target.value as FiltroBiblioteca['equipo'] }))}
          className={SELECT}
        >
          <option value="">Todo el equipo</option>
          {EQUIPOS.map((q) => (
            <option key={q.id} value={q.id}>
              {q.nombre}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-1.5 text-[12px] tracking-[0.04em] text-ink3">
        {lista.length} {lista.length === 1 ? 'ejercicio' : 'ejercicios'}
        {tipoFijo ? ` de tipo ${tipoFijo}` : ''}
      </p>

      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {lista.map((e) => {
          const bloqueado = deshabilitados?.has(e.id) ?? false;
          return (
            <li key={e.id}>
              <button
                type="button"
                disabled={bloqueado}
                onClick={() => onElegir(e)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left disabled:opacity-45"
              >
                <ImagenEjercicio ejercicio={e} tamano="mini" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] leading-snug font-semibold text-ink">{e.nombre}</span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-ink3">
                    {nombreMusculo(e.musculo)} · {e.equipo.map(nombreEquipo).join(', ')}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {e.propio && (
                    <span className="rounded-full bg-surface2 px-2 py-px text-[10.5px] font-semibold text-ink2">
                      Propio
                    </span>
                  )}
                  {bloqueado ? (
                    <span className="text-[11px] text-ink3">Ya está</span>
                  ) : (
                    enPrograma.has(e.id) && (
                      <span className="rounded-full bg-accent-soft px-2 py-px text-[10.5px] font-semibold text-accent-ink">
                        En programa
                      </span>
                    )
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!lista.length && (
        <p className="py-6 text-center text-[14px] text-ink3">Nada coincide. Prueba quitando un filtro.</p>
      )}
    </>
  );
}

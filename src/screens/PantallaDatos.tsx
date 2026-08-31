import { useRef, useState } from 'react';
import { db, type Medicion, type RegistroSerie, type RegistroSesion } from '../db/db';
import { fijarSemana } from '../db/repo';
import { useInstalacion } from '../lib/instalacion';
import {
  construirRespaldo,
  medicionesACsv,
  seriesACsv,
  validarRespaldo,
} from '../lib/respaldo';

interface Props {
  semana: number;
  todas: RegistroSerie[];
  sesiones: RegistroSesion[];
  mediciones: Medicion[];
}

function descargar(nombre: string, contenido: string, tipo: string) {
  const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function sello(): string {
  return new Date().toISOString().slice(0, 10);
}

const BOTON =
  'h-[52px] w-full rounded-[11px] border border-line bg-surface font-display text-[15px] font-bold tracking-[0.1em] text-ink uppercase';

export function PantallaDatos({ semana, todas, sesiones, mediciones }: Props) {
  const { instalada, listaSinConexion } = useInstalacion();
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const archivo = useRef<HTMLInputElement>(null);

  const avisar = (texto: string) => {
    setError('');
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3000);
  };

  const importar = async (file: File) => {
    setError('');
    try {
      const datos = validarRespaldo(JSON.parse(await file.text()));
      const total = datos.series.length + datos.mediciones.length;
      const ok = window.confirm(
        `Vas a reemplazar TODO el historial de este telefono por el del archivo (${datos.series.length} series, ${datos.mediciones.length} mediciones). Esto no se puede deshacer. Continuar?`,
      );
      if (!ok) return;
      await db.transaction('rw', db.series, db.sesiones, db.mediciones, db.ajustes, async () => {
        await Promise.all([db.series.clear(), db.sesiones.clear(), db.mediciones.clear()]);
        await db.series.bulkPut(datos.series);
        if (datos.sesiones.length) await db.sesiones.bulkPut(datos.sesiones);
        if (datos.mediciones.length) {
          await db.mediciones.bulkPut(datos.mediciones.map(({ id: _id, ...m }) => m as Medicion));
        }
      });
      await fijarSemana(datos.semana);
      avisar(`Importado: ${total} registros.`);
    } catch (e) {
      setMensaje('');
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    }
  };

  return (
    <>
      <p className="mb-2.5 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase">
        Datos
      </p>
      <p className="mb-3 text-[13.5px] leading-relaxed text-ink2">
        Todo vive solo en este telefono. Exporta el JSON de vez en cuando: es tu unica copia de
        seguridad.
      </p>

      <p
        className={`mb-4 rounded-lg px-3.5 py-2.5 text-[13px] leading-snug ${
          listaSinConexion ? 'bg-accent-soft text-accent-ink' : 'bg-warn-soft text-warn'
        }`}
      >
        {listaSinConexion
          ? `Lista para usar sin conexion${instalada ? ' · instalada en el telefono' : ''}. Puedes activar el modo avion.`
          : 'Preparando la copia offline. Deja la app abierta unos segundos con conexion.'}
      </p>

      <div className="grid gap-2.5">
        <button
          type="button"
          className={BOTON}
          onClick={() => {
            const respaldo = construirRespaldo({ semana, series: todas, sesiones, mediciones });
            descargar(
              `registro-arquero-${sello()}.json`,
              JSON.stringify(respaldo, null, 2),
              'application/json',
            );
            avisar('JSON exportado.');
          }}
        >
          Exportar JSON
        </button>

        <button
          type="button"
          className={BOTON}
          onClick={() => {
            descargar(`entrenamiento-${sello()}.csv`, seriesACsv(todas, sesiones), 'text/csv');
            avisar('CSV de entrenamiento exportado.');
          }}
        >
          Exportar CSV entrenamiento
        </button>

        <button
          type="button"
          className={BOTON}
          onClick={() => {
            descargar(`mediciones-${sello()}.csv`, medicionesACsv(mediciones), 'text/csv');
            avisar('CSV de mediciones exportado.');
          }}
        >
          Exportar CSV mediciones
        </button>

        <input
          ref={archivo}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void importar(f);
          }}
        />
        <button type="button" className={BOTON} onClick={() => archivo.current?.click()}>
          Importar JSON
        </button>
      </div>

      {mensaje && <p className="mt-3 text-[13.5px] text-accent-ink">{mensaje}</p>}
      {error && (
        <p className="mt-3 rounded-lg bg-warn-soft px-3.5 py-2.5 text-[13.5px] text-warn">{error}</p>
      )}

      <p className="mt-6 text-[12.5px] leading-relaxed text-ink3">
        {todas.length} series y {mediciones.length} mediciones guardadas. Importar reemplaza todo el
        historial actual.
      </p>
    </>
  );
}

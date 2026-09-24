import { useEffect, useRef, useState } from 'react';
import { db, type Medicion, type RegistroSerie, type RegistroSesion } from '../db/db';
import { fijarAlturaCm, fijarSemana, leerAlturaCm, leerNotasEjercicios } from '../db/repo';
import { useArquero } from '../estado/arquero';
import { PanelReloj } from '../components/Reloj';
import { avisosPermitidos, pedirAvisos } from '../lib/avisoDescanso';
import { useInstalacion } from '../lib/instalacion';
import { esAppAndroid } from '../lib/salud';
import {
  construirRespaldo,
  medicionesACsv,
  type FotoRespaldo,
  seriesACsv,
  validarRespaldo,
} from '../lib/respaldo';

interface Props {
  semana: number;
  todas: RegistroSerie[];
  sesiones: RegistroSesion[];
  mediciones: Medicion[];
}

async function descargar(nombre: string, contenido: string, tipo: string) {
  if (esAppAndroid()) {
    // El WebView de Android ignora las descargas <a download>: se escribe el
    // archivo en la cache y se abre el menu de compartir (Drive, Archivos...).
    const [{ Directory, Encoding, Filesystem }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const { uri } = await Filesystem.writeFile({
      path: nombre,
      data: contenido,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: nombre, files: [uri], dialogTitle: 'Guardar respaldo de Arquero' });
    return;
  }
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

function aDataUrl(b: Blob): Promise<string> {
  return new Promise((ok, falla) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => falla(r.error);
    r.readAsDataURL(b);
  });
}

async function deDataUrl(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

function sello(): string {
  return new Date().toISOString().slice(0, 10);
}

const BOTON =
  'h-[52px] w-full rounded-[11px] border border-line bg-surface font-display text-[15px] font-bold tracking-[0.1em] text-ink uppercase';
const ETIQUETA = 'mb-2.5 font-display text-[13px] font-bold tracking-[0.15em] text-ink3 uppercase';

/** Permiso para que el fin del descanso suene con la pantalla apagada. */
function PanelAvisos() {
  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [rechazado, setRechazado] = useState(false);

  useEffect(() => {
    let vigente = true;
    void avisosPermitidos().then((v) => vigente && setPermitido(v));
    return () => {
      vigente = false;
    };
  }, []);

  if (!esAppAndroid()) return null;

  return (
    <section className="mb-6">
      <p className={ETIQUETA}>Aviso de descanso</p>
      <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
        <p className="mb-2 text-[13.5px] leading-relaxed text-ink2">
          Con el permiso de notificaciones, el fin del descanso suena y vibra aunque tengas la pantalla apagada o el
          teléfono en el bolsillo.
        </p>
        {permitido === true ? (
          <p className="text-[13px] font-semibold text-accent-ink">✓ Avisos activados</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                void pedirAvisos().then((ok) => {
                  setPermitido(ok);
                  setRechazado(!ok);
                })
              }
              className="h-11 w-full rounded-[10px] border border-line bg-surface text-[14px] font-semibold text-ink2"
            >
              Permitir avisos
            </button>
            {rechazado && (
              <p className="mt-2 text-[12.5px] leading-snug text-ink3">
                Si no aparece el permiso, actívalo en Ajustes del teléfono → Aplicaciones → Arquero →
                Notificaciones.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export function PantallaDatos({ semana, todas, sesiones, mediciones }: Props) {
  const { instalada, listaSinConexion } = useInstalacion();
  const { programa, catalogo, definicion, personalizado } = useArquero();
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
      // Las fotos se convierten antes: dentro de la transaccion no se puede esperar a fetch.
      const fotos = await Promise.all(
        datos.fotos.map(async (f) => ({ ejercicioId: f.ejercicioId, imagen: await deDataUrl(f.dataUrl), actualizado: Date.now() })),
      );
      const tablas = [db.series, db.sesiones, db.mediciones, db.ajustes, db.programas, db.ejerciciosPropios, db.fotos];
      await db.transaction('rw', tablas, async () => {
        await Promise.all([db.series.clear(), db.sesiones.clear(), db.mediciones.clear()]);
        await db.series.bulkPut(datos.series);
        if (datos.sesiones.length) await db.sesiones.bulkPut(datos.sesiones);
        if (datos.mediciones.length) {
          await db.mediciones.bulkPut(datos.mediciones.map(({ id: _id, ...m }) => m as Medicion));
        }
        // Respaldos v1 no traen programa: se conserva el que haya en el telefono.
        if (datos.version >= 2) {
          await db.programas.clear();
          if (datos.definicionPrograma) {
            await db.programas.put({ id: 'activo', definicion: datos.definicionPrograma, actualizado: Date.now() });
          }
          await db.ejerciciosPropios.clear();
          if (datos.ejerciciosPropios.length) await db.ejerciciosPropios.bulkPut(datos.ejerciciosPropios);
          await db.fotos.clear();
          if (fotos.length) await db.fotos.bulkPut(fotos);
          await db.ajustes.where('clave').startsWith('nota:').delete();
          const notas = Object.entries(datos.notas).map(([id, valor]) => ({ clave: `nota:${id}`, valor }));
          if (notas.length) await db.ajustes.bulkPut(notas);
        }
      });
      await fijarSemana(datos.semana);
      if (datos.alturaCm) await fijarAlturaCm(datos.alturaCm);
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

      {esAppAndroid() ? (
        <p className="mb-4 rounded-lg bg-accent-soft px-3.5 py-2.5 text-[13px] leading-snug text-accent-ink">
          App Android: todo viene dentro de la app y funciona sin conexión.
        </p>
      ) : (
        <p
          className={`mb-4 rounded-lg px-3.5 py-2.5 text-[13px] leading-snug ${
            listaSinConexion ? 'bg-accent-soft text-accent-ink' : 'bg-warn-soft text-warn'
          }`}
        >
          {listaSinConexion
            ? `Lista para usar sin conexion${instalada ? ' · instalada en el telefono' : ''}. Puedes activar el modo avion.`
            : 'Preparando la copia offline. Deja la app abierta unos segundos con conexion.'}
        </p>
      )}

      <PanelAvisos />

      <PanelReloj semana={semana} sesiones={sesiones} />

      <div className="grid gap-2.5">
        <button
          type="button"
          className={BOTON}
          onClick={() => {
            void (async () => {
              const fotos: FotoRespaldo[] = await Promise.all(
                (await db.fotos.toArray()).map(async (f) => ({ ejercicioId: f.ejercicioId, dataUrl: await aDataUrl(f.imagen) })),
              );
              const respaldo = construirRespaldo({
                semana,
                series: todas,
                sesiones,
                mediciones,
                programa,
                definicionPrograma: personalizado ? definicion : null,
                ejerciciosPropios: catalogo.filter((e) => e.propio),
                notas: await leerNotasEjercicios(),
                fotos,
                alturaCm: await leerAlturaCm(),
              });
              await descargar(`registro-arquero-${sello()}.json`, JSON.stringify(respaldo, null, 2), 'application/json');
              avisar('JSON exportado.');
            })().catch((e: unknown) => {
              // Cerrar el menu de compartir sin elegir destino tambien llega aca.
              if (!(e instanceof Error && /cancel/i.test(e.message))) setError('No se pudo exportar el respaldo.');
            });
          }}
        >
          Exportar JSON
        </button>

        <button
          type="button"
          className={BOTON}
          onClick={() => {
            void descargar(`entrenamiento-${sello()}.csv`, seriesACsv(todas, sesiones, programa, catalogo), 'text/csv')
              .then(() => avisar('CSV de entrenamiento exportado.'))
              .catch(() => undefined);
          }}
        >
          Exportar CSV entrenamiento
        </button>

        <button
          type="button"
          className={BOTON}
          onClick={() => {
            void leerAlturaCm()
              .then((alturaCm) => descargar(`mediciones-${sello()}.csv`, medicionesACsv(mediciones, alturaCm), 'text/csv'))
              .then(() => avisar('CSV de mediciones exportado.'))
              .catch(() => undefined);
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
        {todas.length} series y {mediciones.length} mediciones guardadas. El JSON incluye también tu programa
        editado, ejercicios propios, notas de técnica y fotos. Importar reemplaza todo lo actual.
      </p>
    </>
  );
}

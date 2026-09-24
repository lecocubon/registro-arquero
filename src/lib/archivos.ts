import { esAppAndroid } from './salud';

/**
 * Guardar archivos en el telefono. La app nativa no puede usar `<a download>`
 * y el menu de compartir depende de que haya una app que reciba el archivo,
 * asi que las copias se escriben directo en Documentos/Arquero.
 */

const CARPETA = 'Arquero';

/** Guarda el archivo en Documentos/Arquero y devuelve la ruta para mostrar. */
export async function guardarEnDocumentos(nombre: string, contenido: string): Promise<string> {
  const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem');
  const escribir = (directory: (typeof Directory)[keyof typeof Directory]) =>
    Filesystem.writeFile({
      path: `${CARPETA}/${nombre}`,
      data: contenido,
      directory,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  try {
    return rutaLegible((await escribir(Directory.Documents)).uri);
  } catch {
    // Si Android bloquea la carpeta publica, la copia va a la de la app.
    return rutaLegible((await escribir(Directory.External)).uri);
  }
}

/** file:///storage/emulated/0/Documents/Arquero/x.json -> Documentos/Arquero/x.json */
function rutaLegible(uri: string): string {
  return decodeURIComponent(uri)
    .replace(/^file:\/\//, '')
    .replace(/^\/storage\/emulated\/0\//, '')
    .replace(/^\/sdcard\//, '')
    .replace(/^Documents\//, 'Documentos/');
}

/** Abre el menu de compartir con el archivo (Drive, WhatsApp, correo...). */
export async function compartirArchivo(nombre: string, contenido: string): Promise<void> {
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
  await Share.share({ title: nombre, files: [uri], dialogTitle: 'Compartir respaldo de Arquero' });
}

/** Descarga del navegador. Solo sirve en la version web. */
export function descargarEnNavegador(nombre: string, contenido: string, tipo: string): void {
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

/** En el telefono comparte; en la web descarga. */
export async function exportarArchivo(nombre: string, contenido: string, tipo: string): Promise<void> {
  if (esAppAndroid()) await compartirArchivo(nombre, contenido);
  else descargarEnNavegador(nombre, contenido, tipo);
}

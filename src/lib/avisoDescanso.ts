import { Capacitor } from '@capacitor/core';

/**
 * Aviso del sistema al terminar el descanso: suena y vibra aunque la app este
 * en segundo plano o la pantalla apagada, algo que la web no puede hacer.
 * Solo existe en la app Android; en el navegador cada funcion no hace nada.
 */

/** Solo hay un descanso a la vez, asi que reprogramar reemplaza el aviso. */
const ID_AVISO = 1;
const CANAL = 'descanso';

type Plugin = typeof import('@capacitor/local-notifications')['LocalNotifications'];

/**
 * El plugin viene envuelto: los plugins de Capacitor son un Proxy que
 * convierte cualquier propiedad en una llamada nativa, asi que devolverlo
 * suelto desde una funcion async hace que el `await` lo tome por promesa y
 * llame a `LocalNotifications.then()`, que no existe.
 */
async function plugin(): Promise<{ ln: Plugin } | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return { ln: LocalNotifications };
  } catch {
    return null;
  }
}

/**
 * ¿Se pueden mostrar avisos? Sin preguntar nada al usuario. Se consulta
 * `areEnabled` y no el permiso: lo que importa es si el sistema los deja
 * salir, que tambien cubre los avisos apagados desde los ajustes.
 */
export async function avisosPermitidos(): Promise<boolean> {
  const p = await plugin();
  if (!p) return false;
  const { ln } = p;
  try {
    return (await ln.areEnabled()).value;
  } catch {
    return false;
  }
}

/** Pide el permiso (Android 13+) y deja listo el canal. Devuelve si quedo concedido. */
export async function pedirAvisos(): Promise<boolean> {
  const p = await plugin();
  if (!p) return false;
  const { ln } = p;
  try {
    if (!(await ln.areEnabled()).value) {
      await ln.requestPermissions();
      if (!(await ln.areEnabled()).value) return false;
    }
    await ln.createChannel({
      id: CANAL,
      name: 'Fin del descanso',
      description: 'Suena cuando termina el descanso entre series.',
      importance: 5,
      vibration: true,
      visibility: 1,
    });
    return true;
  } catch {
    return false;
  }
}

/** Programa el aviso para la hora en que termina el descanso. */
export async function programarAvisoDescanso(fin: number): Promise<void> {
  const p = await plugin();
  if (!p) return;
  const { ln } = p;
  if (fin - Date.now() < 1000) return;
  if (!(await pedirAvisos())) return;
  try {
    await ln.schedule({
      notifications: [
        {
          id: ID_AVISO,
          title: 'A la serie',
          body: 'Terminó el descanso.',
          channelId: CANAL,
          schedule: { at: new Date(fin), allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* sin aviso: la barra de descanso sigue funcionando igual */
  }
}

export async function cancelarAvisoDescanso(): Promise<void> {
  const p = await plugin();
  if (!p) return;
  const { ln } = p;
  try {
    await ln.cancel({ notifications: [{ id: ID_AVISO }] });
  } catch {
    /* no habia nada programado */
  }
}

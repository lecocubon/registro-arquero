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

async function plugin(): Promise<Plugin | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return (await import('@capacitor/local-notifications')).LocalNotifications;
  } catch {
    return null;
  }
}

/** ¿Se pueden mostrar avisos? Sin preguntar nada al usuario. */
export async function avisosPermitidos(): Promise<boolean> {
  const ln = await plugin();
  if (!ln) return false;
  try {
    return (await ln.checkPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

/** Pide el permiso (Android 13+) y deja listo el canal. Devuelve si quedo concedido. */
export async function pedirAvisos(): Promise<boolean> {
  const ln = await plugin();
  if (!ln) return false;
  try {
    let { display } = await ln.checkPermissions();
    if (display !== 'granted' && display !== 'denied') {
      display = (await ln.requestPermissions()).display;
    }
    if (display !== 'granted') return false;
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
  const ln = await plugin();
  if (!ln) return;
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
  const ln = await plugin();
  if (!ln) return;
  try {
    await ln.cancel({ notifications: [{ id: ID_AVISO }] });
  } catch {
    /* no habia nada programado */
  }
}

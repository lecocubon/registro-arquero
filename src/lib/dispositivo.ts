import { useEffect } from 'react';

export function vibrar(patron: number | number[]): void {
  try {
    navigator.vibrate?.(patron);
  } catch {
    /* sin vibracion en este navegador */
  }
}

/**
 * Mantiene la pantalla encendida mientras `activa` sea true. El navegador
 * libera el bloqueo al pasar a segundo plano, asi que se vuelve a pedir al volver.
 */
export function usePantallaActiva(activa: boolean): void {
  useEffect(() => {
    if (!activa || !('wakeLock' in navigator)) return;
    let bloqueo: WakeLockSentinel | null = null;
    let vigente = true;

    const pedir = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const nuevo = await navigator.wakeLock.request('screen');
        if (vigente) bloqueo = nuevo;
        else void nuevo.release();
      } catch {
        /* bateria baja o permiso denegado: la app sigue funcionando */
      }
    };
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') void pedir();
    };

    void pedir();
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      vigente = false;
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      void bloqueo?.release();
    };
  }, [activa]);
}

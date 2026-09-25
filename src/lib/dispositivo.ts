import { useEffect, useState } from 'react';

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

/** Alto que tapa el teclado para darlo por abierto. */
const ALTO_TECLADO = 150;

/**
 * True mientras el teclado del telefono esta abierto. No hay evento de
 * teclado en la web, asi que se mide el alto disponible; en la app nativa
 * Capacitor achica todo el WebView (tambien `innerHeight`), por eso se
 * compara contra el alto mas grande visto y no contra `innerHeight`.
 */
export function useTecladoAbierto(): boolean {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let maximo = 0;
    const medir = () => {
      const alto = window.visualViewport?.height ?? window.innerHeight;
      maximo = Math.max(maximo, alto);
      setAbierto(maximo - alto > ALTO_TECLADO);
    };
    medir();
    window.addEventListener('resize', medir);
    window.visualViewport?.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('resize', medir);
      window.visualViewport?.removeEventListener('resize', medir);
    };
  }, []);

  return abierto;
}

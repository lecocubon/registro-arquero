import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Boton "atras" de Android en la app nativa. Al registrar el listener,
 * Capacitor deja de minimizar la app por su cuenta: `manejar` decide y
 * devuelve false cuando no queda nada que cerrar (entonces se minimiza).
 */
export function useBotonAtras(manejar: () => boolean): void {
  const ref = useRef(manejar);
  ref.current = manejar;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let quitar: (() => void) | undefined;
    let vigente = true;
    void import('@capacitor/app').then(({ App }) =>
      App.addListener('backButton', () => {
        if (!ref.current()) void App.minimizeApp();
      }).then((h) => {
        if (vigente) quitar = () => void h.remove();
        else void h.remove();
      }),
    );
    return () => {
      vigente = false;
      quitar?.();
    };
  }, []);
}

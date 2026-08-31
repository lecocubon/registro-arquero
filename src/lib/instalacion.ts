import { useEffect, useState } from 'react';

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function esStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

export function esIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const ipadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || ipadOS;
}

export interface EstadoInstalacion {
  instalada: boolean;
  puedeInstalar: boolean;
  ios: boolean;
  /** El service worker ya controla la pagina: la app abre sin conexion. */
  listaSinConexion: boolean;
  instalar: () => Promise<void>;
}

export function useInstalacion(): EstadoInstalacion {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [instalada, setInstalada] = useState(esStandalone);
  const [listaSinConexion, setListaSinConexion] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller,
  );

  useEffect(() => {
    const alPrompt = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
    };
    const alInstalar = () => {
      setInstalada(true);
      setEvento(null);
    };
    const mq = window.matchMedia('(display-mode: standalone)');
    const alCambiar = () => setInstalada(esStandalone());

    window.addEventListener('beforeinstallprompt', alPrompt);
    window.addEventListener('appinstalled', alInstalar);
    mq.addEventListener('change', alCambiar);

    let vivo = true;
    void navigator.serviceWorker?.ready.then(() => {
      if (vivo) setListaSinConexion(true);
    });

    return () => {
      vivo = false;
      window.removeEventListener('beforeinstallprompt', alPrompt);
      window.removeEventListener('appinstalled', alInstalar);
      mq.removeEventListener('change', alCambiar);
    };
  }, []);

  return {
    instalada,
    puedeInstalar: evento !== null,
    ios: esIOS(),
    listaSinConexion,
    instalar: async () => {
      if (!evento) return;
      await evento.prompt();
      await evento.userChoice;
      setEvento(null);
    },
  };
}

import { StrictMode } from 'react';
import { Capacitor } from '@capacitor/core';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import './index.css';
import App from './App';
import { ProveedorArquero } from './estado/arquero';

// En la app Android los archivos vienen dentro del APK: el service worker sobra.
if (!Capacitor.isNativePlatform()) registerSW({ immediate: true });

const contenedor = document.getElementById('root');
if (!contenedor) throw new Error('Falta #root');

createRoot(contenedor).render(
  <StrictMode>
    <ProveedorArquero>
      <App />
    </ProveedorArquero>
  </StrictMode>,
);

import { StrictMode } from 'react';
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

registerSW({ immediate: true });

const contenedor = document.getElementById('root');
if (!contenedor) throw new Error('Falta #root');

createRoot(contenedor).render(
  <StrictMode>
    <ProveedorArquero>
      <App />
    </ProveedorArquero>
  </StrictMode>,
);

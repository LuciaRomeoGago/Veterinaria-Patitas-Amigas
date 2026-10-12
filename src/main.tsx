import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SinConexion } from './components/SinConexion';
import { StoreProvider } from './lib/store';
import './styles/tokens.css';
import './styles/base.css';

// Modo sin conexión: solo en la versión publicada (en desarrollo molestaría con archivos viejos).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <StoreProvider>
          <SinConexion />
          <App />
        </StoreProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

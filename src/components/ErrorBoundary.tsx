import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Si algo falla al dibujar una pantalla, en lugar de quedar en blanco muestra el error
 * y un botón para volver a los datos de ejemplo (por si quedaron datos viejos guardados).
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="screen" style={{ maxWidth: 560, margin: '0 auto', background: 'var(--beige)', minHeight: '100vh' }}>
        <h1 className="display-l">Algo salió mal</h1>
        <p className="suave">No pudimos mostrar esta pantalla. Probá volver a los datos de ejemplo.</p>
        <pre className="mono-dato" style={{ whiteSpace: 'pre-wrap', color: 'var(--error)' }}>{String(this.state.error)}</pre>
        <button
          type="button"
          className="btn btn--primario"
          onClick={() => {
            try {
              Object.keys(localStorage)
                .filter((k) => k.startsWith('patitas-amigas'))
                .forEach((k) => localStorage.removeItem(k));
            } catch {
              /* sin acceso a localStorage */
            }
            location.href = '/';
          }}
        >
          Volver a empezar
        </button>
      </main>
    );
  }
}

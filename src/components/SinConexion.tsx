import { useEffect, useState } from 'react';

/** Aviso fijo cuando se corta internet: la app sigue andando con lo guardado en este equipo. */
export function SinConexion() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <p className="sin-conexion texto-chico" role="status">
      <strong>Sin conexión.</strong> Podés seguir usando la app: lo que cargues queda guardado en este equipo.
    </p>
  );
}

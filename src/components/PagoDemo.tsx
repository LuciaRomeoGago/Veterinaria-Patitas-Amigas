import { useEffect, useState } from 'react';
import { precio } from '../lib/format';
import { Sheet } from './Layout';
import { Button, Notice } from './ui';

/*
 * Pago con Mercado Pago, simulado para la demo. En producción el botón crea una preferencia
 * de pago en el servidor y abre el checkout de Mercado Pago; al volver, el servidor confirma
 * el pago (webhook) y recién ahí se registra. Acá no se pide ningún dato ni se cobra nada:
 * se elige qué respuesta simular.
 */
export function PagoDemo({ concepto, monto, onAprobado, onClose }: { concepto: string; monto: number; onAprobado: () => void; onClose: () => void }) {
  const [estado, setEstado] = useState<'elegir' | 'esperando' | 'rechazado'>('elegir');

  useEffect(() => {
    if (estado !== 'esperando') return;
    const t = setTimeout(onAprobado, 1200);
    return () => clearTimeout(t);
  }, [estado, onAprobado]);

  return (
    <Sheet title="Pagar con Mercado Pago" onClose={onClose}>
      <p className="mono-etiqueta">Pagar</p>
      <h2 className="display-m">{precio(monto)}</h2>
      <p className="suave">{concepto}</p>
      <div className="pago-demo">
        <p className="texto-fuerte">Pago con Mercado Pago</p>
        <p className="texto-chico">En la app real, acá se abre Mercado Pago para pagar con tarjeta, dinero en cuenta o QR, y después volvés a esta pantalla.</p>
        <p className="mono-etiqueta">Demo: no se cobra nada</p>
      </div>
      {estado === 'rechazado' && (
        <Notice tipo="error" titulo="El pago no se aprobó">
          No se te cobró nada. Probá de nuevo o elegí otra forma de pago.
        </Notice>
      )}
      {estado === 'esperando' ? (
        <p className="texto-fuerte pago-demo__espera" role="status">
          Esperando la confirmación del pago…
        </p>
      ) : (
        <>
          <Button full onClick={() => setEstado('esperando')}>
            Simular pago aprobado
          </Button>
          <Button variant="secundario" full onClick={() => setEstado('rechazado')}>
            Simular pago rechazado
          </Button>
          <button type="button" className="link-button mono-etiqueta pago-demo__volver" onClick={onClose}>
            Volver sin pagar
          </button>
        </>
      )}
    </Sheet>
  );
}

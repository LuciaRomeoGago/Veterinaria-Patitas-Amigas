import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Chip, Drawing, Notice, Tag } from '../components/ui';
import { Screen, Sheet } from '../components/Layout';
import { PagoDemo } from '../components/PagoDemo';
import type { Producto } from '../data/types';
import { cuanto, fechaCorta } from '../lib/dates';
import { plural, precio } from '../lib/format';
import { useStore } from '../lib/store';
import { Empty } from './Turnos';
import './pages.css';

/** 15 · Tienda, con 16 · Comprar y 17 · sin stock en una hoja. */
export function Tienda() {
  const { productos, producto } = useStore();
  const [params, setParams] = useSearchParams();
  // "Pedir otra vez" llega con ?comprar=código&cantidad=n y abre la hoja directamente.
  const [elegido, setElegido] = useState<Producto | null>(() => {
    const p = producto(Number(params.get('comprar')));
    return p && p.stock > 0 ? p : null;
  });
  const cantidadInicial = Number(params.get('cantidad')) || 1;

  return (
    <Screen nav="tienda" label="Tienda">
      <p className="mono-etiqueta">{plural(productos.length, 'producto', 'productos')}</p>
      <h1 className="display-l">Tienda</h1>
      <ul className="products">
        {productos.map((p) => (
          <li key={p.id} className="products__row">
            <div className="list__text">
              <p className="texto-fuerte">{p.nombre}</p>
              <p className="mono-dato suave">
                {precio(p.precio)}
                {p.stock > 0 && `  ·  quedan ${p.stock}`}
              </p>
            </div>
            {p.stock > 0 ? (
              <Button variant="acento" small onClick={() => setElegido(p)} aria-label={`Comprar ${p.nombre}`}>
                Comprar
              </Button>
            ) : (
              <Tag>Sin stock</Tag>
            )}
          </li>
        ))}
      </ul>
      {elegido && (
        <Comprar
          producto={elegido}
          inicial={elegido.id === Number(params.get('comprar')) ? Math.min(cantidadInicial, elegido.stock) : 1}
          onClose={() => {
            setElegido(null);
            if (params.get('comprar')) setParams({}, { replace: true });
          }}
        />
      )}
    </Screen>
  );
}

function Comprar({ producto: p, inicial = 1, onClose }: { producto: Producto; inicial?: number; onClose: () => void }) {
  const { comprar } = useStore();
  const navigate = useNavigate();
  const [cantidad, setCantidad] = useState(inicial);
  const [pago, setPago] = useState<'mercadopago' | 'al_retirar'>('mercadopago');
  const [pagando, setPagando] = useState(false);
  // Igual que InventarioManager::comprarProducto(): no se puede comprar más que el stock.
  const sinStock = cantidad > p.stock;

  const registrar = () => {
    comprar(p.id, cantidad, pago);
    navigate(`/compras?producto=${p.id}&cantidad=${cantidad}&pago=${pago}`);
  };
  const confirmar = () => {
    if (sinStock || cantidad < 1) return;
    if (pago === 'mercadopago') setPagando(true);
    else registrar();
  };

  if (pagando) return <PagoDemo concepto={`${p.nombre} × ${cantidad}`} monto={p.precio * cantidad} onAprobado={registrar} onClose={() => setPagando(false)} />;

  return (
    <Sheet title={`Comprar ${p.nombre}`} onClose={onClose}>
      <p className="mono-etiqueta">Comprar</p>
      <h2 className="display-m">{p.nombre}</h2>
      <p className="mono-dato suave">
        {precio(p.precio)} c/u · quedan {p.stock}
      </p>
      <div className="qty">
        <label htmlFor="cantidad" className="texto-fuerte">
          Cantidad
        </label>
        <div className="qty__control">
          <button type="button" className="qty__btn display-s" onClick={() => setCantidad((n) => Math.max(1, n - 1))} disabled={cantidad <= 1} aria-label="Uno menos">
            −
          </button>
          <input
            id="cantidad"
            className={`qty__input display-s${sinStock ? ' qty__input--error' : ''}`}
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))}
            aria-invalid={sinStock}
          />
          <button type="button" className="qty__btn display-s" onClick={() => setCantidad((n) => n + 1)} disabled={cantidad >= p.stock} aria-label="Uno más">
            +
          </button>
        </div>
      </div>
      {sinStock && (
        <Notice tipo="error" titulo="No hay stock suficiente">
          Quedan {p.stock}. Elegí una cantidad menor.
        </Notice>
      )}
      <fieldset className="group">
        <legend className="mono-etiqueta">Cómo pagás</legend>
        <div className="chips">
          <Chip pressed={pago === 'mercadopago'} onClick={() => setPago('mercadopago')}>
            Mercado Pago, ahora
          </Chip>
          <Chip pressed={pago === 'al_retirar'} onClick={() => setPago('al_retirar')}>
            Al retirar
          </Chip>
        </div>
      </fieldset>
      <div className="row-between">
        <span className="texto-fuerte">Total</span>
        <span className="display-m">{precio(p.precio * cantidad)}</span>
      </div>
      <Button full onClick={confirmar} disabled={sinStock}>
        {pago === 'mercadopago' ? 'Ir a pagar' : 'Confirmar compra'}
      </Button>
      <Button variant="secundario" full onClick={onClose}>
        Cancelar
      </Button>
    </Sheet>
  );
}

/** 18 · Mis compras (el inventario del cliente) y 19 · sin compras. Con "Pedir otra vez". */
export function Compras() {
  const { compras, producto, hoy } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const recien = producto(Number(params.get('producto')));
  const cant = Number(params.get('cantidad'));
  const pagada = params.get('pago') === 'mercadopago';
  const unidades = compras.reduce((n, c) => n + c.cantidad, 0);
  const porRetirar = compras.filter((c) => !c.cobrada);
  // Cada compra queda guardada con su fecha; acá se suman por producto, con la última vez.
  const porProducto = compras.reduce<{ productoId: number; cantidad: number; ultima: string; ultimaCantidad: number }[]>((acc, c) => {
    const x = acc.find((y) => y.productoId === c.productoId);
    if (x) {
      x.cantidad += c.cantidad;
      if (c.fecha >= x.ultima) Object.assign(x, { ultima: c.fecha, ultimaCantidad: c.cantidad });
    } else acc.push({ productoId: c.productoId, cantidad: c.cantidad, ultima: c.fecha, ultimaCantidad: c.cantidad });
    return acc;
  }, []);

  if (!compras.length) {
    return (
      <Screen nav="tienda" label="Mis compras" className="empty">
        <h1 className="display-l">Mis compras</h1>
        <Empty titulo="Todavía no compraste nada" texto="Lo que compres en la tienda aparece acá para retirarlo en la veterinaria." cta="Ir a la tienda" to="/tienda" />
      </Screen>
    );
  }

  return (
    <Screen nav="tienda" label="Mis compras">
      <p className="mono-etiqueta">{plural(unidades, 'producto', 'productos')}</p>
      <h1 className="display-l">Mis compras</h1>
      {recien && cant > 0 && (
        <Notice tipo="exito" titulo={pagada ? 'Pago aprobado' : 'Compra hecha'}>
          {cant} × {recien.nombre.toLowerCase()}. {pagada ? 'Ya está pagado: solo tenés que retirarlo.' : 'Lo pagás cuando lo retirás.'}
        </Notice>
      )}
      {porRetirar.length > 0 && (
        <p className="texto-chico">
          Para pagar al retirar: {porRetirar.map((c) => `${producto(c.productoId)?.nombre.toLowerCase()} × ${c.cantidad}`).join(', ')}.
        </p>
      )}
      <ul className="products">
        {porProducto.map((c) => {
          const p = producto(c.productoId);
          return (
            <li key={c.productoId} className="products__row">
              <div className="list__text">
                <p className="texto-fuerte">{p?.nombre}</p>
                <p className="texto-chico suave">
                  × {c.cantidad} · la última, {c.ultima === hoy ? 'hoy' : `el ${fechaCorta(c.ultima)} (${cuanto(c.ultima)})`}
                </p>
              </div>
              {p && p.stock > 0 ? (
                <Button variant="acento" small onClick={() => navigate(`/tienda?comprar=${p.id}&cantidad=${c.ultimaCantidad}`)} aria-label={`Pedir otra vez ${p.nombre}`}>
                  Pedir otra vez
                </Button>
              ) : (
                <Tag>Sin stock</Tag>
              )}
            </li>
          );
        })}
      </ul>
      <p className="texto-chico suave">Retiralos en la veterinaria cuando quieras.</p>
      <div className="grow" />
      <Drawing especie="ambos" height={200} />
    </Screen>
  );
}

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Drawing, Notice, Tag } from '../components/ui';
import { Screen, Sheet } from '../components/Layout';
import type { Producto } from '../data/types';
import { plural, precio } from '../lib/format';
import { useStore } from '../lib/store';
import { Empty } from './Turnos';
import './pages.css';

/** 15 · Tienda, con 16 · Comprar y 17 · sin stock en una hoja. */
export function Tienda() {
  const { productos } = useStore();
  const [elegido, setElegido] = useState<Producto | null>(null);

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
      {elegido && <Comprar producto={elegido} onClose={() => setElegido(null)} />}
    </Screen>
  );
}

function Comprar({ producto: p, onClose }: { producto: Producto; onClose: () => void }) {
  const { comprar } = useStore();
  const navigate = useNavigate();
  const [cantidad, setCantidad] = useState(1);
  // Igual que InventarioManager::comprarProducto(): no se puede comprar más que el stock.
  const sinStock = cantidad > p.stock;

  const confirmar = () => {
    if (sinStock || cantidad < 1) return;
    comprar(p.id, cantidad);
    navigate(`/compras?producto=${p.id}&cantidad=${cantidad}`);
  };

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
      <div className="row-between">
        <span className="texto-fuerte">Total</span>
        <span className="display-m">{precio(p.precio * cantidad)}</span>
      </div>
      <Button full onClick={confirmar} disabled={sinStock}>
        Confirmar compra
      </Button>
      <Button variant="secundario" full onClick={onClose}>
        Cancelar
      </Button>
    </Sheet>
  );
}

/** 18 · Mis compras (el inventario del cliente) y 19 · sin compras. */
export function Compras() {
  const { compras, producto } = useStore();
  const [params] = useSearchParams();
  const recien = producto(Number(params.get('producto')));
  const cant = Number(params.get('cantidad'));
  const unidades = compras.reduce((n, c) => n + c.cantidad, 0);

  if (!compras.length) {
    return (
      <Screen nav="inicio" label="Mis compras" className="empty">
        <h1 className="display-l">Mis compras</h1>
        <Empty titulo="Todavía no compraste nada" texto="Lo que compres en la tienda aparece acá para retirarlo en la veterinaria." cta="Ir a la tienda" to="/tienda" />
      </Screen>
    );
  }

  return (
    <Screen nav="inicio" label="Mis compras">
      <p className="mono-etiqueta">{plural(unidades, 'producto', 'productos')}</p>
      <h1 className="display-l">Mis compras</h1>
      {recien && cant > 0 && (
        <Notice tipo="exito" titulo="Compra hecha">
          Sumamos {cant} × {recien.nombre.toLowerCase()} a tus compras.
        </Notice>
      )}
      <ul className="products">
        {compras.map((c) => (
          <li key={c.productoId} className="products__row">
            <p className="texto-fuerte">{producto(c.productoId)?.nombre}</p>
            <p className="display-s">× {c.cantidad}</p>
          </li>
        ))}
      </ul>
      <p className="texto-chico suave">Retiralos en la veterinaria cuando quieras.</p>
      <div className="grow" />
      <Drawing especie="ambos" height={200} />
    </Screen>
  );
}

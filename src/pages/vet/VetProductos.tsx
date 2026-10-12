import { useState, type FormEvent } from 'react';
import { Field, Notice, Tag } from '../../components/ui';
import { Modal, Panel, PanelActions, RowActions, Table, VetHead, VetScreen, useToast } from '../../components/vet';
import type { Producto } from '../../data/types';
import { plural, precio, stockBajo } from '../../lib/format';
import { cuanto, daysBetween, fechaCorta } from '../../lib/dates';
import { Chip } from '../../components/ui';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../lib/store';

/** 32 · Productos, con 33 · Agregar, 34 · Editar, 35 · guardado y eliminar. */
export function VetProductos() {
  const { productos, deleteProducto, state, hoy } = useStore();
  const [params] = useSearchParams();
  const [panel, setPanel] = useState<{ producto?: Producto } | null>(null);
  const [movs, setMovs] = useState<{ p: Producto; abrir?: 'entrada' | 'ajuste' } | null>(null);
  const [soloPocos, setSoloPocos] = useState(params.get('stock') === 'bajo');
  const [borrar, setBorrar] = useState<Producto | null>(null);
  const [toast, showToast] = useToast();
  const bajos = productos.filter(stockBajo);
  // Lotes que vencen en los próximos 60 días (de lo que entró con fecha de vencimiento).
  const vencen = state.movStock.filter((m) => m.tipo === 'entrada' && m.vence && daysBetween(hoy, m.vence) <= 60).sort((a, b) => a.vence!.localeCompare(b.vence!));

  return (
    <VetScreen label="Productos">
      <VetHead
        kicker={plural(productos.length, 'producto', 'productos')}
        title="Productos"
        action={
          <button type="button" className="btn btn--primario" onClick={() => setPanel({})}>
            Agregar producto
          </button>
        }
      />
      {bajos.length > 0 && (
        <Notice
          tipo="alerta"
          titulo={bajos.length === 1 ? 'Queda poco de 1 producto' : `Queda poco de ${bajos.length} productos`}
          acciones={[{ label: soloPocos ? 'Ver todos' : 'Ver solo esos', onClick: () => setSoloPocos((x) => !x) }]}
        >
          {bajos.map((p) => `${p.nombre} (${p.stock ? `quedan ${p.stock}` : 'sin stock'})`).join(', ')}. Conviene reponer.
        </Notice>
      )}
      {vencen.length > 0 && (
        <Notice tipo="alerta" titulo={vencen.length === 1 ? 'Un lote vence pronto' : `${vencen.length} lotes vencen pronto`}>
          {vencen.map((m) => `${productos.find((p) => p.id === m.productoId)?.nombre} (${m.vence! < hoy ? 'venció' : 'vence'} ${cuanto(m.vence!)})`).join(', ')}.
        </Notice>
      )}
      <Table
        caption="Productos"
        empty="Todavía no hay productos."
        columns={[{ label: 'Código', width: '7%' }, { label: 'Nombre', width: '26%' }, { label: 'Precio', width: '10%' }, { label: 'Stock', width: '16%' }, { label: 'Mínimo', width: '8%' }, { label: '', align: 'right' }]}
        rows={(soloPocos ? bajos : productos).map((p) => ({
          key: p.id,
          cells: [
            <span className="cell-mono">{p.id}</span>,
            <span className="cell-strong">{p.nombre}</span>,
            precio(p.precio),
            <span className="cell-stock">
              {p.stock > 0 && <span className="cell-mono">{p.stock}</span>}
              {p.stock === 0 ? <Tag tone="error">Sin stock</Tag> : stockBajo(p) && <Tag tone="alerta">Poco stock</Tag>}
            </span>,
            <span className="cell-mono">{p.minimo}</span>,
            <RowActions
              actions={[
                { label: 'Entrada', onClick: () => setMovs({ p, abrir: 'entrada' }) },
                { label: 'Movimientos', onClick: () => setMovs({ p }) },
                { label: 'Editar', onClick: () => setPanel({ producto: p }) },
                { label: 'Eliminar', danger: true, onClick: () => setBorrar(p) },
              ]}
            />,
          ],
        }))}
      />

      {panel && (
        <ProductoForm
          producto={panel.producto}
          onClose={() => setPanel(null)}
          onSaved={(p) => {
            setPanel(null);
            showToast('Producto guardado', `${p.nombre}: ${precio(p.precio)}, stock ${p.stock}.${stockBajo(p) ? ' Queda poco: conviene reponer.' : ''}`);
          }}
        />
      )}
      {movs && (
        <MovimientosPanel
          producto={productos.find((x) => x.id === movs.p.id) ?? movs.p}
          abrir={movs.abrir}
          onClose={() => setMovs(null)}
          onDone={(t) => {
            setMovs(null);
            showToast('Stock actualizado', t);
          }}
        />
      )}
      {borrar && (
        <Modal title={`¿Eliminar ${borrar.nombre.toLowerCase()}?`} onClose={() => setBorrar(null)}>
          <p className="suave">Deja de aparecer en la tienda y en las compras de los clientes. No se puede deshacer.</p>
          <div className="vet-modal__actions">
            <button
              type="button"
              className="btn btn--peligro"
              onClick={() => {
                deleteProducto(borrar.id);
                showToast('Producto eliminado', borrar.nombre);
                setBorrar(null);
              }}
            >
              Sí, eliminar
            </button>
            <button type="button" className="btn btn--secundario" onClick={() => setBorrar(null)}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}
      {toast}
    </VetScreen>
  );
}

function ProductoForm({ producto, onClose, onSaved }: { producto?: Producto; onClose: () => void; onSaved: (p: Producto) => void }) {
  const { productos, addProducto, editProducto } = useStore();
  const [codigo, setCodigo] = useState(producto ? String(producto.id) : '');
  const [nombre, setNombre] = useState(producto?.nombre ?? '');
  const [precioTxt, setPrecio] = useState(producto ? String(producto.precio) : '');
  const [stock, setStock] = useState(producto ? String(producto.stock) : '');
  const [minimo, setMinimo] = useState(producto ? String(producto.minimo) : '5');
  const [enviado, setEnviado] = useState(false);

  // Como ProductoManager::alta(): el código lo carga el veterinario y no se puede repetir.
  const errores = {
    codigo: !/^\d{1,6}$/.test(codigo) ? 'Solo números.' : !producto && productos.some((p) => p.id === Number(codigo)) ? 'Ya hay un producto con ese código.' : undefined,
    nombre: !nombre.trim() ? 'Escribí el nombre.' : undefined,
    precio: !/^\d+$/.test(precioTxt) || Number(precioTxt) <= 0 ? 'Precio en pesos, sin centavos.' : undefined,
    stock: !/^\d+$/.test(stock) ? 'Cantidad en números.' : undefined,
    minimo: !/^\d+$/.test(minimo) ? 'Cantidad en números.' : undefined,
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    if (Object.values(errores).some(Boolean)) return;
    const p = { id: Number(codigo), nombre: nombre.trim(), precio: Number(precioTxt), stock: Number(stock), minimo: Number(minimo) };
    if (producto) editProducto(p);
    else addProducto(p);
    onSaved(p);
  };

  const err = (k: keyof typeof errores) => (enviado ? errores[k] : undefined);

  return (
    <Panel title={producto ? 'Editar producto' : 'Agregar producto'} kicker={producto ? `Producto ${producto.id}` : 'Productos'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="Código" inputMode="numeric" placeholder="Ej.: 106" value={codigo} disabled={!!producto} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} error={err('codigo')} />
        <Field label="Nombre" placeholder="Ej.: Hueso de goma" value={nombre} onChange={(e) => setNombre(e.target.value)} error={err('nombre')} />
        <div className="row-2">
          <Field label="Precio ($)" inputMode="numeric" placeholder="0" value={precioTxt} onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ''))} error={err('precio')} />
          <Field
            label={producto ? 'Stock' : 'Stock inicial'}
            inputMode="numeric"
            placeholder="0"
            value={stock}
            disabled={!!producto}
            onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))}
            error={err('stock')}
          />
        </div>
        <Field label="Avisar cuando queden" inputMode="numeric" value={minimo} onChange={(e) => setMinimo(e.target.value.replace(/\D/g, ''))} error={err('minimo')} />
        <p className="texto-chico suave">Con esa cantidad o menos, el producto aparece con aviso de poco stock.</p>
        {producto && <p className="texto-chico suave">El stock se cambia con una entrada o un ajuste, en Movimientos, así queda registrado. Lo que no cambies queda como está.</p>}
        <PanelActions submit={producto ? 'Guardar cambios' : 'Guardar producto'} onCancel={onClose} />
      </form>
    </Panel>
  );
}

/** Movimientos de stock de un producto: lo que entró, lo que se vendió y los ajustes. Con registrar entrada y ajustar. */
function MovimientosPanel({ producto: p, abrir, onClose, onDone }: { producto: Producto; abrir?: 'entrada' | 'ajuste'; onClose: () => void; onDone: (texto: string) => void }) {
  const { state, entradaStock, ajustarStock } = useStore();
  const [modo, setModo] = useState<'lista' | 'entrada' | 'ajuste'>(abrir ?? 'lista');
  const [cantidad, setCantidad] = useState('');
  const [detalle, setDetalle] = useState('');
  const [vence, setVence] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const lista = state.movStock.filter((m) => m.productoId === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  const n = Number(cantidad);
  const error = !/^\d+$/.test(cantidad) || (modo === 'entrada' && n < 1) ? 'Cantidad en números.' : modo === 'ajuste' && n === p.stock ? 'Es el mismo stock que hay.' : undefined;
  const errorMotivo = modo === 'ajuste' && !motivo.trim() ? 'Contá por qué cambia.' : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    if (error || errorMotivo) return;
    if (modo === 'entrada') {
      entradaStock(p.id, n, detalle.trim() || undefined, vence || undefined);
      onDone(`Entraron ${n} de ${p.nombre.toLowerCase()}. Ahora hay ${p.stock + n}.`);
    } else {
      ajustarStock(p.id, n, motivo.trim());
      onDone(`${p.nombre}: de ${p.stock} a ${n} (${motivo.trim().toLowerCase()}).`);
    }
  };

  return (
    <Panel title={p.nombre} kicker={`Stock: ${p.stock} · mínimo ${p.minimo}`} onClose={onClose}>
      <div className="segmented" role="group" aria-label="Qué hacer">
        <button type="button" aria-pressed={modo === 'lista'} onClick={() => setModo('lista')}>
          Movimientos
        </button>
        <button type="button" aria-pressed={modo === 'entrada'} onClick={() => setModo('entrada')}>
          Entrada
        </button>
        <button type="button" aria-pressed={modo === 'ajuste'} onClick={() => setModo('ajuste')}>
          Ajuste
        </button>
      </div>
      {modo === 'lista' ? (
        <ol className="movs">
          {lista.length ? (
            lista.map((m) => (
              <li key={m.id} className="movs__fila">
                <div className="list__text">
                  <p className="texto-fuerte">{m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'venta' ? 'Venta' : 'Ajuste'}{m.detalle ? ` · ${m.detalle}` : ''}</p>
                  <p className="mono-dato suave">
                    {fechaCorta(m.fecha)} · {m.por}
                    {m.vence ? ` · vence ${fechaCorta(m.vence)}` : ''}
                  </p>
                </div>
                <span className={`display-s${m.cantidad < 0 ? ' is-egreso' : ''}`}>{m.cantidad > 0 ? `+${m.cantidad}` : `−${-m.cantidad}`}</span>
              </li>
            ))
          ) : (
            <p className="texto-chico suave">Todavía no hay movimientos.</p>
          )}
        </ol>
      ) : (
        <form onSubmit={submit} noValidate>
          {modo === 'entrada' ? (
            <>
              <Field label="Cantidad que entró" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ''))} error={enviado ? error : undefined} />
              <Field label="Proveedor o remito (opcional)" placeholder="Ej.: Distribuidora del Centro · remito 0012-4520" value={detalle} onChange={(e) => setDetalle(e.target.value)} />
              <Field label="Vencimiento del lote (opcional)" type="date" value={vence} onChange={(e) => setVence(e.target.value)} />
              <p className="texto-chico suave">Con vencimiento, avisamos cuando falten 60 días.</p>
            </>
          ) : (
            <>
              <Field label="Stock real (contado)" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ''))} error={enviado ? error : undefined} />
              <Field label="Motivo" placeholder="Ej.: Conteo" value={motivo} onChange={(e) => setMotivo(e.target.value)} error={enviado ? errorMotivo : undefined} />
              <div className="chips" role="group" aria-label="Motivos frecuentes">
                {['Conteo', 'Roto', 'Vencido', 'Uso en consultorio'].map((x) => (
                  <Chip key={x} pressed={motivo === x} onClick={() => setMotivo(x)}>
                    {x}
                  </Chip>
                ))}
              </div>
            </>
          )}
          <PanelActions submit={modo === 'entrada' ? 'Registrar entrada' : 'Ajustar stock'} onCancel={() => setModo('lista')} />
        </form>
      )}
    </Panel>
  );
}

import { useState, type FormEvent } from 'react';
import { Field, Tag } from '../../components/ui';
import { Modal, Panel, PanelActions, RowActions, Table, VetHead, VetScreen, useToast } from '../../components/vet';
import type { Producto } from '../../data/types';
import { plural, precio } from '../../lib/format';
import { useStore } from '../../lib/store';

/** 32 · Productos, con 33 · Agregar, 34 · Editar, 35 · guardado y eliminar. */
export function VetProductos() {
  const { productos, deleteProducto } = useStore();
  const [panel, setPanel] = useState<{ producto?: Producto } | null>(null);
  const [borrar, setBorrar] = useState<Producto | null>(null);
  const [toast, showToast] = useToast();

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
      <Table
        caption="Productos"
        empty="Todavía no hay productos."
        columns={[{ label: 'Código', width: '10%' }, { label: 'Nombre', width: '38%' }, { label: 'Precio', width: '16%' }, { label: 'Stock', width: '14%' }, { label: '', align: 'right' }]}
        rows={productos.map((p) => ({
          key: p.id,
          cells: [
            <span className="cell-mono">{p.id}</span>,
            <span className="cell-strong">{p.nombre}</span>,
            precio(p.precio),
            p.stock > 0 ? p.stock : <Tag>Sin stock</Tag>,
            <RowActions
              actions={[
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
            showToast('Producto guardado', `${p.nombre}: ${precio(p.precio)}, stock ${p.stock}.`);
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
  const [enviado, setEnviado] = useState(false);

  // Como ProductoManager::alta(): el código lo carga el veterinario y no se puede repetir.
  const errores = {
    codigo: !/^\d{1,6}$/.test(codigo) ? 'Solo números.' : !producto && productos.some((p) => p.id === Number(codigo)) ? 'Ya hay un producto con ese código.' : undefined,
    nombre: !nombre.trim() ? 'Escribí el nombre.' : undefined,
    precio: !/^\d+$/.test(precioTxt) || Number(precioTxt) <= 0 ? 'Precio en pesos, sin centavos.' : undefined,
    stock: !/^\d+$/.test(stock) ? 'Cantidad en números.' : undefined,
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    if (Object.values(errores).some(Boolean)) return;
    const p = { id: Number(codigo), nombre: nombre.trim(), precio: Number(precioTxt), stock: Number(stock) };
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
          <Field label="Stock" inputMode="numeric" placeholder="0" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))} error={err('stock')} />
        </div>
        {producto && <p className="texto-chico suave">Lo que no cambies queda como está.</p>}
        <PanelActions submit={producto ? 'Guardar cambios' : 'Guardar producto'} onCancel={onClose} />
      </form>
    </Panel>
  );
}

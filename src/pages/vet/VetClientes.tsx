import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field } from '../../components/ui';
import { Modal, Panel, PanelActions, RowActions, Table, VetHead, VetScreen, useToast } from '../../components/vet';
import type { Cliente } from '../../data/types';
import { plural } from '../../lib/format';
import { normalizar } from '../../lib/historia';
import { useStore } from '../../lib/store';

const dniFmt = (dni: string) => dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** 22 · Clientes, con 23 · Agregar, 24 · Editar, 25 · guardado y 26 · Eliminar. */
export function VetClientes() {
  const { clientes, mascotasDe, deleteCliente } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [panel, setPanel] = useState<{ cliente?: Cliente } | null>(null);
  const [borrar, setBorrar] = useState<Cliente | null>(null);
  const [toast, showToast] = useToast();

  // Busca por nombre, DNI o nombre de una de sus mascotas.
  const filtro = normalizar(q.trim());
  const digitos = filtro.replace(/\D/g, '');
  const lista = clientes.filter(
    (c) => !filtro || normalizar(c.nombre).includes(filtro) || (digitos !== '' && c.dni.includes(digitos)) || mascotasDe(c.id).some((m) => normalizar(m.nombre).includes(filtro)),
  );

  return (
    <VetScreen label="Clientes">
      <VetHead
        kicker={plural(clientes.length, 'cliente', 'clientes')}
        title="Clientes"
        action={
          <button type="button" className="btn btn--primario" onClick={() => setPanel({})}>
            Agregar cliente
          </button>
        }
      />
      <label className="sr-only" htmlFor="buscar">
        Buscar cliente
      </label>
      <input id="buscar" type="search" className="vet-search" placeholder="Buscar por nombre, DNI o mascota" value={q} onChange={(e) => setQ(e.target.value)} />
      <Table
        caption="Clientes"
        empty={`No hay clientes que coincidan con "${q}".`}
        columns={[{ label: 'N.º', width: '8%' }, { label: 'Nombre y apellido', width: '26%' }, { label: 'DNI', width: '15%' }, { label: 'Celular', width: '19%' }, { label: 'Mascotas', width: '11%' }, { label: '', align: 'right' }]}
        rows={lista.map((c) => ({
          key: c.id,
          cells: [
            <span className="cell-mono">{c.id}</span>,
            <span className="cell-strong">{c.nombre}</span>,
            dniFmt(c.dni),
            <span className="cell-mono">{c.telefono}</span>,
            <Link to={`/vet/mascotas?cliente=${c.id}`}>{mascotasDe(c.id).length}</Link>,
            <RowActions
              actions={[
                { label: 'Editar', onClick: () => setPanel({ cliente: c }) },
                { label: 'Eliminar', danger: true, onClick: () => setBorrar(c) },
              ]}
            />,
          ],
        }))}
      />

      {panel && (
        <ClienteForm
          cliente={panel.cliente}
          onClose={() => setPanel(null)}
          onSaved={(id, nombre, conMascota) => {
            setPanel(null);
            if (conMascota) navigate(`/vet/mascotas?cliente=${id}&nueva=1`);
            else showToast('Cliente guardado', panel.cliente ? `Actualizamos los datos de ${nombre}.` : `${nombre} es el cliente n.º ${id}.`);
          }}
        />
      )}

      {borrar && (
        <Modal title={`¿Eliminar a ${borrar.nombre}?`} onClose={() => setBorrar(null)}>
          <p className="suave">
            {mascotasDe(borrar.id).length ? `También se eliminan sus ${plural(mascotasDe(borrar.id).length, 'mascota', 'mascotas')} y sus compras.` : 'También se eliminan sus compras.'} No se puede deshacer.
          </p>
          <div className="vet-modal__actions">
            <button
              type="button"
              className="btn btn--peligro"
              onClick={() => {
                deleteCliente(borrar.id);
                showToast('Cliente eliminado', borrar.nombre);
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

function ClienteForm({ cliente, onClose, onSaved }: { cliente?: Cliente; onClose: () => void; onSaved: (id: number, nombre: string, conMascota: boolean) => void }) {
  const { clientes, addCliente, editCliente } = useStore();
  const [nombre, setNombre] = useState(cliente?.nombre ?? '');
  const [dni, setDni] = useState(cliente?.dni ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [conMascota, setConMascota] = useState(!cliente);
  const [enviado, setEnviado] = useState(false);

  // Como ClienteManager::alta(): nombre obligatorio y DNI único (UNIQUE en la tabla).
  const errores = {
    nombre: !nombre.trim() ? 'Escribí nombre y apellido.' : undefined,
    dni: !/^\d{7,8}$/.test(dni) ? 'El DNI tiene 7 u 8 números.' : clientes.some((c) => c.dni === dni && c.id !== cliente?.id) ? 'Ya hay un cliente con ese DNI.' : undefined,
    telefono: telefono.replace(/\D/g, '').length !== 10 ? 'Con característica y sin 0 ni 15: 10 números, como 249 455-1820.' : undefined,
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    if (errores.nombre || errores.dni || errores.telefono) return;
    const data = { nombre: nombre.trim(), dni, telefono: telefono.trim() };
    if (cliente) {
      editCliente(cliente.id, data);
      onSaved(cliente.id, data.nombre, false);
    } else {
      onSaved(addCliente(data), data.nombre, conMascota);
    }
  };

  return (
    <Panel title={cliente ? 'Editar cliente' : 'Agregar cliente'} kicker={cliente ? `Cliente n.º ${cliente.id}` : 'Clientes'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="Nombre y apellido" placeholder="Ej.: Marta Gómez" value={nombre} onChange={(e) => setNombre(e.target.value)} error={enviado ? errores.nombre : undefined} />
        <Field label="DNI" inputMode="numeric" placeholder="Ej.: 30456789" value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))} error={enviado ? errores.dni : undefined} />
        <Field label="Celular" type="tel" inputMode="tel" placeholder="Ej.: 249 455-1820" value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/[^\d\s-]/g, ''))} error={enviado ? errores.telefono : undefined} />
        <p className="texto-chico suave">Para los avisos por WhatsApp: turnos, vacunas y lista de espera.</p>
        {cliente ? (
          <p className="texto-chico suave">Lo que no cambies queda como está.</p>
        ) : (
          <>
            <label className="check">
              <input type="checkbox" checked={conMascota} onChange={(e) => setConMascota(e.target.checked)} />
              <span>Agregar una mascota ahora</span>
            </label>
            {conMascota && <p className="texto-chico suave">Al guardar, se abre el formulario de la mascota.</p>}
          </>
        )}
        <PanelActions submit={cliente ? 'Guardar cambios' : 'Guardar cliente'} onCancel={onClose} />
      </form>
    </Panel>
  );
}

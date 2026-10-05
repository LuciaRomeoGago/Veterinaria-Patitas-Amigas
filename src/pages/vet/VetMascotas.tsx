import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Back, Chip, Drawing, Field, Tag, TextArea } from '../../components/ui';
import { Modal, Panel, PanelActions, RowActions, Table, VetHead, VetScreen, useToast } from '../../components/vet';
import type { Especie, Indicacion, Mascota } from '../../data/types';
import { addYears, fechaCorta } from '../../lib/dates';
import { edad, plural, vacunaVencida } from '../../lib/format';
import { useStore } from '../../lib/store';

/** 27 · Mascotas de un cliente (con agregar, editar y eliminar). */
export function VetMascotas() {
  const { clientes, mascotasDe, deleteMascota } = useStore();
  const [params, setParams] = useSearchParams();
  const clienteId = Number(params.get('cliente')) || clientes[0]?.id;
  const cliente = clientes.find((c) => c.id === clienteId);
  const [panel, setPanel] = useState<{ mascota?: Mascota } | null>(params.get('nueva') ? {} : null);
  const [borrar, setBorrar] = useState<Mascota | null>(null);
  const [toast, showToast] = useToast();
  const lista = cliente ? mascotasDe(cliente.id) : [];

  return (
    <VetScreen label="Mascotas">
      <VetHead
        kicker="Mascotas de un cliente"
        title="Mascotas"
        action={
          <button type="button" className="btn btn--primario" onClick={() => setPanel({})} disabled={!cliente}>
            Agregar mascota
          </button>
        }
      />
      <div className="card card--celeste vet-client-pick">
        <label htmlFor="cliente" className="mono-etiqueta suave">
          Cliente
        </label>
        <select id="cliente" className="vet-client-pick__select display-s" value={clienteId} onChange={(e) => setParams({ cliente: e.target.value })}>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} · n.º {c.id}
            </option>
          ))}
        </select>
      </div>

      <Table
        caption={`Mascotas de ${cliente?.nombre ?? ''}`}
        empty="Este cliente todavía no tiene mascotas."
        columns={[{ label: 'N.º', width: '6%' }, { label: 'Nombre', width: '12%' }, { label: 'Edad', width: '9%' }, { label: 'Raza', width: '14%' }, { label: 'Historial médico', width: '33%' }, { label: '', align: 'right' }]}
        rows={lista.map((m) => ({
          key: m.id,
          cells: [
            <span className="cell-mono">{m.id}</span>,
            <Link to={`/vet/mascotas/${m.id}`} className="cell-strong">
              {m.nombre}
            </Link>,
            edad(m.edad),
            m.raza,
            <span className="cell-clip" title={m.historial[0]?.detalle}>
              {m.historial[0] ? `${m.historial[0].titulo}${m.historial[0].detalle ? ': ' + m.historial[0].detalle : ''}` : '—'}
            </span>,
            <RowActions
              actions={[
                { label: 'Ficha', to: `/vet/mascotas/${m.id}`, onClick: () => {} },
                { label: 'Editar', onClick: () => setPanel({ mascota: m }) },
                { label: 'Eliminar', danger: true, onClick: () => setBorrar(m) },
              ]}
            />,
          ],
        }))}
      />

      {panel && cliente && (
        <MascotaPanel
          clienteId={cliente.id}
          mascota={panel.mascota}
          onClose={() => setPanel(null)}
          onSaved={(nombre) => {
            setPanel(null);
            showToast('Mascota guardada', `${nombre}, de ${cliente.nombre}.`);
          }}
        />
      )}
      {borrar && (
        <Modal title={`¿Eliminar a ${borrar.nombre}?`} onClose={() => setBorrar(null)}>
          <p className="suave">Se borran sus datos, su historial médico y sus turnos. No se puede deshacer.</p>
          <div className="vet-modal__actions">
            <button
              type="button"
              className="btn btn--peligro"
              onClick={() => {
                deleteMascota(borrar.id);
                showToast('Mascota eliminada', borrar.nombre);
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

/** Agregar o editar mascota (31 · Editar mascota). */
function MascotaPanel({ clienteId, mascota, onClose, onSaved }: { clienteId: number; mascota?: Mascota; onClose: () => void; onSaved: (nombre: string) => void }) {
  const { clientes, addMascota, editMascota } = useStore();
  const duenio = clientes.find((c) => c.id === (mascota?.clienteId ?? clienteId));
  const [especie, setEspecie] = useState<Especie>(mascota?.especie ?? 'perro');
  const [nombre, setNombre] = useState(mascota?.nombre ?? '');
  const [edadTxt, setEdad] = useState(mascota ? String(mascota.edad) : '');
  const [raza, setRaza] = useState(mascota?.raza ?? '');
  const [peso, setPeso] = useState(mascota?.peso !== undefined ? String(mascota.peso) : '');
  const [historial, setHistorial] = useState('');
  const [enviado, setEnviado] = useState(false);

  const errores = {
    nombre: !nombre.trim() ? 'Escribí el nombre.' : undefined,
    edad: !/^\d{1,2}$/.test(edadTxt) ? 'Solo números, en años.' : undefined,
    raza: !raza.trim() ? 'Escribí la raza.' : undefined,
    peso: peso && !/^\d+([.,]\d+)?$/.test(peso) ? 'Usá números, por ejemplo 12,5.' : undefined,
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    if (Object.values(errores).some(Boolean)) return;
    const data = { especie, nombre: nombre.trim(), edad: Number(edadTxt), raza: raza.trim(), peso: peso ? Number(peso.replace(',', '.')) : undefined, historialMedico: historial };
    if (mascota) editMascota(mascota.id, data);
    else addMascota(data, clienteId);
    onSaved(data.nombre);
  };

  return (
    <Panel title={mascota ? `Editar a ${mascota.nombre}` : 'Agregar mascota'} kicker={`Mascota de ${duenio?.nombre}`} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <fieldset className="group">
          <legend className="mono-etiqueta">Es un…</legend>
          <div className="chips">
            <Chip pressed={especie === 'perro'} onClick={() => setEspecie('perro')}>
              Perro
            </Chip>
            <Chip pressed={especie === 'gato'} onClick={() => setEspecie('gato')}>
              Gato
            </Chip>
          </div>
        </fieldset>
        <Field label="Nombre" placeholder="Ej.: Luna" value={nombre} onChange={(e) => setNombre(e.target.value)} error={enviado ? errores.nombre : undefined} />
        <div className="row-3">
          <Field label="Edad (años)" inputMode="numeric" value={edadTxt} onChange={(e) => setEdad(e.target.value.replace(/\D/g, ''))} error={enviado ? errores.edad : undefined} />
          <Field label="Raza" value={raza} onChange={(e) => setRaza(e.target.value)} error={enviado ? errores.raza : undefined} />
          <Field label="Peso (kg)" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} error={enviado ? errores.peso : undefined} />
        </div>
        <TextArea label={mascota ? 'Agregar al historial médico' : 'Historial médico'} placeholder="Vacunas, enfermedades, alergias, medicación…" value={historial} onChange={(e) => setHistorial(e.target.value)} />
        {mascota && <p className="texto-chico suave">Lo que no cambies queda como está.</p>}
        <PanelActions submit={mascota ? 'Guardar cambios' : 'Guardar mascota'} onCancel={onClose} />
      </form>
    </Panel>
  );
}

/** 28 · Ficha de mascota, con 29 · Registrar vacuna y 30 · Vacuna registrada. */
export function VetFicha() {
  const { id } = useParams();
  const { mascota, duenio, registrarVacuna, addIndicacion, removeIndicacion, addNota, hoy } = useStore();
  const navigate = useNavigate();
  const m = mascota(Number(id));
  const [panel, setPanel] = useState<'vacuna' | 'indicaciones' | 'nota' | 'editar' | null>(null);
  const [toast, showToast] = useToast();

  if (!m) {
    return (
      <VetScreen label="Mascota">
        <Back to="/vet/mascotas">Mascotas</Back>
        <h1 className="display-l">No encontramos esa mascota</h1>
      </VetScreen>
    );
  }
  const d = duenio(m.id);

  return (
    <VetScreen label={`Ficha de ${m.nombre}`}>
      <VetHead
        back={<Back to={`/vet/mascotas?cliente=${m.clienteId}`}>Mascotas de {d?.nombre}</Back>}
        kicker="Ficha de mascota"
        title={m.nombre}
        action={
          <button type="button" className="btn btn--secundario" onClick={() => setPanel('editar')}>
            Editar datos
          </button>
        }
      />
      <div className="vet-ficha">
        <div className="card card--celeste vet-ficha__pet">
          <Drawing especie={m.especie} height={300} />
          <dl className="facts">
            <div>
              <dt className="mono-etiqueta suave">Edad</dt>
              <dd className="display-s">{edad(m.edad)}</dd>
            </div>
            <div>
              <dt className="mono-etiqueta suave">Raza</dt>
              <dd className="display-s">{m.raza}</dd>
            </div>
            {m.peso !== undefined && (
              <div>
                <dt className="mono-etiqueta suave">Peso</dt>
                <dd className="display-s">{m.peso} kg</dd>
              </div>
            )}
          </dl>
          <div className="stack-4">
            <p className="mono-etiqueta suave">Dueña o dueño</p>
            <Link to={`/vet/mascotas?cliente=${m.clienteId}`} className="texto-fuerte">
              {d?.nombre} · n.º {d?.id}
            </Link>
          </div>
        </div>

        <div className="vet-ficha__detail">
          <SectionHead titulo="Vacunas" boton="Registrar vacuna" onClick={() => setPanel('vacuna')} />
          <Table
            caption={`Vacunas de ${m.nombre}`}
            empty="Todavía no hay vacunas registradas."
            columns={[{ label: 'Vacuna', width: '34%' }, { label: 'Aplicada', width: '22%' }, { label: 'Próxima dosis', width: '22%' }, { label: 'Estado' }]}
            rows={m.vacunas.map((v) => ({
              key: v.nombre,
              cells: [<span className="cell-strong">{v.nombre}</span>, fechaCorta(v.aplicada), fechaCorta(v.proxima), vacunaVencida(v) ? <Tag tone="error">Vencida</Tag> : <Tag tone="ok">Al día</Tag>],
            }))}
          />

          <SectionHead titulo="Alergias y medicación" boton="Editar" onClick={() => setPanel('indicaciones')} />
          {m.indicaciones.length ? (
            <div className="chips">
              {m.indicaciones.map((x) => (
                <Tag key={x.titulo} tone={x.tipo === 'alergia' ? 'error' : undefined}>
                  {x.tipo === 'alergia' ? `Alergia: ${x.titulo.toLowerCase()}` : `${x.titulo} · ${x.detalle.toLowerCase()}`}
                </Tag>
              ))}
            </div>
          ) : (
            <p className="texto-chico suave">Sin alergias ni medicación cargadas.</p>
          )}

          <SectionHead titulo="Historial" boton="Agregar nota" onClick={() => setPanel('nota')} />
          <Table
            caption={`Historial de ${m.nombre}`}
            empty="Todavía no hay visitas registradas."
            columns={[{ label: 'Fecha', width: '20%' }, { label: 'Detalle' }]}
            rows={m.historial.map((h, i) => ({ key: i, cells: [<span className="cell-mono">{fechaCorta(h.fecha)}</span>, `${h.titulo}${h.detalle ? '. ' + h.detalle : ''}`] }))}
          />
        </div>
      </div>

      {panel === 'vacuna' && (
        <VacunaPanel
          m={m}
          duenio={d?.nombre ?? ''}
          hoy={hoy}
          onClose={() => setPanel(null)}
          onSave={(v, avisar) => {
            registrarVacuna(m.id, v, avisar);
            setPanel(null);
            showToast('Vacuna registrada', `${v.nombre} · próxima dosis ${fechaCorta(v.proxima)}.${avisar ? ` Le avisamos a ${d?.nombre.split(' ')[0]} antes.` : ''}`);
          }}
        />
      )}
      {panel === 'indicaciones' && <IndicacionesPanel m={m} onClose={() => setPanel(null)} onAdd={(x) => addIndicacion(m.id, x)} onRemove={(t) => removeIndicacion(m.id, t)} />}
      {panel === 'nota' && (
        <NotaPanel
          m={m}
          onClose={() => setPanel(null)}
          onSave={(t, det) => {
            addNota(m.id, t, det);
            setPanel(null);
            showToast('Nota agregada', `Al historial de ${m.nombre}.`);
          }}
        />
      )}
      {panel === 'editar' && (
        <MascotaPanel
          clienteId={m.clienteId}
          mascota={m}
          onClose={() => setPanel(null)}
          onSaved={(nombre) => {
            setPanel(null);
            if (nombre !== m.nombre) navigate(`/vet/mascotas/${m.id}`, { replace: true });
            showToast('Mascota guardada', `Actualizamos los datos de ${nombre}.`);
          }}
        />
      )}
      {toast}
    </VetScreen>
  );
}

function SectionHead({ titulo, boton, onClick }: { titulo: string; boton: string; onClick: () => void }) {
  return (
    <div className="row-between">
      <h2 className="display-s">{titulo}</h2>
      <button type="button" className="btn btn--secundario btn--small" onClick={onClick}>
        {boton}
      </button>
    </div>
  );
}

function VacunaPanel({ m, duenio, hoy, onClose, onSave }: { m: Mascota; duenio: string; hoy: string; onClose: () => void; onSave: (v: { nombre: string; aplicada: string; proxima: string }, avisar: boolean) => void }) {
  const vencida = m.vacunas.find(vacunaVencida);
  const [nombre, setNombre] = useState(vencida?.nombre ?? '');
  const [aplicada, setAplicada] = useState(hoy);
  const [proxima, setProxima] = useState(addYears(hoy, 1));
  const [avisar, setAvisar] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const errores = {
    nombre: !nombre.trim() ? 'Escribí qué vacuna se aplicó.' : undefined,
    proxima: proxima <= aplicada ? 'Tiene que ser después de la aplicación.' : undefined,
  };

  return (
    <Panel title="Registrar vacuna" kicker={`${m.nombre} · ${duenio}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setEnviado(true);
          if (!errores.nombre && !errores.proxima) onSave({ nombre: nombre.trim(), aplicada, proxima }, avisar);
        }}
        noValidate
      >
        <Field label="Vacuna" placeholder="Ej.: Antirrábica" list="vacunas" value={nombre} onChange={(e) => setNombre(e.target.value)} error={enviado ? errores.nombre : undefined} />
        <datalist id="vacunas">
          {(m.especie === 'gato' ? ['Antirrábica', 'Triple felina', 'Leucemia felina'] : ['Antirrábica', 'Séxtuple', 'Tos de las perreras']).map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <div className="row-2">
          <Field label="Aplicada" type="date" value={aplicada} max={hoy} onChange={(e) => setAplicada(e.target.value)} />
          <Field label="Próxima dosis" type="date" value={proxima} onChange={(e) => setProxima(e.target.value)} error={enviado ? errores.proxima : undefined} />
        </div>
        <label className="check">
          <input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} />
          <span>Avisarle a {duenio.split(' ')[0]} antes de la próxima dosis</span>
        </label>
        <PanelActions submit="Guardar vacuna" onCancel={onClose} />
      </form>
    </Panel>
  );
}

function IndicacionesPanel({ m, onClose, onAdd, onRemove }: { m: Mascota; onClose: () => void; onAdd: (x: Indicacion) => void; onRemove: (titulo: string) => void }) {
  const [tipo, setTipo] = useState<Indicacion['tipo']>('alergia');
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState('');

  return (
    <Panel title="Alergias y medicación" kicker={m.nombre} onClose={onClose}>
      {m.indicaciones.length > 0 && (
        <ul className="card card--blanco list">
          {m.indicaciones.map((x) => (
            <li key={x.titulo} className="list__row">
              <div className="list__text">
                <p className="texto-fuerte">{x.titulo}</p>
                <p className="texto-chico suave">{x.detalle}</p>
              </div>
              <button type="button" className="link-button link-button--error mono-etiqueta" onClick={() => onRemove(x.titulo)}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!titulo.trim()) return;
          onAdd({ tipo, titulo: titulo.trim(), detalle: detalle.trim() || (tipo === 'alergia' ? 'Alergia: no recetar' : 'En curso') });
          setTitulo('');
          setDetalle('');
        }}
        noValidate
      >
        <fieldset className="group">
          <legend className="mono-etiqueta">Agregar</legend>
          <div className="chips">
            <Chip pressed={tipo === 'alergia'} onClick={() => setTipo('alergia')}>
              Alergia
            </Chip>
            <Chip pressed={tipo === 'medicacion'} onClick={() => setTipo('medicacion')}>
              Medicación
            </Chip>
          </div>
        </fieldset>
        <Field label={tipo === 'alergia' ? 'Alérgica o alérgico a' : 'Medicamento'} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <Field label="Detalle" placeholder={tipo === 'alergia' ? 'Opcional' : 'Ej.: 1 comprimido cada 12 horas'} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
        <PanelActions submit="Agregar" onCancel={onClose} disabled={!titulo.trim()} />
      </form>
    </Panel>
  );
}

function NotaPanel({ m, onClose, onSave }: { m: Mascota; onClose: () => void; onSave: (titulo: string, detalle: string) => void }) {
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState('');
  return (
    <Panel title="Agregar nota" kicker={`Historial de ${m.nombre}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (titulo.trim()) onSave(titulo.trim(), detalle.trim());
        }}
        noValidate
      >
        <Field label="Motivo de la visita" placeholder="Ej.: Control anual" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <TextArea label="Detalle" placeholder="Qué se vio, qué se indicó…" value={detalle} onChange={(e) => setDetalle(e.target.value)} />
        <p className="texto-chico suave">Se guarda con la fecha de hoy. {plural(m.historial.length, 'nota anterior', 'notas anteriores')}.</p>
        <PanelActions submit="Guardar nota" onCancel={onClose} disabled={!titulo.trim()} />
      </form>
    </Panel>
  );
}

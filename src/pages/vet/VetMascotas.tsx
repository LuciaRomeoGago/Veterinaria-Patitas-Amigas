import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Back, Chip, Drawing, Field, Notice, TextArea } from '../../components/ui';
import { PesoChart } from '../../components/PesoChart';
import { Modal, Panel, PanelActions, RowActions, Table, VetHead, VetScreen, useToast } from '../../components/vet';
import type { Adjunto, Especie, Mascota, Registro, TipoRegistro } from '../../data/types';
import { addYears, fechaCorta } from '../../lib/dates';
import { edad, plural, vacunaVencida } from '../../lib/format';
import { parte } from '../../lib/historia';
import { HistoriaClinica, QuitarRegistro, RegistroPanel } from './HistoriaClinica';
import { useStore } from '../../lib/store';
import { SubirPanel, Visor } from './Adjuntos';

/** 27 · Mascotas de un cliente (con agregar, editar y eliminar). */
export function VetMascotas() {
  const { clientes, mascotasDe, deleteMascota, puede } = useStore();
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
      <div className="card card--salvia vet-client-pick">
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
        columns={[{ label: 'N.º', width: '6%' }, { label: 'Nombre', width: '12%' }, { label: 'Edad', width: '9%' }, { label: 'Raza', width: '14%' }, { label: puede('historia') ? 'Historial médico' : 'Dueña o dueño', width: '33%' }, { label: '', align: 'right' }]}
        rows={lista.map((m) => ({
          key: m.id,
          cells: [
            <span className="cell-mono">{m.id}</span>,
            <Link to={`/vet/mascotas/${m.id}`} className="cell-strong">
              {m.nombre}
            </Link>,
            edad(m.edad),
            m.raza,
            puede('historia') ? (
              <span className="cell-clip" title={m.historial[0]?.detalle}>
                {m.historial[0] ? `${m.historial[0].titulo}${m.historial[0].detalle ? ': ' + m.historial[0].detalle : ''}` : '—'}
              </span>
            ) : (
              cliente?.nombre
            ),
            <RowActions
              actions={[
                { label: 'Ficha', to: `/vet/mascotas/${m.id}` },
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
  const { clientes, addMascota, editMascotaVet: editMascota } = useStore();
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
  const { mascota, duenio, registrarVacuna, addRegistro, editRegistro, removeRegistro, addNota, removeAdjunto, hoy, puede } = useStore();
  const navigate = useNavigate();
  const m = mascota(Number(id));
  const [panel, setPanel] = useState<'vacuna' | 'nota' | 'editar' | 'subir' | 'cambios' | null>(null);
  const [visto, setVisto] = useState<Adjunto | null>(null);
  const [registro, setRegistro] = useState<{ tipo: TipoRegistro; r?: Registro } | null>(null);
  const [quitar, setQuitar] = useState<Registro | null>(null);
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
  const alergias = m.registros.filter((r) => r.tipo === 'alergia');

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
        <div className="card card--blanco vet-ficha__pet">
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
          {alergias.length > 0 && (
            <Notice tipo="error" titulo={alergias.length === 1 ? 'Alergia' : 'Alergias'}>
              {alergias.map((r) => r.titulo).join(', ')}
            </Notice>
          )}
          <div className="stack-8">
            <p className="mono-etiqueta suave">Peso</p>
            <PesoChart pesos={m.pesos} />
          </div>
          <div className="stack-4">
            <p className="mono-etiqueta suave">Dueña o dueño</p>
            <Link to={`/vet/mascotas?cliente=${m.clienteId}`} className="texto-fuerte">
              {d?.nombre} · n.º {d?.id}
            </Link>
            <p className="mono-dato suave">{d?.telefono}</p>
          </div>
          {puede('historia') && m.cambios.length > 0 && (
            <div className="stack-8 cambios">
              <p className="mono-etiqueta suave">Últimos cambios</p>
              <Cambios m={m} cuantos={3} />
              {m.cambios.length > 3 && (
                <button type="button" className="link-button mono-etiqueta" onClick={() => setPanel('cambios')}>
                  Ver los {m.cambios.length} cambios
                </button>
              )}
            </div>
          )}
        </div>

        <HistoriaClinica
          m={m}
          limitado={!puede('historia')}
          onSubir={() => setPanel('subir')}
          onVerAdjunto={setVisto}
          onAgregar={(tipo) => setRegistro({ tipo })}
          onEditar={(r) => setRegistro({ tipo: r.tipo, r })}
          onQuitar={setQuitar}
          onVacuna={() => setPanel('vacuna')}
          onNota={() => setPanel('nota')}
        />
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
      {registro && (
        <RegistroPanel
          m={m}
          duenio={d?.nombre ?? ''}
          tipoInicial={registro.tipo}
          registro={registro.r}
          hoy={hoy}
          onClose={() => setRegistro(null)}
          onSave={(data) => {
            if (registro.r) editRegistro(m.id, { ...data, id: registro.r.id });
            else addRegistro(m.id, data);
            setRegistro(null);
            showToast('Historia clínica actualizada', `${data.titulo}, en ${parte(data.tipo).titulo.toLowerCase()}.`);
          }}
        />
      )}
      {quitar && (
        <QuitarRegistro
          r={quitar}
          onClose={() => setQuitar(null)}
          onConfirm={() => {
            removeRegistro(m.id, quitar.id);
            showToast('Quitado de la historia clínica', quitar.titulo);
            setQuitar(null);
          }}
        />
      )}
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
      {!puede('historia') && <p className="texto-chico suave">La historia clínica completa (consultas, medicación, estudios) la ven los veterinarios.</p>}
      {panel === 'subir' && (
        <SubirPanel
          m={m}
          onClose={() => setPanel(null)}
          onDone={(nombre) => {
            setPanel(null);
            showToast('Archivo subido', `${nombre}, en Estudios y fotos.`);
          }}
        />
      )}
      {visto && (
        <Visor
          m={m}
          a={visto}
          onClose={() => setVisto(null)}
          onQuitar={() => {
            removeAdjunto(m.id, visto.id);
            showToast('Quitado de la historia clínica', visto.nombre);
            setVisto(null);
          }}
        />
      )}
      {panel === 'cambios' && (
        <Panel title="Cambios en la ficha" kicker={m.nombre} onClose={() => setPanel(null)}>
          <Cambios m={m} />
        </Panel>
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

/** Historial de cambios: quién cargó o modificó qué, y cuándo. */
function Cambios({ m, cuantos }: { m: Mascota; cuantos?: number }) {
  return (
    <ol className="cambios__lista">
      {m.cambios.slice(0, cuantos).map((c, i) => (
        <li key={c.cuando + i}>
          <p className="texto-chico">{c.texto}</p>
          <p className="mono-dato suave">
            {fechaCorta(c.cuando.slice(0, 10))} {c.cuando.slice(11)} · {c.por}
          </p>
        </li>
      ))}
    </ol>
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

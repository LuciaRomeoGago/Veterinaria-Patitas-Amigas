import { useId, useState, type ReactNode } from 'react';
import { Chip, Field, Tag, TextArea, Toggle } from '../../components/ui';
import { Icon } from '../../components/icons';
import { Modal, Panel, PanelActions, RowActions } from '../../components/vet';
import type { Adjunto, Mascota, Registro, TipoRegistro } from '../../data/types';
import { fechaCorta } from '../../lib/dates';
import { vacunaVencida } from '../../lib/format';
import { CAMPOS, PARTES, coincide, conflictos, estado, normalizar, parte } from '../../lib/historia';
import { AlertaReceta } from './AlertaReceta';
import { ahora, type RegistroInput } from '../../lib/store';
import { progreso } from '../../lib/tomas';

type Filtro = 'todo' | TipoRegistro | 'vacunas' | 'consultas' | 'estudios';

interface Props {
  m: Mascota;
  onAgregar: (tipo: TipoRegistro) => void;
  onEditar: (r: Registro) => void;
  onQuitar: (r: Registro) => void;
  onVacuna: () => void;
  onNota: () => void;
  onSubir: () => void;
  onVerAdjunto: (a: Adjunto) => void;
  /** Recepción: solo alergias y vacunas, sin editar. */
  limitado?: boolean;
}

/**
 * Historia clínica por partes: alergias, medicación, enfermedades, lo que le hizo bien,
 * lo que le hizo mal, vacunas y consultas. Arriba, un buscador que mira todas las partes
 * y filtros para ver una sola.
 */
export function HistoriaClinica({ m, onAgregar, onEditar, onQuitar, onVacuna, onNota, onSubir, onVerAdjunto, limitado }: Props) {
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const q = texto.trim();

  const encontrados = m.registros.filter((r) => coincide(q, r.titulo, r.detalle));
  const porTipo = Object.fromEntries(PARTES.map((p) => [p.tipo, encontrados.filter((r) => r.tipo === p.tipo)])) as Record<TipoRegistro, Registro[]>;
  const vacunas = m.vacunas.filter((v) => coincide(q, v.nombre));
  const consultas = limitado ? [] : m.historial.filter((h) => coincide(q, h.titulo, h.detalle));
  const estudios = limitado ? [] : m.adjuntos.filter((a) => coincide(q, a.nombre, a.nota));
  const partes = limitado ? PARTES.filter((p) => p.tipo === 'alergia') : PARTES;

  const cuenta: Record<Filtro, number> = {
    todo: 0,
    alergia: porTipo.alergia.length,
    medicacion: porTipo.medicacion.length,
    enfermedad: porTipo.enfermedad.length,
    bien: porTipo.bien.length,
    mal: porTipo.mal.length,
    vacunas: vacunas.length,
    consultas: consultas.length,
    estudios: estudios.length,
  };
  cuenta.todo = Object.values(cuenta).reduce((a, b) => a + b, 0);

  // Con algo escrito, solo se muestran las partes donde hay resultados.
  const ver = (f: Filtro) => !(limitado && (f === 'consultas' || f === 'estudios')) && (filtro === 'todo' || filtro === f) && (!q || cuenta[f] > 0);
  const filtros: { id: Filtro; label: string }[] = [
    { id: 'todo', label: 'Todo' },
    ...partes.map((p) => ({ id: p.tipo, label: p.titulo })),
    { id: 'vacunas', label: 'Vacunas' },
    ...(limitado
      ? []
      : [
          { id: 'consultas' as const, label: 'Consultas' },
          { id: 'estudios' as const, label: 'Estudios y fotos' },
        ]),
  ];
  const nada = q && (filtro === 'todo' ? cuenta.todo === 0 : cuenta[filtro] === 0);

  return (
    <div className="hc">
      <div className="hc__tools">
        <h2 className="display-m">Historia clínica</h2>
        <label className="hc__search">
          <Icon name="buscar" />
          <span className="sr-only">Buscar en la historia clínica</span>
          <input type="search" placeholder="Buscar: alergia, medicamento, enfermedad…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <div className="chips hc__filters" role="group" aria-label="Qué parte mostrar">
          {filtros.map((f) => (
            <Chip key={f.id} pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.label}
              {f.id !== 'todo' && <span className="hc__count">{cuenta[f.id]}</span>}
            </Chip>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {q ? `${cuenta.todo} resultados para ${q}` : ''}
        </p>
      </div>

      {nada ? (
        <p className="hc__empty suave">No hay nada con “{q}” en esta parte de la historia clínica.</p>
      ) : (
        <div className="hc__grid">
          {partes.filter((p) => ver(p.tipo)).map((p) => (
            <Parte key={p.tipo} titulo={p.titulo} cantidad={porTipo[p.tipo].length} boton={limitado ? undefined : 'Agregar'} onBoton={() => onAgregar(p.tipo)} vacio={p.vacio} alerta={p.tipo === 'alergia'}>
              {porTipo[p.tipo].map((r) => {
                const e = estado(r);
                const pr = r.plan && r.vigente ? progreso(r.plan, ahora()) : null;
                return (
                  <Fila
                    key={r.id}
                    titulo={<Resaltar texto={r.titulo} q={q} />}
                    detalle={r.detalle && <Resaltar texto={r.detalle} q={q} />}
                    fecha={r.desde && (r.tipo === 'bien' || r.tipo === 'mal' ? fechaCorta(r.desde) : `Desde ${fechaCorta(r.desde)}`)}
                    extra={pr && <span className={pr.dadas < pr.tocaban ? 'hc-row__tomas is-falta' : 'hc-row__tomas'}>{pr.terminado ? 'Terminado' : `Día ${pr.dia} de ${r.plan!.dias}`} · en casa: {pr.dadas} de {pr.tocaban} tomas</span>}
                    tag={e && <Tag tone={e.tone}>{e.texto}</Tag>}
                    acciones={
                      limitado ? undefined : <RowActions
                        actions={[
                          { label: 'Editar', onClick: () => onEditar(r) },
                          { label: 'Quitar', danger: true, onClick: () => onQuitar(r) },
                        ]}
                      />
                    }
                  />
                );
              })}
            </Parte>
          ))}
          {ver('vacunas') && (
            <Parte titulo="Vacunas" cantidad={vacunas.length} boton={limitado ? undefined : 'Registrar vacuna'} onBoton={onVacuna} vacio="Todavía no hay vacunas registradas.">
              {vacunas.map((v) => (
                <Fila
                  key={v.nombre}
                  titulo={<Resaltar texto={v.nombre} q={q} />}
                  detalle={`Aplicada el ${fechaCorta(v.aplicada)} · próxima dosis ${fechaCorta(v.proxima)}`}
                  tag={vacunaVencida(v) ? <Tag tone="error">Vencida</Tag> : <Tag tone="ok">Al día</Tag>}
                />
              ))}
            </Parte>
          )}
          {ver('consultas') && (
            <Parte titulo="Consultas" cantidad={consultas.length} boton="Agregar nota" onBoton={onNota} vacio="Todavía no hay visitas registradas." ancha>
              {consultas.map((h, i) => (
                <Fila key={h.fecha + i} titulo={<Resaltar texto={h.titulo} q={q} />} detalle={h.detalle && <Resaltar texto={h.detalle} q={q} />} fecha={fechaCorta(h.fecha)} />
              ))}
            </Parte>
          )}
          {ver('estudios') && (
            <Parte titulo="Estudios y fotos" cantidad={estudios.length} boton="Subir" onBoton={onSubir} vacio="Subí análisis, radiografías o fotos de una lesión para comparar cómo evoluciona." ancha>
              <li className="adjuntos">
                {estudios.map((a) => (
                  <button key={a.id} type="button" className="adjunto" onClick={() => onVerAdjunto(a)}>
                    {a.miniatura ? <img src={a.miniatura} alt="" /> : <span className="adjunto__pdf mono-etiqueta">PDF</span>}
                    <span className="texto-fuerte">
                      <Resaltar texto={a.nombre} q={q} />
                    </span>
                    <span className="mono-dato suave">{fechaCorta(a.fecha)}</span>
                  </button>
                ))}
              </li>
            </Parte>
          )}
        </div>
      )}
    </div>
  );
}

function Parte({ titulo, cantidad, boton, onBoton, vacio, alerta, ancha, children }: { titulo: string; cantidad: number; boton?: string; onBoton: () => void; vacio: string; alerta?: boolean; ancha?: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <section className={`hc-part${alerta && cantidad ? ' hc-part--alerta' : ''}${ancha ? ' hc-part--ancha' : ''}`} aria-labelledby={id}>
      <header className="hc-part__head">
        <h3 id={id} className="display-s">
          {titulo} <span className="hc__count">{cantidad}</span>
        </h3>
        {boton && (
          <button type="button" className="btn btn--secundario btn--small" onClick={onBoton}>
            {boton}
          </button>
        )}
      </header>
      {cantidad ? <ul className="hc-part__list">{children}</ul> : <p className="texto-chico suave">{vacio}</p>}
    </section>
  );
}

function Fila({ titulo, detalle, fecha, extra, tag, acciones }: { titulo: ReactNode; detalle?: ReactNode; fecha?: string | false; extra?: ReactNode; tag?: ReactNode; acciones?: ReactNode }) {
  return (
    <li className="hc-row">
      <div className="hc-row__text">
        <p className="texto-fuerte">{titulo}</p>
        {detalle && <p className="texto-chico">{detalle}</p>}
        {fecha && <p className="mono-dato suave">{fecha}</p>}
        {extra && <p className="mono-etiqueta">{extra}</p>}
      </div>
      {(tag || acciones) && (
        <div className="hc-row__side">
          {tag}
          {acciones}
        </div>
      )}
    </li>
  );
}

/** Marca lo buscado dentro del texto, aunque se haya escrito sin acentos o en mayúsculas. */
function Resaltar({ texto, q }: { texto: string; q: string }) {
  if (!q) return <>{texto}</>;
  const i = normalizar(texto).indexOf(normalizar(q));
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <mark>{texto.slice(i, i + q.length)}</mark>
      {texto.slice(i + q.length)}
    </>
  );
}

/** Agregar o editar una entrada de la historia clínica. */
export function RegistroPanel({ m, duenio, tipoInicial, registro, hoy, onClose, onSave }: { m: Mascota; duenio: string; tipoInicial: TipoRegistro; registro?: Registro; hoy: string; onClose: () => void; onSave: (r: RegistroInput) => void }) {
  const [tipo, setTipo] = useState<TipoRegistro>(registro?.tipo ?? tipoInicial);
  const [titulo, setTitulo] = useState(registro?.titulo ?? '');
  const [detalle, setDetalle] = useState(registro?.detalle ?? '');
  const [desde, setDesde] = useState(registro?.desde ?? hoy);
  const [vigente, setVigente] = useState(registro?.vigente ?? true);
  const [enviado, setEnviado] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const c = CAMPOS[tipo];
  const error = !titulo.trim() ? 'Completá este dato.' : undefined;
  // Al cargar medicación, se compara con las alergias y con lo que le hizo mal.
  const choques = tipo === 'medicacion' ? conflictos(m.registros.filter((r) => r.id !== registro?.id), titulo) : [];
  const frenado = choques.length > 0 && !confirmado;

  return (
    <Panel title={registro ? `Editar: ${registro.titulo}` : 'Agregar a la historia clínica'} kicker={`${m.nombre} · ${duenio}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setEnviado(true);
          if (error || frenado) return;
          onSave({ tipo, titulo: titulo.trim(), detalle: detalle.trim() || undefined, desde: desde || undefined, vigente: c.vigente ? vigente : true });
        }}
        noValidate
      >
        <fieldset className="group">
          <legend className="mono-etiqueta">Va en</legend>
          <div className="chips">
            {PARTES.map((p) => (
              <Chip key={p.tipo} pressed={tipo === p.tipo} onClick={() => setTipo(p.tipo)}>
                {p.titulo}
              </Chip>
            ))}
          </div>
        </fieldset>
        <Field label={c.titulo} placeholder={c.tituloEj} value={titulo} onChange={(e) => setTitulo(e.target.value)} error={enviado ? error : undefined} />
        <AlertaReceta nombre={m.nombre} conflictos={choques} confirmado={confirmado} onConfirmar={setConfirmado} />
        <TextArea label={c.detalle} placeholder={c.detalleEj} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
        <Field label={c.desde} type="date" value={desde} max={hoy} onChange={(e) => setDesde(e.target.value)} />
        {c.vigente && (
          <div className="row-between">
            <span className="texto-fuerte">{c.vigente}</span>
            <Toggle checked={vigente} onChange={() => setVigente((v) => !v)} label={c.vigente} />
          </div>
        )}
        <PanelActions submit={registro ? 'Guardar cambios' : 'Agregar'} onCancel={onClose} disabled={frenado} />
      </form>
    </Panel>
  );
}

/** Confirmar antes de quitar una entrada. */
export function QuitarRegistro({ r, onClose, onConfirm }: { r: Registro; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal title={`¿Quitar ${r.titulo}?`} onClose={onClose}>
      <p className="suave">Sale de {parte(r.tipo).titulo.toLowerCase()} en la historia clínica. No se puede deshacer.</p>
      <div className="vet-modal__actions">
        <button type="button" className="btn btn--peligro" onClick={onConfirm}>
          Sí, quitar
        </button>
        <button type="button" className="btn btn--secundario" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

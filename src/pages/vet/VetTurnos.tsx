import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chip, Field, Notice, Tag, Toggle } from '../../components/ui';
import { Modal, Panel, PanelActions, RowActions, Table, VetHead, VetScreen, useToast, type RowAction } from '../../components/vet';
import type { Bloqueo, Motivo, Turno } from '../../data/types';
import { DURACION, ESTADOS, HORARIOS, MANIANA, MOTIVOS, TARDE, aHora, aMin, bloqueoDe, duracionTexto, horaFin, libres, textoBloqueo, todoElDia } from '../../lib/agenda';
import { addDays, diaSemanaCorto, diaSemanaLargo, fechaLarga, fechaTitulo, fromIso, nextWorkdays, nombreDia, numeroDia } from '../../lib/dates';
import { plural } from '../../lib/format';
import { horaActual, useStore } from '../../lib/store';
import { FIRMA, primerNombre, waLink } from '../../lib/whatsapp';
import { Atender } from './Atender';
import { Horarios } from '../../components/Horarios';

/** Los próximos días de atención: hoy (si es hábil) y los siguientes días hábiles. */
function diasDeAgenda(hoy: string) {
  const wd = fromIso(hoy).getDay();
  return wd === 0 || wd === 6 ? nextWorkdays(5, hoy) : [hoy, ...nextWorkdays(4, hoy)];
}

/** Lunes a viernes de la semana de `iso` (si es fin de semana, la que sigue). */
function semanaDe(iso: string) {
  const wd = fromIso(iso).getDay();
  const lunes = addDays(iso, wd === 0 ? 1 : wd === 6 ? 2 : 1 - wd);
  return [0, 1, 2, 3, 4].map((i) => addDays(lunes, i));
}

/** Vuelve a dibujar cada 30 segundos, para que "hace 12 min" se mantenga al día. */
function useReloj() {
  const [h, setH] = useState(horaActual);
  useEffect(() => {
    const t = setInterval(() => setH(horaActual()), 30_000);
    return () => clearInterval(t);
  }, []);
  return h;
}

const espera = (llegada: string, ahora: string) => {
  const min = aMin(ahora) - aMin(llegada);
  if (min < 0 || min > 180) return `Llegó ${llegada}`;
  return min < 1 ? `Llegó ${llegada} · recién` : `Llegó ${llegada} · hace ${min} min`;
};

type PanelAbierto =
  | { tipo: 'nuevo'; fecha?: string; hora?: string; vetId?: number; mascotaId?: number; motivo?: Motivo; esperaId?: number }
  | { tipo: 'atender'; turno: Turno }
  | { tipo: 'bloquear'; fecha?: string }
  | { tipo: 'quitar'; bloqueo: Bloqueo }
  | { tipo: 'cancelar'; turno: Turno }
  | null;

/**
 * 21 · Agenda: el día (tabla) o la semana (grilla), por veterinario. Hoy, arriba,
 * la sala de espera; abajo, la lista de espera de los días llenos.
 */
export function VetTurnos() {
  const { hoy, vet, veterinarios, puede, turnosDel, mascota, duenio, vencidas, avisar, bloqueos, removeBloqueo, cancelarTurno, esperas, nombreVet, profesional, llego, pasarAConsulta } = useStore();
  const navigate = useNavigate();
  const ahora = useReloj();
  const dias = diasDeAgenda(hoy);
  const esVet = vet?.rol === 'veterinario';
  const [quien, setQuien] = useState<number>(esVet ? vet!.id : 0);
  const [vista, setVista] = useState<'dia' | 'semana'>('dia');
  const [dia, setDia] = useState(() => (dias[0] === hoy ? hoy : (dias.find((d) => turnosDel(d).length) ?? dias[0])));
  const [semana, setSemana] = useState(() => semanaDe(hoy));
  const [panel, setPanel] = useState<PanelAbierto>(null);
  const [verVencidas, setVerVencidas] = useState(false);
  const [toast, showToast] = useToast();
  const vetFiltro = quien || undefined;
  const turnos = turnosDel(dia, vetFiltro);
  const bloqueosDelDia = bloqueos.filter((b) => b.fecha === dia && (!vetFiltro || !b.vetId || b.vetId === vetFiltro));
  const conLugar = esperas.filter((e) => e.lugares.length > 0);
  const vetSemana = quien || veterinarios[0].id;

  const nombresVencidas = vencidas.map((v) => `${v.mascota.nombre} (${v.vacuna.nombre.toLowerCase()})`);
  const listaVencidas = nombresVencidas.length > 1 ? nombresVencidas.slice(0, -1).join(', ') + ' y ' + nombresVencidas[nombresVencidas.length - 1] : nombresVencidas[0];
  const rango = `${numeroDia(semana[0])} al ${fechaLarga(semana[4])}`;
  const turnosSemana = semana.reduce((n, d) => n + turnosDel(d, vetSemana).length, 0);

  const recordatorio = (t: Turno) => {
    const m = mascota(t.mascotaId)!;
    const c = duenio(m.id)!;
    const cuando = t.fecha === addDays(hoy, 1) ? 'mañana' : `el ${diaSemanaLargo(t.fecha).toLowerCase()}`;
    return waLink(c.telefono, `Hola ${primerNombre(c.nombre)}, te recordamos el turno de ${m.nombre} ${cuando} a las ${t.hora} con ${profesional(t)}. Si no pueden venir, avisanos por acá así se lo damos a otra persona. ${FIRMA}`);
  };

  const acciones = (t: Turno) => {
    const m = mascota(t.mascotaId)!;
    const a: RowAction[] = [];
    if (t.estado === 'pendiente' && t.fecha === hoy) a.push({ label: 'Llegó', onClick: () => llego(t.id) });
    if (t.estado === 'en_espera' && puede('atender')) a.push({ label: 'Pasar', onClick: () => pasarAConsulta(t.id) });
    if (t.estado !== 'atendido' && puede('atender')) a.push({ label: 'Atender', onClick: () => setPanel({ tipo: 'atender', turno: t }) });
    if (t.estado === 'pendiente' && t.fecha > hoy) a.push({ label: 'WhatsApp', href: recordatorio(t), title: `Recordarle el turno a ${duenio(m.id)?.nombre} por WhatsApp` });
    a.push({ label: 'Ficha', to: `/vet/mascotas/${m.id}` });
    if (t.estado === 'pendiente') a.push({ label: 'Cancelar', danger: true, onClick: () => setPanel({ tipo: 'cancelar', turno: t }) });
    return a;
  };

  return (
    <VetScreen label="Agenda">
      <VetHead
        kicker={vista === 'dia' ? plural(turnos.length, 'turno', 'turnos') : `${turnosSemana} turnos · del ${rango}`}
        title={vista === 'dia' ? fechaTitulo(dia) : 'Agenda de la semana'}
        action={
          <div className="vet-head__actions">
            <button type="button" className="btn btn--secundario" onClick={() => setPanel({ tipo: 'bloquear', fecha: vista === 'dia' ? dia : undefined })}>
              Bloquear horario
            </button>
            <button type="button" className="btn btn--primario" onClick={() => setPanel({ tipo: 'nuevo', fecha: vista === 'dia' ? dia : undefined, vetId: vetFiltro })}>
              Nuevo turno
            </button>
          </div>
        }
      />

      <div className="agenda-bar">
        <div className="segmented" role="group" aria-label="Vista">
          <button type="button" aria-pressed={vista === 'dia'} onClick={() => setVista('dia')}>
            Día
          </button>
          <button type="button" aria-pressed={vista === 'semana'} onClick={() => setVista('semana')}>
            Semana
          </button>
        </div>
        <div className="chips" role="group" aria-label="Agenda de">
          {vista === 'dia' && (
            <Chip pressed={quien === 0} onClick={() => setQuien(0)}>
              Todos
            </Chip>
          )}
          {veterinarios.map((v) => (
            <Chip key={v.id} pressed={(vista === 'dia' ? quien : vetSemana) === v.id} onClick={() => setQuien(v.id)}>
              {v.nombre}
            </Chip>
          ))}
        </div>
      </div>
      {vista === 'dia' ? (
        <div className="chips" role="group" aria-label="Día">
          {dias.map((d) => (
            <Chip key={d} pressed={d === dia} onClick={() => setDia(d)}>
              {d === hoy ? 'Hoy' : diaSemanaCorto(d).replace(/\/\d+$/, '')}
            </Chip>
          ))}
        </div>
      ) : (
        <div className="chips" role="group" aria-label="Semana">
          <button type="button" className="chip mono-etiqueta" onClick={() => setSemana(semana.map((d) => addDays(d, -7)))}>
            Anterior
          </button>
          <button type="button" className="chip mono-etiqueta" aria-pressed={semana[0] === semanaDe(hoy)[0]} onClick={() => setSemana(semanaDe(hoy))}>
            Esta semana
          </button>
          <button type="button" className="chip mono-etiqueta" onClick={() => setSemana(semana.map((d) => addDays(d, 7)))}>
            Siguiente
          </button>
        </div>
      )}

      {conLugar.length > 0 && (
        <Notice
          tipo="alerta"
          titulo={conLugar.length === 1 ? 'Hay lugar para 1 persona de la lista de espera' : `Hay lugar para ${conLugar.length} personas de la lista de espera`}
          acciones={[{ label: 'Ver la lista', onClick: () => document.getElementById('lista-espera')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }]}
        >
          Se liberó un horario el día que querían. Avisales por WhatsApp.
        </Notice>
      )}
      {vencidas.length > 0 && (
        <Notice
          tipo="alerta"
          titulo={vencidas.length === 1 ? '1 mascota con una vacuna vencida' : `${vencidas.length} mascotas con vacunas vencidas`}
          acciones={[
            {
              label: 'Avisar a los dueños',
              onClick: () => {
                avisar(vencidas.map((v) => ({ clienteId: v.mascota.clienteId, titulo: `Vacuna vencida: ${v.vacuna.nombre.toLowerCase()} de ${v.mascota.nombre}`, fecha: hoy })));
                showToast('Avisos enviados', 'Les aparece en Recordatorios de la app, y por WhatsApp a quienes lo pidieron.');
              },
            },
            { label: verVencidas ? 'Ocultar mascotas' : 'Ver mascotas', onClick: () => setVerVencidas((x) => !x) },
          ]}
        >
          {listaVencidas}. Podés avisarles a sus dueños.
        </Notice>
      )}
      {verVencidas && (
        <ul className="chips">
          {vencidas.map((v) => (
            <li key={v.mascota.id + v.vacuna.nombre}>
              <Link className="chip mono-etiqueta" to={`/vet/mascotas/${v.mascota.id}`}>
                {v.mascota.nombre} · {duenio(v.mascota.id)?.nombre}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {vista === 'dia' ? (
        <>
          {dia === hoy && <SalaDeEspera turnos={turnos} ahora={ahora} onAtender={(t) => setPanel({ tipo: 'atender', turno: t })} />}
          {bloqueosDelDia.map((b) => (
            <Notice
              key={b.id}
              tipo="alerta"
              titulo={`${todoElDia(b) ? 'Día bloqueado' : `Bloqueado de ${b.desde} a ${b.hasta}`}${b.vetId ? ` · ${nombreVet(b.vetId)}` : ''}`}
              acciones={[{ label: 'Quitar bloqueo', onClick: () => setPanel({ tipo: 'quitar', bloqueo: b }) }]}
            >
              {b.motivo}. En ese horario no se dan turnos{b.vetId ? ` con ${nombreVet(b.vetId)}` : ''}.
            </Notice>
          ))}
          <Table
            caption={`Turnos del ${fechaTitulo(dia)}`}
            empty="No hay turnos este día."
            columns={[
              { label: 'Hora', width: '11%' },
              { label: 'Mascota', width: '11%' },
              { label: 'Cliente', width: '14%' },
              { label: 'Motivo', width: '13%' },
              ...(quien ? [] : [{ label: 'Con', width: '13%' }]),
              { label: 'Estado', width: '13%' },
              { label: '', align: 'right' as const },
            ]}
            rows={turnos.map((t) => {
              const m = mascota(t.mascotaId)!;
              return {
                key: t.id,
                cells: [
                  <span className="cell-mono">
                    {t.hora}–{horaFin(t.hora, t.motivo)}
                  </span>,
                  <span className="cell-strong">{m.nombre}</span>,
                  duenio(m.id)?.nombre,
                  <span>
                    {t.motivo}
                    {t.sena ? <span className="texto-chico suave"> · seña</span> : null}
                  </span>,
                  ...(quien ? [] : [profesional(t)]),
                  <EstadoTag t={t} ahora={ahora} />,
                  <RowActions actions={acciones(t)} />,
                ],
              };
            })}
          />
        </>
      ) : (
        <Semana
          dias={semana}
          vetId={vetSemana}
          ahora={ahora}
          onTurno={(t) => (t.estado === 'atendido' || !puede('atender') ? navigate(`/vet/mascotas/${t.mascotaId}`) : setPanel({ tipo: 'atender', turno: t }))}
          onLibre={(fecha, hora) => setPanel({ tipo: 'nuevo', fecha, hora, vetId: vetSemana })}
          onBloqueo={(b) => setPanel({ tipo: 'quitar', bloqueo: b })}
        />
      )}

      <ListaEspera onDarTurno={(e) => setPanel({ tipo: 'nuevo', fecha: e.fecha, hora: e.hora, vetId: e.vetId, mascotaId: e.mascotaId, motivo: e.motivo, esperaId: e.id })} />

      {panel?.tipo === 'nuevo' && (
        <NuevoTurno
          dias={dias}
          inicial={panel}
          onClose={() => setPanel(null)}
          onDone={(d, texto) => {
            setPanel(null);
            setDia(d);
            showToast('Turno agendado', texto);
          }}
        />
      )}
      {panel?.tipo === 'atender' && (
        <Atender
          turno={panel.turno}
          onClose={() => setPanel(null)}
          onDone={(nombre) => {
            setPanel(null);
            showToast('Consulta guardada', `Quedó en la historia clínica de ${nombre}.`);
          }}
        />
      )}
      {panel?.tipo === 'bloquear' && (
        <BloquearPanel
          fechaInicial={panel.fecha ?? (dias.includes(dia) ? dia : dias[0])}
          vetInicial={vetFiltro}
          onClose={() => setPanel(null)}
          onDone={(b) => {
            setPanel(null);
            setDia(b.fecha);
            showToast('Horario bloqueado', `${diaSemanaCorto(b.fecha)}: ${textoBloqueo(b).toLowerCase()}.`);
          }}
        />
      )}
      {panel?.tipo === 'quitar' && (
        <Modal title="¿Quitar el bloqueo?" onClose={() => setPanel(null)}>
          <p className="suave">
            {diaSemanaCorto(panel.bloqueo.fecha)}, {textoBloqueo(panel.bloqueo).toLowerCase()}. Ese horario vuelve a estar disponible para turnos.
          </p>
          <div className="vet-modal__actions">
            <button
              type="button"
              className="btn btn--primario"
              onClick={() => {
                removeBloqueo(panel.bloqueo.id);
                setPanel(null);
                showToast('Bloqueo quitado', 'Ese horario vuelve a estar disponible.');
              }}
            >
              Sí, quitar
            </button>
            <button type="button" className="btn btn--secundario" onClick={() => setPanel(null)}>
              No, dejarlo
            </button>
          </div>
        </Modal>
      )}
      {panel?.tipo === 'cancelar' && (
        <Modal title={`¿Cancelar el turno de ${mascota(panel.turno.mascotaId)?.nombre}?`} onClose={() => setPanel(null)}>
          <p className="suave">
            {diaSemanaLargo(panel.turno.fecha)} a las {panel.turno.hora}, con {profesional(panel.turno)}.
            {panel.turno.sena ? ' Tenía una seña pagada por la app.' : ''} Si hay alguien en la lista de espera para ese día, te lo mostramos para avisarle.
          </p>
          <div className="vet-modal__actions">
            <button
              type="button"
              className="btn btn--peligro"
              onClick={() => {
                const t = panel.turno;
                cancelarTurno(t.id);
                setPanel(null);
                const esperan = esperas.filter((e) => e.fecha === t.fecha && (!e.vetId || e.vetId === t.vetId)).length;
                showToast('Turno cancelado', esperan ? `${plural(esperan, 'persona esperaba', 'personas esperaban')} ese día: avisales desde la lista de espera.` : 'El horario quedó libre.');
              }}
            >
              Sí, cancelar
            </button>
            <button type="button" className="btn btn--secundario" onClick={() => setPanel(null)}>
              No, dejarlo
            </button>
          </div>
        </Modal>
      )}
      {toast}
    </VetScreen>
  );
}

function EstadoTag({ t, ahora }: { t: Turno; ahora: string }) {
  if (t.estado === 'atendido') return <Tag tone="ok">Atendido</Tag>;
  if (t.estado === 'en_consulta') return <Tag tone="acento">En consulta</Tag>;
  if (t.estado === 'en_espera') return <span className="estado-espera"><Tag tone="alerta">En espera</Tag><span className="texto-chico suave">{t.llegada && espera(t.llegada, ahora).replace(/^Llegó \d\d:\d\d( · )?/, '')}</span></span>;
  return <Tag>Por llegar</Tag>;
}

/** Sala de espera de hoy: quién llegó y hace cuánto, quién está en el consultorio y quién falta. */
function SalaDeEspera({ turnos, ahora, onAtender }: { turnos: Turno[]; ahora: string; onAtender: (t: Turno) => void }) {
  const { mascota, duenio, profesional, puede, llego, pasarAConsulta } = useStore();
  const enEspera = turnos.filter((t) => t.estado === 'en_espera');
  const enConsulta = turnos.filter((t) => t.estado === 'en_consulta');
  const porLlegar = turnos.filter((t) => t.estado === 'pendiente');
  const atendidos = turnos.filter((t) => t.estado === 'atendido').length;
  if (!turnos.length) return null;

  const fila = (t: Turno, extra: string, accion?: { label: string; onClick: () => void }) => {
    const m = mascota(t.mascotaId)!;
    return (
      <li key={t.id} className="sala__fila">
        <div className="sala__texto">
          <p className="texto-fuerte">
            {m.nombre} <span className="texto-chico suave">· {duenio(m.id)?.nombre}</span>
          </p>
          <p className="texto-chico">
            {t.hora} · {t.motivo} · {profesional(t)}
          </p>
          <p className="mono-etiqueta suave">{extra}</p>
        </div>
        {accion && (
          <button type="button" className="btn btn--secundario btn--small" onClick={accion.onClick}>
            {accion.label}
          </button>
        )}
      </li>
    );
  };

  return (
    <section className="sala" aria-labelledby="sala-titulo">
      <div className="row-between">
        <h2 id="sala-titulo" className="display-s">
          Sala de espera
        </h2>
        <p className="mono-etiqueta suave">
          {atendidos} de {turnos.length} atendidos
        </p>
      </div>
      <div className="sala__cols">
        <div className="sala__col">
          <h3 className="mono-etiqueta">En espera · {enEspera.length}</h3>
          {enEspera.length ? (
            <ul>{enEspera.map((t) => fila(t, espera(t.llegada ?? t.hora, ahora), puede('atender') ? { label: 'Pasar', onClick: () => pasarAConsulta(t.id) } : undefined))}</ul>
          ) : (
            <p className="texto-chico suave">Nadie esperando.</p>
          )}
        </div>
        <div className="sala__col">
          <h3 className="mono-etiqueta">En consulta · {enConsulta.length}</h3>
          {enConsulta.length ? (
            <ul>{enConsulta.map((t) => fila(t, `Con ${profesional(t)}`, puede('atender') ? { label: 'Atender', onClick: () => onAtender(t) } : undefined))}</ul>
          ) : (
            <p className="texto-chico suave">Consultorios libres.</p>
          )}
        </div>
        <div className="sala__col">
          <h3 className="mono-etiqueta">Por llegar · {porLlegar.length}</h3>
          {porLlegar.length ? (
            <ul>{porLlegar.slice(0, 3).map((t) => fila(t, aMin(t.hora) < aMin(ahora) ? 'Ya es la hora' : `A las ${t.hora}`, { label: 'Llegó', onClick: () => llego(t.id) }))}</ul>
          ) : (
            <p className="texto-chico suave">Ya llegaron todos.</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Lista de espera: quién quería un día que estaba lleno. Si se libera lugar, se le avisa por WhatsApp. */
function ListaEspera({ onDarTurno }: { onDarTurno: (e: { id: number; fecha: string; hora?: string; vetId?: number; mascotaId: number; motivo: Motivo }) => void }) {
  const { esperas, mascota, clientes, nombreVet, avisarEspera, removeEspera } = useStore();
  return (
    <section className="stack-12" id="lista-espera" aria-labelledby="espera-titulo">
      <div className="row-between">
        <h2 id="espera-titulo" className="display-s">
          Lista de espera
        </h2>
        <p className="mono-etiqueta suave">{plural(esperas.length, 'persona', 'personas')}</p>
      </div>
      <Table
        caption="Lista de espera"
        empty="Nadie en lista de espera. Cuando un día se llena, el cliente se puede anotar desde la app."
        columns={[{ label: 'Quiere', width: '13%' }, { label: 'Mascota', width: '11%' }, { label: 'Cliente', width: '15%' }, { label: 'Con', width: '15%' }, { label: 'Lugar', width: '22%' }, { label: '', align: 'right' }]}
        rows={esperas.map((e) => {
          const m = mascota(e.mascotaId);
          const c = clientes.find((x) => x.id === e.clienteId);
          const primero = e.lugares[0];
          const texto =
            primero && m && c
              ? `Hola ${primerNombre(c.nombre)}, se liberó un lugar para ${m.nombre} el ${diaSemanaLargo(e.fecha).toLowerCase()} a las ${primero.hora} con ${nombreVet(primero.vetId)} (${e.motivo.toLowerCase()}). ¿Lo querés? Respondé este mensaje y te lo reservamos. ${FIRMA}`
              : '';
          return {
            key: e.id,
            cells: [
              <span>
                {diaSemanaCorto(e.fecha)}
                <span className="texto-chico suave"> · {e.motivo}</span>
              </span>,
              <span className="cell-strong">{m?.nombre}</span>,
              c?.nombre,
              e.vetId ? nombreVet(e.vetId) : 'Cualquiera',
              primero ? (
                <span className="estado-espera">
                  <Tag tone="ok">Hay lugar</Tag>
                  <span className="texto-chico">{e.lugares.slice(0, 3).map((l) => l.hora).join(', ')}{e.lugares.length > 3 ? '…' : ''}</span>
                </span>
              ) : (
                <span className="texto-chico suave">Sigue lleno</span>
              ),
              <RowActions
                actions={[
                  ...(primero && c
                    ? [
                        { label: e.avisado ? 'Avisado' : 'WhatsApp', href: waLink(c.telefono, texto), onClick: () => avisarEspera(e.id), title: `Avisarle a ${c.nombre} por WhatsApp` },
                        { label: 'Dar turno', onClick: () => onDarTurno({ ...e, hora: primero.hora, vetId: primero.vetId }) },
                      ]
                    : []),
                  { label: 'Quitar', danger: true, onClick: () => removeEspera(e.id) },
                ]}
              />,
            ],
          };
        })}
      />
    </section>
  );
}

/** Fila de la grilla de cada horario (encabezado = 1, mañana desde 2, una fila de separación, tarde). */
const filaDe = (hora: string) => {
  const i = MANIANA.indexOf(hora);
  return i >= 0 ? i + 2 : MANIANA.length + 3 + TARDE.indexOf(hora);
};

/**
 * Agenda de la semana de un veterinario: una columna por día y una fila cada 30 minutos.
 * Cada turno ocupa lo que dura. En el celular, los días se apilan uno debajo del otro.
 */
function Semana({ dias, vetId, ahora, onTurno, onLibre, onBloqueo }: { dias: string[]; vetId: number; ahora: string; onTurno: (t: Turno) => void; onLibre: (fecha: string, hora: string) => void; onBloqueo: (b: Bloqueo) => void }) {
  const { hoy, turnosDel, mascota, bloqueos } = useStore();
  const horas = HORARIOS;

  return (
    <div className="semana" role="grid" aria-label="Agenda de la semana">
      {horas.map((h) => (
        <span key={h} className="semana__hora mono-dato suave" style={{ gridRow: filaDe(h) } as CSSProperties} aria-hidden="true">
          {h}
        </span>
      ))}
      <span className="semana__corte mono-etiqueta suave" style={{ gridRow: MANIANA.length + 2 } as CSSProperties} aria-hidden="true">
        Tarde
      </span>
      {dias.map((d, col) => {
        const turnos = turnosDel(d, vetId);
        const pasado = d < hoy;
        const celdas: [number, JSX.Element][] = [];
        const usadas = new Set<string>();
        for (const t of turnos) {
          const n = DURACION[t.motivo] / 30;
          const idx = horas.indexOf(t.hora);
          horas.slice(idx, idx + n).forEach((h) => usadas.add(h));
          const m = mascota(t.mascotaId)!;
          celdas.push([
            filaDe(t.hora),
            <button
              key={'t' + t.id}
              type="button"
              className={`slot slot--turno is-${t.estado}`}
              style={{ gridColumn: col + 2, gridRow: `${filaDe(t.hora)} / span ${n}` } as CSSProperties}
              onClick={() => onTurno(t)}
              aria-label={`${t.hora} a ${horaFin(t.hora, t.motivo)}, ${m.nombre}, ${t.motivo}, ${ESTADOS[t.estado].toLowerCase()}`}
            >
              <span className="slot__linea">
                <span className="mono-dato">{t.hora}</span> <span className="texto-fuerte">{m.nombre}</span>
              </span>
              <span className="texto-chico">
                {t.motivo}
                {t.estado !== 'pendiente' ? ` · ${ESTADOS[t.estado].toLowerCase()}` : ''}
              </span>
            </button>,
          ]);
        }
        for (let i = 0; i < horas.length; i++) {
          const h = horas[i];
          if (usadas.has(h)) continue;
          const b = bloqueoDe(bloqueos, d, h, vetId);
          if (b) {
            // Un solo rectángulo para todo el bloqueo seguido.
            let n = 1;
            while (i + n < horas.length && !usadas.has(horas[i + n]) && bloqueoDe(bloqueos, d, horas[i + n], vetId) === b && filaDe(horas[i + n]) === filaDe(h) + n) n++;
            celdas.push([
              filaDe(h),
              <button key={'b' + h} type="button" className="slot slot--bloqueado" style={{ gridColumn: col + 2, gridRow: `${filaDe(h)} / span ${n}` } as CSSProperties} onClick={() => onBloqueo(b)} aria-label={`${h}, bloqueado: ${b.motivo}. Quitar bloqueo`}>
                <span className="mono-dato">{h}</span>
                <span className="texto-chico">{b.motivo}</span>
              </button>,
            ]);
            i += n - 1;
            continue;
          }
          const style = { gridColumn: col + 2, gridRow: filaDe(h) } as CSSProperties;
          celdas.push([
            filaDe(h),
            pasado || (d === hoy && h < ahora) ? (
              <span key={'l' + h} className="slot slot--libre is-pasado" style={style}>
                <span className="mono-dato">{h}</span>
              </span>
            ) : (
              <button key={'l' + h} type="button" className="slot slot--libre" style={style} onClick={() => onLibre(d, h)} aria-label={`${h}, libre. Agendar turno`}>
                <span className="mono-dato">{h}</span>
                <span className="slot__estado mono-etiqueta">Libre</span>
              </button>
            ),
          ]);
        }
        return [
          <h3 key={'h' + d} className={`semana__head${d === hoy ? ' is-hoy' : ''}`} style={{ gridColumn: col + 2 } as CSSProperties}>
            <span className="mono-etiqueta">{d === hoy ? 'Hoy' : nombreDia(d)}</span>
            <span className="display-s">{numeroDia(d)}</span>
          </h3>,
          ...celdas.sort((a, b) => a[0] - b[0]).map((c) => c[1]),
        ];
      })}
    </div>
  );
}

/** Agendar desde la veterinaria: con quién, motivo (con su duración), día y horario libre. */
function NuevoTurno({ dias, inicial, onClose, onDone }: { dias: string[]; inicial: { fecha?: string; hora?: string; vetId?: number; mascotaId?: number; motivo?: Motivo; esperaId?: number }; onClose: () => void; onDone: (dia: string, texto: string) => void }) {
  const { state, veterinarios, duenio, pedirTurno, nombreVet, removeEspera } = useStore();
  const [mascotaId, setMascotaId] = useState(inicial.mascotaId ?? state.mascotas[0]?.id);
  const [vetId, setVetId] = useState(inicial.vetId ?? veterinarios[0].id);
  const [motivo, setMotivo] = useState<Motivo>(inicial.motivo ?? 'Control');
  const [fecha, setFecha] = useState(inicial.fecha ?? dias[0]);
  const [hora, setHora] = useState<string | null>(inicial.hora ?? null);
  const disponibles = libres(state.turnos, state.bloqueos, fecha, vetId, motivo);
  const horaValida = hora && disponibles.includes(hora) ? hora : null;
  const opciones = [...new Set([...dias, fecha])].sort();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!mascotaId || !horaValida) return;
    pedirTurno({ mascotaId, motivo, fecha, hora: horaValida, vetId });
    if (inicial.esperaId) removeEspera(inicial.esperaId);
    const m = state.mascotas.find((x) => x.id === mascotaId)!;
    onDone(fecha, `${m.nombre}, ${diaSemanaCorto(fecha)} de ${horaValida} a ${horaFin(horaValida, motivo)} con ${nombreVet(vetId)}.`);
  };

  return (
    <Panel title="Nuevo turno" kicker="Agenda" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="nt-mascota" className="mono-etiqueta">
            Mascota
          </label>
          <select id="nt-mascota" className="field__box" value={mascotaId} onChange={(e) => setMascotaId(Number(e.target.value))}>
            {state.mascotas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} · {duenio(m.id)?.nombre}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="group">
          <legend className="mono-etiqueta">Con</legend>
          <div className="chips">
            {veterinarios.map((v) => (
              <Chip key={v.id} pressed={v.id === vetId} onClick={() => setVetId(v.id)}>
                {v.nombre}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="group">
          <legend className="mono-etiqueta">Motivo</legend>
          <div className="chips">
            {MOTIVOS.map((x) => (
              <Chip key={x} pressed={x === motivo} onClick={() => setMotivo(x)}>
                {x} · {duracionTexto(x)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="group">
          <legend className="mono-etiqueta">Día</legend>
          <div className="chips">
            {opciones.map((d) => (
              <Chip key={d} pressed={d === fecha} onClick={() => setFecha(d)}>
                {diaSemanaCorto(d)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <Horarios disponibles={disponibles} elegido={horaValida} onElegir={setHora} motivo={motivo} />
        <PanelActions submit="Agendar turno" onCancel={onClose} disabled={!horaValida || !mascotaId} />
      </form>
    </Panel>
  );
}

/** Bloquear un horario o un día entero, para alguien o para todos: ahí no se dan turnos, ni desde la app. */
function BloquearPanel({ fechaInicial, vetInicial, onClose, onDone }: { fechaInicial: string; vetInicial?: number; onClose: () => void; onDone: (b: Omit<Bloqueo, 'id'>) => void }) {
  const { hoy, turnosDel, mascota, addBloqueo, veterinarios } = useStore();
  const [fecha, setFecha] = useState(fechaInicial);
  const [vetId, setVetId] = useState<number | undefined>(vetInicial);
  const [diaEntero, setDiaEntero] = useState(false);
  const [desde, setDesde] = useState('16:00');
  const [hasta, setHasta] = useState('19:00');
  const [motivo, setMotivo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const horas = Array.from({ length: 25 }, (_, i) => aHora(480 + i * 30));
  const errores = {
    fecha: !fecha || fecha < hoy ? 'Elegí hoy o un día que venga.' : undefined,
    hasta: !diaEntero && hasta <= desde ? 'Tiene que ser después de “desde”.' : undefined,
    motivo: !motivo.trim() ? 'Contá por qué, así se entiende en la agenda.' : undefined,
  };
  const afectados = turnosDel(fecha, vetId).filter((t) => t.estado === 'pendiente' && (diaEntero || (t.hora >= desde && t.hora < hasta)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    if (Object.values(errores).some(Boolean)) return;
    const b = { fecha, motivo: motivo.trim(), vetId, ...(diaEntero ? {} : { desde, hasta }) };
    addBloqueo(b);
    onDone(b);
  };

  return (
    <Panel title="Bloquear horario" kicker="Agenda" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <fieldset className="group">
          <legend className="mono-etiqueta">Para</legend>
          <div className="chips">
            <Chip pressed={vetId === undefined} onClick={() => setVetId(undefined)}>
              Toda la veterinaria
            </Chip>
            {veterinarios.map((v) => (
              <Chip key={v.id} pressed={vetId === v.id} onClick={() => setVetId(v.id)}>
                {v.nombre}
              </Chip>
            ))}
          </div>
        </fieldset>
        <Field label="Día" type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} error={enviado ? errores.fecha : undefined} />
        <div className="row-between">
          <span className="texto-fuerte">Todo el día</span>
          <Toggle checked={diaEntero} onChange={() => setDiaEntero((x) => !x)} label="Todo el día" />
        </div>
        {!diaEntero && (
          <div className="row-2">
            <div className="field">
              <label htmlFor="bl-desde" className="mono-etiqueta">
                Desde
              </label>
              <select id="bl-desde" className="field__box" value={desde} onChange={(e) => setDesde(e.target.value)}>
                {horas.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="bl-hasta" className="mono-etiqueta">
                Hasta
              </label>
              <select id="bl-hasta" className="field__box" value={hasta} onChange={(e) => setHasta(e.target.value)} aria-invalid={enviado && !!errores.hasta}>
                {horas.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
              {enviado && errores.hasta && <p className="field__error texto-chico">{errores.hasta}</p>}
            </div>
          </div>
        )}
        <Field label="Motivo" placeholder="Ej.: Cirugía programada" value={motivo} onChange={(e) => setMotivo(e.target.value)} error={enviado ? errores.motivo : undefined} />
        <div className="chips" role="group" aria-label="Motivos frecuentes">
          {['Cirugía programada', 'Vacaciones', 'Capacitación', 'Trámite'].map((x) => (
            <Chip key={x} pressed={motivo === x} onClick={() => setMotivo(x)}>
              {x}
            </Chip>
          ))}
        </div>
        {afectados.length > 0 && (
          <Notice tipo="alerta" titulo={afectados.length === 1 ? 'Ya hay 1 turno en ese horario' : `Ya hay ${afectados.length} turnos en ese horario`}>
            {afectados.map((t) => `${mascota(t.mascotaId)?.nombre} a las ${t.hora}`).join(', ')}. Siguen en la agenda: avisale al dueño para reprogramarlo.
          </Notice>
        )}
        <PanelActions submit="Bloquear" onCancel={onClose} />
      </form>
    </Panel>
  );
}

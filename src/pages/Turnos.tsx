import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Back, Button, Chip, Drawing, Notice, Tag } from '../components/ui';
import { Screen } from '../components/Layout';
import { Horarios } from '../components/Horarios';
import { PagoDemo } from '../components/PagoDemo';
import type { Motivo } from '../data/types';
import { MOTIVOS_CLIENTE, SENA, duracionTexto, horaFin } from '../lib/agenda';
import { diaSemanaCorto, diaSemanaLargo, nextWorkdays, nombreDia, nombreMes, numeroDia } from '../lib/dates';
import { downloadIcs } from '../lib/ics';
import { precio } from '../lib/format';
import { useStore } from '../lib/store';
import './pages.css';

/** 06 · Mis turnos y 07 · sin turnos. También la lista de espera en la que se anotó. */
export function Turnos() {
  const { proximos, anteriores, misEsperas, mascota, cancelarTurno, removeEspera, profesional, nombreVet } = useStore();
  const [cancelado, setCancelado] = useState<string | null>(null);

  if (!proximos.length && !anteriores.length && !misEsperas.length) {
    return (
      <Screen nav="turnos" label="Mis turnos" className="empty">
        <h1 className="display-l">Mis turnos</h1>
        <Empty titulo="No tenés turnos pedidos" texto="Elegí mascota, día y horario, y te esperamos." cta="Pedir turno" to="/turnos/nuevo" />
      </Screen>
    );
  }

  return (
    <Screen nav="turnos" label="Mis turnos">
      <p className="mono-etiqueta">{proximos.length === 1 ? '1 próximo' : `${proximos.length} próximos`}</p>
      <h1 className="display-l">Mis turnos</h1>
      {cancelado && <Notice tipo="exito" titulo="Turno cancelado">{cancelado}</Notice>}
      {proximos.length > 0 && (
        <ul className="card card--salvia list">
          {proximos.map((t) => {
            const m = mascota(t.mascotaId)!;
            return (
              <li key={t.id} className="list__row">
                <div className="list__text">
                  <p className="display-s">
                    {diaSemanaCorto(t.fecha)} · {t.hora}
                  </p>
                  <p className="texto-chico">
                    {m.nombre} · {t.motivo} · {profesional(t)}
                  </p>
                  {t.sena ? <p className="texto-chico">Seña pagada: {precio(t.sena)}</p> : null}
                </div>
                <div className="list__actions">
                  <Link to={`/turnos/${t.id}/reprogramar`} className="link-button mono-etiqueta" aria-label={`Reprogramar el turno de ${m.nombre} del ${diaSemanaLargo(t.fecha).toLowerCase()}`}>
                    Reprogramar
                  </Link>
                  <button
                    type="button"
                    className="link-button link-button--error mono-etiqueta"
                    aria-label={`Cancelar el turno de ${m.nombre} del ${diaSemanaLargo(t.fecha).toLowerCase()}`}
                    onClick={() => {
                      cancelarTurno(t.id);
                      setCancelado(`${m.nombre}, ${diaSemanaLargo(t.fecha).toLowerCase()} a las ${t.hora}.${t.sena ? ' Por la seña que pagaste, consultá en la veterinaria.' : ''}`);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {misEsperas.length > 0 && (
        <>
          <h2 className="mono-etiqueta suave">En lista de espera</h2>
          <ul className="card card--blanco list">
            {misEsperas.map((e) => (
              <li key={e.id} className="list__row">
                <div className="list__text">
                  <p className="display-s">{diaSemanaCorto(e.fecha)}</p>
                  <p className="texto-chico suave">
                    {mascota(e.mascotaId)?.nombre} · {e.motivo} · {e.vetId ? nombreVet(e.vetId) : 'con cualquier profesional'}
                  </p>
                  <p className="texto-chico suave">{e.avisado ? 'Te avisamos que se liberó un lugar.' : 'Si se libera un lugar, te avisamos.'}</p>
                </div>
                <button type="button" className="link-button link-button--error mono-etiqueta" onClick={() => removeEspera(e.id)}>
                  Salir
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {anteriores.length > 0 && (
        <>
          <h2 className="mono-etiqueta suave">Anteriores</h2>
          <ul className="card card--blanco list">
            {anteriores.map((t) => (
              <li key={t.id} className="list__row">
                <div className="list__text">
                  <p className="display-s">
                    {diaSemanaCorto(t.fecha)} · {t.hora}
                  </p>
                  <p className="texto-chico suave">
                    {mascota(t.mascotaId)!.nombre} · {t.motivo}
                  </p>
                </div>
                <Tag>Atendido</Tag>
              </li>
            ))}
          </ul>
        </>
      )}
      <Button to="/turnos/nuevo" full>
        Pedir turno
      </Button>
    </Screen>
  );
}

/**
 * 08 · Pedir turno. Con un id en la ruta, es Reprogramar ese turno (mismo formulario).
 * Se elige con quién (o "me da igual"); los horarios dependen de lo que dura el motivo.
 * Si el día está lleno, se puede anotar en la lista de espera. Para confirmar, la seña.
 */
export function PedirTurno() {
  const { id } = useParams();
  const { state, cliente, mascotas, veterinarios, lugares, nombreVet, misEsperas, pedirTurno, reprogramarTurno, anotarEspera } = useStore();
  const navigate = useNavigate();
  const turno = id ? state.turnos.find((t) => t.id === Number(id) && mascotas.some((m) => m.id === t.mascotaId)) : undefined;
  const dias = nextWorkdays(5);
  const [mascotaId, setMascotaId] = useState(turno?.mascotaId ?? mascotas[0]?.id);
  const [motivo, setMotivo] = useState<Motivo>(turno?.motivo ?? 'Control');
  const [vetId, setVetId] = useState<number | 0>(turno?.vetId ?? 0);
  const lleno = (d: string) => lugares(d, motivo, vetId || undefined, turno?.id).length === 0;
  const [fecha, setFecha] = useState(() => (turno && dias.includes(turno.fecha) ? turno.fecha : (dias.slice(1).find((d) => lugares(d, 'Control').length > 0) ?? dias[1])));
  const disponibles = lugares(fecha, motivo, vetId || undefined, turno?.id);
  const [hora, setHora] = useState<string | null>(null);
  const elegido = disponibles.find((l) => l.hora === hora) ?? null;
  const sinCambios = turno && elegido && fecha === turno.fecha && elegido.hora === turno.hora && elegido.vetId === turno.vetId;
  const [pagar, setPagar] = useState(false);
  const yaAnotado = misEsperas.some((e) => e.mascotaId === mascotaId && e.fecha === fecha);

  if (id && !turno) return <NotFoundTurno />;

  if (!mascotas.length) {
    return (
      <Screen nav="turnos" label="Pedir turno" className="empty">
        <Back to="/inicio">Inicio</Back>
        <h1 className="display-l">Pedir turno</h1>
        <Empty titulo="Primero cargá a tu mascota" texto="El turno se pide para una mascota." cta="Agregar mascota" to="/mascotas/nueva" />
      </Screen>
    );
  }

  const confirmar = () => {
    if (!mascotaId || !elegido || sinCambios) return;
    if (turno) {
      reprogramarTurno(turno.id, fecha, elegido.hora, motivo, elegido.vetId);
      navigate(`/turnos/listo/${turno.id}?cambio=1`);
      return;
    }
    setPagar(true);
  };
  const reservar = () => {
    if (!mascotaId || !elegido) return;
    const nuevo = pedirTurno({ mascotaId, motivo, fecha, hora: elegido.hora, vetId: elegido.vetId, sena: SENA });
    navigate(`/turnos/listo/${nuevo}`);
  };
  const m = mascotas.find((x) => x.id === mascotaId);

  return (
    <Screen nav="turnos" label={turno ? 'Reprogramar turno' : 'Pedir turno'}>
      {turno ? <Back to="/turnos">Mis turnos</Back> : <Back to="/inicio">Inicio</Back>}
      <h1 className="display-l">{turno ? 'Reprogramar turno' : 'Pedir turno'}</h1>

      {turno ? (
        <div className="card card--salvia">
          <p className="mono-etiqueta">Ahora</p>
          <p className="display-s">
            {diaSemanaCorto(turno.fecha)} · {turno.hora}
          </p>
          <p className="texto-chico">
            {mascotas.find((x) => x.id === turno.mascotaId)?.nombre} · {nombreVet(turno.vetId)}
          </p>
        </div>
      ) : (
        <fieldset className="group">
          <legend className="mono-etiqueta">Mascota</legend>
          <div className="chips">
            {mascotas.map((x) => (
              <Chip key={x.id} pressed={x.id === mascotaId} onClick={() => setMascotaId(x.id)}>
                {x.nombre}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="group">
        <legend className="mono-etiqueta">Motivo</legend>
        <div className="chips">
          {MOTIVOS_CLIENTE.map((x) => (
            <Chip key={x} pressed={x === motivo} onClick={() => setMotivo(x)}>
              {x} · {duracionTexto(x)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="group">
        <legend className="mono-etiqueta">Con</legend>
        <div className="chips">
          <Chip pressed={vetId === 0} onClick={() => setVetId(0)}>
            Me da igual
          </Chip>
          {veterinarios.map((v) => (
            <Chip key={v.id} pressed={vetId === v.id} onClick={() => setVetId(v.id)}>
              {v.nombre}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="group">
        <legend className="mono-etiqueta">{nombreMes(fecha)}</legend>
        <div className="days">
          {dias.map((d) => {
            const sinLugar = lleno(d);
            return (
              <button key={d} type="button" className={`day${sinLugar ? ' day--lleno' : ''}`} aria-pressed={d === fecha} onClick={() => setFecha(d)} aria-label={sinLugar ? `${diaSemanaLargo(d)}, completo` : diaSemanaLargo(d)}>
                <span className="mono-etiqueta">{nombreDia(d)}</span>
                <span className="display-s">{numeroDia(d)}</span>
                {sinLugar && <span className="day__lleno mono-etiqueta">Lleno</span>}
              </button>
            );
          })}
        </div>
      </fieldset>

      {disponibles.length > 0 ? (
        <Horarios disponibles={disponibles.map((l) => l.hora)} elegido={elegido?.hora ?? null} onElegir={setHora} motivo={motivo} actual={turno && fecha === turno.fecha ? turno.hora : undefined} />
      ) : (
        <Notice
          tipo="alerta"
          titulo={yaAnotado ? 'Estás en la lista de espera para ese día' : `El ${diaSemanaLargo(fecha).toLowerCase()} está completo`}
          acciones={yaAnotado || !m ? undefined : [{ label: 'Anotarme en la lista de espera', onClick: () => anotarEspera({ mascotaId: m.id, motivo, fecha, vetId: vetId || undefined }) }]}
        >
          {yaAnotado
            ? `Si se libera un lugar te avisamos${cliente?.whatsapp ? ' por WhatsApp' : ' en la app'}.`
            : `No queda lugar para ${motivo.toLowerCase()}${vetId ? ` con ${nombreVet(vetId)}` : ''}. Elegí otro día o anotate y te avisamos si alguien cancela.`}
        </Notice>
      )}

      {elegido && (
        <p className="texto-chico suave">
          {diaSemanaLargo(fecha)} de {elegido.hora} a {horaFin(elegido.hora, motivo)} con {nombreVet(elegido.vetId)}.
          {turno ? (turno.sena ? ' La seña que pagaste sigue valiendo.' : '') : ` Para confirmarlo se paga una seña de ${precio(SENA)}, que se descuenta de la consulta.`}
        </p>
      )}
      <div className="grow" />
      {sinCambios && <p className="texto-chico suave">Es el mismo día, horario y profesional que ya tenés. Elegí otro.</p>}
      <Button full onClick={confirmar} disabled={!elegido || !!sinCambios}>
        {turno ? 'Confirmar cambio' : 'Pagar seña y confirmar'}
      </Button>
      {pagar && m && elegido && (
        <PagoDemo concepto={`Seña del turno de ${m.nombre}, ${diaSemanaCorto(fecha)} ${elegido.hora}`} monto={SENA} onAprobado={reservar} onClose={() => setPagar(false)} />
      )}
    </Screen>
  );
}

/** 09 · Turno pedido */
export function TurnoPedido() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const cambio = params.get('cambio') === '1';
  const { state, mascota, profesional } = useStore();
  const t = state.turnos.find((x) => x.id === Number(id));
  const m = t && mascota(t.mascotaId);
  if (!t || !m) return <NotFoundTurno />;

  return (
    <Screen nav="turnos" label="Turno pedido" className="center">
      <div className="grow" />
      <Drawing especie={m.especie} height={228} />
      <h1 className="display-l">{cambio ? '¡Listo! Lo cambiamos' : '¡Listo! Te esperamos'}</h1>
      <div className="card card--blanco">
        <p className="display-m">
          {diaSemanaLargo(t.fecha)} · {t.hora}
        </p>
        <p className="texto-chico suave">
          {m.nombre} · {t.motivo} · {profesional(t)}
        </p>
        {t.sena && !cambio ? <p className="texto-chico suave">Seña pagada: {precio(t.sena)}</p> : null}
      </div>
      <p className="texto-chico suave">Te avisamos un día antes.</p>
      <div className="grow" />
      <Button full onClick={() => downloadIcs({ titulo: `Turno de ${m.nombre} en la veterinaria`, fecha: t.fecha, hora: t.hora, detalle: `${t.motivo} · ${profesional(t)}` })}>
        Agregar al calendario
      </Button>
      <Button to="/inicio" variant="secundario" full>
        Volver al inicio
      </Button>
    </Screen>
  );
}

function NotFoundTurno() {
  return (
    <Screen nav="turnos" label="Turno">
      <Back to="/turnos">Mis turnos</Back>
      <h1 className="display-l">No encontramos ese turno</h1>
    </Screen>
  );
}

/** Estado vacío: los dos dibujos, un título, una explicación y la acción para resolverlo. */
export function Empty({ titulo, texto, cta, to }: { titulo: string; texto: string; cta: string; to: string }) {
  return (
    <div className="empty__body">
      <Drawing especie="ambos" height={200} />
      <h2 className="display-m">{titulo}</h2>
      <p className="suave">{texto}</p>
      <Button to={to} full>
        {cta}
      </Button>
    </div>
  );
}

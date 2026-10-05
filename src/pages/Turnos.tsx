import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Back, Button, Chip, Drawing, Notice, Tag } from '../components/ui';
import { Screen } from '../components/Layout';
import type { Motivo } from '../data/types';
import { diaSemanaCorto, diaSemanaLargo, nextWorkdays, nombreDia, nombreMes, numeroDia } from '../lib/dates';
import { downloadIcs } from '../lib/ics';
import { useStore } from '../lib/store';
import './pages.css';

const HORARIOS = ['09:30', '10:30', '11:00', '16:00', '17:30'];
const MOTIVOS: Motivo[] = ['Control', 'Vacuna', 'Consulta'];

/** 06 · Mis turnos y 07 · sin turnos. */
export function Turnos() {
  const { proximos, anteriores, mascota, cancelarTurno } = useStore();
  const [cancelado, setCancelado] = useState<string | null>(null);

  if (!proximos.length && !anteriores.length) {
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
        <ul className="card card--celeste list">
          {proximos.map((t) => {
            const m = mascota(t.mascotaId)!;
            return (
              <li key={t.id} className="list__row">
                <div className="list__text">
                  <p className="display-s">
                    {diaSemanaCorto(t.fecha)} · {t.hora}
                  </p>
                  <p className="texto-chico">
                    {m.nombre} · {t.motivo} · {t.profesional}
                  </p>
                </div>
                <button
                  type="button"
                  className="link-button link-button--error mono-etiqueta"
                  onClick={() => {
                    cancelarTurno(t.id);
                    setCancelado(`${m.nombre}, ${diaSemanaLargo(t.fecha).toLowerCase()} a las ${t.hora}.`);
                  }}
                >
                  Cancelar
                </button>
              </li>
            );
          })}
        </ul>
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

/** 08 · Pedir turno */
export function PedirTurno() {
  const { mascotas, ocupados, pedirTurno } = useStore();
  const navigate = useNavigate();
  const dias = nextWorkdays(5);
  const [mascotaId, setMascotaId] = useState(mascotas[0]?.id);
  const [motivo, setMotivo] = useState<Motivo>('Control');
  const [fecha, setFecha] = useState(dias[1]);
  const tomados = ocupados(fecha);
  const [hora, setHora] = useState<string | null>(() => HORARIOS.find((h) => !ocupados(dias[1]).includes(h)) ?? null);
  const horaValida = hora && !tomados.includes(hora) ? hora : null;

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
    if (!mascotaId || !horaValida) return;
    const id = pedirTurno({ mascotaId, motivo, fecha, hora: horaValida });
    navigate(`/turnos/listo/${id}`);
  };

  return (
    <Screen label="Pedir turno">
      <Back to="/inicio">Inicio</Back>
      <h1 className="display-l">Pedir turno</h1>

      <fieldset className="group">
        <legend className="mono-etiqueta">Mascota</legend>
        <div className="chips">
          {mascotas.map((m) => (
            <Chip key={m.id} pressed={m.id === mascotaId} onClick={() => setMascotaId(m.id)}>
              {m.nombre}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="group">
        <legend className="mono-etiqueta">Motivo</legend>
        <div className="chips">
          {MOTIVOS.map((x) => (
            <Chip key={x} pressed={x === motivo} onClick={() => setMotivo(x)}>
              {x}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="group">
        <legend className="mono-etiqueta">{nombreMes(fecha)}</legend>
        <div className="days">
          {dias.map((d) => (
            <button key={d} type="button" className="day" aria-pressed={d === fecha} onClick={() => setFecha(d)} aria-label={diaSemanaLargo(d)}>
              <span className="mono-etiqueta">{nombreDia(d)}</span>
              <span className="display-s">{numeroDia(d)}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="group">
        <legend className="mono-etiqueta">Horario</legend>
        <div className="chips">
          {HORARIOS.map((h) => (
            <Chip key={h} pressed={h === horaValida} disabled={tomados.includes(h)} onClick={() => setHora(h)} aria-label={tomados.includes(h) ? `${h}, ocupado` : h}>
              {h}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="grow" />
      <Button full onClick={confirmar} disabled={!horaValida}>
        Confirmar turno
      </Button>
    </Screen>
  );
}

/** 09 · Turno pedido */
export function TurnoPedido() {
  const { id } = useParams();
  const { state, mascota } = useStore();
  const t = state.turnos.find((x) => x.id === Number(id));
  const m = t && mascota(t.mascotaId);
  if (!t || !m) return <NotFoundTurno />;

  return (
    <Screen label="Turno pedido" className="center">
      <div className="grow" />
      <Drawing especie={m.especie} height={228} />
      <h1 className="display-l">¡Listo! Te esperamos</h1>
      <div className="card card--blanco">
        <p className="display-m">
          {diaSemanaLargo(t.fecha)} · {t.hora}
        </p>
        <p className="texto-chico suave">
          {m.nombre} · {t.motivo} · {t.profesional}
        </p>
      </div>
      <p className="texto-chico suave">Te avisamos un día antes.</p>
      <div className="grow" />
      <Button full onClick={() => downloadIcs({ titulo: `Turno de ${m.nombre} en la veterinaria`, fecha: t.fecha, hora: t.hora, detalle: `${t.motivo} · ${t.profesional}` })}>
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
    <Screen label="Turno">
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

import { Link } from 'react-router-dom';
import { Back, Notice, Toggle } from '../components/ui';
import { Screen } from '../components/Layout';
import { cuanto, daysBetween, diaMes, diaSemanaCorto, fromIso, today } from '../lib/dates';
import { downloadIcs } from '../lib/ics';
import { plural } from '../lib/format';
import { useStore } from '../lib/store';
import './pages.css';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaLarga = (iso: string) => `${fromIso(iso).getDate()} de ${MESES[fromIso(iso).getMonth()]}`;

/** 04 · Cliente · Inicio: aviso, próximo turno y atajos. */
export function Inicio() {
  const { cliente, recordatorios, proximos, compras, mascota, toggleRecordatorio, logout } = useStore();
  const hoy = today();

  // El aviso es el recordatorio activo más cercano de los próximos 30 días.
  const aviso = recordatorios
    .filter((r) => r.activo && r.fecha && daysBetween(hoy, r.fecha) >= 0 && daysBetween(hoy, r.fecha) <= 30)
    .sort((a, b) => a.fecha!.localeCompare(b.fecha!))[0];
  const turno = proximos[0];
  const m = turno && mascota(turno.mascotaId);
  const activos = recordatorios.filter((r) => r.activo).length;
  const unidades = compras.reduce((n, c) => n + c.cantidad, 0);

  return (
    <Screen nav="inicio" label="Inicio">
      <div className="row-between">
        <p className="mono-etiqueta">Cliente n.º {cliente!.id}</p>
        <button type="button" className="link-button mono-etiqueta" onClick={logout}>
          Salir
        </button>
      </div>
      <h1 className="display-l">Hola, {cliente!.nombre.split(' ')[0]}</h1>

      {aviso && (
        <Notice
          tipo="alerta"
          titulo={`${aviso.titulo} ${cuanto(aviso.fecha!)}`}
          acciones={[
            { label: 'Agregar al calendario', onClick: () => downloadIcs({ titulo: aviso.titulo, fecha: aviso.fecha! }) },
            { label: 'Desactivar', onClick: () => toggleRecordatorio(aviso.id) },
          ]}
        >
          Le toca el {fechaLarga(aviso.fecha!)}.
        </Notice>
      )}

      {turno && m ? (
        <Link to="/turnos" className="card card--celeste next-turn">
          <span className="mono-etiqueta">Próximo turno</span>
          <span className="display-m">
            {diaSemanaCorto(turno.fecha)} · {turno.hora}
          </span>
          <span className="texto-chico">
            {m.nombre} · {turno.motivo === 'Control' ? 'Control anual' : turno.motivo} · {turno.profesional}
          </span>
        </Link>
      ) : (
        <Link to="/turnos/nuevo" className="card card--celeste next-turn">
          <span className="mono-etiqueta">Próximo turno</span>
          <span className="display-m">Sin turnos</span>
          <span className="texto-chico">Pedí uno cuando quieras.</span>
        </Link>
      )}

      <nav className="shortcuts" aria-label="Atajos">
        <Link to="/turnos/nuevo" className="shortcut">
          <span className="display-s">Pedir turno</span>
          <span className="texto-chico suave">Elegí día y horario</span>
        </Link>
        <Link to="/recordatorios" className="shortcut">
          <span className="display-s">Recordatorios</span>
          <span className="texto-chico suave">{activos === 1 ? '1 activo' : `${activos} activos`}</span>
        </Link>
        <Link to="/tienda" className="shortcut">
          <span className="display-s">Tienda</span>
          <span className="texto-chico suave">Alimento, pipetas y más</span>
        </Link>
        <Link to="/compras" className="shortcut">
          <span className="display-s">Mis compras</span>
          <span className="texto-chico suave">{unidades ? plural(unidades, 'producto', 'productos') : 'Todavía nada'}</span>
        </Link>
      </nav>
    </Screen>
  );
}

/** 05 · Cliente · Recordatorios */
export function Recordatorios() {
  const { recordatorios, toggleRecordatorio } = useStore();
  return (
    <Screen nav="inicio" label="Recordatorios">
      <Back to="/inicio">Inicio</Back>
      <h1 className="display-l">Recordatorios</h1>
      <p className="suave">Te avisamos antes de cada vacuna, desparasitación o turno. Podés apagar los que no quieras.</p>
      <ul className="card card--blanco list">
        {recordatorios.map((r) => (
          <li key={r.id} className="list__row">
            <div className="list__text">
              <p className="texto-fuerte">{r.titulo}</p>
              <p className="texto-chico suave">{r.fecha ? `${diaMes(r.fecha)} · ${cuanto(r.fecha)}` : r.frecuencia}</p>
              {r.activo && r.fecha && (
                <button type="button" className="link-button mono-etiqueta" onClick={() => downloadIcs({ titulo: r.titulo, fecha: r.fecha! })}>
                  Agregar al calendario
                </button>
              )}
            </div>
            <Toggle checked={r.activo} onChange={() => toggleRecordatorio(r.id)} label={r.titulo} />
          </li>
        ))}
      </ul>
    </Screen>
  );
}

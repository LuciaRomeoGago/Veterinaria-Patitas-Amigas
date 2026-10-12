import { Link, useNavigate } from 'react-router-dom';
import { Back, Notice, Toggle } from '../components/ui';
import { tomasDelDia } from '../lib/tomas';
import { Screen } from '../components/Layout';
import { cuanto, daysBetween, diaMes, diaSemanaCorto, diaSemanaLargo, fromIso, today } from '../lib/dates';
import { downloadIcs } from '../lib/ics';
import { plural } from '../lib/format';
import { useStore } from '../lib/store';
import './pages.css';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaLarga = (iso: string) => `${fromIso(iso).getDate()} de ${MESES[fromIso(iso).getMonth()]}`;

/** 04 · Cliente · Inicio: aviso, próximo turno y atajos. */
export function Inicio() {
  const { cliente, recordatorios, proximos, compras, mascota, mascotas, producto, toggleRecordatorio, logout, profesional, marcarToma } = useStore();
  const navigate = useNavigate();
  const hoy = today();

  // Medicación en casa: las tomas de hoy de los tratamientos en curso.
  const tomasHoy = mascotas.flatMap((m) =>
    m.registros.filter((r) => r.plan && r.vigente).flatMap((r) => tomasDelDia(r.plan!, hoy).map((cuando) => ({ m, r, cuando, dada: r.plan!.dadas.includes(cuando) }))),
  ).sort((a, b) => a.cuando.localeCompare(b.cuando));

  // Pedir otra vez: lo que se termina (alimento, arena, pipeta) y ya va por los días que suele durar.
  const ultimas = new Map<number, { fecha: string; cantidad: number }>();
  for (const c of compras) if (!ultimas.has(c.productoId) || c.fecha > ultimas.get(c.productoId)!.fecha) ultimas.set(c.productoId, c);
  const reponer = [...ultimas.entries()]
    .map(([id, c]) => ({ p: producto(id), ...c }))
    .filter((x) => x.p?.duraDias && x.p.stock > 0 && daysBetween(x.fecha, hoy) >= x.p.duraDias - 5)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];

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

      {tomasHoy.length > 0 && (
        <section className="card card--blanco meds" aria-labelledby="meds-titulo">
          <h2 id="meds-titulo" className="mono-etiqueta">
            Medicación de hoy
          </h2>
          <ul className="meds__lista">
            {tomasHoy.map((x) => (
              <li key={x.r.id + x.cuando}>
                <label className="check toma">
                  <input type="checkbox" checked={x.dada} onChange={() => marcarToma(x.m.id, x.r.id, x.cuando)} />
                  <span>
                    <span className="mono-dato">{x.cuando.slice(11)}</span> <span className="texto-fuerte">{x.r.titulo}</span>
                    <span className="texto-chico suave"> · {x.m.nombre}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="texto-chico suave">Marcá cada toma cuando se la des: la veterinaria ve que el tratamiento se cumple.</p>
        </section>
      )}

      {reponer?.p && (
        <Notice
          tipo="alerta"
          titulo={`¿Se está terminando: ${reponer.p.nombre.toLowerCase()}?`}
          acciones={[{ label: 'Pedir otra vez', onClick: () => navigate(`/tienda?comprar=${reponer.p!.id}&cantidad=${reponer.cantidad}`) }]}
        >
          Lo compraste {cuanto(reponer.fecha)}; suele durar unos {reponer.p.duraDias} días.
        </Notice>
      )}

      {turno && m ? (
        <Link to="/turnos" className="card card--salvia next-turn">
          <span className="mono-etiqueta">Próximo turno</span>
          <span className="display-m">
            {diaSemanaCorto(turno.fecha)} · {turno.hora}
          </span>
          <span className="texto-chico">
            {m.nombre} · {turno.motivo === 'Control' ? 'Control anual' : turno.motivo} · {profesional(turno)}
          </span>
        </Link>
      ) : (
        <Link to="/turnos/nuevo" className="card card--salvia next-turn">
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

/** 05 · Cliente · Recordatorios, también por WhatsApp si lo quiere. */
export function Recordatorios() {
  const { cliente, recordatorios, toggleRecordatorio, setWhatsapp, proximos, mascota, profesional } = useStore();
  const t = proximos[0];
  const ejemplo = t
    ? `Hola ${cliente!.nombre.split(' ')[0]}, te recordamos el turno de ${mascota(t.mascotaId)?.nombre} ${t.fecha === today() ? 'hoy' : `el ${diaSemanaLargo(t.fecha).toLowerCase()}`} a las ${t.hora} con ${profesional(t)}. Si no pueden venir, avisanos por acá.`
    : `Hola ${cliente!.nombre.split(' ')[0]}, te recordamos que se acerca una vacuna. Podés pedir turno desde la app.`;
  return (
    <Screen nav="inicio" label="Recordatorios">
      <Back to="/inicio">Inicio</Back>
      <h1 className="display-l">Recordatorios</h1>
      <p className="suave">Te avisamos antes de cada vacuna, desparasitación o turno. Podés apagar los que no quieras.</p>
      <section className="card card--blanco wa">
        <div className="row-between">
          <div className="list__text">
            <p className="texto-fuerte">También por WhatsApp</p>
            <p className="texto-chico suave">Al {cliente!.telefono}. Si cambiaste de número, avisanos en la veterinaria.</p>
          </div>
          <Toggle checked={cliente!.whatsapp} onChange={() => setWhatsapp(!cliente!.whatsapp)} label="Recordatorios por WhatsApp" />
        </div>
        {cliente!.whatsapp && (
          <div className="wa__burbuja">
            <p className="mono-etiqueta suave">Así te llega</p>
            <p className="texto-chico">{ejemplo}</p>
            <p className="texto-chico suave">Veterinaria Patitas amigas</p>
          </div>
        )}
      </section>
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

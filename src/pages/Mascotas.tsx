import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Back, Button, Chip, Drawing, Field, Notice, Tag, TextArea } from '../components/ui';
import { Screen, Sheet } from '../components/Layout';
import { PesoChart } from '../components/PesoChart';
import type { Especie, PlanTomas } from '../data/types';
import { progreso, tomasDelDia } from '../lib/tomas';
import { fechaCorta } from '../lib/dates';
import { edad, vacunaVencida } from '../lib/format';
import { PARTES, estado } from '../lib/historia';
import { ahora, useStore } from '../lib/store';
import { Empty } from './Turnos';
import './pages.css';

/** 10 · Mis mascotas y 11 · sin mascotas. */
export function Mascotas() {
  const { mascotas } = useStore();
  const [params] = useSearchParams();
  const eliminada = params.get('eliminada');

  if (!mascotas.length) {
    return (
      <Screen nav="mascotas" label="Mis mascotas" className="empty">
        <h1 className="display-l">Mis mascotas</h1>
        {eliminada && <Notice tipo="exito" titulo={`Eliminaste a ${eliminada}`} />}
        <Empty titulo="Todavía no hay mascotas" texto="Cargá a tu mascota para ver su ficha, sus vacunas y sus turnos." cta="Agregar mascota" to="/mascotas/nueva" />
      </Screen>
    );
  }

  return (
    <Screen nav="mascotas" label="Mis mascotas">
      <p className="mono-etiqueta">{mascotas.length === 1 ? '1 mascota' : `${mascotas.length} mascotas`}</p>
      <h1 className="display-l">Mis mascotas</h1>
      {eliminada && <Notice tipo="exito" titulo={`Eliminaste a ${eliminada}`} />}
      <ul className="stack-16">
        {mascotas.map((m) => (
          <li key={m.id}>
            <Link to={`/mascotas/${m.id}`} className="pet-row">
              <span className="pet-row__pic">
                <Drawing especie={m.especie} height={78} />
              </span>
              <span className="pet-row__text">
                <span className="display-m">{m.nombre}</span>
                <span className="texto-chico suave">
                  {m.raza} · {edad(m.edad)}
                </span>
                <span className="mono-etiqueta">Ver ficha</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Button to="/mascotas/nueva" variant="secundario" full>
        Agregar mascota
      </Button>
    </Screen>
  );
}

/** 12 · Ficha de mascota y 14 · Eliminar mascota (hoja). */
export function Ficha() {
  const { id } = useParams();
  const { mascota, deleteMascota } = useStore();
  const navigate = useNavigate();
  const [confirmar, setConfirmar] = useState(false);
  const m = mascota(Number(id));

  if (!m) {
    return (
      <Screen nav="mascotas" label="Mascota">
        <Back to="/mascotas">Mis mascotas</Back>
        <h1 className="display-l">No encontramos esa mascota</h1>
      </Screen>
    );
  }

  const eliminar = () => {
    deleteMascota(m.id);
    navigate(`/mascotas?eliminada=${encodeURIComponent(m.nombre)}`, { replace: true });
  };

  return (
    <Screen nav="mascotas" label={`Ficha de ${m.nombre}`}>
      <Back to="/mascotas">Mis mascotas</Back>
      <div className="card card--blanco pet-hero">
        <Drawing especie={m.especie} height={228} />
      </div>
      <h1 className="display-l">{m.nombre}</h1>
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

      {m.pesos.length > 1 && (
        <section className="stack-10">
          <h2 className="display-s">Peso</h2>
          <div className="card card--blanco">
            <PesoChart pesos={m.pesos} />
          </div>
        </section>
      )}

      <Section titulo="Vacunas" vacio="Todavía no hay vacunas registradas.">
        {m.vacunas.map((v) => (
          <li key={v.nombre} className="list__row">
            <div className="list__text">
              <p className="texto-fuerte">{v.nombre}</p>
              <p className="texto-chico suave">Aplicada el {fechaCorta(v.aplicada)}</p>
            </div>
            {vacunaVencida(v) ? <Tag tone="error">Vencida</Tag> : <Tag>Próxima {fechaCorta(v.proxima)}</Tag>}
          </li>
        ))}
      </Section>

      {/* Historia clínica por partes: alergias siempre; el resto, si hay algo cargado. */}
      {PARTES.filter((p) => p.tipo === 'alergia' || m.registros.some((r) => r.tipo === p.tipo)).map((p) => (
        <Section key={p.tipo} titulo={p.titulo} vacio={p.vacio}>
          {m.registros
            .filter((r) => r.tipo === p.tipo)
            .map((r) => {
              const e = estado(r);
              return (
                <li key={r.id} className="list__row">
                  <div className="list__text">
                    <p className="texto-fuerte">{r.titulo}</p>
                    {r.detalle && <p className="texto-chico suave">{r.detalle}</p>}
                    {r.plan && r.vigente && <Tratamiento mascotaId={m.id} registroId={r.id} plan={r.plan} />}
                  </div>
                  {e && <Tag tone={e.tone}>{e.texto}</Tag>}
                </li>
              );
            })}
        </Section>
      ))}

      <Section titulo="Historial" vacio="Todavía no hay visitas registradas.">
        {m.historial.map((h) => (
          <li key={h.fecha + h.titulo} className="list__row">
            <div className="list__text">
              <p className="texto-fuerte">{h.titulo}</p>
              <p className="texto-chico suave">
                {fechaCorta(h.fecha)}
                {h.detalle && ` · ${h.detalle}`}
              </p>
            </div>
          </li>
        ))}
      </Section>

      <div className="row-2">
        <Button to={`/mascotas/${m.id}/editar`} variant="secundario">
          Editar
        </Button>
        <Button variant="peligro-borde" onClick={() => setConfirmar(true)}>
          Eliminar
        </Button>
      </div>

      {confirmar && (
        <Sheet title={`Eliminar a ${m.nombre}`} onClose={() => setConfirmar(false)}>
          <Drawing especie={m.especie} height={130} />
          <h2 className="display-m">¿Eliminar a {m.nombre}?</h2>
          <p className="suave">Se borran sus datos, su historial médico y sus turnos. No se puede deshacer.</p>
          <Button variant="peligro" full onClick={eliminar}>
            Sí, eliminar
          </Button>
          <Button variant="secundario" full onClick={() => setConfirmar(false)}>
            Cancelar
          </Button>
        </Sheet>
      )}
    </Screen>
  );
}

/** Medicación en casa: en qué día va, cuántas tomas se dieron y las de hoy para marcar. */
function Tratamiento({ mascotaId, registroId, plan }: { mascotaId: number; registroId: number; plan: PlanTomas }) {
  const { hoy, marcarToma } = useStore();
  const p = progreso(plan, ahora());
  const deHoy = tomasDelDia(plan, hoy);
  return (
    <div className="tratamiento">
      <p className="mono-etiqueta">
        {p.terminado ? 'Tratamiento terminado' : `Día ${p.dia} de ${plan.dias}`} · {p.dadas} de {p.tocaban} tomas dadas
      </p>
      <div className="tratamiento__barra" aria-hidden="true">
        <span style={{ width: `${(p.dadas / p.total) * 100}%` }} />
      </div>
      {deHoy.length > 0 && (
        <div className="chips" role="group" aria-label="Tomas de hoy">
          {deHoy.map((c) => {
            const dada = plan.dadas.includes(c);
            return (
              <button key={c} type="button" className="chip mono-etiqueta" aria-pressed={dada} onClick={() => marcarToma(mascotaId, registroId, c)} aria-label={`Toma de las ${c.slice(11)}, ${dada ? 'dada' : 'sin dar'}`}>
                {c.slice(11)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Section({ titulo, vacio, children }: { titulo: string; vacio: string; children: ReactNode[] }) {
  return (
    <section className="stack-10">
      <h2 className="display-s">{titulo}</h2>
      {children.length ? <ul className="card card--blanco list">{children}</ul> : <p className="card card--blanco texto-chico suave">{vacio}</p>}
    </section>
  );
}

/** 13 · Agregar mascota (y editar, con los datos cargados). */
export function MascotaForm() {
  const { id } = useParams();
  const { mascota, addMascota, editMascota } = useStore();
  const navigate = useNavigate();
  const actual = id ? mascota(Number(id)) : undefined;

  const [nombre, setNombre] = useState(actual?.nombre ?? '');
  const [especie, setEspecie] = useState<Especie>(actual?.especie ?? 'perro');
  const [edadTxt, setEdad] = useState(actual ? String(actual.edad) : '');
  const [raza, setRaza] = useState(actual?.raza ?? '');
  const [historial, setHistorial] = useState('');
  const [enviado, setEnviado] = useState(false);

  // Mismas validaciones que MascotaManager::alta(): nombre y raza obligatorios, edad numérica.
  const errores = {
    nombre: !nombre.trim() ? 'Escribí el nombre.' : undefined,
    edad: !/^\d{1,2}$/.test(edadTxt) ? 'Solo números, en años.' : undefined,
    raza: !raza.trim() ? 'Escribí la raza (o "mestizo").' : undefined,
  };
  const valido = !errores.nombre && !errores.edad && !errores.raza;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    if (!valido) return;
    const data = { nombre: nombre.trim(), especie, edad: Number(edadTxt), raza: raza.trim(), historialMedico: historial };
    if (actual) {
      editMascota(actual.id, data);
      navigate(`/mascotas/${actual.id}`, { replace: true });
    } else {
      navigate(`/mascotas/${addMascota(data)}`, { replace: true });
    }
  };

  return (
    <Screen nav="mascotas" label={actual ? `Editar a ${actual.nombre}` : 'Agregar mascota'}>
      <form className="form-screen form-screen--20" onSubmit={submit} noValidate>
        <Back to={actual ? `/mascotas/${actual.id}` : '/mascotas'}>{actual ? actual.nombre : 'Mis mascotas'}</Back>
        <h1 className="display-l">{actual ? `Editar a ${actual.nombre}` : 'Agregar mascota'}</h1>
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
        <div className="row-2">
          <Field label="Edad (años)" inputMode="numeric" placeholder="Ej.: 4" value={edadTxt} onChange={(e) => setEdad(e.target.value.replace(/\D/g, ''))} error={enviado ? errores.edad : undefined} />
          <Field label="Raza" placeholder="Ej.: Mestiza" value={raza} onChange={(e) => setRaza(e.target.value)} error={enviado ? errores.raza : undefined} />
        </div>
        <TextArea
          label={actual ? 'Agregar al historial médico' : 'Historial médico'}
          placeholder="Vacunas, enfermedades, alergias, medicación…"
          value={historial}
          onChange={(e) => setHistorial(e.target.value)}
        />
        <div className="grow" />
        <Button type="submit" full>
          {actual ? 'Guardar cambios' : 'Guardar mascota'}
        </Button>
      </form>
    </Screen>
  );
}

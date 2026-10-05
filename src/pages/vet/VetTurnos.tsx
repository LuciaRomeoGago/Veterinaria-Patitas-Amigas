import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Chip, Notice, Tag } from '../../components/ui';
import { Panel, PanelActions, RowActions, Table, VetHead, VetScreen, useToast } from '../../components/vet';
import type { Motivo } from '../../data/types';
import { diaSemanaCorto, fromIso, nextWorkdays } from '../../lib/dates';
import { useStore } from '../../lib/store';

const HORARIOS = ['09:30', '10:30', '11:00', '16:00', '17:30'];
const MOTIVOS: Motivo[] = ['Control', 'Vacuna', 'Consulta'];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaTitulo = (iso: string) => {
  const d = fromIso(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

/** Los próximos días de atención: hoy (si es hábil) y los siguientes días hábiles. */
function diasDeAgenda(hoy: string) {
  const wd = fromIso(hoy).getDay();
  return wd === 0 || wd === 6 ? nextWorkdays(5, hoy) : [hoy, ...nextWorkdays(4, hoy)];
}

/** 21 · Veterinario · Turnos del día */
export function VetTurnos() {
  const { hoy, turnosDel, mascota, duenio, vencidas, avisar, cancelarTurno, marcarAtendido } = useStore();
  const dias = diasDeAgenda(hoy);
  const [dia, setDia] = useState(() => dias.find((d) => turnosDel(d).length) ?? dias[0]);
  const [nuevo, setNuevo] = useState(false);
  const [verVencidas, setVerVencidas] = useState(false);
  const [toast, showToast] = useToast();
  const turnos = turnosDel(dia);

  const nombresVencidas = vencidas.map((v) => `${v.mascota.nombre} (${v.vacuna.nombre.toLowerCase()})`);
  const listaVencidas = nombresVencidas.length > 1 ? nombresVencidas.slice(0, -1).join(', ') + ' y ' + nombresVencidas[nombresVencidas.length - 1] : nombresVencidas[0];

  return (
    <VetScreen label="Turnos">
      <VetHead
        kicker={turnos.length === 1 ? '1 turno' : `${turnos.length} turnos`}
        title={fechaTitulo(dia)}
        action={
          <button type="button" className="btn btn--primario" onClick={() => setNuevo(true)}>
            Nuevo turno
          </button>
        }
      />
      <div className="chips" role="group" aria-label="Día">
        {dias.map((d) => (
          <Chip key={d} pressed={d === dia} onClick={() => setDia(d)}>
            {d === hoy ? 'Hoy' : diaSemanaCorto(d).replace(/\/\d+$/, '')}
          </Chip>
        ))}
      </div>

      {vencidas.length > 0 && (
        <Notice
          tipo="alerta"
          titulo={vencidas.length === 1 ? '1 mascota con una vacuna vencida' : `${vencidas.length} mascotas con vacunas vencidas`}
          acciones={[
            {
              label: 'Avisar a los dueños',
              onClick: () => {
                avisar(vencidas.map((v) => ({ clienteId: v.mascota.clienteId, titulo: `Vacuna vencida: ${v.vacuna.nombre.toLowerCase()} de ${v.mascota.nombre}`, fecha: hoy })));
                showToast('Avisos enviados', 'Les aparece en Recordatorios de la app.');
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

      <Table
        caption={`Turnos del ${fechaTitulo(dia)}`}
        empty="No hay turnos este día."
        columns={[{ label: 'Hora', width: '8%' }, { label: 'Mascota', width: '12%' }, { label: 'Cliente', width: '18%' }, { label: 'Motivo', width: '13%' }, { label: 'Estado', width: '14%' }, { label: '', align: 'right' }]}
        rows={turnos.map((t) => {
          const m = mascota(t.mascotaId)!;
          return {
            key: t.id,
            cells: [
              <span className="cell-mono">{t.hora}</span>,
              <span className="cell-strong">{m.nombre}</span>,
              duenio(m.id)?.nombre,
              t.motivo,
              t.atendido ? <Tag tone="ok">Atendido</Tag> : <Tag>Pendiente</Tag>,
              <RowActions
                actions={[
                  { label: 'Ver ficha', to: `/vet/mascotas/${m.id}`, onClick: () => {} },
                  ...(t.atendido
                    ? []
                    : [
                        { label: 'Atendido', onClick: () => marcarAtendido(t.id) },
                        { label: 'Cancelar', danger: true, onClick: () => cancelarTurno(t.id) },
                      ]),
                ]}
              />,
            ],
          };
        })}
      />

      {nuevo && (
        <NuevoTurno
          dias={dias}
          diaInicial={dia}
          onClose={() => setNuevo(false)}
          onDone={(d, texto) => {
            setNuevo(false);
            setDia(d);
            showToast('Turno agendado', texto);
          }}
        />
      )}
      {toast}
    </VetScreen>
  );
}

function NuevoTurno({ dias, diaInicial, onClose, onDone }: { dias: string[]; diaInicial: string; onClose: () => void; onDone: (dia: string, texto: string) => void }) {
  const { state, vet, duenio, ocupados, pedirTurno } = useStore();
  const [mascotaId, setMascotaId] = useState(state.mascotas[0]?.id);
  const [motivo, setMotivo] = useState<Motivo>('Control');
  const [fecha, setFecha] = useState(diaInicial);
  const [hora, setHora] = useState<string | null>(null);
  const tomados = ocupados(fecha);
  const horaValida = hora && !tomados.includes(hora) ? hora : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!mascotaId || !horaValida) return;
    pedirTurno({ mascotaId, motivo, fecha, hora: horaValida, profesional: vet!.nombre });
    const m = state.mascotas.find((x) => x.id === mascotaId)!;
    onDone(fecha, `${m.nombre}, ${diaSemanaCorto(fecha)} a las ${horaValida}.`);
  };

  return (
    <Panel title="Nuevo turno" kicker="Turnos" onClose={onClose}>
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
          <legend className="mono-etiqueta">Día</legend>
          <div className="chips">
            {dias.map((d) => (
              <Chip key={d} pressed={d === fecha} onClick={() => setFecha(d)}>
                {diaSemanaCorto(d)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="group">
          <legend className="mono-etiqueta">Horario</legend>
          <div className="chips">
            {HORARIOS.map((h) => (
              <Chip key={h} pressed={h === horaValida} disabled={tomados.includes(h)} onClick={() => setHora(h)}>
                {h}
              </Chip>
            ))}
          </div>
        </fieldset>
        <PanelActions submit="Agendar turno" onCancel={onClose} disabled={!horaValida || !mascotaId} />
      </form>
    </Panel>
  );
}

import { useState, type FormEvent } from 'react';
import { Chip, Field, Notice, TextArea, Toggle } from '../../components/ui';
import { Panel, PanelActions } from '../../components/vet';
import type { Mascota, Medio, Plantilla, Turno } from '../../data/types';
import { PRECIO } from '../../lib/agenda';
import { diaSemanaCorto, fechaCorta } from '../../lib/dates';
import { DROGAS, calcular, mgTexto, textoPresentacion } from '../../lib/dosis';
import { precio } from '../../lib/format';
import { conflictos } from '../../lib/historia';
import { horaActual, useStore } from '../../lib/store';
import { AlertaReceta } from './AlertaReceta';

export const MEDIOS: Medio[] = ['Efectivo', 'Débito', 'Crédito', 'Transferencia', 'Mercado Pago'];

const kgTexto = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','));
const aNumero = (t: string) => Number(t.replace(',', '.'));

/** La próxima hora en punto, para la primera toma. */
const proximaHora = () => `${String((Number(horaActual().slice(0, 2)) + 1) % 24).padStart(2, '0')}:00`;

/**
 * Atender un turno: plantilla para no tipear lo de siempre, calculadora de dosis por peso,
 * plan de tomas que el dueño sigue en la app, y el cobro (descontando la seña) a la caja.
 */
export function Atender({ turno, onClose, onDone }: { turno: Turno; onClose: () => void; onDone: (nombre: string) => void }) {
  const { hoy, mascota, duenio, atender, state, addPlantilla, profesional, precioConsulta } = useStore();
  const m = mascota(turno.mascotaId)!;
  const d = duenio(m.id);
  const ultimo = m.pesos[m.pesos.length - 1];
  const [plantilla, setPlantilla] = useState<number | null>(null);
  const [titulo, setTitulo] = useState(turno.motivo === 'Control' ? 'Control' : turno.motivo);
  const [peso, setPeso] = useState(kgTexto(m.peso));
  const [detalle, setDetalle] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [medicamento, setMedicamento] = useState('');
  const [dosis, setDosis] = useState('');
  const [cada, setCada] = useState(0);
  const [dias, setDias] = useState('7');
  const [hora, setHora] = useState(proximaHora);
  const [calc, setCalc] = useState(false);
  const [cobrar, setCobrar] = useState(true);
  const [monto, setMonto] = useState(String(precioConsulta(turno)));
  const [medio, setMedio] = useState<Medio>('Efectivo');
  const [confirmado, setConfirmado] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [guardada, setGuardada] = useState(false);
  const alergias = m.registros.filter((r) => r.tipo === 'alergia');
  const choques = conflictos(m.registros, medicamento);
  const frenado = choques.length > 0 && !confirmado;

  const usar = (p: Plantilla) => {
    setPlantilla(p.id);
    setTitulo(p.titulo);
    setDetalle(p.detalle);
    setDiagnostico(p.diagnostico ?? '');
    setMedicamento(p.medicamento ?? '');
    setDosis(p.dosis ?? '');
  };

  const errores = {
    titulo: !titulo.trim() ? 'Escribí el motivo.' : undefined,
    peso: peso && !/^\d+([.,]\d+)?$/.test(peso) ? 'Usá números, por ejemplo 12,5.' : undefined,
    dias: cada && !/^\d{1,2}$/.test(dias) ? 'Cantidad de días, en números.' : undefined,
    monto: cobrar && !/^\d+$/.test(monto) ? 'Monto en pesos, sin centavos.' : undefined,
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    if (Object.values(errores).some(Boolean) || frenado) return;
    atender({
      turnoId: turno.id,
      titulo: titulo.trim(),
      detalle: detalle.trim(),
      peso: peso ? aNumero(peso) : undefined,
      diagnostico: diagnostico.trim() || undefined,
      medicamento: medicamento.trim()
        ? { titulo: medicamento.trim(), detalle: dosis.trim() || undefined, plan: cada ? { cadaHoras: cada, dias: Number(dias), inicio: hoy, hora } : undefined }
        : undefined,
      cobro: cobrar ? { monto: Number(monto), medio } : undefined,
    });
    onDone(m.nombre);
  };

  return (
    <Panel title={`Atender a ${m.nombre}`} kicker={`${diaSemanaCorto(turno.fecha)} · ${turno.hora} · ${d?.nombre}`} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {alergias.length > 0 && (
          <Notice tipo="error" titulo={alergias.length === 1 ? 'Alergia' : 'Alergias'}>
            {alergias.map((r) => r.titulo).join(', ')}
          </Notice>
        )}

        <fieldset className="group">
          <legend className="mono-etiqueta">Plantilla</legend>
          <div className="chips">
            {state.plantillas.map((p) => (
              <Chip key={p.id} pressed={plantilla === p.id} onClick={() => usar(p)}>
                {p.nombre}
              </Chip>
            ))}
          </div>
        </fieldset>

        <div className="row-2">
          <Field label="Motivo" value={titulo} onChange={(e) => setTitulo(e.target.value)} error={enviado ? errores.titulo : undefined} />
          <Field label="Peso (kg)" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} error={enviado ? errores.peso : undefined} />
        </div>
        {ultimo && (
          <p className="texto-chico suave">
            Último pesaje: {kgTexto(ultimo.kg)} kg el {fechaCorta(ultimo.fecha)}.
          </p>
        )}
        <TextArea label="Qué se vio" placeholder="Ej.: Buen estado general, piel sin lesiones." value={detalle} onChange={(e) => setDetalle(e.target.value)} />
        <Field label="Diagnóstico (opcional)" placeholder="Ej.: Otitis externa" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />

        <fieldset className="group stack-12">
          <legend className="mono-etiqueta">Indicación (opcional)</legend>
          <Field label="Medicamento" placeholder="Ej.: Cefalexina 500 mg" value={medicamento} onChange={(e) => setMedicamento(e.target.value)} />
          <AlertaReceta nombre={m.nombre} conflictos={choques} confirmado={confirmado} onConfirmar={setConfirmado} />
          <button type="button" className="link-button mono-etiqueta" aria-expanded={calc} onClick={() => setCalc((x) => !x)}>
            {calc ? 'Cerrar la calculadora' : 'Calcular la dosis por peso'}
          </button>
          {calc && (
            <Calculadora
              m={m}
              peso={peso ? aNumero(peso) : m.peso}
              onUsar={(r) => {
                setMedicamento(r.medicamento);
                setDosis(r.dosis);
                setCada(r.cadaHoras);
                setDias(String(r.dias));
                setCalc(false);
              }}
            />
          )}
          <Field label="Dosis y frecuencia" placeholder="Ej.: 1 comprimido cada 12 horas, 7 días" value={dosis} onChange={(e) => setDosis(e.target.value)} />
          <div className="stack-8">
            <p className="mono-etiqueta">Para que lo siga en la app</p>
            <div className="chips" role="group" aria-label="Cada cuánto">
              {[0, 8, 12, 24].map((h) => (
                <Chip key={h} pressed={cada === h} onClick={() => setCada(h)}>
                  {h === 0 ? 'Sin plan' : h === 24 ? '1 vez por día' : `Cada ${h} h`}
                </Chip>
              ))}
            </div>
          </div>
          {cada > 0 && (
            <div className="row-2">
              <Field label="Durante (días)" inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value.replace(/\D/g, ''))} error={enviado ? errores.dias : undefined} />
              <Field label="Primera toma" type="time" step={1800} value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          )}
          {cada > 0 && <p className="texto-chico suave">{d?.nombre.split(' ')[0]} ve cada toma en la app y la marca cuando se la da.</p>}
        </fieldset>

        <fieldset className="group stack-12">
          <legend className="mono-etiqueta">Cobro</legend>
          <div className="row-between">
            <span className="texto-fuerte">Cobrar ahora</span>
            <Toggle checked={cobrar} onChange={() => setCobrar((x) => !x)} label="Cobrar ahora" />
          </div>
          {cobrar && (
            <>
              <Field label="Monto ($)" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value.replace(/\D/g, ''))} error={enviado ? errores.monto : undefined} />
              <p className="texto-chico suave">
                {turno.motivo} {precio(PRECIO[turno.motivo])}
                {turno.sena ? ` − seña pagada ${precio(turno.sena)}` : ''}. Con {profesional(turno)}.
              </p>
              <div className="chips" role="group" aria-label="Medio de pago">
                {MEDIOS.map((x) => (
                  <Chip key={x} pressed={medio === x} onClick={() => setMedio(x)}>
                    {x}
                  </Chip>
                ))}
              </div>
            </>
          )}
        </fieldset>

        <p className="texto-chico suave">
          El turno queda como atendido. El diagnóstico va a Enfermedades, la indicación a Medicación{cobrar ? ' y el cobro a la caja del día' : ''}.
        </p>
        {titulo.trim() && detalle.trim() && !guardada && (
          <button
            type="button"
            className="link-button mono-etiqueta"
            onClick={() => {
              addPlantilla({ nombre: titulo.trim(), titulo: titulo.trim(), detalle: detalle.trim(), diagnostico: diagnostico.trim() || undefined, medicamento: medicamento.trim() || undefined, dosis: dosis.trim() || undefined });
              setGuardada(true);
            }}
          >
            Guardar como plantilla
          </button>
        )}
        {guardada && <p className="texto-chico suave">Guardada: aparece entre las plantillas la próxima vez.</p>}
        <PanelActions submit="Guardar consulta" onCancel={onClose} disabled={frenado} />
      </form>
    </Panel>
  );
}

/** Dosis según el peso: elegís la droga y la presentación, y te dice cuánto dar. */
export function Calculadora({ m, peso, onUsar }: { m: Mascota; peso?: number; onUsar: (r: NonNullable<ReturnType<typeof calcular>>) => void }) {
  const opciones = DROGAS.filter((d) => d.mgKg[m.especie]);
  const [droga, setDroga] = useState(opciones[0]?.nombre ?? '');
  const [pres, setPres] = useState(0);
  const d = opciones.find((x) => x.nombre === droga);
  const p = d?.presentaciones[pres] ?? d?.presentaciones[0];
  const r = d && p && peso ? calcular(d, p, m.especie, peso) : null;
  const choques = conflictos(m.registros, droga);

  return (
    <div className="calc">
      <div className="field">
        <label htmlFor="calc-droga" className="mono-etiqueta">
          Droga
        </label>
        <select
          id="calc-droga"
          className="field__box"
          value={droga}
          onChange={(e) => {
            setDroga(e.target.value);
            setPres(0);
          }}
        >
          {opciones.map((x) => (
            <option key={x.nombre}>{x.nombre}</option>
          ))}
        </select>
      </div>
      {d && (
        <div className="chips" role="group" aria-label="Presentación">
          {d.presentaciones.map((x, i) => (
            <Chip key={i} pressed={i === pres} onClick={() => setPres(i)}>
              {textoPresentacion(x)}
            </Chip>
          ))}
        </div>
      )}
      {!peso ? (
        <p className="texto-chico">Cargá el peso de {m.nombre} para calcular.</p>
      ) : r && d ? (
        <div className="calc__resultado" aria-live="polite">
          <p className="mono-etiqueta suave">
            {String(peso).replace('.', ',')} kg × {String(d.mgKg[m.especie]).replace('.', ',')} mg/kg = {mgTexto(r.mg)} por toma
          </p>
          <p className="display-s">{r.cantidad}</p>
          <p className="texto-chico">{r.dosis}</p>
        </div>
      ) : null}
      {choques.length > 0 && <p className="texto-chico calc__ojo">Ojo: {m.nombre} tiene anotado {choques.map((c) => (c.tipo === 'alergia' ? `alergia a ${c.titulo}` : `que le hizo mal ${c.titulo}`)).join(' y ')}.</p>}
      <p className="texto-chico suave">Valores de referencia de la demo. Revisá siempre la dosis antes de indicarla.</p>
      {r && (
        <button type="button" className="btn btn--secundario btn--small" onClick={() => onUsar(r)}>
          Usar en la indicación
        </button>
      )}
    </div>
  );
}

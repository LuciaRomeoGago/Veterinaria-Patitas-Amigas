import { useState, type FormEvent } from 'react';
import { Chip, Field, Notice, Tag } from '../../components/ui';
import { Modal, Panel, PanelActions, RowActions, Table, VetHead, VetScreen, useToast } from '../../components/vet';
import type { Compra, Medio, Movimiento } from '../../data/types';
import { fromIso } from '../../lib/dates';
import { plural, precio } from '../../lib/format';
import { useStore } from '../../lib/store';
import { MEDIOS } from './Atender';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaTitulo = (iso: string) => `${DIAS[fromIso(iso).getDay()]} ${fromIso(iso).getDate()} de ${MESES[fromIso(iso).getMonth()]}`;

const TIPOS: Record<Movimiento['tipo'], string> = { consulta: 'Consulta', venta: 'Venta', sena: 'Seña', fondo: 'Fondo', ingreso: 'Ingreso', egreso: 'Gasto' };
const signo = (m: Movimiento) => (m.tipo === 'egreso' ? -1 : 1);

/**
 * Caja del día: cada cobro (consultas, tienda, señas), los gastos y lo que falta cobrar
 * de lo que se retira. Al final del día se cuenta el efectivo y se cierra.
 */
export function VetCaja() {
  const { hoy, state, producto, clientes, cobrarCompra, cerrarCaja } = useStore();
  const [panel, setPanel] = useState<'movimiento' | 'cerrar' | null>(null);
  const [cobrar, setCobrar] = useState<Compra | null>(null);
  const [toast, showToast] = useToast();
  const movs = state.movimientos.filter((m) => m.fecha === hoy).sort((a, b) => a.hora.localeCompare(b.hora));
  const cierre = state.cierres.find((c) => c.fecha === hoy);
  const porCobrar = state.compras.filter((c) => !c.cobrada);

  const cobrado = movs.filter((m) => m.tipo !== 'fondo' && m.tipo !== 'egreso').reduce((n, m) => n + m.monto, 0);
  const gastos = movs.filter((m) => m.tipo === 'egreso').reduce((n, m) => n + m.monto, 0);
  const porMedio = (medios: Medio[]) => movs.filter((m) => medios.includes(m.medio)).reduce((n, m) => n + signo(m) * m.monto, 0);
  const efectivo = porMedio(['Efectivo']);

  return (
    <VetScreen label="Caja del día">
      <VetHead
        kicker={fechaTitulo(hoy)}
        title="Caja del día"
        action={
          <div className="vet-head__actions">
            <button type="button" className="btn btn--secundario" onClick={() => setPanel('movimiento')}>
              Ingreso o gasto
            </button>
            <button type="button" className="btn btn--primario" onClick={() => setPanel('cerrar')}>
              {cierre ? 'Volver a cerrar' : 'Cerrar caja'}
            </button>
          </div>
        }
      />
      {cierre && (
        <Notice tipo={cierre.contado === cierre.esperado ? 'exito' : 'alerta'} titulo={`Caja cerrada a las ${cierre.hora} por ${cierre.por}`}>
          Se contaron {precio(cierre.contado)} en efectivo; tenía que haber {precio(cierre.esperado)}.
          {cierre.contado === cierre.esperado ? ' Coincide.' : ` Diferencia: ${cierre.contado > cierre.esperado ? '+' : '−'} ${precio(Math.abs(cierre.contado - cierre.esperado)).slice(2)}.`}
        </Notice>
      )}

      <ul className="kpis">
        <li className="kpi">
          <p className="mono-etiqueta suave">Cobrado hoy</p>
          <p className="display-l">{precio(cobrado)}</p>
          <p className="texto-chico suave">{plural(movs.filter((m) => m.tipo !== 'fondo' && m.tipo !== 'egreso').length, 'cobro', 'cobros')}</p>
        </li>
        <li className="kpi">
          <p className="mono-etiqueta suave">Efectivo en caja</p>
          <p className="display-l">{precio(efectivo)}</p>
          <p className="texto-chico suave">con el fondo y menos los gastos</p>
        </li>
        <li className="kpi">
          <p className="mono-etiqueta suave">Mercado Pago</p>
          <p className="display-l">{precio(porMedio(['Mercado Pago']))}</p>
          <p className="texto-chico suave">tienda, señas y cobros</p>
        </li>
        <li className="kpi">
          <p className="mono-etiqueta suave">Tarjetas y transferencias</p>
          <p className="display-l">{precio(porMedio(['Débito', 'Crédito', 'Transferencia']))}</p>
          <p className="texto-chico suave">gastos del día: {precio(gastos)}</p>
        </li>
      </ul>

      {porCobrar.length > 0 && (
        <section className="stack-12" aria-labelledby="por-cobrar">
          <h2 id="por-cobrar" className="display-s">
            Para cobrar al retirar
          </h2>
          <Table
            caption="Compras de la tienda para cobrar al retirar"
            columns={[{ label: 'Cliente', width: '22%' }, { label: 'Producto', width: '34%' }, { label: 'Cant.', width: '8%' }, { label: 'Total', width: '14%' }, { label: '', align: 'right' }]}
            rows={porCobrar.map((c) => {
              const p = producto(c.productoId);
              return {
                key: c.id,
                cells: [clientes.find((x) => x.id === c.clienteId)?.nombre, p?.nombre, <span className="cell-mono">{c.cantidad}</span>, <span className="cell-mono">{precio((p?.precio ?? 0) * c.cantidad)}</span>, <RowActions actions={[{ label: 'Cobrar', onClick: () => setCobrar(c) }]} />],
              };
            })}
          />
        </section>
      )}

      <section className="stack-12" aria-labelledby="movimientos">
        <h2 id="movimientos" className="display-s">
          Movimientos
        </h2>
        <Table
          caption="Movimientos de caja de hoy"
          empty="Todavía no hay movimientos hoy."
          columns={[{ label: 'Hora', width: '8%' }, { label: 'Concepto', width: '36%' }, { label: 'Tipo', width: '11%' }, { label: 'Medio', width: '14%' }, { label: 'Por', width: '15%' }, { label: 'Monto', align: 'right' }]}
          rows={movs.map((m) => ({
            key: m.id,
            cells: [
              <span className="cell-mono">{m.hora}</span>,
              m.concepto,
              m.tipo === 'egreso' ? <Tag tone="error">Gasto</Tag> : TIPOS[m.tipo],
              m.medio,
              <span className="texto-chico">{m.por}</span>,
              <span className={`cell-mono${m.tipo === 'egreso' ? ' is-egreso' : ''}`}>
                {m.tipo === 'egreso' ? '− ' : ''}
                {precio(m.monto)}
              </span>,
            ],
          }))}
        />
      </section>

      {panel === 'movimiento' && (
        <MovimientoPanel
          onClose={() => setPanel(null)}
          onDone={(t) => {
            setPanel(null);
            showToast('Movimiento registrado', t);
          }}
        />
      )}
      {panel === 'cerrar' && (
        <CerrarPanel
          esperado={efectivo}
          onClose={() => setPanel(null)}
          onCerrar={(contado) => {
            cerrarCaja(contado, efectivo);
            setPanel(null);
            showToast('Caja cerrada', contado === efectivo ? 'El efectivo coincide.' : `Diferencia de ${precio(Math.abs(contado - efectivo))}.`);
          }}
        />
      )}
      {cobrar && (
        <CobrarModal
          compra={cobrar}
          onClose={() => setCobrar(null)}
          onCobrar={(medio) => {
            cobrarCompra(cobrar.id, medio);
            showToast('Cobrado', `${producto(cobrar.productoId)?.nombre} × ${cobrar.cantidad}, con ${medio.toLowerCase()}.`);
            setCobrar(null);
          }}
        />
      )}
      {toast}
    </VetScreen>
  );
}

function CobrarModal({ compra, onClose, onCobrar }: { compra: Compra; onClose: () => void; onCobrar: (m: Medio) => void }) {
  const { producto } = useStore();
  const [medio, setMedio] = useState<Medio>('Efectivo');
  const p = producto(compra.productoId);
  return (
    <Modal title={`Cobrar ${precio((p?.precio ?? 0) * compra.cantidad)}`} onClose={onClose}>
      <p className="suave">
        {p?.nombre} × {compra.cantidad}. Queda como retirado y pagado.
      </p>
      <div className="chips" role="group" aria-label="Medio de pago">
        {MEDIOS.map((m) => (
          <Chip key={m} pressed={medio === m} onClick={() => setMedio(m)}>
            {m}
          </Chip>
        ))}
      </div>
      <div className="vet-modal__actions">
        <button type="button" className="btn btn--primario" onClick={() => onCobrar(medio)}>
          Cobrar
        </button>
        <button type="button" className="btn btn--secundario" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

function MovimientoPanel({ onClose, onDone }: { onClose: () => void; onDone: (texto: string) => void }) {
  const { registrarMovimiento } = useStore();
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('egreso');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [medio, setMedio] = useState<Medio>('Efectivo');
  const [enviado, setEnviado] = useState(false);
  const errores = {
    concepto: !concepto.trim() ? 'Contá qué fue.' : undefined,
    monto: !/^\d+$/.test(monto) || Number(monto) <= 0 ? 'Monto en pesos, sin centavos.' : undefined,
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    if (errores.concepto || errores.monto) return;
    registrarMovimiento(tipo, concepto.trim(), Number(monto), medio);
    onDone(`${tipo === 'egreso' ? 'Gasto' : 'Ingreso'}: ${concepto.trim()}, ${precio(Number(monto))}.`);
  };
  return (
    <Panel title="Ingreso o gasto" kicker="Caja del día" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="chips" role="group" aria-label="Tipo">
          <Chip pressed={tipo === 'egreso'} onClick={() => setTipo('egreso')}>
            Gasto
          </Chip>
          <Chip pressed={tipo === 'ingreso'} onClick={() => setTipo('ingreso')}>
            Ingreso
          </Chip>
        </div>
        <Field label="Concepto" placeholder={tipo === 'egreso' ? 'Ej.: Pago al proveedor de vacunas' : 'Ej.: Baño y corte'} value={concepto} onChange={(e) => setConcepto(e.target.value)} error={enviado ? errores.concepto : undefined} />
        <Field label="Monto ($)" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value.replace(/\D/g, ''))} error={enviado ? errores.monto : undefined} />
        <div className="chips" role="group" aria-label="Medio">
          {MEDIOS.map((m) => (
            <Chip key={m} pressed={medio === m} onClick={() => setMedio(m)}>
              {m}
            </Chip>
          ))}
        </div>
        <PanelActions submit="Registrar" onCancel={onClose} />
      </form>
    </Panel>
  );
}

function CerrarPanel({ esperado, onClose, onCerrar }: { esperado: number; onClose: () => void; onCerrar: (contado: number) => void }) {
  const [contado, setContado] = useState('');
  const n = Number(contado);
  const valido = /^\d+$/.test(contado);
  const dif = n - esperado;
  return (
    <Panel title="Cerrar caja" kicker="Caja del día" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valido) onCerrar(n);
        }}
        noValidate
      >
        <div className="stack-4">
          <p className="mono-etiqueta suave">Tiene que haber en efectivo</p>
          <p className="display-m">{precio(esperado)}</p>
          <p className="texto-chico suave">El fondo de caja, más lo cobrado en efectivo, menos los gastos en efectivo.</p>
        </div>
        <Field label="Efectivo contado ($)" inputMode="numeric" value={contado} onChange={(e) => setContado(e.target.value.replace(/\D/g, ''))} />
        {valido && (
          <p className={`texto-fuerte${dif === 0 ? '' : ' is-alerta'}`} aria-live="polite">
            {dif === 0 ? 'Coincide.' : dif > 0 ? `Sobran ${precio(dif)}.` : `Faltan ${precio(-dif)}.`}
          </p>
        )}
        <PanelActions submit="Cerrar caja" onCancel={onClose} disabled={!valido} />
      </form>
    </Panel>
  );
}

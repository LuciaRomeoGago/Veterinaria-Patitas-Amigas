import { Link } from 'react-router-dom';
import { Notice, Tag } from '../../components/ui';
import { Table, VetHead, VetScreen, useToast } from '../../components/vet';
import { addDays, cuanto, daysBetween, diaMes, fechaCorta, fromIso } from '../../lib/dates';
import { plural, precio, stockBajo } from '../../lib/format';
import { useStore } from '../../lib/store';
import { descargarCsv } from '../../lib/csv';

/** Lunes de la semana de una fecha. */
function lunes(iso: string) {
  const wd = fromIso(iso).getDay();
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}

/**
 * Resumen del mes: los últimos 30 días, para que siempre haya un mes completo para mirar.
 * Turnos atendidos, ventas, vacunas aplicadas y por vencer, y productos con poco stock.
 */
export function VetResumen() {
  const { hoy, state, mascota, duenio, avisar } = useStore();
  const [toast, showToast] = useToast();
  const desde = addDays(hoy, -29);
  const enPeriodo = (iso: string) => iso >= desde && iso <= hoy;

  const turnos = state.turnos.filter((t) => enPeriodo(t.fecha));
  const atendidos = turnos.filter((t) => t.estado === 'atendido');
  const clientesAtendidos = new Set(atendidos.map((t) => mascota(t.mascotaId)?.clienteId)).size;

  const ventas = state.compras.filter((c) => enPeriodo(c.fecha));
  const porProducto = state.productos
    .map((p) => {
      const unidades = ventas.filter((c) => c.productoId === p.id).reduce((n, c) => n + c.cantidad, 0);
      return { p, unidades, total: unidades * p.precio };
    })
    .filter((x) => x.unidades > 0)
    .sort((a, b) => b.total - a.total);
  const totalVentas = porProducto.reduce((n, x) => n + x.total, 0);
  const unidades = porProducto.reduce((n, x) => n + x.unidades, 0);

  const aplicadas = state.mascotas.flatMap((m) => m.vacunas.filter((v) => enPeriodo(v.aplicada)));
  const porVencer = state.mascotas
    .flatMap((m) => m.vacunas.map((v) => ({ m, v, dias: daysBetween(hoy, v.proxima) })))
    .filter((x) => x.dias <= 30)
    .sort((a, b) => a.dias - b.dias);
  const bajos = state.productos.filter(stockBajo);

  // Turnos atendidos por semana (de lunes a viernes) dentro del período.
  const semanas: { inicio: string; n: number }[] = [];
  for (let s = lunes(desde); s <= hoy; s = addDays(s, 7)) {
    semanas.push({ inicio: s, n: atendidos.filter((t) => t.fecha >= s && t.fecha < addDays(s, 7)).length });
  }
  const maxSemana = Math.max(1, ...semanas.map((s) => s.n));
  const caja = state.movimientos.filter((m) => enPeriodo(m.fecha) && m.tipo !== 'fondo');

  // Para la contadora: todo el resumen en una planilla, por secciones.
  const exportar = () =>
    descargarCsv(`resumen-${desde}-al-${hoy}.csv`, [
      ['Veterinaria Patitas amigas · Resumen del mes'],
      ['Del', fechaCorta(desde), 'al', fechaCorta(hoy)],
      [],
      ['Indicador', 'Valor'],
      ['Turnos atendidos', atendidos.length],
      ['Turnos en el período', turnos.length],
      ['Ventas de la tienda ($)', totalVentas],
      ['Unidades vendidas', unidades],
      ['Vacunas aplicadas', aplicadas.length],
      ['Clientes atendidos', clientesAtendidos],
      [],
      ['Turnos atendidos por semana'],
      ['Semana del', 'Turnos'],
      ...semanas.map((s) => [fechaCorta(s.inicio), s.n]),
      [],
      ['Lo más vendido'],
      ['Producto', 'Unidades', 'Total ($)'],
      ...porProducto.map((x) => [x.p.nombre, x.unidades, x.total]),
      [],
      ['Caja (cobros y gastos registrados)'],
      ['Fecha', 'Hora', 'Tipo', 'Concepto', 'Medio', 'Monto ($)'],
      ...caja.map((m) => [fechaCorta(m.fecha), m.hora, { consulta: 'Consulta', venta: 'Venta', sena: 'Seña', fondo: 'Fondo', ingreso: 'Ingreso', egreso: 'Gasto' }[m.tipo], m.concepto, m.medio, m.tipo === 'egreso' ? -m.monto : m.monto]),
      [],
      ['Vacunas por vencer en 30 días'],
      ['Mascota', 'Dueña o dueño', 'Vacuna', 'Vence'],
      ...porVencer.map((x) => [x.m.nombre, duenio(x.m.id)?.nombre, x.v.nombre, fechaCorta(x.v.proxima)]),
    ]);
  const maxVenta = Math.max(1, ...porProducto.map((x) => x.total));

  return (
    <VetScreen label="Resumen del mes" permiso="resumen">
      <VetHead
        kicker={`Del ${fechaCorta(desde)} al ${fechaCorta(hoy)}`}
        title="Resumen del mes"
        action={
          <div className="vet-head__actions no-print">
            <button type="button" className="btn btn--secundario" onClick={() => window.print()}>
              Imprimir o PDF
            </button>
            <button type="button" className="btn btn--primario" onClick={exportar}>
              Descargar Excel
            </button>
          </div>
        }
      />

      <ul className="kpis">
        <li className="kpi">
          <p className="mono-etiqueta suave">Turnos atendidos</p>
          <p className="display-l">{atendidos.length}</p>
          <p className="texto-chico suave">de {plural(turnos.length, 'turno', 'turnos')} en el período</p>
        </li>
        <li className="kpi">
          <p className="mono-etiqueta suave">Ventas de la tienda</p>
          <p className="display-l">{precio(totalVentas)}</p>
          <p className="texto-chico suave">{plural(unidades, 'unidad vendida', 'unidades vendidas')}</p>
        </li>
        <li className="kpi">
          <p className="mono-etiqueta suave">Vacunas aplicadas</p>
          <p className="display-l">{aplicadas.length}</p>
          <p className="texto-chico suave">{porVencer.length ? `${porVencer.length} por vencer o vencidas` : 'Ninguna por vencer'}</p>
        </li>
        <li className="kpi">
          <p className="mono-etiqueta suave">Clientes atendidos</p>
          <p className="display-l">{clientesAtendidos}</p>
          <p className="texto-chico suave">de {plural(state.clientes.length, 'cliente', 'clientes')}</p>
        </li>
      </ul>

      <div className="resumen-grid">
        <section className="resumen-card" aria-labelledby="r-semanas">
          <h2 id="r-semanas" className="display-s">
            Turnos atendidos por semana
          </h2>
          <ol className="barras" aria-label="Turnos atendidos por semana">
            {semanas.map((s) => (
              <li key={s.inicio} className="barras__item">
                <span className="barras__valor mono-dato">{s.n}</span>
                <span className="barras__barra" style={{ height: `${(s.n / maxSemana) * 100}%` }} aria-hidden="true" />
                <span className="barras__label mono-etiqueta">
                  <span className="sr-only">Semana del </span>
                  {diaMes(s.inicio)}
                </span>
              </li>
            ))}
          </ol>
          <p className="texto-chico suave">Cada barra es una semana; debajo, el lunes en que empieza.</p>
        </section>

        <section className="resumen-card" aria-labelledby="r-ventas">
          <h2 id="r-ventas" className="display-s">
            Lo más vendido
          </h2>
          {porProducto.length ? (
            <ol className="ranking">
              {porProducto.map((x) => (
                <li key={x.p.id} className="ranking__row">
                  <div className="row-between">
                    <span className="texto-fuerte">{x.p.nombre}</span>
                    <span className="mono-dato">{precio(x.total)}</span>
                  </div>
                  <span className="ranking__barra" style={{ width: `${(x.total / maxVenta) * 100}%` }} aria-hidden="true" />
                  <span className="texto-chico suave">{plural(x.unidades, 'unidad', 'unidades')}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="texto-chico suave">No hubo ventas en el período.</p>
          )}
        </section>
      </div>

      <section className="stack-12" aria-labelledby="r-vacunas">
        <div className="row-between">
          <h2 id="r-vacunas" className="display-s">
            Vacunas por vencer en 30 días
          </h2>
          {porVencer.length > 0 && (
            <button
              type="button"
              className="btn btn--secundario btn--small"
              onClick={() => {
                avisar(porVencer.map((x) => ({ clienteId: x.m.clienteId, titulo: `${x.v.nombre} de ${x.m.nombre}`, fecha: x.v.proxima })));
                showToast('Avisos enviados', 'A cada dueño le aparece en Recordatorios.');
              }}
            >
              Avisar a los dueños
            </button>
          )}
        </div>
        <Table
          caption="Vacunas por vencer"
          empty="No hay vacunas por vencer en los próximos 30 días."
          columns={[{ label: 'Mascota', width: '16%' }, { label: 'Dueña o dueño', width: '22%' }, { label: 'Vacuna', width: '22%' }, { label: 'Vence', width: '24%' }, { label: '', align: 'right' }]}
          rows={porVencer.map((x) => ({
            key: x.m.id + x.v.nombre,
            cells: [
              <span className="cell-strong">{x.m.nombre}</span>,
              duenio(x.m.id)?.nombre,
              x.v.nombre,
              x.dias < 0 ? <Tag tone="error">Vencida {cuanto(x.v.proxima, hoy)}</Tag> : `${fechaCorta(x.v.proxima)} · ${cuanto(x.v.proxima, hoy)}`,
              <Link to={`/vet/mascotas/${x.m.id}`} className="row-actions mono-etiqueta">
                Ver ficha
              </Link>,
            ],
          }))}
        />
      </section>

      {bajos.length > 0 && (
        <Notice tipo="alerta" titulo={bajos.length === 1 ? 'Queda poco de 1 producto' : `Queda poco de ${bajos.length} productos`}>
          {bajos.map((p) => `${p.nombre} (${p.stock ? `quedan ${p.stock}` : 'sin stock'})`).join(', ')}.{' '}
          <Link to="/vet/productos?stock=bajo">Ver en Productos</Link>
        </Notice>
      )}
      {toast}
    </VetScreen>
  );
}

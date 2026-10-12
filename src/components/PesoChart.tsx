import type { Pesaje } from '../data/types';
import { fechaCorta, fromIso } from '../lib/dates';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mesAnio = (iso: string) => {
  const d = fromIso(iso);
  return `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
};
const kg = (n: number) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg`;

/**
 * Peso a lo largo del tiempo: una línea con cada pesaje, el último destacado.
 * Debajo, en texto, cuánto cambió; y una tabla oculta para lectores de pantalla.
 */
export function PesoChart({ pesos }: { pesos: Pesaje[] }) {
  if (pesos.length === 0) return <p className="texto-chico suave">Todavía no hay pesajes.</p>;
  if (pesos.length === 1) return <p className="texto-chico">Un pesaje: {kg(pesos[0].kg)} el {fechaCorta(pesos[0].fecha)}.</p>;

  const W = 320;
  const H = 150;
  const L = 44;
  const R = 20;
  const T = 18;
  const B = 30;
  const t = (iso: string) => fromIso(iso).getTime();
  const t0 = t(pesos[0].fecha);
  const t1 = t(pesos[pesos.length - 1].fecha);
  const valores = pesos.map((p) => p.kg);
  const margen = Math.max(0.3, (Math.max(...valores) - Math.min(...valores)) * 0.15);
  const lo = Math.min(...valores) - margen;
  const hi = Math.max(...valores) + margen;
  const X = (iso: string) => L + ((t(iso) - t0) / (t1 - t0 || 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const linea = pesos.map((p, i) => `${i ? 'L' : 'M'}${X(p.fecha).toFixed(1)} ${Y(p.kg).toFixed(1)}`).join(' ');
  const primero = pesos[0];
  const ultimo = pesos[pesos.length - 1];
  const dif = Math.round((ultimo.kg - primero.kg) * 10) / 10;
  const resumen =
    dif === 0
      ? `Mantiene el peso desde ${mesAnio(primero.fecha)}: ${kg(ultimo.kg)}.`
      : `${dif > 0 ? 'Subió' : 'Bajó'} ${kg(Math.abs(dif))} desde ${mesAnio(primero.fecha)}. Último pesaje: ${kg(ultimo.kg)}.`;
  const max = Math.max(...valores);
  const min = Math.min(...valores);

  return (
    <figure className="peso">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Peso a lo largo del tiempo. ${resumen}`}>
        {[max, min].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className="peso__grid" />
            <text x={L - 8} y={Y(v) + 4} textAnchor="end" className="peso__eje">
              {v.toLocaleString('es-AR')}
            </text>
          </g>
        ))}
        <path d={linea} className="peso__linea" />
        {pesos.map((p) => (
          <circle key={p.fecha} cx={X(p.fecha)} cy={Y(p.kg)} r={p === ultimo ? 5 : 3.5} className={p === ultimo ? 'peso__punto peso__punto--ultimo' : 'peso__punto'} />
        ))}
        <text x={L} y={H - 8} className="peso__eje">
          {mesAnio(primero.fecha)}
        </text>
        <text x={W - R} y={H - 8} textAnchor="end" className="peso__eje">
          {mesAnio(ultimo.fecha)}
        </text>
      </svg>
      <figcaption className="texto-chico">{resumen}</figcaption>
      <table className="sr-only">
        <caption>Pesajes</caption>
        <tbody>
          {pesos.map((p) => (
            <tr key={p.fecha}>
              <td>{fechaCorta(p.fecha)}</td>
              <td>{kg(p.kg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

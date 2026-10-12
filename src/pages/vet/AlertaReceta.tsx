import type { Registro } from '../../data/types';

/**
 * Aviso al recetar: aparece mientras se escribe el medicamento, si choca con una alergia
 * o con algo que le hizo mal. Para guardar igual hay que confirmarlo a propósito.
 */
export function AlertaReceta({ nombre, conflictos, confirmado, onConfirmar }: { nombre: string; conflictos: Registro[]; confirmado: boolean; onConfirmar: (v: boolean) => void }) {
  if (!conflictos.length) return null;
  return (
    <div className="notice notice--error alerta-receta" role="alert">
      <p className="notice__title texto-fuerte">Ojo: revisá la historia de {nombre} antes de indicarlo</p>
      <ul className="texto-chico">
        {conflictos.map((r) => (
          <li key={r.id}>
            <strong>{r.tipo === 'alergia' ? `Alergia a ${r.titulo}` : `Le hizo mal: ${r.titulo}`}</strong>
            {r.detalle ? `. ${r.detalle}` : '.'}
          </li>
        ))}
      </ul>
      <label className="check texto-chico">
        <input type="checkbox" checked={confirmado} onChange={(e) => onConfirmar(e.target.checked)} />
        <span>Lo revisé y lo indico igual</span>
      </label>
    </div>
  );
}

import type { Motivo } from '../data/types';
import { MANIANA, TARDE, duracionTexto } from '../lib/agenda';
import { Chip } from './ui';

/** Horarios para empezar el turno, de mañana y de tarde. Los que no alcanzan para lo que dura, tachados. */
export function Horarios({ disponibles, elegido, onElegir, motivo, actual }: { disponibles: string[]; elegido: string | null; onElegir: (h: string) => void; motivo: Motivo; actual?: string }) {
  return (
    <fieldset className="group">
      <legend className="mono-etiqueta">Horario · {duracionTexto(motivo)}</legend>
      {[
        ['Mañana', MANIANA],
        ['Tarde', TARDE],
      ].map(([nombre, lista]) => (
        <div key={nombre as string} className="horarios">
          <p className="texto-chico suave">{nombre}</p>
          <div className="chips">
            {(lista as string[]).map((h) => {
              const libre = disponibles.includes(h);
              return (
                <Chip key={h} pressed={h === elegido} disabled={!libre} onClick={() => onElegir(h)} aria-label={libre ? (h === actual ? `${h}, tu turno actual` : h) : `${h}, no disponible`}>
                  {h}
                </Chip>
              );
            })}
          </div>
        </div>
      ))}
      {disponibles.length === 0 && <p className="texto-chico">No queda lugar para {motivo.toLowerCase()} este día.</p>}
    </fieldset>
  );
}


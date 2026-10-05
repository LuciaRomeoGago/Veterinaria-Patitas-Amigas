import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import type { Especie } from '../data/types';
import { img } from '../lib/format';
import './ui.css';

/* Componentes de la página "Sistema de diseño" de Figma. */

type Variant = 'primario' | 'secundario' | 'acento' | 'peligro' | 'peligro-borde';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  small?: boolean;
  to?: string;
}

/** Botón "Botón" (Tipo=Primario/Secundario/Acento). Con `to` es un enlace con el mismo aspecto. */
export function Button({ variant = 'primario', full, small, to, className = '', children, type = 'button', ...rest }: ButtonProps) {
  const cls = ['btn', `btn--${variant}`, full && 'btn--full', small && 'btn--small', className].filter(Boolean).join(' ');
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/** Componente "Campo": etiqueta en mono y caja blanca. */
export function Field({ label, error, className = '', ...rest }: FieldProps) {
  const id = useId();
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id} className="mono-etiqueta">
        {label}
      </label>
      <input id={id} className="field__box" aria-invalid={!!error || undefined} aria-describedby={error ? id + '-e' : undefined} {...rest} />
      {error && (
        <p id={id + '-e'} className="field__error texto-chico">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({ label, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="mono-etiqueta">
        {label}
      </label>
      <textarea id={id} className="field__box field__box--area" rows={4} {...rest} />
    </div>
  );
}

interface NoticeProps {
  tipo: 'alerta' | 'exito' | 'error';
  titulo: string;
  children?: ReactNode;
  acciones?: { label: string; onClick: () => void }[];
}

/** Componente "Aviso" (Tipo=Alerta/Éxito/Error). */
export function Notice({ tipo, titulo, children, acciones }: NoticeProps) {
  return (
    <div className={`notice notice--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <p className="notice__title texto-fuerte">{titulo}</p>
      {children && <p className="notice__text texto-chico">{children}</p>}
      {acciones && (
        <div className="notice__actions">
          {acciones.map((a) => (
            <button key={a.label} type="button" className="mono-etiqueta" onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Componente "Etiqueta": píldora con contorno. */
export function Tag({ children, tone }: { children: ReactNode; tone?: 'error' | 'ok' }) {
  return <span className={`tag mono-etiqueta${tone ? ' tag--' + tone : ''}`}>{children}</span>;
}

/** Opción elegible (mascota, motivo, horario). */
export function Chip({ pressed, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { pressed: boolean }) {
  return (
    <button type="button" className="chip mono-etiqueta" aria-pressed={pressed} {...rest}>
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="toggle" onClick={onChange}>
      <span className="toggle__knob" />
    </button>
  );
}

export function Back({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="back mono-etiqueta">
      <span aria-hidden="true">← </span>
      {children}
    </Link>
  );
}

/** Dibujos de Luci: perrito y gatito. `ambos` los muestra juntos, levemente superpuestos. */
export function Drawing({ especie, height = 228, className = '' }: { especie: Especie | 'ambos'; height?: number; className?: string }) {
  if (especie === 'ambos') {
    return (
      <div className={`drawing drawing--pair ${className}`} aria-hidden="true">
        <img src={img('perrito')} alt="" style={{ height }} />
        <img src={img('gatito')} alt="" style={{ height }} />
      </div>
    );
  }
  return (
    <div className={`drawing ${className}`} aria-hidden="true">
      <img src={img(especie === 'perro' ? 'perrito' : 'gatito')} alt="" style={{ height }} />
    </div>
  );
}

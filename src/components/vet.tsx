import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { img } from '../lib/format';
import { useStore } from '../lib/store';
import { Notice } from './ui';
import './vet.css';

/* Vista del veterinario: escritorio (Figma 1440) con menú lateral verde. */

const SECCIONES = [
  { label: 'Turnos', to: '/vet/turnos' },
  { label: 'Clientes', to: '/vet/clientes' },
  { label: 'Mascotas', to: '/vet/mascotas' },
  { label: 'Productos', to: '/vet/productos' },
];

export function VetLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="vet">
      <a className="skip sr-only" href="#contenido">
        Saltar al contenido
      </a>
      <Outlet />
    </div>
  );
}

/** Pantalla con menú lateral. Sin veterinario ingresado vuelve al ingreso. */
export function VetScreen({ children, label }: { children: ReactNode; label: string }) {
  const { vet, logoutVet } = useStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!vet) navigate('/veterinario', { replace: true });
  }, [vet, navigate]);
  if (!vet) return null;

  return (
    <div className="vet-shell">
      <aside className="vet-side">
        <img className="vet-side__logo" src={img('logo-celeste')} alt="Veterinaria Patitas amigas" width={100} height={100} />
        <nav className="vet-side__nav" aria-label="Secciones">
          {SECCIONES.map((s) => (
            <Link key={s.to} to={s.to} className="vet-side__item mono-boton" aria-current={pathname.startsWith(s.to) ? 'page' : undefined}>
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="vet-side__session">
          <p className="texto-fuerte">{vet.nombre}</p>
          <p className="texto-chico">{vet.especialidad}</p>
          <button type="button" className="mono-etiqueta" onClick={logoutVet}>
            Salir
          </button>
        </div>
      </aside>
      <main id="contenido" className="vet-main" aria-label={label}>
        {children}
      </main>
    </div>
  );
}

export function VetHead({ kicker, title, action, back }: { kicker: string; title: string; action?: ReactNode; back?: ReactNode }) {
  return (
    <header className="vet-head">
      <div className="vet-head__titles">
        {back}
        <p className="mono-etiqueta suave">{kicker}</p>
        <h1 className="display-l">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export interface Column {
  label: string;
  width?: string;
  align?: 'right';
}

/** Tabla blanca con encabezado en mono (Figma: "Tabla"). */
export function Table({ columns, rows, caption, empty }: { columns: Column[]; rows: { key: string | number; cells: ReactNode[] }[]; caption: string; empty?: string }) {
  return (
    <div className="vet-table-wrap">
      <table className="vet-table">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          {columns.map((c, i) => (
            <col key={i} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} scope="col" className={`mono-etiqueta${c.align ? ' is-right' : ''}`}>
                {c.label || <span className="sr-only">Acciones</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r) => (
              <tr key={r.key}>
                {r.cells.map((cell, i) => (
                  <td key={i} className={columns[i]?.align ? 'is-right' : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="vet-table__empty suave">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Acciones en texto de las filas (Editar · Eliminar). */
export function RowActions({ actions }: { actions: { label: string; onClick: () => void; danger?: boolean; to?: string }[] }) {
  return (
    <span className="row-actions">
      {actions.map((a) =>
        a.to ? (
          <Link key={a.label} to={a.to} className="mono-etiqueta">
            {a.label}
          </Link>
        ) : (
          <button key={a.label} type="button" className={`mono-etiqueta${a.danger ? ' is-danger' : ''}`} onClick={a.onClick}>
            {a.label}
          </button>
        ),
      )}
    </span>
  );
}

function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    (ref.current?.querySelector('input, textarea, button') as HTMLElement | null)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);
  return ref;
}

/** Panel lateral derecho de 520 (agregar y editar). */
export function Panel({ title, kicker, onClose, children }: { title: string; kicker: string; onClose: () => void; children: ReactNode }) {
  const ref = useDialog(onClose);
  return (
    <div className="vet-overlay" onClick={onClose}>
      <div className="vet-panel" role="dialog" aria-modal="true" aria-label={title} ref={ref} onClick={(e) => e.stopPropagation()}>
        <p className="mono-etiqueta suave">{kicker}</p>
        <h2 className="display-m">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Diálogo centrado (confirmar eliminación). */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useDialog(onClose);
  return (
    <div className="vet-overlay vet-overlay--center" onClick={onClose}>
      <div className="vet-modal" role="alertdialog" aria-modal="true" aria-label={title} ref={ref} onClick={(e) => e.stopPropagation()}>
        <h2 className="display-m">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Mensaje de "guardado" abajo a la derecha; se va solo a los 5 segundos. */
export function useToast() {
  const [toast, setToast] = useState<{ titulo: string; texto: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast ? (
    <div className="vet-toast">
      <Notice tipo="exito" titulo={toast.titulo}>
        {toast.texto}
      </Notice>
    </div>
  ) : null;
  return [node, (titulo: string, texto: string) => setToast({ titulo, texto })] as const;
}

/** Botones Guardar / Cancelar al pie de un panel. */
export function PanelActions({ submit, onCancel, disabled }: { submit: string; onCancel: () => void; disabled?: boolean }) {
  return (
    <div className="vet-panel__actions">
      <button type="submit" className="btn btn--primario" disabled={disabled}>
        {submit}
      </button>
      <button type="button" className="btn btn--secundario" onClick={onCancel}>
        Cancelar
      </button>
    </div>
  );
}

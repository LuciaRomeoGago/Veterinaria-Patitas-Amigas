import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import './Layout.css';

type NavId = 'inicio' | 'mascotas' | 'turnos' | 'tienda';

const ITEMS: { id: NavId; label: string; to: string }[] = [
  { id: 'inicio', label: 'Inicio', to: '/inicio' },
  { id: 'mascotas', label: 'Mascotas', to: '/mascotas' },
  { id: 'turnos', label: 'Turnos', to: '/turnos' },
  { id: 'tienda', label: 'Tienda', to: '/tienda' },
];

/*
 * La barra inferior vive en el Layout (no en cada pantalla) para que no se vuelva a montar
 * al navegar: así la píldora celeste puede deslizarse de una sección a otra, y la pantalla
 * nueva entra desde el lado hacia el que se movió la barra.
 */
const NavCtx = createContext<{ set: (id: NavId | null) => void; dir: 'left' | 'right' | null }>({ set: () => {}, dir: null });

/** Contenedor de la app: una columna de celular centrada (Figma 390). */
export function Layout() {
  const { pathname } = useLocation();
  const [active, setActive] = useState<NavId | null>(null);
  const [dir, setDir] = useState<'left' | 'right' | null>(null);
  const prev = useRef<NavId | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const set = (id: NavId | null) => {
    if (id === prev.current) return;
    const from = ITEMS.findIndex((i) => i.id === prev.current);
    const to = ITEMS.findIndex((i) => i.id === id);
    setDir(from >= 0 && to >= 0 && from !== to ? (to > from ? 'right' : 'left') : null);
    prev.current = id;
    setActive(id);
  };

  return (
    <NavCtx.Provider value={{ set, dir }}>
      <div className="app">
        <a className="skip sr-only" href="#contenido">
          Saltar al contenido
        </a>
        <Outlet />
        {active && <BottomNav active={active} />}
      </div>
    </NavCtx.Provider>
  );
}

interface ScreenProps {
  children: ReactNode;
  nav?: NavId;
  className?: string;
  label?: string;
}

/** Pantalla: margen de 24, 64 arriba, y la barra inferior si corresponde. */
export function Screen({ children, nav, className = '', label }: ScreenProps) {
  const { set, dir } = useContext(NavCtx);
  // Se fija una sola vez, al montar, desde qué lado entra esta pantalla.
  const [enter] = useState(() => (nav ? dir : null));
  useLayoutEffect(() => {
    set(nav ?? null);
  }, [nav, set]);

  return (
    <main id="contenido" className={`screen ${nav ? 'screen--nav' : ''} ${enter ? 'screen--from-' + enter : ''} ${className}`} aria-label={label}>
      {children}
    </main>
  );
}

function BottomNav({ active }: { active: NavId }) {
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const [ready, setReady] = useState(false);
  const index = ITEMS.findIndex((i) => i.id === active);

  // La píldora se mide sobre el ítem activo y se mueve con transform (se ve deslizarse).
  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[index];
      if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [index]);

  // Sin animación en la primera medición, para que no entre "volando" desde la izquierda.
  useEffect(() => {
    if (pill && !ready) requestAnimationFrame(() => setReady(true));
  }, [pill, ready]);

  return (
    <nav className="bottom-nav" aria-label="Secciones">
      {pill && <span className={`bottom-nav__pill${ready ? ' is-ready' : ''}`} style={{ width: pill.w, transform: `translateX(${pill.x}px)` }} aria-hidden="true" />}
      {ITEMS.map((it, i) => (
        <Link
          key={it.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          to={it.to}
          className="bottom-nav__item mono-etiqueta"
          aria-current={it.id === active ? 'page' : undefined}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

/** Sin cliente ingresado, las pantallas privadas vuelven al ingreso. */
export function RequireClient({ children }: { children: ReactNode }) {
  const { cliente } = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (!cliente) navigate('/ingreso', { replace: true });
  }, [cliente, navigate]);
  return cliente ? <>{children}</> : null;
}

/** Hoja que sube desde abajo (eliminar mascota, comprar). Esc o tocar el fondo la cierra. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__panel" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

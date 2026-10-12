/* Íconos de los menús: trazo de 1,8 en el color del texto, para que sigan al estado activo. */

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export type IconName = 'inicio' | 'mascotas' | 'turnos' | 'tienda' | 'clientes' | 'productos' | 'buscar' | 'resumen' | 'caja';

export function Icon({ name }: { name: IconName }) {
  switch (name) {
    case 'inicio':
      return (
        <svg {...base}>
          <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z" />
        </svg>
      );
    case 'mascotas':
      return (
        <svg {...base}>
          <circle cx="6.5" cy="10" r="1.9" />
          <circle cx="10" cy="6" r="2" />
          <circle cx="14" cy="6" r="2" />
          <circle cx="17.5" cy="10" r="1.9" />
          <path d="M12 12.2c-2.7 0-5.2 3-5.2 5.3 0 1.7 1.3 2.7 2.9 2.7 1 0 1.6-.5 2.3-.5s1.3.5 2.3.5c1.6 0 2.9-1 2.9-2.7 0-2.3-2.5-5.3-5.2-5.3z" />
        </svg>
      );
    case 'turnos':
      return (
        <svg {...base}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      );
    case 'tienda':
    case 'productos':
      return (
        <svg {...base}>
          <path d="M5 8h14l-1 12a1 1 0 0 1-1 .9H7a1 1 0 0 1-1-.9z" />
          <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
        </svg>
      );
    case 'clientes':
      return (
        <svg {...base}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
          <circle cx="16.5" cy="9" r="2.5" />
          <path d="M15.6 14.6c2.6-.3 4.5 1.4 4.9 4.4" />
        </svg>
      );
    case 'resumen':
      return (
        <svg {...base}>
          <path d="M4 20h16" />
          <rect x="5.5" y="11" width="3" height="6.5" rx="1" />
          <rect x="10.5" y="6" width="3" height="11.5" rx="1" />
          <rect x="15.5" y="13.5" width="3" height="4" rx="1" />
        </svg>
      );
    case 'caja':
      return (
        <svg {...base}>
          <rect x="3" y="6.5" width="18" height="11" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6.5 9.5v5M17.5 9.5v5" />
        </svg>
      );
    case 'buscar':
      return (
        <svg {...base}>
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.5-4.5" />
        </svg>
      );
  }
}

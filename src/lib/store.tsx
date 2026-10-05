import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { createSeed, type SeedData } from '../data/seed';
import type { Cliente, Indicacion, Mascota, Motivo, Producto, Turno, Vacuna } from '../data/types';
import { daysBetween, today } from './dates';

/*
 * Estado de la app con useReducer + Context. No hay backend: los datos de ejemplo
 * se guardan en localStorage y se regeneran cada día para que las fechas sigan
 * teniendo sentido (turnos próximos, vacunas por vencer).
 * Cliente y veterinario comparten los mismos datos: lo que carga uno lo ve el otro.
 */

interface State extends SeedData {
  clienteId: number | null;
  vetId: number | null;
  seedDate: string;
}

export type MascotaInput = Pick<Mascota, 'nombre' | 'especie' | 'edad' | 'raza'> & { peso?: number; historialMedico: string };
export type ClienteInput = Pick<Cliente, 'nombre' | 'dni'>;

type Action =
  | { type: 'login'; clienteId: number }
  | { type: 'logout' }
  | { type: 'loginVet'; vetId: number }
  | { type: 'logoutVet' }
  | { type: 'addCliente'; cliente: Cliente }
  | { type: 'editCliente'; id: number; data: ClienteInput }
  | { type: 'deleteCliente'; id: number }
  | { type: 'addMascota'; id: number; clienteId: number; data: MascotaInput }
  | { type: 'editMascota'; id: number; data: MascotaInput }
  | { type: 'deleteMascota'; id: number }
  | { type: 'registrarVacuna'; mascotaId: number; vacuna: Vacuna; avisar: boolean }
  | { type: 'addIndicacion'; mascotaId: number; indicacion: Indicacion }
  | { type: 'removeIndicacion'; mascotaId: number; titulo: string }
  | { type: 'addNota'; mascotaId: number; titulo: string; detalle: string }
  | { type: 'addProducto'; producto: Producto }
  | { type: 'editProducto'; producto: Producto }
  | { type: 'deleteProducto'; id: number }
  | { type: 'comprar'; productoId: number; cantidad: number }
  | { type: 'toggleRecordatorio'; id: number }
  | { type: 'avisar'; avisos: { clienteId: number; titulo: string; fecha: string }[] }
  | { type: 'pedirTurno'; turno: Turno }
  | { type: 'cancelarTurno'; id: number }
  | { type: 'atendido'; id: number }
  | { type: 'reset' };

const KEY = 'patitas-amigas:v2';

function fresh(clienteId: number | null = null, vetId: number | null = null): State {
  return { ...createSeed(), clienteId, vetId, seedDate: today() };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (s.seedDate === today()) return s;
      return fresh(s.clienteId, s.vetId);
    }
  } catch {
    /* localStorage no disponible: se usa la semilla */
  }
  return fresh();
}

const nextId = (items: { id: number }[]) => items.reduce((m, x) => Math.max(m, x.id), 0) + 1;
const nextRecId = (s: State) => nextId(s.recordatorios);

const mapMascota = (state: State, id: number, fn: (m: Mascota) => Mascota): State => ({
  ...state,
  mascotas: state.mascotas.map((m) => (m.id === id ? fn(m) : m)),
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'login':
      return { ...state, clienteId: action.clienteId };
    case 'logout':
      return { ...state, clienteId: null };
    case 'loginVet':
      return { ...state, vetId: action.vetId };
    case 'logoutVet':
      return { ...state, vetId: null };

    case 'addCliente':
      return { ...state, clientes: [...state.clientes, action.cliente] };
    case 'editCliente':
      return { ...state, clientes: state.clientes.map((c) => (c.id === action.id ? { ...c, ...action.data } : c)) };
    case 'deleteCliente': {
      // ON DELETE CASCADE: mascotas, compras, turnos y recordatorios del cliente.
      const ids = new Set(state.mascotas.filter((m) => m.clienteId === action.id).map((m) => m.id));
      return {
        ...state,
        clientes: state.clientes.filter((c) => c.id !== action.id),
        mascotas: state.mascotas.filter((m) => m.clienteId !== action.id),
        compras: state.compras.filter((c) => c.clienteId !== action.id),
        turnos: state.turnos.filter((t) => !ids.has(t.mascotaId)),
        recordatorios: state.recordatorios.filter((r) => r.clienteId !== action.id),
        clienteId: state.clienteId === action.id ? null : state.clienteId,
      };
    }

    case 'addMascota': {
      const { historialMedico, ...data } = action.data;
      const mascota: Mascota = {
        ...data,
        id: action.id,
        clienteId: action.clienteId,
        vacunas: [],
        indicaciones: [],
        historial: historialMedico.trim() ? [{ fecha: today(), titulo: 'Datos iniciales', detalle: historialMedico.trim() }] : [],
      };
      return { ...state, mascotas: [...state.mascotas, mascota] };
    }
    case 'editMascota': {
      const { historialMedico, ...data } = action.data;
      return mapMascota(state, action.id, (m) => ({
        ...m,
        ...data,
        historial: historialMedico.trim() ? [{ fecha: today(), titulo: 'Nota', detalle: historialMedico.trim() }, ...m.historial] : m.historial,
      }));
    }
    case 'deleteMascota':
      return {
        ...state,
        mascotas: state.mascotas.filter((m) => m.id !== action.id),
        turnos: state.turnos.filter((t) => t.mascotaId !== action.id),
      };
    case 'registrarVacuna': {
      const m = state.mascotas.find((x) => x.id === action.mascotaId);
      if (!m) return state;
      const next = mapMascota(state, m.id, (x) => ({
        ...x,
        vacunas: [...x.vacunas.filter((v) => v.nombre.toLowerCase() !== action.vacuna.nombre.toLowerCase()), action.vacuna],
      }));
      if (!action.avisar) return next;
      return {
        ...next,
        recordatorios: [...next.recordatorios, { id: nextRecId(next), clienteId: m.clienteId, titulo: `${action.vacuna.nombre} de ${m.nombre}`, fecha: action.vacuna.proxima, activo: true }],
      };
    }
    case 'addIndicacion':
      return mapMascota(state, action.mascotaId, (m) => ({ ...m, indicaciones: [...m.indicaciones, action.indicacion] }));
    case 'removeIndicacion':
      return mapMascota(state, action.mascotaId, (m) => ({ ...m, indicaciones: m.indicaciones.filter((i) => i.titulo !== action.titulo) }));
    case 'addNota':
      return mapMascota(state, action.mascotaId, (m) => ({ ...m, historial: [{ fecha: today(), titulo: action.titulo, detalle: action.detalle || undefined }, ...m.historial] }));

    case 'addProducto':
      return { ...state, productos: [...state.productos, action.producto] };
    case 'editProducto':
      return { ...state, productos: state.productos.map((p) => (p.id === action.producto.id ? action.producto : p)) };
    case 'deleteProducto':
      return {
        ...state,
        productos: state.productos.filter((p) => p.id !== action.id),
        compras: state.compras.filter((c) => c.productoId !== action.id),
      };
    case 'comprar': {
      const p = state.productos.find((x) => x.id === action.productoId);
      if (!p || state.clienteId === null || action.cantidad < 1 || action.cantidad > p.stock) return state;
      const clienteId = state.clienteId;
      const existe = state.compras.some((c) => c.clienteId === clienteId && c.productoId === p.id);
      return {
        ...state,
        productos: state.productos.map((x) => (x.id === p.id ? { ...x, stock: x.stock - action.cantidad } : x)),
        compras: existe
          ? state.compras.map((c) => (c.clienteId === clienteId && c.productoId === p.id ? { ...c, cantidad: c.cantidad + action.cantidad } : c))
          : [...state.compras, { clienteId, productoId: p.id, cantidad: action.cantidad }],
      };
    }

    case 'toggleRecordatorio':
      return { ...state, recordatorios: state.recordatorios.map((r) => (r.id === action.id ? { ...r, activo: !r.activo } : r)) };
    case 'avisar': {
      let s = state;
      for (const a of action.avisos) {
        if (s.recordatorios.some((r) => r.clienteId === a.clienteId && r.titulo === a.titulo)) continue;
        s = { ...s, recordatorios: [...s.recordatorios, { id: nextRecId(s), clienteId: a.clienteId, titulo: a.titulo, fecha: a.fecha, activo: true }] };
      }
      return s;
    }

    case 'pedirTurno':
      return { ...state, turnos: [...state.turnos, action.turno] };
    case 'cancelarTurno':
      return { ...state, turnos: state.turnos.filter((t) => t.id !== action.id) };
    case 'atendido':
      return { ...state, turnos: state.turnos.map((t) => (t.id === action.id ? { ...t, atendido: true } : t)) };
    case 'reset':
      return fresh(state.clienteId, state.vetId);
  }
}

function useStoreValue() {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* sin persistencia */
    }
  }, [state]);

  return useMemo(() => {
    const cliente = state.clientes.find((c) => c.id === state.clienteId) ?? null;
    const vet = state.veterinarios.find((v) => v.id === state.vetId) ?? null;
    const mascotasDe = (clienteId: number) => state.mascotas.filter((m) => m.clienteId === clienteId);
    const mascotas = state.clienteId === null ? [] : mascotasDe(state.clienteId);
    const ids = new Set(mascotas.map((m) => m.id));
    const turnos = state.turnos.filter((t) => ids.has(t.mascotaId)).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    const hoy = today();
    const mascota = (id: number) => state.mascotas.find((m) => m.id === id);
    const duenio = (mascotaId: number) => state.clientes.find((c) => c.id === mascota(mascotaId)?.clienteId);

    return {
      state,
      hoy,

      /* ---------- Cliente ---------- */
      cliente,
      mascotas,
      proximos: turnos.filter((t) => !t.atendido && t.fecha >= hoy),
      anteriores: turnos.filter((t) => t.atendido || t.fecha < hoy).reverse(),
      recordatorios: state.recordatorios.filter((r) => r.clienteId === state.clienteId),
      compras: state.compras.filter((c) => c.clienteId === state.clienteId),
      productos: state.productos,
      mascota,
      producto: (id: number) => state.productos.find((p) => p.id === id),

      /** Devuelve false si el número no corresponde a ningún cliente (como existeId() en PHP). */
      login(id: number) {
        if (!state.clientes.some((c) => c.id === id)) return false;
        dispatch({ type: 'login', clienteId: id });
        return true;
      },
      logout: () => dispatch({ type: 'logout' }),
      /** Sin `clienteId` la mascota es del cliente que ingresó. */
      addMascota(data: MascotaInput, clienteId = state.clienteId) {
        if (clienteId === null) return -1;
        const id = nextId(state.mascotas);
        dispatch({ type: 'addMascota', id, clienteId, data });
        return id;
      },
      editMascota: (id: number, data: MascotaInput) => dispatch({ type: 'editMascota', id, data }),
      deleteMascota: (id: number) => dispatch({ type: 'deleteMascota', id }),
      comprar: (productoId: number, cantidad: number) => dispatch({ type: 'comprar', productoId, cantidad }),
      toggleRecordatorio: (id: number) => dispatch({ type: 'toggleRecordatorio', id }),
      pedirTurno(data: { mascotaId: number; motivo: Motivo; fecha: string; hora: string; profesional?: string }) {
        const id = nextId(state.turnos);
        dispatch({ type: 'pedirTurno', turno: { profesional: 'Dra. Paz Ruiz', ...data, id, atendido: false } });
        return id;
      },
      cancelarTurno: (id: number) => dispatch({ type: 'cancelarTurno', id }),
      /** Horarios ya tomados de un día (para no ofrecerlos). */
      ocupados: (fecha: string) => state.turnos.filter((t) => t.fecha === fecha).map((t) => t.hora),

      /* ---------- Veterinario ---------- */
      vet,
      clientes: state.clientes,
      mascotasDe,
      duenio,
      turnosDel: (fecha: string) => state.turnos.filter((t) => t.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora)),
      /** Vacunas vencidas de todas las mascotas. */
      vencidas: state.mascotas.flatMap((m) => m.vacunas.filter((v) => daysBetween(hoy, v.proxima) < 0).map((v) => ({ mascota: m, vacuna: v }))),

      loginVet(id: number) {
        if (!state.veterinarios.some((v) => v.id === id)) return false;
        dispatch({ type: 'loginVet', vetId: id });
        return true;
      },
      logoutVet: () => dispatch({ type: 'logoutVet' }),
      addCliente(data: ClienteInput) {
        const id = Math.max(...state.clientes.map((c) => c.id), 1023) + 1;
        dispatch({ type: 'addCliente', cliente: { id, ...data } });
        return id;
      },
      editCliente: (id: number, data: ClienteInput) => dispatch({ type: 'editCliente', id, data }),
      deleteCliente: (id: number) => dispatch({ type: 'deleteCliente', id }),
      registrarVacuna: (mascotaId: number, vacuna: Vacuna, avisar: boolean) => dispatch({ type: 'registrarVacuna', mascotaId, vacuna, avisar }),
      addIndicacion: (mascotaId: number, indicacion: Indicacion) => dispatch({ type: 'addIndicacion', mascotaId, indicacion }),
      removeIndicacion: (mascotaId: number, titulo: string) => dispatch({ type: 'removeIndicacion', mascotaId, titulo }),
      addNota: (mascotaId: number, titulo: string, detalle: string) => dispatch({ type: 'addNota', mascotaId, titulo, detalle }),
      addProducto: (producto: Producto) => dispatch({ type: 'addProducto', producto }),
      editProducto: (producto: Producto) => dispatch({ type: 'editProducto', producto }),
      deleteProducto: (id: number) => dispatch({ type: 'deleteProducto', id }),
      avisar: (avisos: { clienteId: number; titulo: string; fecha: string }[]) => dispatch({ type: 'avisar', avisos }),
      marcarAtendido: (id: number) => dispatch({ type: 'atendido', id }),
      reset: () => dispatch({ type: 'reset' }),
    };
  }, [state]);
}

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useStoreValue()}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}

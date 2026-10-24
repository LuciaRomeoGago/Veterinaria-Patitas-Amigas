import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { createSeed, type SeedData } from '../data/seed';
import type { Adjunto, Bloqueo, Cliente, EstadoTurno, Mascota, Medio, Motivo, Movimiento, PlanTomas, Plantilla, Producto, Registro, Turno, Vacuna } from '../data/types';
import { HORARIOS, PRECIO, libres } from './agenda';
import { daysBetween, today } from './dates';

/*
 * Estado de la app con useReducer + Context. No hay backend: los datos de ejemplo
 * se guardan en localStorage y se regeneran cada día para que las fechas sigan
 * teniendo sentido (turnos próximos, vacunas por vencer).
 * Cliente y veterinaria comparten los mismos datos: lo que carga uno lo ve el otro.
 */

interface State extends SeedData {
  clienteId: number | null;
  vetId: number | null;
  seedDate: string;
}

export type MascotaInput = Pick<Mascota, 'nombre' | 'especie' | 'edad' | 'raza'> & { peso?: number; historialMedico: string };
export type ClienteInput = Pick<Cliente, 'nombre' | 'dni' | 'telefono'>;
export type RegistroInput = Omit<Registro, 'id'>;

/** Lo que se carga al atender un turno: va a la historia clínica por partes y a la caja. */
export interface Consulta {
  turnoId: number;
  titulo: string;
  detalle: string;
  peso?: number;
  diagnostico?: string;
  medicamento?: { titulo: string; detalle?: string; plan?: Omit<PlanTomas, 'dadas'> };
  cobro?: { monto: number; medio: Medio };
}

type Action =
  | { type: 'login'; clienteId: number }
  | { type: 'logout' }
  | { type: 'loginVet'; vetId: number }
  | { type: 'logoutVet' }
  | { type: 'addCliente'; cliente: Cliente }
  | { type: 'editCliente'; id: number; data: ClienteInput }
  | { type: 'deleteCliente'; id: number }
  | { type: 'setWhatsapp'; id: number; valor: boolean }
  | { type: 'addMascota'; id: number; clienteId: number; data: MascotaInput; por: string }
  | { type: 'editMascota'; id: number; data: MascotaInput; por: string }
  | { type: 'deleteMascota'; id: number }
  | { type: 'registrarVacuna'; mascotaId: number; vacuna: Vacuna; avisar: boolean; por: string }
  | { type: 'addRegistro'; mascotaId: number; registro: RegistroInput; por: string }
  | { type: 'editRegistro'; mascotaId: number; registro: Registro; por: string }
  | { type: 'removeRegistro'; mascotaId: number; id: number; por: string }
  | { type: 'addNota'; mascotaId: number; titulo: string; detalle: string; por: string }
  | { type: 'addAdjunto'; mascotaId: number; adjunto: Adjunto }
  | { type: 'removeAdjunto'; mascotaId: number; id: number; por: string }
  | { type: 'toma'; mascotaId: number; registroId: number; cuando: string; por: string }
  | { type: 'addProducto'; producto: Producto; por: string }
  | { type: 'editProducto'; producto: Producto }
  | { type: 'deleteProducto'; id: number }
  | { type: 'entradaStock'; productoId: number; cantidad: number; detalle?: string; vence?: string; por: string }
  | { type: 'ajustarStock'; productoId: number; nuevo: number; motivo: string; por: string }
  | { type: 'comprar'; productoId: number; cantidad: number; pago: 'mercadopago' | 'al_retirar' }
  | { type: 'cobrarCompra'; id: number; medio: Medio; por: string }
  | { type: 'toggleRecordatorio'; id: number }
  | { type: 'avisar'; avisos: { clienteId: number; titulo: string; fecha: string }[] }
  | { type: 'pedirTurno'; turno: Turno }
  | { type: 'cancelarTurno'; id: number }
  | { type: 'estadoTurno'; id: number; estado: EstadoTurno; llegada?: string }
  | { type: 'atender'; consulta: Consulta; por: string }
  | { type: 'reprogramarTurno'; id: number; fecha: string; hora: string; motivo: Motivo; vetId: number }
  | { type: 'addBloqueo'; bloqueo: Omit<Bloqueo, 'id'> }
  | { type: 'removeBloqueo'; id: number }
  | { type: 'addEspera'; espera: Omit<State['esperas'][number], 'id'> }
  | { type: 'removeEspera'; id: number }
  | { type: 'avisarEspera'; id: number; cuando: string }
  | { type: 'movimiento'; mov: Omit<Movimiento, 'id'> }
  | { type: 'cerrarCaja'; contado: number; esperado: number; por: string }
  | { type: 'addPlantilla'; plantilla: Omit<Plantilla, 'id'> }
  | { type: 'reset' };

const KEY = 'patitas-amigas:v5';

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

/** Hora actual (HH:MM) y "AAAA-MM-DD HH:MM". */
export const horaActual = () => new Date().toTimeString().slice(0, 5);
export const ahora = () => `${today()} ${horaActual()}`;

/** Anota un pesaje (uno por día: si ya hay uno de hoy, lo reemplaza). */
const pesar = (m: Mascota, kg: number, fecha: string): Mascota => ({
  ...m,
  peso: kg,
  pesos: [...m.pesos.filter((p) => p.fecha !== fecha), { fecha, kg }].sort((a, b) => a.fecha.localeCompare(b.fecha)),
});

const mapMascota = (state: State, id: number, fn: (m: Mascota) => Mascota): State => ({
  ...state,
  mascotas: state.mascotas.map((m) => (m.id === id ? fn(m) : m)),
});

/** Cambia la ficha y deja anotado quién lo hizo (historial de cambios). */
const cambiar = (state: State, id: number, por: string, texto: string, fn: (m: Mascota) => Mascota = (m) => m): State =>
  mapMascota(state, id, (m) => {
    const next = fn(m);
    return { ...next, cambios: [{ cuando: ahora(), por, texto }, ...next.cambios] };
  });

const conMovimiento = (state: State, mov: Omit<Movimiento, 'id'>): State => ({ ...state, movimientos: [...state.movimientos, { ...mov, id: nextId(state.movimientos) }] });

const PARTE: Record<Registro['tipo'], string> = { alergia: 'Alergias', medicacion: 'Medicación', enfermedad: 'Enfermedades', bien: 'Le hizo bien', mal: 'Le hizo mal' };

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
      // ON DELETE CASCADE: mascotas, compras, turnos, recordatorios y lista de espera del cliente.
      const ids = new Set(state.mascotas.filter((m) => m.clienteId === action.id).map((m) => m.id));
      return {
        ...state,
        clientes: state.clientes.filter((c) => c.id !== action.id),
        mascotas: state.mascotas.filter((m) => m.clienteId !== action.id),
        compras: state.compras.filter((c) => c.clienteId !== action.id),
        turnos: state.turnos.filter((t) => !ids.has(t.mascotaId)),
        recordatorios: state.recordatorios.filter((r) => r.clienteId !== action.id),
        esperas: state.esperas.filter((e) => e.clienteId !== action.id),
        clienteId: state.clienteId === action.id ? null : state.clienteId,
      };
    }
    case 'setWhatsapp':
      return { ...state, clientes: state.clientes.map((c) => (c.id === action.id ? { ...c, whatsapp: action.valor } : c)) };

    case 'addMascota': {
      const { historialMedico, ...data } = action.data;
      const mascota: Mascota = {
        ...data,
        id: action.id,
        clienteId: action.clienteId,
        pesos: data.peso !== undefined ? [{ fecha: today(), kg: data.peso }] : [],
        vacunas: [],
        registros: [],
        historial: historialMedico.trim() ? [{ fecha: today(), titulo: 'Datos iniciales', detalle: historialMedico.trim() }] : [],
        adjuntos: [],
        cambios: [{ cuando: ahora(), por: action.por, texto: 'Cargó la ficha.' }],
      };
      return { ...state, mascotas: [...state.mascotas, mascota] };
    }
    case 'editMascota': {
      const { historialMedico, ...data } = action.data;
      const antes = state.mascotas.find((m) => m.id === action.id);
      if (!antes) return state;
      const cambios = [
        data.nombre !== antes.nombre && `nombre: ${data.nombre}`,
        data.edad !== antes.edad && `edad: ${data.edad}`,
        data.raza !== antes.raza && `raza: ${data.raza}`,
        data.peso !== undefined && data.peso !== antes.peso && `peso: ${String(data.peso).replace('.', ',')} kg`,
        historialMedico.trim() && 'agregó una nota',
      ].filter(Boolean);
      return cambiar(state, action.id, action.por, cambios.length ? `Editó los datos (${cambios.join(', ')}).` : 'Revisó los datos sin cambios.', (m) => {
        const next = { ...m, ...data, historial: historialMedico.trim() ? [{ fecha: today(), titulo: 'Nota', detalle: historialMedico.trim() }, ...m.historial] : m.historial };
        return data.peso !== undefined && data.peso !== m.peso ? pesar(next, data.peso, today()) : next;
      });
    }
    case 'deleteMascota':
      return {
        ...state,
        mascotas: state.mascotas.filter((m) => m.id !== action.id),
        turnos: state.turnos.filter((t) => t.mascotaId !== action.id),
        esperas: state.esperas.filter((e) => e.mascotaId !== action.id),
      };
    case 'registrarVacuna': {
      const m = state.mascotas.find((x) => x.id === action.mascotaId);
      if (!m) return state;
      const next = cambiar(state, m.id, action.por, `Registró la vacuna ${action.vacuna.nombre}.`, (x) => ({
        ...x,
        vacunas: [...x.vacunas.filter((v) => v.nombre.toLowerCase() !== action.vacuna.nombre.toLowerCase()), action.vacuna],
      }));
      if (!action.avisar) return next;
      return {
        ...next,
        recordatorios: [...next.recordatorios, { id: nextRecId(next), clienteId: m.clienteId, titulo: `${action.vacuna.nombre} de ${m.nombre}`, fecha: action.vacuna.proxima, activo: true }],
      };
    }
    case 'addRegistro':
      return cambiar(state, action.mascotaId, action.por, `Agregó en ${PARTE[action.registro.tipo]}: ${action.registro.titulo}.`, (m) => ({ ...m, registros: [...m.registros, { ...action.registro, id: nextId(m.registros) }] }));
    case 'editRegistro':
      return cambiar(state, action.mascotaId, action.por, `Editó en ${PARTE[action.registro.tipo]}: ${action.registro.titulo}.`, (m) => ({
        ...m,
        registros: m.registros.map((r) => (r.id === action.registro.id ? { ...action.registro, plan: action.registro.plan ?? r.plan } : r)),
      }));
    case 'removeRegistro': {
      const r = state.mascotas.find((m) => m.id === action.mascotaId)?.registros.find((x) => x.id === action.id);
      if (!r) return state;
      return cambiar(state, action.mascotaId, action.por, `Quitó de ${PARTE[r.tipo]}: ${r.titulo}.`, (m) => ({ ...m, registros: m.registros.filter((x) => x.id !== action.id) }));
    }
    case 'addNota':
      return cambiar(state, action.mascotaId, action.por, `Agregó una nota: ${action.titulo}.`, (m) => ({ ...m, historial: [{ fecha: today(), titulo: action.titulo, detalle: action.detalle || undefined }, ...m.historial] }));
    case 'addAdjunto':
      return cambiar(state, action.mascotaId, action.adjunto.por, `Subió ${action.adjunto.tipo === 'pdf' ? 'el estudio' : 'la foto'} “${action.adjunto.nombre}”.`, (m) => ({ ...m, adjuntos: [action.adjunto, ...m.adjuntos] }));
    case 'removeAdjunto': {
      const a = state.mascotas.find((m) => m.id === action.mascotaId)?.adjuntos.find((x) => x.id === action.id);
      if (!a) return state;
      return cambiar(state, action.mascotaId, action.por, `Quitó “${a.nombre}”.`, (m) => ({ ...m, adjuntos: m.adjuntos.filter((x) => x.id !== action.id) }));
    }
    case 'toma': {
      const r = state.mascotas.find((m) => m.id === action.mascotaId)?.registros.find((x) => x.id === action.registroId);
      if (!r?.plan) return state;
      const dada = r.plan.dadas.includes(action.cuando);
      const hora = action.cuando.slice(11);
      return cambiar(state, action.mascotaId, action.por, `${dada ? 'Desmarcó' : 'Marcó'} la toma de las ${hora} de ${r.titulo}.`, (m) => ({
        ...m,
        registros: m.registros.map((x) =>
          x.id === r.id && x.plan ? { ...x, plan: { ...x.plan, dadas: dada ? x.plan.dadas.filter((d) => d !== action.cuando) : [...x.plan.dadas, action.cuando].sort() } } : x,
        ),
      }));
    }

    case 'addProducto': {
      const s = { ...state, productos: [...state.productos, action.producto] };
      if (!action.producto.stock) return s;
      return { ...s, movStock: [...s.movStock, { id: nextId(s.movStock), fecha: today(), productoId: action.producto.id, cantidad: action.producto.stock, tipo: 'entrada', detalle: 'Stock inicial', por: action.por }] };
    }
    case 'editProducto':
      return { ...state, productos: state.productos.map((p) => (p.id === action.producto.id ? { ...action.producto, stock: p.stock } : p)) };
    case 'deleteProducto':
      return {
        ...state,
        productos: state.productos.filter((p) => p.id !== action.id),
        compras: state.compras.filter((c) => c.productoId !== action.id),
        movStock: state.movStock.filter((x) => x.productoId !== action.id),
      };
    case 'entradaStock':
      if (action.cantidad < 1) return state;
      return {
        ...state,
        productos: state.productos.map((p) => (p.id === action.productoId ? { ...p, stock: p.stock + action.cantidad } : p)),
        movStock: [...state.movStock, { id: nextId(state.movStock), fecha: today(), productoId: action.productoId, cantidad: action.cantidad, tipo: 'entrada', detalle: action.detalle, vence: action.vence, por: action.por }],
      };
    case 'ajustarStock': {
      const p = state.productos.find((x) => x.id === action.productoId);
      if (!p || action.nuevo < 0 || action.nuevo === p.stock) return state;
      return {
        ...state,
        productos: state.productos.map((x) => (x.id === p.id ? { ...x, stock: action.nuevo } : x)),
        movStock: [...state.movStock, { id: nextId(state.movStock), fecha: today(), productoId: p.id, cantidad: action.nuevo - p.stock, tipo: 'ajuste', detalle: action.motivo, por: action.por }],
      };
    }
    case 'comprar': {
      const p = state.productos.find((x) => x.id === action.productoId);
      if (!p || state.clienteId === null || action.cantidad < 1 || action.cantidad > p.stock) return state;
      const cliente = state.clientes.find((c) => c.id === state.clienteId)!;
      const pagada = action.pago === 'mercadopago';
      // Cada compra queda con su fecha (para el resumen del mes); Mis compras las suma por producto.
      const s: State = {
        ...state,
        productos: state.productos.map((x) => (x.id === p.id ? { ...x, stock: x.stock - action.cantidad } : x)),
        compras: [...state.compras, { id: nextId(state.compras), clienteId: cliente.id, productoId: p.id, cantidad: action.cantidad, fecha: today(), pago: action.pago, cobrada: pagada }],
        movStock: [...state.movStock, { id: nextId(state.movStock), fecha: today(), productoId: p.id, cantidad: -action.cantidad, tipo: 'venta', detalle: cliente.nombre, por: 'Tienda' }],
      };
      return pagada
        ? conMovimiento(s, { fecha: today(), hora: horaActual(), tipo: 'venta', concepto: `${p.nombre} × ${action.cantidad} · ${cliente.nombre}`, monto: p.precio * action.cantidad, medio: 'Mercado Pago', por: 'Tienda' })
        : s;
    }
    case 'cobrarCompra': {
      const c = state.compras.find((x) => x.id === action.id);
      const p = c && state.productos.find((x) => x.id === c.productoId);
      if (!c || !p || c.cobrada) return state;
      const cliente = state.clientes.find((x) => x.id === c.clienteId);
      return conMovimiento(
        { ...state, compras: state.compras.map((x) => (x.id === c.id ? { ...x, cobrada: true } : x)) },
        { fecha: today(), hora: horaActual(), tipo: 'venta', concepto: `${p.nombre} × ${c.cantidad} · ${cliente?.nombre ?? ''}`, monto: p.precio * c.cantidad, medio: action.medio, por: action.por },
      );
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

    case 'pedirTurno': {
      const t = action.turno;
      const m = state.mascotas.find((x) => x.id === t.mascotaId);
      // Si estaba en la lista de espera para ese día, sale.
      const s = { ...state, turnos: [...state.turnos, t], esperas: state.esperas.filter((e) => !(e.mascotaId === t.mascotaId && e.fecha === t.fecha)) };
      if (!t.sena || !m) return s;
      return conMovimiento(s, { fecha: today(), hora: horaActual(), tipo: 'sena', concepto: `Seña · ${m.nombre}, ${t.fecha.slice(8)}/${t.fecha.slice(5, 7)} ${t.hora}`, monto: t.sena, medio: 'Mercado Pago', por: 'App' });
    }
    case 'cancelarTurno':
      return { ...state, turnos: state.turnos.filter((t) => t.id !== action.id) };
    case 'estadoTurno':
      return { ...state, turnos: state.turnos.map((t) => (t.id === action.id ? { ...t, estado: action.estado, llegada: action.llegada ?? t.llegada } : t)) };
    case 'atender': {
      const c = action.consulta;
      const t = state.turnos.find((x) => x.id === c.turnoId);
      const m0 = t && state.mascotas.find((x) => x.id === t.mascotaId);
      if (!t || !m0) return state;
      const vet = state.veterinarios.find((v) => v.id === t.vetId)?.nombre ?? action.por;
      let next: State = { ...state, turnos: state.turnos.map((x) => (x.id === t.id ? { ...x, estado: 'atendido' as const } : x)) };
      next = mapMascota(next, t.mascotaId, (m) => {
        let r = m.registros;
        const alta = (x: RegistroInput) => (r = [...r, { ...x, id: nextId(r) }]);
        if (c.diagnostico) alta({ tipo: 'enfermedad', titulo: c.diagnostico, desde: t.fecha, vigente: true });
        if (c.medicamento) alta({ tipo: 'medicacion', titulo: c.medicamento.titulo, detalle: c.medicamento.detalle, desde: t.fecha, vigente: true, plan: c.medicamento.plan && { ...c.medicamento.plan, dadas: [] } });
        const partes = [c.detalle, c.diagnostico && `Diagnóstico: ${c.diagnostico}`, c.medicamento && `Indicación: ${c.medicamento.titulo}${c.medicamento.detalle ? ' (' + c.medicamento.detalle + ')' : ''}`].filter(Boolean);
        const conNota = {
          ...m,
          registros: r,
          historial: [{ fecha: t.fecha, titulo: c.titulo, detalle: [vet, ...partes].join(' · ') }, ...m.historial],
          cambios: [{ cuando: ahora(), por: action.por, texto: `Registró la consulta: ${c.titulo}.${c.peso !== undefined ? ` Peso: ${String(c.peso).replace('.', ',')} kg.` : ''}` }, ...m.cambios],
        };
        return c.peso !== undefined ? pesar(conNota, c.peso, t.fecha) : conNota;
      });
      if (!c.cobro || c.cobro.monto <= 0) return next;
      return conMovimiento(next, { fecha: today(), hora: horaActual(), tipo: 'consulta', concepto: `${c.titulo} · ${m0.nombre}`, monto: c.cobro.monto, medio: c.cobro.medio, por: action.por });
    }
    case 'reprogramarTurno':
      return { ...state, turnos: state.turnos.map((t) => (t.id === action.id ? { ...t, fecha: action.fecha, hora: action.hora, motivo: action.motivo, vetId: action.vetId } : t)) };
    case 'addBloqueo':
      return { ...state, bloqueos: [...state.bloqueos, { ...action.bloqueo, id: nextId(state.bloqueos) }] };
    case 'removeBloqueo':
      return { ...state, bloqueos: state.bloqueos.filter((b) => b.id !== action.id) };

    case 'addEspera':
      if (state.esperas.some((e) => e.mascotaId === action.espera.mascotaId && e.fecha === action.espera.fecha)) return state;
      return { ...state, esperas: [...state.esperas, { ...action.espera, id: nextId(state.esperas) }] };
    case 'removeEspera':
      return { ...state, esperas: state.esperas.filter((e) => e.id !== action.id) };
    case 'avisarEspera':
      return { ...state, esperas: state.esperas.map((e) => (e.id === action.id ? { ...e, avisado: action.cuando } : e)) };

    case 'movimiento':
      return conMovimiento(state, action.mov);
    case 'cerrarCaja':
      return { ...state, cierres: [...state.cierres.filter((c) => c.fecha !== today()), { fecha: today(), hora: horaActual(), esperado: action.esperado, contado: action.contado, por: action.por }] };
    case 'addPlantilla':
      return { ...state, plantillas: [...state.plantillas, { ...action.plantilla, id: nextId(state.plantillas) }] };

    case 'reset':
      return fresh(state.clienteId, state.vetId);
  }
}

/** Lo que puede hacer cada rol en la vista de la veterinaria. */
export type Permiso = 'historia' | 'atender' | 'resumen';
const PERMISOS: Record<string, Permiso[]> = {
  veterinario: ['historia', 'atender', 'resumen'],
  recepcion: [],
};

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
    const veterinarios = state.veterinarios.filter((v) => v.rol === 'veterinario');
    const mascotasDe = (clienteId: number) => state.mascotas.filter((m) => m.clienteId === clienteId);
    const mascotas = state.clienteId === null ? [] : mascotasDe(state.clienteId);
    const ids = new Set(mascotas.map((m) => m.id));
    const turnos = state.turnos.filter((t) => ids.has(t.mascotaId)).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    const hoy = today();
    const mascota = (id: number) => state.mascotas.find((m) => m.id === id);
    const duenio = (mascotaId: number) => state.clientes.find((c) => c.id === mascota(mascotaId)?.clienteId);
    const nombreVet = (id: number | undefined) => state.veterinarios.find((v) => v.id === id)?.nombre ?? 'Cualquier profesional';
    const porVet = vet?.nombre ?? 'Veterinaria';
    const porCliente = cliente?.nombre ?? 'Cliente';

    /** Horarios libres para un motivo; sin vetId, con cualquiera (dice con quién). */
    const lugares = (fecha: string, motivo: Motivo, vetId?: number, excepto?: number) => {
      const vets = (vetId ? [vetId] : veterinarios.map((v) => v.id)).map((id) => ({ id, libres: libres(state.turnos, state.bloqueos, fecha, id, motivo, excepto) }));
      return HORARIOS.flatMap((hora) => {
        const quien = vets.find((v) => v.libres.includes(hora));
        return quien ? [{ hora, vetId: quien.id }] : [];
      });
    };

    return {
      state,
      hoy,
      veterinarios,
      nombreVet,
      profesional: (t: Turno) => nombreVet(t.vetId),
      lugares,

      /* ---------- Cliente ---------- */
      cliente,
      mascotas,
      proximos: turnos.filter((t) => t.estado !== 'atendido' && t.fecha >= hoy),
      anteriores: turnos.filter((t) => t.estado === 'atendido' || t.fecha < hoy).reverse(),
      misEsperas: state.esperas.filter((e) => e.clienteId === state.clienteId && e.fecha >= hoy),
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
      setWhatsapp: (valor: boolean) => cliente && dispatch({ type: 'setWhatsapp', id: cliente.id, valor }),
      /** Sin `clienteId` la mascota es del cliente que ingresó (y la carga él). */
      addMascota(data: MascotaInput, clienteId = state.clienteId) {
        if (clienteId === null) return -1;
        const id = nextId(state.mascotas);
        dispatch({ type: 'addMascota', id, clienteId, data, por: clienteId === state.clienteId && !vet ? porCliente : porVet });
        return id;
      },
      editMascota: (id: number, data: MascotaInput, por = porCliente) => dispatch({ type: 'editMascota', id, data, por }),
      deleteMascota: (id: number) => dispatch({ type: 'deleteMascota', id }),
      comprar: (productoId: number, cantidad: number, pago: 'mercadopago' | 'al_retirar') => dispatch({ type: 'comprar', productoId, cantidad, pago }),
      toggleRecordatorio: (id: number) => dispatch({ type: 'toggleRecordatorio', id }),
      marcarToma: (mascotaId: number, registroId: number, cuando: string) => dispatch({ type: 'toma', mascotaId, registroId, cuando, por: porCliente }),
      pedirTurno(data: { mascotaId: number; motivo: Motivo; fecha: string; hora: string; vetId: number; sena?: number }) {
        const id = nextId(state.turnos);
        dispatch({ type: 'pedirTurno', turno: { ...data, id, estado: 'pendiente' } });
        return id;
      },
      cancelarTurno: (id: number) => dispatch({ type: 'cancelarTurno', id }),
      reprogramarTurno: (id: number, fecha: string, hora: string, motivo: Motivo, vetId: number) => dispatch({ type: 'reprogramarTurno', id, fecha, hora, motivo, vetId }),
      anotarEspera: (e: { mascotaId: number; motivo: Motivo; fecha: string; vetId?: number }) => cliente && dispatch({ type: 'addEspera', espera: { ...e, clienteId: cliente.id } }),
      removeEspera: (id: number) => dispatch({ type: 'removeEspera', id }),

      /* ---------- Veterinaria ---------- */
      vet,
      puede: (p: Permiso) => !!vet && PERMISOS[vet.rol].includes(p),
      clientes: state.clientes,
      mascotasDe,
      duenio,
      turnosDel: (fecha: string, vetId?: number) => state.turnos.filter((t) => t.fecha === fecha && (!vetId || t.vetId === vetId)).sort((a, b) => a.hora.localeCompare(b.hora) || a.vetId - b.vetId),
      /** Vacunas vencidas de todas las mascotas. */
      vencidas: state.mascotas.flatMap((m) => m.vacunas.filter((v) => daysBetween(hoy, v.proxima) < 0).map((v) => ({ mascota: m, vacuna: v }))),
      /** Lista de espera, con los lugares que hay hoy para cada uno. */
      esperas: state.esperas
        .filter((e) => e.fecha >= hoy)
        .map((e) => ({ ...e, lugares: lugares(e.fecha, e.motivo, e.vetId) }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),

      loginVet(id: number) {
        if (!state.veterinarios.some((v) => v.id === id)) return false;
        dispatch({ type: 'loginVet', vetId: id });
        return true;
      },
      logoutVet: () => dispatch({ type: 'logoutVet' }),
      addCliente(data: ClienteInput) {
        const id = Math.max(...state.clientes.map((c) => c.id), 1023) + 1;
        dispatch({ type: 'addCliente', cliente: { id, ...data, whatsapp: true } });
        return id;
      },
      editCliente: (id: number, data: ClienteInput) => dispatch({ type: 'editCliente', id, data }),
      deleteCliente: (id: number) => dispatch({ type: 'deleteCliente', id }),
      editMascotaVet: (id: number, data: MascotaInput) => dispatch({ type: 'editMascota', id, data, por: porVet }),
      registrarVacuna: (mascotaId: number, vacuna: Vacuna, avisar: boolean) => dispatch({ type: 'registrarVacuna', mascotaId, vacuna, avisar, por: porVet }),
      addRegistro: (mascotaId: number, registro: RegistroInput) => dispatch({ type: 'addRegistro', mascotaId, registro, por: porVet }),
      editRegistro: (mascotaId: number, registro: Registro) => dispatch({ type: 'editRegistro', mascotaId, registro, por: porVet }),
      removeRegistro: (mascotaId: number, id: number) => dispatch({ type: 'removeRegistro', mascotaId, id, por: porVet }),
      addNota: (mascotaId: number, titulo: string, detalle: string) => dispatch({ type: 'addNota', mascotaId, titulo, detalle, por: porVet }),
      addAdjunto: (mascotaId: number, a: Omit<Adjunto, 'por'>) => dispatch({ type: 'addAdjunto', mascotaId, adjunto: { ...a, por: porVet } }),
      removeAdjunto: (mascotaId: number, id: number) => dispatch({ type: 'removeAdjunto', mascotaId, id, por: porVet }),
      addProducto: (producto: Producto) => dispatch({ type: 'addProducto', producto, por: porVet }),
      editProducto: (producto: Producto) => dispatch({ type: 'editProducto', producto }),
      deleteProducto: (id: number) => dispatch({ type: 'deleteProducto', id }),
      entradaStock: (productoId: number, cantidad: number, detalle?: string, vence?: string) => dispatch({ type: 'entradaStock', productoId, cantidad, detalle, vence, por: porVet }),
      ajustarStock: (productoId: number, nuevo: number, motivo: string) => dispatch({ type: 'ajustarStock', productoId, nuevo, motivo, por: porVet }),
      avisar: (avisos: { clienteId: number; titulo: string; fecha: string }[]) => dispatch({ type: 'avisar', avisos }),
      llego: (id: number) => dispatch({ type: 'estadoTurno', id, estado: 'en_espera', llegada: horaActual() }),
      pasarAConsulta: (id: number) => dispatch({ type: 'estadoTurno', id, estado: 'en_consulta' }),
      atender: (consulta: Consulta) => dispatch({ type: 'atender', consulta, por: porVet }),
      bloqueos: state.bloqueos,
      addBloqueo: (bloqueo: Omit<Bloqueo, 'id'>) => dispatch({ type: 'addBloqueo', bloqueo }),
      removeBloqueo: (id: number) => dispatch({ type: 'removeBloqueo', id }),
      avisarEspera: (id: number) => dispatch({ type: 'avisarEspera', id, cuando: ahora() }),
      cobrarCompra: (id: number, medio: Medio) => dispatch({ type: 'cobrarCompra', id, medio, por: porVet }),
      registrarMovimiento: (tipo: 'ingreso' | 'egreso', concepto: string, monto: number, medio: Medio) =>
        dispatch({ type: 'movimiento', mov: { fecha: today(), hora: horaActual(), tipo, concepto, monto, medio, por: porVet } }),
      cerrarCaja: (contado: number, esperado: number) => dispatch({ type: 'cerrarCaja', contado, esperado, por: porVet }),
      addPlantilla: (p: Omit<Plantilla, 'id'>) => dispatch({ type: 'addPlantilla', plantilla: p }),
      precioConsulta: (t: Turno) => Math.max(0, PRECIO[t.motivo] - (t.sena ?? 0)),
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


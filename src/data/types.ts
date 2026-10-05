/*
 * Modelo de datos. Cliente, Mascota, Producto e Inventario vienen de Sistema.sql
 * del proyecto original en PHP; Vacuna, Nota, Turno y Recordatorio son las tablas nuevas.
 */

export type Especie = 'perro' | 'gato';

export interface Cliente {
  id: number;
  nombre: string;
  dni: string;
}

export interface Veterinario {
  id: number;
  nombre: string;
  especialidad: string;
}

export interface Vacuna {
  nombre: string;
  /** Fechas en formato ISO (AAAA-MM-DD). */
  aplicada: string;
  proxima: string;
}

/** Alergias y medicación. */
export interface Indicacion {
  titulo: string;
  detalle: string;
  tipo: 'alergia' | 'medicacion';
}

export interface EntradaHistorial {
  fecha: string;
  titulo: string;
  detalle?: string;
}

export interface Mascota {
  id: number;
  clienteId: number;
  nombre: string;
  especie: Especie;
  edad: number;
  raza: string;
  peso?: number;
  vacunas: Vacuna[];
  indicaciones: Indicacion[];
  historial: EntradaHistorial[];
}

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
}

/** Inventario del código original: lo que compró cada cliente. */
export interface Compra {
  clienteId: number;
  productoId: number;
  cantidad: number;
}

export type Motivo = 'Control' | 'Vacuna' | 'Consulta';

export interface Turno {
  id: number;
  mascotaId: number;
  fecha: string;
  hora: string;
  motivo: Motivo;
  profesional: string;
  atendido: boolean;
}

export interface Recordatorio {
  id: number;
  clienteId: number;
  titulo: string;
  /** Fecha del aviso; sin fecha es un recordatorio periódico. */
  fecha?: string;
  frecuencia?: string;
  activo: boolean;
}

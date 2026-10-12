/*
 * Modelo de datos. Cliente, Mascota, Producto e Inventario vienen de Sistema.sql
 * del proyecto original en PHP; el resto son tablas nuevas (ver docs/sistema-ampliado.sql).
 */

export type Especie = 'perro' | 'gato';

export interface Cliente {
  id: number;
  nombre: string;
  dni: string;
  /** Celular con característica, sin el 0 ni el 15: 249 455-1234. */
  telefono: string;
  /** Quiere los recordatorios también por WhatsApp. */
  whatsapp: boolean;
}

/** Quién usa la vista de la veterinaria: recepción no ve la historia clínica completa ni el resumen. */
export type Rol = 'veterinario' | 'recepcion';

/** Persona del equipo (veterinarios y recepción). */
export interface Veterinario {
  id: number;
  nombre: string;
  especialidad: string;
  rol: Rol;
}

export interface Vacuna {
  nombre: string;
  /** Fechas en formato ISO (AAAA-MM-DD). */
  aplicada: string;
  proxima: string;
}

/**
 * Historia clínica por partes, para que el veterinario encuentre rápido lo que busca.
 * - alergia: a qué es alérgica la mascota y qué reacción tuvo.
 * - medicacion: medicamento y dosis; vigente = la está tomando.
 * - enfermedad: diagnóstico; vigente = activa o crónica, si no, resuelta.
 * - bien / mal: un tratamiento, alimento o producto que le hizo bien o mal.
 */
export type TipoRegistro = 'alergia' | 'medicacion' | 'enfermedad' | 'bien' | 'mal';

export interface Registro {
  id: number;
  tipo: TipoRegistro;
  titulo: string;
  detalle?: string;
  /** Fecha ISO desde la que corre (o en la que pasó). */
  desde?: string;
  vigente: boolean;
  /** Solo medicación: el plan de tomas que el dueño sigue en casa. */
  plan?: PlanTomas;
}

/** Cada cuántas horas y durante cuántos días; el dueño marca cada toma desde la app. */
export interface PlanTomas {
  cadaHoras: number;
  dias: number;
  /** Primer día (ISO) y hora de la primera toma (HH:MM). */
  inicio: string;
  hora: string;
  /** Tomas dadas: "AAAA-MM-DD HH:MM". */
  dadas: string[];
}

/** Estudios y fotos de la historia clínica. El archivo vive en el navegador (IndexedDB). */
export interface Adjunto {
  id: number;
  nombre: string;
  tipo: 'imagen' | 'pdf';
  fecha: string;
  nota?: string;
  /** Vista previa chica (data URL) para la lista; el archivo entero se busca por id. */
  miniatura?: string;
  por: string;
}

/** Historial de cambios de la ficha: quién hizo qué y cuándo. */
export interface Cambio {
  /** "AAAA-MM-DD HH:MM" */
  cuando: string;
  por: string;
  texto: string;
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
  /** Cada vez que se la pesa (en la consulta o al editar sus datos). */
  pesos: Pesaje[];
  vacunas: Vacuna[];
  registros: Registro[];
  historial: EntradaHistorial[];
  adjuntos: Adjunto[];
  cambios: Cambio[];
}

export interface Pesaje {
  fecha: string;
  kg: number;
}

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  /** Con esta cantidad o menos, se avisa que queda poco. */
  minimo: number;
  /** Para lo que se termina (alimento, arena, pipetas): cada cuántos días se suele volver a comprar. */
  duraDias?: number;
}

export type Medio = 'Efectivo' | 'Débito' | 'Crédito' | 'Transferencia' | 'Mercado Pago';

/** Inventario del código original: lo que compró cada cliente. */
export interface Compra {
  id: number;
  clienteId: number;
  productoId: number;
  cantidad: number;
  fecha: string;
  /** Pagada en la app (Mercado Pago) o se paga al retirar en la veterinaria. */
  pago: 'mercadopago' | 'al_retirar';
  cobrada: boolean;
}

/** Entradas y salidas de stock: lo que llega del proveedor, lo que se vende y los ajustes. */
export interface MovStock {
  id: number;
  fecha: string;
  productoId: number;
  /** Positivo entra, negativo sale. */
  cantidad: number;
  tipo: 'entrada' | 'venta' | 'ajuste';
  detalle?: string;
  /** Vencimiento del lote que entró (vacunas, medicamentos, alimento). */
  vence?: string;
  por: string;
}

/** Caja del día: cada cobro, venta, seña o gasto. */
export interface Movimiento {
  id: number;
  fecha: string;
  hora: string;
  tipo: 'consulta' | 'venta' | 'sena' | 'fondo' | 'ingreso' | 'egreso';
  concepto: string;
  /** Siempre positivo; los egresos restan. */
  monto: number;
  medio: Medio;
  por: string;
}

export interface CierreCaja {
  fecha: string;
  hora: string;
  esperado: number;
  contado: number;
  por: string;
}

export type Motivo = 'Control' | 'Vacuna' | 'Consulta' | 'Cirugía';

/** pendiente → en_espera (llegó) → en_consulta → atendido. */
export type EstadoTurno = 'pendiente' | 'en_espera' | 'en_consulta' | 'atendido';

export interface Turno {
  id: number;
  mascotaId: number;
  fecha: string;
  hora: string;
  motivo: Motivo;
  vetId: number;
  estado: EstadoTurno;
  /** Hora en que llegó a la sala de espera (HH:MM). */
  llegada?: string;
  /** Seña pagada al pedir el turno desde la app. */
  sena?: number;
}

/** Lista de espera: quería un día que estaba lleno; se le avisa si se libera un lugar. */
export interface Espera {
  id: number;
  clienteId: number;
  mascotaId: number;
  motivo: Motivo;
  fecha: string;
  /** Sin vetId, le sirve con cualquiera. */
  vetId?: number;
  /** Cuándo se le avisó por WhatsApp ("AAAA-MM-DD HH:MM"). */
  avisado?: string;
}

/** Plantilla de consulta: completa el formulario de Atender. */
export interface Plantilla {
  id: number;
  nombre: string;
  titulo: string;
  detalle: string;
  diagnostico?: string;
  medicamento?: string;
  dosis?: string;
}

/** Horario en que no se dan turnos (cirugía, vacaciones, capacitación). */
export interface Bloqueo {
  id: number;
  fecha: string;
  /** Sin desde/hasta, es todo el día. Formato HH:MM; hasta no incluido. */
  desde?: string;
  hasta?: string;
  motivo: string;
  /** Sin vetId, no se dan turnos con nadie (feriado, capacitación). */
  vetId?: number;
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

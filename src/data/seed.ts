import { addDays, addYears, diaMes, fromIso, nextWorkdays, today } from '../lib/dates';
import type { Cliente, Compra, Mascota, Producto, Recordatorio, Turno, Veterinario } from './types';

/**
 * Datos de ejemplo. Las fechas se calculan desde hoy para que la demo siempre
 * tenga turnos próximos, una vacuna vencida y una desparasitación en 15 días.
 */
export interface SeedData {
  veterinarios: Veterinario[];
  clientes: Cliente[];
  mascotas: Mascota[];
  productos: Producto[];
  compras: Compra[];
  turnos: Turno[];
  recordatorios: Recordatorio[];
}

export function createSeed(hoy = today()): SeedData {
  const d = (n: number) => addDays(hoy, n);
  /** Día hábil más cercano hacia atrás (los turnos pasados no caen en fin de semana). */
  const habil = (n: number) => {
    let x = d(n);
    while ([0, 6].includes(fromIso(x).getDay())) x = addDays(x, -1);
    return x;
  };
  const dias = nextWorkdays(25, hoy);

  const veterinarios: Veterinario[] = [
    { id: 7, nombre: 'Dra. Paz Ruiz', especialidad: 'Clínica general' },
    { id: 8, nombre: 'Dr. Tomás Vera', especialidad: 'Dermatología' },
  ];

  const clientes: Cliente[] = [
    { id: 1024, nombre: 'Marta Gómez', dni: '30456789' },
    { id: 1025, nombre: 'Julián Pereyra', dni: '28112004' },
    { id: 1026, nombre: 'Sofía Álvarez', dni: '35870221' },
    { id: 1027, nombre: 'Carlos Benítez', dni: '22903517' },
    { id: 1028, nombre: 'Lucía Ferreyra', dni: '40215668' },
    { id: 1029, nombre: 'Ramiro Ortiz', dni: '33004912' },
  ];

  const mascotas: Mascota[] = [
    {
      id: 1,
      clienteId: 1024,
      nombre: 'Luna',
      especie: 'perro',
      edad: 4,
      raza: 'Mestiza',
      peso: 12,
      vacunas: [
        { nombre: 'Antirrábica', aplicada: d(-207), proxima: addYears(d(-207), 1) },
        { nombre: 'Séxtuple', aplicada: d(-227), proxima: addYears(d(-227), 1) },
        { nombre: 'Tos de las perreras', aplicada: d(-395), proxima: d(-30) },
      ],
      indicaciones: [
        { titulo: 'Amoxicilina', detalle: 'Alergia: no recetar', tipo: 'alergia' },
        { titulo: 'Antiparasitario interno', detalle: `Cada 3 meses · próxima dosis ${diaMes(d(15))}`, tipo: 'medicacion' },
      ],
      historial: [
        { fecha: habil(-23), titulo: 'Control anual', detalle: 'Dra. Paz Ruiz · Pesa 12 kg, todo bien.' },
        { fecha: d(-63), titulo: 'Desparasitación' },
        { fecha: habil(-143), titulo: 'Consulta por picazón', detalle: 'Dermatitis leve, se indicó shampoo neutro.' },
      ],
    },
    {
      id: 2,
      clienteId: 1024,
      nombre: 'Michi',
      especie: 'gato',
      edad: 2,
      raza: 'Europeo común',
      peso: 4,
      vacunas: [
        { nombre: 'Antirrábica', aplicada: addYears(d(29), -1), proxima: d(29) },
        { nombre: 'Triple felina', aplicada: d(-120), proxima: addYears(d(-120), 1) },
      ],
      indicaciones: [],
      historial: [{ fecha: d(-300), titulo: 'Castración', detalle: 'Recuperación sin complicaciones.' }],
    },
    { id: 3, clienteId: 1025, nombre: 'Toby', especie: 'perro', edad: 6, raza: 'Caniche', vacunas: [], indicaciones: [], historial: [] },
    { id: 4, clienteId: 1026, nombre: 'Nala', especie: 'gato', edad: 3, raza: 'Siamés', vacunas: [], indicaciones: [], historial: [] },
    {
      id: 5,
      clienteId: 1027,
      nombre: 'Rocco',
      especie: 'perro',
      edad: 8,
      raza: 'Labrador',
      vacunas: [{ nombre: 'Antirrábica', aplicada: d(-400), proxima: d(-35) }],
      indicaciones: [],
      historial: [],
    },
    { id: 6, clienteId: 1029, nombre: 'Coco', especie: 'perro', edad: 1, raza: 'Beagle', vacunas: [], indicaciones: [], historial: [] },
    { id: 7, clienteId: 1029, nombre: 'Mora', especie: 'gato', edad: 5, raza: 'Mestiza', vacunas: [], indicaciones: [], historial: [] },
  ];

  const productos: Producto[] = [
    { id: 101, nombre: 'Alimento balanceado adulto 3 kg', precio: 18900, stock: 12 },
    { id: 102, nombre: 'Pipeta antipulgas perro mediano', precio: 9500, stock: 30 },
    { id: 103, nombre: 'Collar antiparasitario', precio: 14200, stock: 8 },
    { id: 104, nombre: 'Shampoo neutro 250 ml', precio: 6300, stock: 15 },
    { id: 105, nombre: 'Arena sanitaria 4 kg', precio: 7800, stock: 0 },
  ];

  const compras: Compra[] = [
    { clienteId: 1024, productoId: 102, cantidad: 2 },
    { clienteId: 1024, productoId: 101, cantidad: 1 },
  ];

  const turnos: Turno[] = [
    { id: 1, mascotaId: 1, fecha: dias[1], hora: '10:30', motivo: 'Control', profesional: 'Dra. Paz Ruiz', atendido: false },
    { id: 2, mascotaId: 2, fecha: dias[19], hora: '17:00', motivo: 'Vacuna', profesional: 'Dra. Paz Ruiz', atendido: false },
    { id: 5, mascotaId: 3, fecha: dias[1], hora: '09:30', motivo: 'Vacuna', profesional: 'Dra. Paz Ruiz', atendido: false },
    { id: 6, mascotaId: 4, fecha: dias[1], hora: '11:00', motivo: 'Consulta', profesional: 'Dr. Tomás Vera', atendido: false },
    { id: 7, mascotaId: 5, fecha: dias[1], hora: '16:00', motivo: 'Control', profesional: 'Dra. Paz Ruiz', atendido: false },
    { id: 8, mascotaId: 6, fecha: dias[2], hora: '09:30', motivo: 'Vacuna', profesional: 'Dra. Paz Ruiz', atendido: false },
    { id: 3, mascotaId: 1, fecha: habil(-23), hora: '11:00', motivo: 'Control', profesional: 'Dra. Paz Ruiz', atendido: true },
    { id: 4, mascotaId: 1, fecha: habil(-143), hora: '18:30', motivo: 'Consulta', profesional: 'Dr. Tomás Vera', atendido: true },
  ];

  const recordatorios: Recordatorio[] = [
    { id: 1, clienteId: 1024, titulo: 'Desparasitar a Luna', fecha: d(15), activo: true },
    { id: 2, clienteId: 1024, titulo: 'Vacuna antirrábica de Michi', fecha: d(29), activo: true },
    { id: 3, clienteId: 1024, titulo: 'Turnos', frecuencia: 'Un día antes de cada turno', activo: true },
    { id: 4, clienteId: 1024, titulo: 'Comprar alimento', frecuencia: 'Cada 30 días', activo: false },
  ];

  return { veterinarios, clientes, mascotas, productos, compras, turnos, recordatorios };
}

import { addDays, addYears, diaMes, fromIso, nextWorkdays, today } from '../lib/dates';
import type { Bloqueo, CierreCaja, Cliente, Compra, Espera, Mascota, MovStock, Movimiento, Plantilla, Producto, Recordatorio, Turno, Veterinario } from './types';

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
  bloqueos: Bloqueo[];
  recordatorios: Recordatorio[];
  esperas: Espera[];
  movStock: MovStock[];
  movimientos: Movimiento[];
  cierres: CierreCaja[];
  plantillas: Plantilla[];
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
    { id: 7, nombre: 'Dra. Paz Ruiz', especialidad: 'Clínica general', rol: 'veterinario' },
    { id: 8, nombre: 'Dr. Tomás Vera', especialidad: 'Dermatología', rol: 'veterinario' },
    { id: 9, nombre: 'Ana Sosa', especialidad: 'Recepción', rol: 'recepcion' },
  ];

  const clientes: Cliente[] = [
    { id: 1024, nombre: 'Marta Gómez', dni: '30456789', telefono: '249 455-1820', whatsapp: true },
    { id: 1025, nombre: 'Julián Pereyra', dni: '28112004', telefono: '249 430-7716', whatsapp: false },
    { id: 1026, nombre: 'Sofía Álvarez', dni: '35870221', telefono: '249 462-0394', whatsapp: true },
    { id: 1027, nombre: 'Carlos Benítez', dni: '22903517', telefono: '249 448-2251', whatsapp: false },
    { id: 1028, nombre: 'Lucía Ferreyra', dni: '40215668', telefono: '249 471-6608', whatsapp: true },
    { id: 1029, nombre: 'Ramiro Ortiz', dni: '33004912', telefono: '249 437-9142', whatsapp: true },
  ];

  const ahora = (n: number, h: string) => `${d(n)} ${h}`;

  // Luna está con gotas para una otitis desde hace unos días; la dueña marca cada toma.
  const gotas = habil(-2);
  const dadasGotas: string[] = [];
  for (let x = gotas; x <= hoy; x = addDays(x, 1)) for (const h of ['08:00', '20:00']) if (x < hoy || h === '08:00') dadasGotas.push(`${x} ${h}`);
  dadasGotas.splice(3, 1); // una que se le pasó

  const base: Omit<Mascota, 'adjuntos' | 'cambios'>[] = [
    {
      id: 1,
      clienteId: 1024,
      nombre: 'Luna',
      especie: 'perro',
      edad: 4,
      raza: 'Mestiza',
      peso: 12,
      pesos: [
        { fecha: habil(-420), kg: 10.6 },
        { fecha: habil(-260), kg: 11.3 },
        { fecha: habil(-143), kg: 11.9 },
        { fecha: habil(-63), kg: 12.4 },
        { fecha: habil(-23), kg: 12 },
      ],
      vacunas: [
        { nombre: 'Antirrábica', aplicada: d(-207), proxima: addYears(d(-207), 1) },
        { nombre: 'Séxtuple', aplicada: d(-227), proxima: addYears(d(-227), 1) },
        { nombre: 'Tos de las perreras', aplicada: d(-395), proxima: d(-30) },
      ],
      registros: [
        { id: 1, tipo: 'alergia', titulo: 'Amoxicilina', detalle: 'Urticaria y picazón en la cara. No recetar.', desde: habil(-420), vigente: true },
        { id: 2, tipo: 'medicacion', titulo: 'Antiparasitario interno', detalle: `Cada 3 meses · próxima dosis ${diaMes(d(15))}`, desde: d(-63), vigente: true },
        { id: 3, tipo: 'medicacion', titulo: 'Omega 3', detalle: 'Una cápsula por día, con la comida, para la piel.', desde: habil(-143), vigente: true },
        { id: 4, tipo: 'enfermedad', titulo: 'Dermatitis', detalle: 'Leve, por contacto.', desde: habil(-143), vigente: false },
        { id: 5, tipo: 'bien', titulo: 'Shampoo neutro', detalle: 'La picazón bajó en dos semanas.', desde: habil(-143), vigente: true },
        { id: 6, tipo: 'mal', titulo: 'Alimento con pollo', detalle: 'Vómitos y picazón. Pasó a alimento de cordero.', desde: habil(-260), vigente: true },
        { id: 7, tipo: 'enfermedad', titulo: 'Otitis externa', detalle: 'Oído derecho.', desde: gotas, vigente: true },
        {
          id: 8,
          tipo: 'medicacion',
          titulo: 'Gotas para los oídos',
          detalle: '5 gotas en el oído derecho, cada 12 horas, 7 días.',
          desde: gotas,
          vigente: true,
          plan: { cadaHoras: 12, dias: 7, inicio: gotas, hora: '08:00', dadas: dadasGotas },
        },
      ],
      historial: [
        { fecha: gotas, titulo: 'Consulta por otitis', detalle: 'Dr. Tomás Vera · Otitis externa en el oído derecho. Gotas cada 12 horas, 7 días.' },
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
      pesos: [
        { fecha: habil(-300), kg: 3.4 },
        { fecha: habil(-120), kg: 3.9 },
        { fecha: habil(-9), kg: 4 },
      ],
      vacunas: [
        { nombre: 'Antirrábica', aplicada: addYears(d(29), -1), proxima: d(29) },
        { nombre: 'Triple felina', aplicada: d(-120), proxima: addYears(d(-120), 1) },
      ],
      registros: [{ id: 1, tipo: 'enfermedad', titulo: 'Gingivitis', detalle: 'Leve. Revisar la boca en cada control.', desde: habil(-120), vigente: true }],
      historial: [{ fecha: d(-300), titulo: 'Castración', detalle: 'Recuperación sin complicaciones.' }],
    },
    {
      id: 3,
      clienteId: 1025,
      nombre: 'Toby',
      especie: 'perro',
      edad: 6,
      raza: 'Caniche',
      peso: 7.2,
      pesos: [{ fecha: habil(-12), kg: 7.2 }],
      vacunas: [{ nombre: 'Séxtuple', aplicada: habil(-12), proxima: addYears(habil(-12), 1) }],
      registros: [],
      historial: [{ fecha: habil(-12), titulo: 'Vacuna', detalle: 'Séxtuple anual.' }],
    },
    {
      id: 4,
      clienteId: 1026,
      nombre: 'Nala',
      especie: 'gato',
      edad: 3,
      raza: 'Siamés',
      peso: 3.8,
      pesos: [{ fecha: habil(-5), kg: 3.8 }],
      vacunas: [{ nombre: 'Triple felina', aplicada: habil(-5), proxima: addYears(habil(-5), 1) }],
      registros: [],
      historial: [{ fecha: habil(-5), titulo: 'Vacuna', detalle: 'Triple felina.' }],
    },
    {
      id: 5,
      clienteId: 1027,
      nombre: 'Rocco',
      especie: 'perro',
      edad: 8,
      raza: 'Labrador',
      peso: 31,
      pesos: [
        { fecha: habil(-500), kg: 34 },
        { fecha: habil(-260), kg: 32.5 },
        { fecha: habil(-16), kg: 31 },
      ],
      vacunas: [{ nombre: 'Antirrábica', aplicada: d(-400), proxima: d(-35) }],
      registros: [
        { id: 1, tipo: 'enfermedad', titulo: 'Artrosis de cadera', detalle: 'Crónica. Evitar escaleras y saltos.', desde: habil(-500), vigente: true },
        { id: 2, tipo: 'medicacion', titulo: 'Condroprotector', detalle: 'Un comprimido por día.', desde: habil(-500), vigente: true },
      ],
      historial: [],
    },
    {
      id: 6,
      clienteId: 1029,
      nombre: 'Coco',
      especie: 'perro',
      edad: 1,
      raza: 'Beagle',
      peso: 11,
      pesos: [
        { fecha: habil(-110), kg: 8.5 },
        { fecha: habil(-20), kg: 11 },
      ],
      vacunas: [{ nombre: 'Séxtuple', aplicada: habil(-20), proxima: d(18) }],
      registros: [],
      historial: [{ fecha: habil(-20), titulo: 'Vacuna', detalle: 'Segunda dosis de séxtuple; la tercera, en 5 semanas.' }],
    },
    { id: 7, clienteId: 1029, nombre: 'Mora', especie: 'gato', edad: 5, raza: 'Mestiza', pesos: [], vacunas: [], registros: [], historial: [] },
  ];

  // Historial de cambios de la ficha (quién cargó o modificó qué).
  const cambiosLuna = [
    { cuando: ahora(-23, '11:24'), por: 'Dra. Paz Ruiz', texto: 'Registró el control anual. Peso: 12 kg.' },
    { cuando: `${gotas} 16:41`, por: 'Dr. Tomás Vera', texto: 'Agregó en Enfermedades: Otitis externa.' },
    { cuando: `${gotas} 16:42`, por: 'Dr. Tomás Vera', texto: 'Indicó Gotas para los oídos, cada 12 horas, 7 días.' },
    { cuando: `${hoy} 08:05`, por: 'Marta Gómez', texto: 'Marcó la toma de las 08:00 de Gotas para los oídos.' },
  ];
  const mascotas: Mascota[] = base.map((m) => ({ ...m, adjuntos: [], cambios: m.id === 1 ? cambiosLuna.reverse() : [] }));

  const productos: Producto[] = [
    { id: 101, nombre: 'Alimento balanceado adulto 3 kg', precio: 18900, stock: 12, minimo: 6, duraDias: 30 },
    { id: 102, nombre: 'Pipeta antipulgas perro mediano', precio: 9500, stock: 30, minimo: 10, duraDias: 30 },
    { id: 103, nombre: 'Collar antiparasitario', precio: 14200, stock: 8, minimo: 10, duraDias: 180 },
    { id: 104, nombre: 'Shampoo neutro 250 ml', precio: 6300, stock: 15, minimo: 5 },
    { id: 105, nombre: 'Arena sanitaria 4 kg', precio: 7800, stock: 0, minimo: 5, duraDias: 20 },
  ];

  const pagada = { pago: 'mercadopago' as const, cobrada: true };
  const alRetirar = { pago: 'al_retirar' as const, cobrada: true };
  const compras: Compra[] = [
    { id: 1, clienteId: 1024, productoId: 102, cantidad: 2, fecha: habil(-6), ...pagada },
    { id: 2, clienteId: 1024, productoId: 101, cantidad: 1, fecha: habil(-27), ...alRetirar },
    { id: 3, clienteId: 1025, productoId: 101, cantidad: 2, fecha: habil(-2), ...pagada },
    { id: 4, clienteId: 1026, productoId: 105, cantidad: 3, fecha: habil(-4), ...alRetirar },
    { id: 5, clienteId: 1027, productoId: 103, cantidad: 1, fecha: habil(-8), ...pagada },
    { id: 6, clienteId: 1029, productoId: 102, cantidad: 4, fecha: habil(-11), ...alRetirar },
    { id: 7, clienteId: 1025, productoId: 104, cantidad: 1, fecha: habil(-15), ...pagada },
    { id: 8, clienteId: 1029, productoId: 103, cantidad: 1, fecha: habil(-19), ...alRetirar },
    { id: 9, clienteId: 1026, productoId: 105, cantidad: 2, fecha: habil(-22), ...pagada },
    { id: 10, clienteId: 1027, productoId: 101, cantidad: 2, fecha: habil(-25), ...alRetirar },
    { id: 11, clienteId: 1028, productoId: 102, cantidad: 1, fecha: habil(-45), ...pagada },
    // Hoy: una pagada en la app y una que se cobra cuando la retiren.
    { id: 12, clienteId: 1029, productoId: 102, cantidad: 1, fecha: hoy, ...pagada },
    { id: 13, clienteId: 1025, productoId: 104, cantidad: 2, fecha: hoy, pago: 'al_retirar', cobrada: false },
  ];

  const PAZ = 7;
  const VERA = 8;
  const t = (id: number, mascotaId: number, fecha: string, hora: string, motivo: Turno['motivo'], vetId: number, estado: Turno['estado'] = 'atendido', extra: Partial<Turno> = {}): Turno => ({ id, mascotaId, fecha, hora, motivo, vetId, estado, ...extra });
  const esHabil = ![0, 6].includes(fromIso(hoy).getDay());

  const turnos: Turno[] = [
    t(1, 1, dias[1], '10:30', 'Control', PAZ, 'pendiente', { sena: 5000 }),
    t(2, 2, dias[19], '17:00', 'Vacuna', PAZ, 'pendiente'),
    t(5, 3, dias[1], '09:30', 'Vacuna', PAZ, 'pendiente'),
    t(6, 4, dias[1], '11:00', 'Consulta', VERA, 'pendiente', { sena: 5000 }),
    t(7, 5, dias[1], '16:00', 'Control', PAZ, 'pendiente'),
    t(8, 6, dias[2], '09:30', 'Vacuna', VERA, 'pendiente'),
    // La Dra. Ruiz tiene ese día completo: hay gente en lista de espera.
    t(20, 5, dias[2], '09:00', 'Cirugía', PAZ, 'pendiente'),
    t(21, 7, dias[2], '11:00', 'Consulta', PAZ, 'pendiente', { sena: 5000 }),
    t(22, 2, dias[2], '12:00', 'Control', PAZ, 'pendiente'),
    t(23, 3, dias[2], '16:00', 'Cirugía', PAZ, 'pendiente'),
    t(24, 4, dias[2], '18:00', 'Consulta', PAZ, 'pendiente'),
    t(3, 1, habil(-23), '11:00', 'Control', PAZ),
    t(4, 1, habil(-143), '17:30', 'Consulta', VERA),
    // Últimos 30 días: lo que muestra el resumen del mes.
    t(9, 4, habil(-5), '10:30', 'Vacuna', PAZ),
    t(10, 2, habil(-9), '16:00', 'Control', PAZ),
    t(11, 3, habil(-12), '09:30', 'Vacuna', PAZ),
    t(12, 5, habil(-16), '11:00', 'Control', PAZ),
    t(13, 6, habil(-20), '10:30', 'Vacuna', PAZ),
    t(14, 7, habil(-3), '17:30', 'Consulta', VERA),
    t(15, 5, habil(-1), '09:30', 'Consulta', VERA),
    t(16, 4, habil(-26), '16:00', 'Consulta', VERA),
    t(17, 7, habil(-17), '11:00', 'Control', PAZ),
    t(18, 1, gotas, '16:00', 'Consulta', VERA),
    // Hoy: la sala de espera.
    ...(esHabil
      ? [
          t(30, 7, hoy, '09:00', 'Control', PAZ),
          t(31, 6, hoy, '10:00', 'Consulta', PAZ, 'en_consulta', { llegada: '09:54' }),
          t(32, 5, hoy, '11:00', 'Control', VERA, 'en_espera', { llegada: '10:51' }),
          t(33, 3, hoy, '11:30', 'Vacuna', PAZ, 'en_espera', { llegada: '11:18' }),
          t(34, 4, hoy, '16:00', 'Consulta', VERA, 'pendiente', { sena: 5000 }),
          t(35, 2, hoy, '17:30', 'Control', PAZ, 'pendiente'),
        ]
      : []),
  ];

  const bloqueos: Bloqueo[] = [
    { id: 1, fecha: dias[3], desde: '16:00', hasta: '19:00', motivo: 'Cirugía programada', vetId: PAZ },
    { id: 2, fecha: dias[8], motivo: 'Capacitación' },
  ];

  const esperas: Espera[] = [
    { id: 1, clienteId: 1024, mascotaId: 1, motivo: 'Consulta', fecha: dias[2], vetId: PAZ },
    { id: 2, clienteId: 1025, mascotaId: 3, motivo: 'Control', fecha: dias[3] },
  ];

  // Stock: lo que entró del proveedor y lo que se vendió (las compras de los clientes).
  const movStock: MovStock[] = [];
  let ms = 0;
  for (const p of productos) {
    const vendidas = compras.filter((c) => c.productoId === p.id).reduce((n, c) => n + c.cantidad, 0);
    movStock.push({ id: ++ms, fecha: habil(-50), productoId: p.id, cantidad: p.stock + vendidas, tipo: 'entrada', detalle: 'Distribuidora del Centro · remito 0012-4471', vence: p.id === 101 ? addDays(hoy, 240) : undefined, por: 'Ana Sosa' });
  }
  for (const c of [...compras].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    movStock.push({ id: ++ms, fecha: c.fecha, productoId: c.productoId, cantidad: -c.cantidad, tipo: 'venta', detalle: clientes.find((x) => x.id === c.clienteId)?.nombre, por: 'Tienda' });
  }

  // Caja de hoy.
  const movimientos: Movimiento[] = esHabil
    ? [
        { id: 1, fecha: hoy, hora: '08:52', tipo: 'fondo', concepto: 'Fondo de caja', monto: 20000, medio: 'Efectivo', por: 'Ana Sosa' },
        { id: 2, fecha: hoy, hora: '09:31', tipo: 'consulta', concepto: 'Control · Mora', monto: 15000, medio: 'Débito', por: 'Dra. Paz Ruiz' },
        { id: 3, fecha: hoy, hora: '09:47', tipo: 'venta', concepto: 'Pipeta antipulgas perro mediano × 1 · Ramiro Ortiz', monto: 9500, medio: 'Mercado Pago', por: 'Tienda' },
        { id: 4, fecha: hoy, hora: '10:15', tipo: 'egreso', concepto: 'Artículos de limpieza', monto: 6500, medio: 'Efectivo', por: 'Ana Sosa' },
        { id: 5, fecha: hoy, hora: '10:40', tipo: 'sena', concepto: 'Seña · Nala, hoy 16:00', monto: 5000, medio: 'Mercado Pago', por: 'App' },
      ]
    : [];

  const plantillas: Plantilla[] = [
    { id: 1, nombre: 'Control anual', titulo: 'Control anual', detalle: 'Buen estado general. Mucosas rosadas, hidratación normal. Corazón y pulmones sin particularidades. Piel y pelaje sanos.' },
    { id: 2, nombre: 'Vacunación', titulo: 'Vacuna', detalle: 'Se aplicó la vacuna en buen estado general, sin fiebre. Se explicó qué esperar en las próximas 24 horas.' },
    { id: 3, nombre: 'Desparasitación', titulo: 'Desparasitación', detalle: 'Desparasitación interna según peso.', medicamento: 'Antiparasitario interno', dosis: 'Dosis única; repetir en 3 meses' },
    { id: 4, nombre: 'Consulta por piel', titulo: 'Consulta por piel', detalle: 'Picazón y enrojecimiento. Se revisó piel, orejas y espacios entre los dedos.', diagnostico: 'Dermatitis', medicamento: 'Shampoo con clorhexidina', dosis: 'Baño 2 veces por semana, 3 semanas' },
    { id: 5, nombre: 'Control posquirúrgico', titulo: 'Control posquirúrgico', detalle: 'Herida limpia y cerrada, sin inflamación ni secreción. Buen ánimo y apetito.' },
  ];

  const recordatorios: Recordatorio[] = [
    { id: 1, clienteId: 1024, titulo: 'Desparasitar a Luna', fecha: d(15), activo: true },
    { id: 2, clienteId: 1024, titulo: 'Vacuna antirrábica de Michi', fecha: d(29), activo: true },
    { id: 3, clienteId: 1024, titulo: 'Turnos', frecuencia: 'Un día antes de cada turno', activo: true },
    { id: 4, clienteId: 1024, titulo: 'Comprar alimento', frecuencia: 'Cada 30 días', activo: false },
  ];

  return { veterinarios, clientes, mascotas, productos, compras, turnos, bloqueos, recordatorios, esperas, movStock, movimientos, cierres: [], plantillas };
}

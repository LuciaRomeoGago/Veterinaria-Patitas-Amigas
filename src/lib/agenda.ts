import type { Bloqueo, Motivo, Turno } from '../data/types';

/*
 * La agenda va de a 30 minutos: de 9 a 12:30 y de 16 a 19.
 * Cada motivo ocupa lo que dura (una consulta, una hora; una cirugía, dos).
 */

const rango = (desde: string, hasta: string) => {
  const out: string[] = [];
  for (let m = aMin(desde); m < aMin(hasta); m += 30) out.push(aHora(m));
  return out;
};

export function aMin(hora: string) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function aHora(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export const MANIANA = rango('09:00', '12:30');
export const TARDE = rango('16:00', '19:00');
/** Cada horario de comienzo posible, de a 30 minutos. */
export const HORARIOS = [...MANIANA, ...TARDE];

/** Los que puede pedir el cliente desde la app; la cirugía la agenda la veterinaria. */
export const MOTIVOS_CLIENTE: Motivo[] = ['Control', 'Vacuna', 'Consulta'];
export const MOTIVOS: Motivo[] = [...MOTIVOS_CLIENTE, 'Cirugía'];

/** Minutos que ocupa cada motivo en la agenda. */
export const DURACION: Record<Motivo, number> = { Control: 30, Vacuna: 30, Consulta: 60, Cirugía: 120 };

/** Lo que se cobra por cada motivo (sin medicamentos ni vacunas aparte). */
export const PRECIO: Record<Motivo, number> = { Control: 15000, Vacuna: 12000, Consulta: 18000, Cirugía: 120000 };

/** Seña al pedir el turno desde la app; se descuenta de la consulta. */
export const SENA = 5000;

export const duracionTexto = (motivo: Motivo) => {
  const m = DURACION[motivo];
  return m < 60 ? `${m} min` : m === 60 ? '1 hora' : `${m / 60} horas`;
};

export const horaFin = (hora: string, motivo: Motivo) => aHora(aMin(hora) + DURACION[motivo]);

/** Los bloques de 30 que ocupa un turno; si se pasa del horario de atención, devuelve null. */
export function bloquesDe(hora: string, motivo: Motivo) {
  const n = DURACION[motivo] / 30;
  const i = HORARIOS.indexOf(hora);
  if (i < 0) return null;
  const out = HORARIOS.slice(i, i + n);
  // Tienen que ser seguidos (no puede empezar a las 12 y seguir a las 16).
  if (out.length < n || aMin(out[out.length - 1]) - aMin(hora) !== (n - 1) * 30) return null;
  return out;
}

export const todoElDia = (b: Pick<Bloqueo, 'desde' | 'hasta'>) => !b.desde || !b.hasta;

/** ¿Ese horario cae dentro de un bloqueo? Los bloqueos sin veterinario valen para todos. */
export function bloqueoDe(bloqueos: Bloqueo[], fecha: string, hora: string, vetId?: number) {
  return bloqueos.find(
    (b) => b.fecha === fecha && (b.vetId === undefined || vetId === undefined || b.vetId === vetId) && (todoElDia(b) || (hora >= b.desde! && hora < b.hasta!)),
  );
}

export function textoBloqueo(b: Omit<Bloqueo, 'id'>) {
  return todoElDia(b) ? `Todo el día · ${b.motivo}` : `${b.desde} a ${b.hasta} · ${b.motivo}`;
}

/** Bloques de 30 tomados por los turnos de un veterinario ese día. */
export function tomados(turnos: Turno[], fecha: string, vetId: number, excepto?: number) {
  const s = new Set<string>();
  for (const t of turnos) {
    if (t.fecha !== fecha || t.vetId !== vetId || t.id === excepto) continue;
    for (const h of bloquesDe(t.hora, t.motivo) ?? [t.hora]) s.add(h);
  }
  return s;
}

/** Horarios en que se puede empezar un turno de ese motivo con ese veterinario. */
export function libres(turnos: Turno[], bloqueos: Bloqueo[], fecha: string, vetId: number, motivo: Motivo, excepto?: number) {
  const ocupado = tomados(turnos, fecha, vetId, excepto);
  return HORARIOS.filter((h) => {
    const b = bloquesDe(h, motivo);
    return b !== null && b.every((x) => !ocupado.has(x) && !bloqueoDe(bloqueos, fecha, x, vetId));
  });
}

export const ESTADOS: Record<string, string> = {
  pendiente: 'Por llegar',
  en_espera: 'En espera',
  en_consulta: 'En consulta',
  atendido: 'Atendido',
};

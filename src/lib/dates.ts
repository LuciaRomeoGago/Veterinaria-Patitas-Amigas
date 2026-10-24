/** Fechas en formato ISO local (AAAA-MM-DD), sin horas, para no depender del huso horario. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toIso(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

export function addYears(iso: string, years: number): string {
  const d = fromIso(iso);
  d.setFullYear(d.getFullYear() + years);
  return toIso(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((fromIso(to).getTime() - fromIso(from).getTime()) / 86_400_000);
}

/** Próximos días hábiles (lunes a viernes) a partir de mañana. */
export function nextWorkdays(count: number, from = today()): string[] {
  const out: string[] = [];
  let d = from;
  while (out.length < count) {
    d = addDays(d, 1);
    const wd = fromIso(d).getDay();
    if (wd !== 0 && wd !== 6) out.push(d);
  }
  return out;
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** 12/03/2026 */
export const fechaCorta = (iso: string) => {
  const d = fromIso(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** 20/10 */
export const diaMes = (iso: string) => {
  const d = fromIso(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

/** Mar 14/10 */
export const diaSemanaCorto = (iso: string) => `${DIAS[fromIso(iso).getDay()]} ${diaMes(iso)}`;

/** Martes 14/10 */
export const diaSemanaLargo = (iso: string) => `${DIAS_LARGOS[fromIso(iso).getDay()]} ${diaMes(iso)}`;

/** 14 de octubre */
export const fechaLarga = (iso: string) => `${fromIso(iso).getDate()} de ${MESES[fromIso(iso).getMonth()]}`;

/** Martes 14 de octubre */
export const fechaTitulo = (iso: string) => `${DIAS_LARGOS[fromIso(iso).getDay()]} ${fechaLarga(iso)}`;

/** oct 26 */
export const mesAnio = (iso: string) => `${MESES[fromIso(iso).getMonth()].slice(0, 3)} ${String(fromIso(iso).getFullYear()).slice(2)}`;

export const nombreDia = (iso: string) => DIAS[fromIso(iso).getDay()];
export const numeroDia = (iso: string) => String(fromIso(iso).getDate());
export const nombreMes = (iso: string) => {
  const m = MESES[fromIso(iso).getMonth()];
  return m[0].toUpperCase() + m.slice(1);
};

/** "en 15 días", "mañana", "hoy", "hace 3 días" */
export function cuanto(iso: string, from = today()): string {
  const n = daysBetween(from, iso);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n > 1) return `en ${n} días`;
  return n === -1 ? 'ayer' : `hace ${-n} días`;
}

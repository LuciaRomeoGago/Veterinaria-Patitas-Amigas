import { daysBetween, today } from './dates';
import type { Vacuna } from '../data/types';

/** $ 18.900 */
export const precio = (n: number) => '$ ' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 });

export const img = (key: string) => `/img/${key}.webp`;

export const edad = (n: number) => (n === 1 ? '1 año' : `${n} años`);

/** Vencida si la próxima dosis ya pasó. */
export const vacunaVencida = (v: Vacuna) => daysBetween(today(), v.proxima) < 0;

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

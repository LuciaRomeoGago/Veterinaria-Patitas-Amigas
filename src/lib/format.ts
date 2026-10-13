import { daysBetween, today } from './dates';
import type { Vacuna } from '../data/types';

/** $ 18.900 */
export const precio = (n: number) => '$ ' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 });

export const img = (key: string) => `/img/${key}.webp`;

export const edad = (n: number) => (n === 1 ? '1 año' : `${n} años`);

/** Vencida si la próxima dosis ya pasó. */
export const vacunaVencida = (v: Vacuna) => daysBetween(today(), v.proxima) < 0;

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Queda poco: el stock llegó al mínimo que se cargó para el producto. */
export const stockBajo = (p: { stock: number; minimo: number }) => p.stock <= p.minimo;

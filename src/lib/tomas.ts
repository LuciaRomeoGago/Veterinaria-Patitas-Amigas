import type { PlanTomas } from '../data/types';
import { aHora, aMin } from './agenda';
import { addDays, daysBetween } from './dates';

/*
 * Medicación en casa: con "cada X horas durante N días" y la primera toma, se arma la lista
 * de tomas. El dueño las marca desde la app y el veterinario ve si se está cumpliendo.
 */

/** Todas las tomas del tratamiento, como "AAAA-MM-DD HH:MM". */
export function tomasDe(plan: Pick<PlanTomas, 'cadaHoras' | 'dias' | 'inicio' | 'hora'>) {
  const out: string[] = [];
  const total = Math.round((plan.dias * 24) / plan.cadaHoras);
  let min = aMin(plan.hora);
  for (let i = 0; i < total; i++) {
    const dia = addDays(plan.inicio, Math.floor(min / 1440));
    out.push(`${dia} ${aHora(min % 1440)}`);
    min += plan.cadaHoras * 60;
  }
  return out;
}

export const tomasDelDia = (plan: PlanTomas, fecha: string) => tomasDe(plan).filter((t) => t.startsWith(fecha));

/** Dónde va el tratamiento: día N de M, cuántas tomas tocaban hasta ahora y cuántas se dieron. */
export function progreso(plan: PlanTomas, ahora: string) {
  const todas = tomasDe(plan);
  const hasta = todas.filter((t) => t <= ahora);
  const dadas = hasta.filter((t) => plan.dadas.includes(t)).length;
  const dia = Math.min(plan.dias, daysBetween(plan.inicio, ahora.slice(0, 10)) + 1);
  return { total: todas.length, tocaban: hasta.length, dadas, dia, terminado: todas.every((t) => t <= ahora) && todas.length > 0, ultimo: todas[todas.length - 1] };
}

/** "cada 12 horas, 7 días" */
export const textoPlan = (plan: Pick<PlanTomas, 'cadaHoras' | 'dias'>) => `${plan.cadaHoras === 24 ? 'una vez por día' : `cada ${plan.cadaHoras} horas`}, ${plan.dias} ${plan.dias === 1 ? 'día' : 'días'}`;

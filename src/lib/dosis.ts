import type { Especie } from '../data/types';

/*
 * Calculadora de dosis por peso. Valores de referencia para la demo: en una clínica real
 * se cargan los del vademécum que usen, y la dosis siempre la revisa quien la indica.
 */

export interface Presentacion {
  /** Comprimido de X mg, o suspensión de X mg cada `ml` ml. */
  tipo: 'comprimido' | 'suspension';
  mg: number;
  ml?: number;
}

export interface Droga {
  nombre: string;
  /** mg por kg de peso, por toma. Sin valor para una especie: no se calcula. */
  mgKg: Partial<Record<Especie, number>>;
  cadaHoras: number;
  dias: number;
  presentaciones: Presentacion[];
}

export const DROGAS: Droga[] = [
  { nombre: 'Amoxicilina', mgKg: { perro: 20, gato: 20 }, cadaHoras: 12, dias: 7, presentaciones: [{ tipo: 'comprimido', mg: 500 }, { tipo: 'comprimido', mg: 250 }, { tipo: 'suspension', mg: 250, ml: 5 }] },
  { nombre: 'Cefalexina', mgKg: { perro: 22, gato: 22 }, cadaHoras: 12, dias: 7, presentaciones: [{ tipo: 'comprimido', mg: 500 }, { tipo: 'comprimido', mg: 250 }, { tipo: 'suspension', mg: 250, ml: 5 }] },
  { nombre: 'Metronidazol', mgKg: { perro: 15, gato: 10 }, cadaHoras: 12, dias: 5, presentaciones: [{ tipo: 'comprimido', mg: 500 }, { tipo: 'comprimido', mg: 250 }, { tipo: 'suspension', mg: 125, ml: 5 }] },
  { nombre: 'Meloxicam', mgKg: { perro: 0.1, gato: 0.05 }, cadaHoras: 24, dias: 5, presentaciones: [{ tipo: 'suspension', mg: 1.5, ml: 1 }, { tipo: 'suspension', mg: 0.5, ml: 1 }] },
  { nombre: 'Prednisolona', mgKg: { perro: 0.5, gato: 1 }, cadaHoras: 24, dias: 5, presentaciones: [{ tipo: 'comprimido', mg: 5 }, { tipo: 'comprimido', mg: 20 }] },
];

const num = (n: number, dec = 1) => n.toLocaleString('es-AR', { maximumFractionDigits: dec });

export const textoPresentacion = (p: Presentacion) => (p.tipo === 'comprimido' ? `comprimido de ${num(p.mg)} mg` : `suspensión ${num(p.mg)} mg/${p.ml === 1 ? 'ml' : `${p.ml} ml`}`);

/** 1.25 → "1 ¼" */
function fraccion(n: number) {
  const entero = Math.floor(n);
  const resto = n - entero;
  const f = resto === 0.25 ? '¼' : resto === 0.5 ? '½' : resto === 0.75 ? '¾' : '';
  return [entero || '', f].filter(Boolean).join(' ') || '0';
}

export interface Resultado {
  mg: number;
  /** "1 ½ comprimidos de 250 mg" o "2,4 ml" */
  cantidad: string;
  /** Lo que va en la indicación. */
  medicamento: string;
  dosis: string;
  cadaHoras: number;
  dias: number;
}

export function calcular(d: Droga, p: Presentacion, especie: Especie, kg: number): Resultado | null {
  const mgKg = d.mgKg[especie];
  if (!mgKg || !kg || kg <= 0) return null;
  const mg = kg * mgKg;
  const frec = d.cadaHoras === 24 ? 'una vez por día' : `cada ${d.cadaHoras} horas`;
  if (p.tipo === 'comprimido') {
    // Los comprimidos se parten en cuartos como mucho.
    const n = Math.max(0.25, Math.round((mg / p.mg) * 4) / 4);
    const c = `${fraccion(n)} ${n > 1 ? 'comprimidos' : 'comprimido'}`;
    return { mg, cantidad: `${c} de ${num(p.mg)} mg`, medicamento: `${d.nombre} ${num(p.mg)} mg`, dosis: `${c} ${frec}, ${d.dias} días`, cadaHoras: d.cadaHoras, dias: d.dias };
  }
  const ml = Math.max(0.1, Math.round(((mg * (p.ml ?? 1)) / p.mg) * 10) / 10);
  return { mg, cantidad: `${num(ml)} ml`, medicamento: `${d.nombre} ${textoPresentacion(p)}`, dosis: `${num(ml)} ml ${frec}, ${d.dias} días`, cadaHoras: d.cadaHoras, dias: d.dias };
}

export const mgTexto = (mg: number) => `${num(mg, mg < 10 ? 2 : 0)} mg`;

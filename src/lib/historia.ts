import type { Registro, TipoRegistro } from '../data/types';

/** Las partes de la historia clínica, en el orden en que se muestran. */
export const PARTES: { tipo: TipoRegistro; titulo: string; vacio: string }[] = [
  { tipo: 'alergia', titulo: 'Alergias', vacio: 'Sin alergias conocidas.' },
  { tipo: 'medicacion', titulo: 'Medicación', vacio: 'No toma medicación.' },
  { tipo: 'enfermedad', titulo: 'Enfermedades', vacio: 'Sin enfermedades registradas.' },
  { tipo: 'bien', titulo: 'Le hizo bien', vacio: 'Todavía no hay nada anotado.' },
  { tipo: 'mal', titulo: 'Le hizo mal', vacio: 'Todavía no hay nada anotado.' },
];

export const parte = (tipo: TipoRegistro) => PARTES.find((p) => p.tipo === tipo)!;

/** Etiqueta de estado de cada registro (solo donde dice algo que el título de la parte no dice). */
export function estado(r: Registro): { texto: string; tone?: 'error' | 'ok' } | null {
  if (r.tipo === 'medicacion') return r.vigente ? { texto: 'En curso' } : { texto: 'Terminada', tone: 'ok' };
  if (r.tipo === 'enfermedad') return r.vigente ? { texto: 'Activa', tone: 'error' } : { texto: 'Resuelta', tone: 'ok' };
  return null;
}

/** Textos del formulario según la parte. */
export const CAMPOS: Record<TipoRegistro, { titulo: string; tituloEj: string; detalle: string; detalleEj: string; desde: string; vigente?: string }> = {
  alergia: { titulo: 'Alérgica o alérgico a', tituloEj: 'Ej.: Amoxicilina', detalle: 'Qué reacción tuvo', detalleEj: 'Ej.: Urticaria en la cara', desde: 'Desde' },
  medicacion: { titulo: 'Medicamento', tituloEj: 'Ej.: Omega 3', detalle: 'Dosis y frecuencia', detalleEj: 'Ej.: 1 cápsula por día', desde: 'Desde', vigente: 'La está tomando' },
  enfermedad: { titulo: 'Enfermedad o diagnóstico', tituloEj: 'Ej.: Dermatitis', detalle: 'Detalle', detalleEj: 'Ej.: Leve, por contacto', desde: 'Desde', vigente: 'Sigue activa' },
  bien: { titulo: 'Tratamiento, alimento o producto', tituloEj: 'Ej.: Shampoo neutro', detalle: 'Qué pasó', detalleEj: 'Ej.: La picazón bajó en dos semanas', desde: 'Fecha' },
  mal: { titulo: 'Tratamiento, alimento o producto', tituloEj: 'Ej.: Alimento con pollo', detalle: 'Qué pasó', detalleEj: 'Ej.: Vómitos y picazón', desde: 'Fecha' },
};

/**
 * Pasa a minúsculas y saca los acentos letra por letra, sin cambiar el largo:
 * así la posición de lo encontrado sirve para resaltarlo en el texto original.
 */
export function normalizar(texto: string) {
  return texto
    .split('')
    .map((c) => c.normalize('NFD')[0].toLowerCase()[0])
    .join('');
}

export function coincide(q: string, ...textos: (string | undefined)[]) {
  if (!q) return true;
  const n = normalizar(q);
  return textos.some((t) => t && normalizar(t).includes(n));
}

/**
 * Antes de recetar: ¿el medicamento coincide con una alergia o con algo que le hizo mal?
 * Compara sin acentos ni mayúsculas, por la palabra entera o por palabras largas en común
 * ("Amoxicilina 500 mg" choca con la alergia "Amoxicilina").
 */
export function conflictos(registros: Registro[], medicamento: string) {
  const m = normalizar(medicamento.trim());
  if (m.length < 3) return [];
  const comunes = ['alimento', 'comprimido', 'comprimidos', 'capsula', 'capsulas', 'tableta', 'tabletas', 'jarabe', 'gotas', 'inyectable', 'solucion', 'suspension'];
  const palabras = (t: string) => t.split(/[^a-z0-9]+/).filter((w) => w.length >= 5 && !comunes.includes(w));
  const pm = palabras(m);
  return registros.filter((r) => {
    if (r.tipo !== 'alergia' && r.tipo !== 'mal') return false;
    const t = normalizar(r.titulo);
    return t.includes(m) || m.includes(t) || palabras(t).some((w) => pm.includes(w));
  });
}

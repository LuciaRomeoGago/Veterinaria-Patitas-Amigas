/*
 * Avisos por WhatsApp con un enlace wa.me y el mensaje ya escrito: quien lo manda solo toca Enviar.
 * En la demo el enlace no lleva el número del cliente (los números son inventados): WhatsApp
 * abre el mensaje y deja elegir a quién mandarlo. En producción se usa el celular cargado.
 */
export const DEMO = true;

/** 249 455-1820 → 5492494551820 (formato internacional de un celular argentino). */
export const numeroWa = (telefono: string) => '549' + telefono.replace(/\D/g, '');

export function waLink(telefono: string, texto: string) {
  return `https://wa.me/${DEMO ? '' : numeroWa(telefono)}?text=${encodeURIComponent(texto)}`;
}

export const FIRMA = 'Veterinaria Patitas amigas';

export const primerNombre = (nombre: string) => nombre.split(' ')[0];

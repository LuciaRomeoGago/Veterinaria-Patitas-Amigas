import { aHora, aMin } from './agenda';
import { descargar } from './csv';
import { addDays } from './dates';

/*
 * "Agregar al calendario": arma un archivo .ics, el formato que abren Google Calendar,
 * el calendario del celular y Outlook. Sin hora es un evento de todo el día.
 */

const esc = (s: string) => s.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
const compact = (iso: string) => iso.replace(/-/g, '');
const hhmm = (hora: string) => hora.replace(':', '');

export function downloadIcs(opts: { titulo: string; fecha: string; hora?: string; minutos?: number; detalle?: string }) {
  const { titulo, fecha, hora, minutos = 30, detalle = '' } = opts;
  const [start, end] = hora
    ? [`DTSTART:${compact(fecha)}T${hhmm(hora)}00`, `DTEND:${compact(fecha)}T${hhmm(aHora(aMin(hora) + minutos))}00`]
    : [`DTSTART;VALUE=DATE:${compact(fecha)}`, `DTEND;VALUE=DATE:${compact(addDays(fecha, 1))}`];
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Veterinaria Patitas amigas//ES',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@patitas-amigas`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    start,
    end,
    `SUMMARY:${esc(titulo)}`,
    `DESCRIPTION:${esc(detalle)}`,
    'LOCATION:Veterinaria Patitas amigas',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  descargar(`${titulo.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-')}.ics`, new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
}

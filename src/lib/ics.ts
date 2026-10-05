/*
 * "Agregar al calendario": arma un archivo .ics, el formato que abren Google Calendar,
 * el calendario del celular y Outlook. Sin hora es un evento de todo el día.
 */

const esc = (s: string) => s.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
const compact = (iso: string) => iso.replace(/-/g, '');

export function downloadIcs(opts: { titulo: string; fecha: string; hora?: string; minutos?: number; detalle?: string }) {
  const { titulo, fecha, hora, minutos = 30, detalle = '' } = opts;
  let start: string;
  let end: string;
  if (hora) {
    const [h, m] = hora.split(':').map(Number);
    const fin = h * 60 + m + minutos;
    start = `DTSTART:${compact(fecha)}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
    end = `DTEND:${compact(fecha)}T${String(Math.floor(fin / 60)).padStart(2, '0')}${String(fin % 60).padStart(2, '0')}00`;
  } else {
    const [y, mo, d] = fecha.split('-').map(Number);
    const next = new Date(y, mo - 1, d + 1);
    const nextIso = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`;
    start = `DTSTART;VALUE=DATE:${compact(fecha)}`;
    end = `DTEND;VALUE=DATE:${nextIso}`;
  }
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

  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${titulo.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Descarga un CSV que Excel abre bien en español: punto y coma, y BOM para los acentos. */
export function descargarCsv(nombre: string, filas: (string | number | undefined)[][]) {
  const celda = (v: string | number | undefined) => {
    const t = v === undefined ? '' : typeof v === 'number' ? String(v).replace('.', ',') : v;
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const texto = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

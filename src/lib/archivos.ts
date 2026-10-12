/*
 * Archivos de la historia clínica (fotos y estudios). No entran en localStorage (5 MB en total),
 * así que van a IndexedDB, en el mismo navegador. En la ficha solo se guarda una miniatura.
 * Con un backend, esto se sube a un almacenamiento de archivos y se guarda la URL.
 */

const DB = 'patitas-archivos';
const STORE = 'archivos';
export const MAX_MB = 8;

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, modo).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const claveArchivo = (mascotaId: number, adjuntoId: number) => `${mascotaId}-${adjuntoId}`;
export const guardarArchivo = (clave: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, clave));
export const leerArchivo = (clave: string) => tx<Blob | undefined>('readonly', (s) => s.get(clave));
export const borrarArchivo = (clave: string) => tx('readwrite', (s) => s.delete(clave));

function cargarImagen(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

function aCanvas(img: HTMLImageElement, max: number) {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Fotos: se achican a 1600 px (las del celular pesan mucho) y se hace una miniatura de 240. */
export async function prepararImagen(file: File) {
  const img = await cargarImagen(file);
  const grande = aCanvas(img, 1600);
  const blob: Blob = await new Promise((r) => grande.toBlob((b) => r(b ?? file), 'image/jpeg', 0.82));
  const miniatura = aCanvas(img, 240).toDataURL('image/jpeg', 0.7);
  return { blob, miniatura };
}

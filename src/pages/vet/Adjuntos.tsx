import { useEffect, useState, type FormEvent } from 'react';
import { Field, Notice, TextArea } from '../../components/ui';
import { Modal, Panel, PanelActions } from '../../components/vet';
import type { Adjunto, Mascota } from '../../data/types';
import { MAX_MB, borrarArchivo, claveArchivo, guardarArchivo, leerArchivo, prepararImagen } from '../../lib/archivos';
import { fechaCorta } from '../../lib/dates';
import { useStore } from '../../lib/store';

/** Subir una foto o un estudio (PDF) a la historia clínica. En el celular, la cámara abre directo. */
export function SubirPanel({ m, onClose, onDone }: { m: Mascota; onClose: () => void; onDone: (nombre: string) => void }) {
  const { hoy, addAdjunto } = useStore();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nombre, setNombre] = useState('');
  const [nota, setNota] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const elegir = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    const pdf = f.type === 'application/pdf';
    if (!pdf && !f.type.startsWith('image/')) return setError('Tiene que ser una foto (JPG, PNG) o un PDF.');
    if (f.size > MAX_MB * 1024 * 1024) return setError(`Pesa más de ${MAX_MB} MB. Probá con una foto más chica o un PDF comprimido.`);
    setArchivo(f);
    if (!nombre) setNombre(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!archivo || !nombre.trim()) return setError(!archivo ? 'Elegí un archivo.' : 'Poné un nombre para encontrarlo después.');
    setGuardando(true);
    try {
      const id = m.adjuntos.reduce((n, a) => Math.max(n, a.id), 0) + 1;
      const pdf = archivo.type === 'application/pdf';
      const { blob, miniatura } = pdf ? { blob: archivo, miniatura: undefined } : await prepararImagen(archivo);
      await guardarArchivo(claveArchivo(m.id, id), blob);
      addAdjunto(m.id, { id, nombre: nombre.trim(), tipo: pdf ? 'pdf' : 'imagen', fecha, nota: nota.trim() || undefined, miniatura });
      onDone(nombre.trim());
    } catch {
      setError('No se pudo guardar el archivo en este navegador. Probá de nuevo.');
      setGuardando(false);
    }
  };

  return (
    <Panel title="Subir foto o estudio" kicker={`Historia clínica de ${m.nombre}`} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="adj-archivo" className="mono-etiqueta">
            Archivo
          </label>
          <input id="adj-archivo" className="field__box field__box--file" type="file" accept="image/*,application/pdf" onChange={(e) => elegir(e.target.files?.[0])} />
          <p className="texto-chico suave">Fotos de una lesión, análisis, radiografías o ecografías. Hasta {MAX_MB} MB.</p>
        </div>
        <Field label="Nombre" placeholder="Ej.: Análisis de sangre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Field label="Fecha del estudio" type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <TextArea label="Nota (opcional)" placeholder="Ej.: Lesión en el oído derecho, día 1 del tratamiento." value={nota} onChange={(e) => setNota(e.target.value)} />
        {error && (
          <Notice tipo="error" titulo="No se pudo subir">
            {error}
          </Notice>
        )}
        <PanelActions submit={guardando ? 'Guardando…' : 'Subir'} onCancel={onClose} disabled={guardando} />
      </form>
    </Panel>
  );
}

/** Ver una foto o un estudio. Las fotos se ven acá; el PDF se abre en otra pestaña. */
export function Visor({ m, a, onClose, onQuitar }: { m: Mascota; a: Adjunto; onClose: () => void; onQuitar?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [falta, setFalta] = useState(false);
  useEffect(() => {
    let u: string | null = null;
    leerArchivo(claveArchivo(m.id, a.id))
      .then((b) => {
        if (!b) return setFalta(true);
        u = URL.createObjectURL(b);
        setUrl(u);
      })
      .catch(() => setFalta(true));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [m.id, a.id]);

  return (
    <Modal title={a.nombre} onClose={onClose}>
      <p className="mono-etiqueta suave">
        {fechaCorta(a.fecha)} · subido por {a.por}
      </p>
      {a.nota && <p className="texto-chico">{a.nota}</p>}
      {falta ? (
        <Notice tipo="alerta" titulo="El archivo no está en este navegador">
          Se subió desde otro equipo o se borraron los datos del navegador. {a.miniatura ? 'Queda la vista previa.' : ''}
        </Notice>
      ) : null}
      {a.tipo === 'imagen' ? (
        <img className="visor__img" src={url ?? a.miniatura} alt={a.nota ? `${a.nombre}: ${a.nota}` : a.nombre} />
      ) : url ? (
        <a className="btn btn--primario" href={url} target="_blank" rel="noopener noreferrer">
          Abrir el PDF
        </a>
      ) : null}
      <div className="vet-modal__actions">
        {onQuitar && (
          <button
            type="button"
            className="btn btn--peligro-borde"
            onClick={() => {
              borrarArchivo(claveArchivo(m.id, a.id)).catch(() => {});
              onQuitar();
            }}
          >
            Quitar de la historia
          </button>
        )}
        <button type="button" className="btn btn--secundario" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

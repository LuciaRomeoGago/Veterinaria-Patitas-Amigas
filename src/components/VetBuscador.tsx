import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { coincide } from '../lib/historia';
import { useStore } from '../lib/store';
import { Icon } from './icons';

interface Resultado {
  id: string;
  grupo: 'Clientes' | 'Mascotas' | 'Productos';
  titulo: string;
  detalle: string;
  to: string;
}

/**
 * Buscador general del veterinario: clientes (por nombre, número o DNI), mascotas y productos.
 * Es un combobox: flechas para moverse, Enter para abrir, Esc para cerrar y "/" para ir al buscador.
 */
export function VetBuscador() {
  const { state, duenio } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const id = useId();
  const texto = q.trim();

  const resultados: Resultado[] = texto
    ? [
        ...state.clientes
          .filter((c) => coincide(texto, c.nombre, String(c.id), c.dni))
          .slice(0, 5)
          .map((c) => ({ id: `c${c.id}`, grupo: 'Clientes' as const, titulo: c.nombre, detalle: `Cliente n.º ${c.id} · DNI ${c.dni}`, to: `/vet/mascotas?cliente=${c.id}` })),
        ...state.mascotas
          .filter((m) => coincide(texto, m.nombre, m.raza))
          .slice(0, 5)
          .map((m) => ({ id: `m${m.id}`, grupo: 'Mascotas' as const, titulo: m.nombre, detalle: `${m.raza} · de ${duenio(m.id)?.nombre}`, to: `/vet/mascotas/${m.id}` })),
        ...state.productos
          .filter((p) => coincide(texto, p.nombre, String(p.id)))
          .slice(0, 5)
          .map((p) => ({ id: `p${p.id}`, grupo: 'Productos' as const, titulo: p.nombre, detalle: `Código ${p.id} · ${p.stock ? `quedan ${p.stock}` : 'sin stock'}`, to: '/vet/productos' })),
      ]
    : [];

  // "/" lleva al buscador desde cualquier lado (salvo que se esté escribiendo en otro campo).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Cerrar al tocar fuera.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const ir = (r: Resultado) => {
    setQ('');
    setAbierto(false);
    navigate(r.to);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAbierto(true);
      setActivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && resultados[activo]) {
      e.preventDefault();
      ir(resultados[activo]);
    } else if (e.key === 'Escape') {
      if (q) setQ('');
      else input.current?.blur();
      setAbierto(false);
    }
  };

  const mostrar = abierto && texto.length > 0;
  const grupos = (['Clientes', 'Mascotas', 'Productos'] as const).filter((g) => resultados.some((r) => r.grupo === g));

  return (
    <div className="buscador" ref={caja}>
      <label className="buscador__campo">
        <Icon name="buscar" />
        <span className="sr-only">Buscar clientes, mascotas o productos</span>
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-expanded={mostrar}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={mostrar && resultados[activo] ? `${id}-${resultados[activo].id}` : undefined}
          placeholder="Buscar cliente, DNI, mascota o producto"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActivo(0);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={onKeyDown}
        />
        <kbd className="buscador__atajo mono-etiqueta" aria-hidden="true">
          /
        </kbd>
      </label>
      {mostrar && (
        <div className="buscador__panel" id={`${id}-lista`} role="listbox" aria-label="Resultados">
          {resultados.length === 0 && (
            <p className="buscador__vacio texto-chico suave" role="presentation">
              No hay nada con “{texto}”.
            </p>
          )}
          {grupos.map((g) => (
            <div key={g} role="group" aria-label={g}>
              <p className="buscador__grupo mono-etiqueta suave" role="presentation">
                {g}
              </p>
              {resultados
                .filter((r) => r.grupo === g)
                .map((r) => {
                  const i = resultados.indexOf(r);
                  return (
                    <div
                      key={r.id}
                      id={`${id}-${r.id}`}
                      role="option"
                      aria-selected={i === activo}
                      className="buscador__opcion"
                      onPointerEnter={() => setActivo(i)}
                      onClick={() => ir(r)}
                    >
                      <span className="texto-fuerte">{r.titulo}</span>
                      <span className="texto-chico suave">{r.detalle}</span>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

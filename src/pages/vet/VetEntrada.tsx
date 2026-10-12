import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Back, Button, Drawing, Field, Notice } from '../../components/ui';
import { img } from '../../lib/format';
import { useStore } from '../../lib/store';

/** 20 · Veterinario · Ingreso */
export function VetIngreso() {
  const { loginVet } = useStore();
  const navigate = useNavigate();
  const [numero, setNumero] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (loginVet(Number(numero))) navigate('/vet/turnos', { replace: true });
    else setError(true);
  };

  return (
    <div className="vet-login">
      <div className="vet-login__art">
        <img className="logo" src={img('logo-bosque')} alt="Veterinaria Patitas amigas, Argentina" width={140} height={140} />
        <Drawing especie="ambos" height={380} className="vet-login__drawing" />
        <p className="frase-l">Gestión de la veterinaria</p>
      </div>
      <main id="contenido" className="vet-login__form">
        <form className="stack-24" onSubmit={submit} noValidate>
          <Back to="/">Volver</Back>
          <h1 className="display-l">Ingreso del equipo</h1>
          <p className="suave">Usá tu número de veterinario o de recepción.</p>
          <Field
            label="Número"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ej.: 7"
            value={numero}
            onChange={(e) => {
              setNumero(e.target.value.replace(/\D/g, ''));
              setError(false);
            }}
          />
          {error && (
            <Notice tipo="error" titulo="No encontramos ese número">
              Revisá el número.
            </Notice>
          )}
          <p className="texto-chico suave">Para probar la demo: 7 (Dra. Paz Ruiz), 8 (Dr. Tomás Vera) o 9 (Ana Sosa, recepción).</p>
          <Button type="submit" full disabled={!numero}>
            Ingresar
          </Button>
        </form>
      </main>
    </div>
  );
}

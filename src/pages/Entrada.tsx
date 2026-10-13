import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Back, Button, Drawing, Field, Notice } from '../components/ui';
import { Screen } from '../components/Layout';
import { img } from '../lib/format';
import { useStore } from '../lib/store';
import './pages.css';

/** 01 · Inicio: elegir perfil. */
export function Bienvenida() {
  return (
    <Screen label="Bienvenida">
      <img className="logo" src={img('logo-bosque')} alt="Veterinaria Patitas amigas, Argentina" width={120} height={120} />
      <h1 className="display-l">Hola, te damos la bienvenida</h1>
      <p className="suave">Entrá para ver a tus mascotas, comprar productos o administrar la veterinaria.</p>
      <Drawing especie="ambos" height={228} className="drawing--grow" />
      <div className="stack-12">
        <Button to="/ingreso" full>
          Soy cliente
        </Button>
        <Button to="/veterinario" variant="secundario" full>
          Soy veterinario
        </Button>
      </div>
    </Screen>
  );
}

/** 02 · Ingreso con número de cliente; 03 · número no encontrado. */
export function Ingreso() {
  const { login } = useStore();
  const navigate = useNavigate();
  const [numero, setNumero] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (login(Number(numero.trim()))) navigate('/inicio', { replace: true });
    else setError(true);
  };

  return (
    <Screen label="Ingreso">
      <form className="form-screen" onSubmit={submit} noValidate>
        <Back to="/">Volver</Back>
        <h1 className="display-l">Ingresá a tu cuenta</h1>
        <p className="suave">Usá el número de cliente que te dieron en la veterinaria.</p>
        <Field
          label="Número de cliente"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ej.: 1024"
          value={numero}
          onChange={(e) => {
            setNumero(e.target.value.replace(/\D/g, ''));
            setError(false);
          }}
        />
        {error && (
          <Notice tipo="error" titulo="No encontramos ese número">
            Revisalo o consultá en la veterinaria.
          </Notice>
        )}
        <p className="demo-hint texto-chico suave">Para probar la demo: 1024 (con mascotas) o 1028 (sin mascotas).</p>
        <Drawing especie="ambos" height={error ? 170 : 228} className="drawing--grow" />
        <Button type="submit" full disabled={!numero}>
          Ingresar
        </Button>
      </form>
    </Screen>
  );
}

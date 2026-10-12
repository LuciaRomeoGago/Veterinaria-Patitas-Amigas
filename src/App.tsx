import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout, RequireClient, Screen } from './components/Layout';
import { Back } from './components/ui';
import { VetLayout } from './components/vet';
import { Bienvenida, Ingreso } from './pages/Entrada';
import { Inicio, Recordatorios } from './pages/Inicio';
import { Ficha, MascotaForm, Mascotas } from './pages/Mascotas';
import { Compras, Tienda } from './pages/Tienda';
import { PedirTurno, TurnoPedido, Turnos } from './pages/Turnos';
import { VetCaja } from './pages/vet/VetCaja';
import { VetClientes } from './pages/vet/VetClientes';
import { VetIngreso } from './pages/vet/VetEntrada';
import { VetFicha, VetMascotas } from './pages/vet/VetMascotas';
import { VetProductos } from './pages/vet/VetProductos';
import { VetResumen } from './pages/vet/VetResumen';
import { VetTurnos } from './pages/vet/VetTurnos';

const priv = (el: ReactElement) => <RequireClient>{el}</RequireClient>;

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Bienvenida />} />
        <Route path="/ingreso" element={<Ingreso />} />
        <Route path="/inicio" element={priv(<Inicio />)} />
        <Route path="/recordatorios" element={priv(<Recordatorios />)} />
        <Route path="/turnos" element={priv(<Turnos />)} />
        <Route path="/turnos/nuevo" element={priv(<PedirTurno />)} />
        <Route path="/turnos/listo/:id" element={priv(<TurnoPedido />)} />
        <Route path="/turnos/:id/reprogramar" element={priv(<PedirTurno key="reprogramar" />)} />
        <Route path="/mascotas" element={priv(<Mascotas />)} />
        <Route path="/mascotas/nueva" element={priv(<MascotaForm />)} />
        <Route path="/mascotas/:id" element={priv(<Ficha />)} />
        <Route path="/mascotas/:id/editar" element={priv(<MascotaForm />)} />
        <Route path="/tienda" element={priv(<Tienda />)} />
        <Route path="/compras" element={priv(<Compras />)} />
      </Route>
      <Route element={<VetLayout />}>
        <Route path="/veterinario" element={<VetIngreso />} />
        <Route path="/vet/turnos" element={<VetTurnos />} />
        <Route path="/vet/clientes" element={<VetClientes />} />
        <Route path="/vet/mascotas" element={<VetMascotas />} />
        <Route path="/vet/mascotas/:id" element={<VetFicha />} />
        <Route path="/vet/productos" element={<VetProductos />} />
        <Route path="/vet/caja" element={<VetCaja />} />
        <Route path="/vet/resumen" element={<VetResumen />} />
      </Route>
      <Route element={<Layout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <Screen label="Página no encontrada">
      <Back to="/">Inicio</Back>
      <h1 className="display-l">Esta página no existe</h1>
    </Screen>
  );
}

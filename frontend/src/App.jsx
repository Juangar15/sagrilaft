// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GatewayOnboarding from './components/GatewayOnboarding';
import FormularioProveedor from './components/FormularioProveedor';
import FormularioEmpleado from './components/FormularioEmpleado';
import DashboardOficial from './components/DashboardOficial';
import PortalInterno from './components/PortalInterno';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirigir la raíz al dashboard para los oficiales internos */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Rutas principales del MVP */}
        <Route path="/onboarding" element={<GatewayOnboarding />} />
        <Route path="/onboarding/proveedor" element={<FormularioProveedor />} />
        <Route path="/onboarding/empleado" element={<FormularioEmpleado />} />
        <Route path="/dashboard" element={<DashboardOficial />} />
        <Route path="/portal-interno" element={<PortalInterno />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
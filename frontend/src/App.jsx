// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import GatewayOnboarding from './components/GatewayOnboarding';
import FormularioProveedor from './components/FormularioProveedor';
import DashboardOficial from './components/DashboardOficial';
import PortalInterno from './components/PortalInterno';
import Login from './components/Login';

// Componente para proteger rutas privadas
const ProtectedRoute = ({ session, children }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [session, setSession] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  useEffect(() => {
    // Revisar sesión actual al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCargandoAuth(false);
    });

    // Escuchar cambios en la autenticación (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (cargandoAuth) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando seguridad...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Ruta de Login (si ya tiene sesión, mandarlo al dashboard) */}
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login setSession={setSession} />} />

        {/* Rutas públicas del Formulario MVP */}
        <Route path="/onboarding" element={<GatewayOnboarding />} />
        <Route path="/onboarding/proveedor" element={<FormularioProveedor />} />
        <Route path="/onboarding/empleado" element={<FormularioProveedor isGenericEmpleado={true} />} />
        
        {/* Rutas Protegidas */}
        <Route path="/dashboard" element={
          <ProtectedRoute session={session}>
            <DashboardOficial />
          </ProtectedRoute>
        } />
        <Route path="/portal-interno" element={
          <ProtectedRoute session={session}>
            <PortalInterno />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, XCircle, Building2 } from 'lucide-react';
import { sagrilaftService } from '../services/api';

export default function GatewayOnboarding() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    const [estado, setEstado] = useState({ 
        cargando: true, 
        error: '', 
        datos: null 
    });

    useEffect(() => {
        const validarAcceso = async () => {
            if (!token) {
                setEstado({ cargando: false, error: 'Acceso Denegado: No se proporcionó un token de invitación válido.', datos: null });
                return;
            }

            try {
                const respuesta = await sagrilaftService.validarInvitacion(token);
                if (respuesta.valido) {
                    setEstado({ cargando: false, error: '', datos: respuesta.datos });
                    
                    // Redirección automática al formulario unificado
                    setTimeout(() => {
                        navigate(`/onboarding/proveedor?token=${token}`);
                    }, 2000); // Pequeña pausa para que vean la animación de bienvenida
                }
            } catch (err) {
                setEstado({ 
                    cargando: false, 
                    error: err.response?.data?.error || 'El enlace de invitación es inválido, ha expirado o ya fue utilizado.', 
                    datos: null 
                });
            }
        };

        validarAcceso();
    }, [token, navigate]);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', padding: '2rem' }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="card glass-panel" 
                style={{ width: '100%', maxWidth: '500px', padding: '3rem', textAlign: 'center', border: '1px solid var(--border)' }}
            >
                {estado.cargando ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <Loader2 size={48} className="spinner" color="var(--primary)" />
                        <h2 style={{ color: 'var(--text-main)', margin: 0 }}>Autenticando Acceso...</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Validando su token de invitación SAGRILAFT.</p>
                    </div>
                ) : estado.error ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%' }}>
                            <XCircle size={64} color="var(--danger)" />
                        </div>
                        <h2 style={{ color: 'var(--danger)', margin: 0 }}>Acceso Restringido</h2>
                        <p style={{ color: 'var(--text-main)' }}>{estado.error}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Por favor, contacte al área de la compañía que solicitó su vinculación para generar un nuevo enlace.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%' }}>
                            <ShieldCheck size={64} color="var(--success)" />
                        </div>
                        <h2 style={{ color: 'var(--success-text)', margin: 0 }}>Acceso Autorizado</h2>
                        <p style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>
                            Bienvenido, <strong>{estado.datos?.razon_social}</strong>
                        </p>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Iniciando proceso de vinculación como <strong>{estado.datos?.tipo_vinculacion}</strong>...
                        </p>
                        <div style={{ marginTop: '1rem' }}>
                            <Loader2 size={24} className="spinner" color="var(--primary)" />
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

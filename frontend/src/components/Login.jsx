import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Lock, Mail, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login({ setSession }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

    const showToast = (message, type = 'error') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: '' }), 4000);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setCargando(true);

        // 1. Iniciar sesión en Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            setCargando(false);
            showToast(authError.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : authError.message);
            return;
        }

        // 2. Verificar que el usuario pertenece al proyecto SAGRILAFT
        // Buscamos en la tabla usuarios_sagrilaft
        const { data: userData, error: userError } = await supabase
            .from('usuarios_sagrilaft')
            .select('rol, activo')
            .eq('email', authData.user.email)
            .maybeSingle();

        if (userError || !userData) {
            console.error("Error al buscar en usuarios_sagrilaft:", userError, "userData:", userData);
            // No existe en la tabla de este proyecto
            await supabase.auth.signOut();
            setCargando(false);
            showToast('Tu usuario no tiene acceso a este proyecto (SAGRILAFT). Verifica la consola.');
            return;
        }

        if (userData.activo === false) {
            await supabase.auth.signOut();
            setCargando(false);
            showToast('Tu usuario está inactivo en SAGRILAFT.');
            return;
        }

        // Si todo está bien, seteamos la sesión
        setSession(authData.session);
        setCargando(false);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
            <AnimatePresence>
                {toast.visible && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'fixed', top: '20px', right: '20px',
                            background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)', color: 'white',
                            padding: '1rem 1.5rem', borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                            zIndex: 9999, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500'
                        }}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    background: 'var(--surface)', padding: '3rem 2rem', borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '400px', border: '1px solid var(--border)'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(20, 80, 120, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                        <Shield size={40} color="var(--primary)" />
                    </div>
                    <h2 style={{ margin: '0 0 0.5rem', color: 'var(--primary)', fontSize: '1.5rem' }}>Acceso SAGRILAFT</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Portal Oficial de Cumplimiento</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label className="label">Correo Electrónico</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                required type="email" className="input-field" style={{ paddingLeft: '2.5rem' }}
                                placeholder="oficial@empresa.com"
                                value={email} onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="label">Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                required type="password" className="input-field" style={{ paddingLeft: '2.5rem' }}
                                placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }} disabled={cargando}>
                        {cargando ? <><Loader2 size={18} className="spinner" /> Autenticando...</> : 'Iniciar Sesión'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

import React, { useState } from 'react';
import { sagrilaftService } from '../services/api';
import { motion } from 'framer-motion';
import { Link, Mail, CheckCircle, Shield, Building, User, Send, Loader2 } from 'lucide-react';

export default function PortalInterno() {
    const [formData, setFormData] = useState({
        razon_social: '',
        correo: '',
        tipo_vinculacion: 'proveedor',
        area_solicitante: ''
    });
    
    const [estado, setEstado] = useState({ cargando: false, exito: false, linkGenerado: '', previewUrl: '', error: '' });

    const handleGenerarLink = async (e) => {
        e.preventDefault();
        setEstado({ cargando: true, exito: false, linkGenerado: '', previewUrl: '', error: '' });

        try {
            const respuesta = await sagrilaftService.generarInvitacion(formData);
            setEstado({ 
                cargando: false, 
                exito: true, 
                linkGenerado: `http://localhost:5173/onboarding?token=${respuesta.token}`,
                previewUrl: respuesta.previewUrl,
                error: '' 
            });
            
            // Limpiar formulario
            setFormData({ razon_social: '', correo: '', tipo_vinculacion: 'proveedor', area_solicitante: '' });
        } catch (error) {
            setEstado({ 
                cargando: false, 
                exito: false, 
                linkGenerado: '', 
                previewUrl: '',
                error: error.response?.data?.error || 'Error al generar la invitación.' 
            });
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', padding: '2rem' }}>
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="card glass-panel" 
                style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', border: '1px solid var(--border)' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(20, 80, 120, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                        <Shield size={40} color="var(--primary)" />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', margin: '0 0 0.5rem', color: 'var(--primary)' }}>Portal Interno SAGRILAFT</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Generación de links de vinculación para contrapartes.</p>
                </div>

                {estado.error && (
                    <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', marginBottom: '1.5rem', textAlign: 'center' }}>
                        {estado.error}
                    </div>
                )}

                {estado.exito ? (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '2rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)' }}>
                        <CheckCircle size={50} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
                        <h3 style={{ color: 'var(--success-text)', margin: '0 0 1rem' }}>¡Invitación Generada y Enviada!</h3>
                        <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>El enlace seguro ha sido enviado al correo electrónico de la contraparte.</p>
                        
                        <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)', marginBottom: '1rem', wordBreak: 'break-all', fontSize: '0.85rem' }}>
                            {estado.linkGenerado}
                        </div>
                        
                        {estado.previewUrl && (
                            <a href={estado.previewUrl} target="_blank" rel="noreferrer" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center', marginBottom: '1rem' }}>
                                <Mail size={18} /> Ver Correo Enviado (Modo Pruebas)
                            </a>
                        )}

                        <button className="btn-primary" style={{ width: '100%' }} onClick={() => setEstado({...estado, exito: false})}>
                            Generar Nueva Invitación
                        </button>
                    </motion.div>
                ) : (
                    <form onSubmit={handleGenerarLink}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label className="label">Razón Social / Nombre Completo</label>
                                <div style={{ position: 'relative' }}>
                                    <Building size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input 
                                        required 
                                        type="text" 
                                        className="input-field" 
                                        style={{ paddingLeft: '2.5rem' }}
                                        placeholder="Ej. Suministros ABC S.A.S."
                                        value={formData.razon_social}
                                        onChange={e => setFormData({...formData, razon_social: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="label">Correo Electrónico (Notificación)</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input 
                                        required 
                                        type="email" 
                                        className="input-field" 
                                        style={{ paddingLeft: '2.5rem' }}
                                        placeholder="ejemplo@empresa.com"
                                        value={formData.correo}
                                        onChange={e => setFormData({...formData, correo: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="label">Tipo de Vinculación</label>
                                    <select 
                                        className="input-field"
                                        value={formData.tipo_vinculacion}
                                        onChange={e => setFormData({...formData, tipo_vinculacion: e.target.value})}
                                    >
                                        <option value="proveedor">Proveedor</option>
                                        <option value="cliente">Cliente</option>
                                        <option value="empleado">Empleado</option>
                                        <option value="contratista">Contratista</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="label">Área Solicitante</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input 
                                            required 
                                            type="text" 
                                            className="input-field" 
                                            style={{ paddingLeft: '2.5rem' }}
                                            placeholder="Ej. Sistemas, Compras"
                                            value={formData.area_solicitante}
                                            onChange={e => setFormData({...formData, area_solicitante: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', marginTop: '1rem' }} disabled={estado.cargando}>
                                {estado.cargando ? (
                                    <><Loader2 size={20} className="spinner" /> Generando link seguro...</>
                                ) : (
                                    <><Send size={20} /> Generar y Enviar Invitación</>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}

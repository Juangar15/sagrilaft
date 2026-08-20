import React, { useState } from 'react';
import { sagrilaftService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Mail, CheckCircle, Shield, Building, User, Send, Loader2 } from 'lucide-react';

export default function PortalInterno() {
    const [formData, setFormData] = useState({
        razon_social: '',
        correo: '',
        tipo_vinculacion: 'proveedor',
        area_solicitante: '',
        empresa_destino: 'cosechas'
    });
    
    const [tab, setTab] = useState('proveedores');
    const [estado, setEstado] = useState({ cargando: false, exito: false, linkGenerado: '', previewUrl: '', error: '' });
    const [toast, setToast] = useState({ visible: false, message: '' });

    const showToast = (message) => {
        setToast({ visible: true, message });
        setTimeout(() => setToast({ visible: false, message: '' }), 3000);
    };

    const handleGenerarLink = async (e) => {
        e.preventDefault();
        setEstado({ cargando: true, exito: false, linkGenerado: '', previewUrl: '', error: '' });

        try {
            const respuesta = await sagrilaftService.generarInvitacion(formData);
            setEstado({ 
                cargando: false, 
                exito: true, 
                linkGenerado: `${window.location.origin}/onboarding?token=${respuesta.token}`,
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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
            <AnimatePresence>
                {toast.visible && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'fixed', top: '20px', right: '20px',
                            background: 'var(--success)', color: 'white',
                            padding: '1rem 1.5rem', borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                            zIndex: 9999, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500'
                        }}
                    >
                        <CheckCircle size={20} />
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="card glass-panel" 
                style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', border: '1px solid var(--border)' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
                    <button 
                        onClick={() => window.location.href = '/dashboard'}
                        className="btn-outline"
                        style={{ position: 'absolute', left: 0, top: 0, padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none' }}
                    >
                        ⬅️ Volver
                    </button>
                    <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(20, 80, 120, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                        <Shield size={40} color="var(--primary)" />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', margin: '0 0 0.5rem', color: 'var(--primary)' }}>Portal Interno SAGRILAFT</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Generación de links de vinculación para contrapartes.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <button 
                        onClick={() => setTab('proveedores')}
                        style={{ flex: 1, padding: '0.75rem', border: 'none', background: tab === 'proveedores' ? 'var(--primary)' : 'transparent', color: tab === 'proveedores' ? 'white' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                    >
                        Terceros (Link Único)
                    </button>
                    <button 
                        onClick={() => setTab('empleados')}
                        style={{ flex: 1, padding: '0.75rem', border: 'none', background: tab === 'empleados' ? 'var(--primary)' : 'transparent', color: tab === 'empleados' ? 'white' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                    >
                        Empleados (Link Genérico)
                    </button>
                </div>

                {estado.error && (
                    <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', marginBottom: '1.5rem', textAlign: 'center' }}>
                        {estado.error}
                    </div>
                )}

                {tab === 'proveedores' ? (
                    estado.exito ? (
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
                        <>
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

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label className="label">Empresa Destino</label>
                                            <select 
                                                className="input-field"
                                                value={formData.empresa_destino}
                                                onChange={e => setFormData({...formData, empresa_destino: e.target.value})}
                                            >
                                                <option value="cosechas">Cosechas</option>
                                                <option value="selecta">Selecta</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Tipo de Vinculación</label>
                                            <select 
                                                className="input-field"
                                                value={formData.tipo_vinculacion}
                                                onChange={e => setFormData({...formData, tipo_vinculacion: e.target.value})}
                                            >
                                                <option value="proveedor">Proveedor</option>
                                                <option value="cliente_selecta">Cliente</option>
                                                <option value="franquiciado">Franquiciado</option>
                                                <option value="posible_franquiciado">Posible Franquiciado</option>
                                                <option value="prestacion_servicios">Prestación de Servicios</option>
                                                <option value="contratista">Contratista</option>
                                                <option value="accionista">Accionista</option>
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

                            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    💡 <b>Enlace de Revisión (Terceros):</b> Si necesitas compartir el formulario con la Oficial de Cumplimiento para su revisión sin generar una invitación formal, puedes usar este enlace público temporal:
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                                    <code style={{ background: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--primary)', border: '1px dashed var(--border)' }}>
                                        {window.location.origin}/onboarding/proveedor
                                    </code>
                                    <button 
                                        className="btn-outline" 
                                        style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigator.clipboard.writeText(`${window.location.origin}/onboarding/proveedor`);
                                            showToast('¡Enlace de revisión copiado!');
                                        }}
                                    >
                                        📋 Copiar
                                    </button>
                                </div>
                            </div>
                        </>
                    )
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', marginBottom: '1.5rem' }}>
                            <User size={30} color="var(--primary)" />
                        </div>
                        <h3 style={{ margin: '0 0 1rem', color: 'var(--text-main)' }}>Enlace Universal de Empleados</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.5' }}>
                            Este enlace no requiere generación única, no caduca y no envía correo automático. 
                            Puedes copiarlo y enviarlo masivamente por WhatsApp, Intranet o correo a cualquier empleado nuevo.
                        </p>
                        
                        <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '2px dashed var(--border)', marginBottom: '1.5rem', wordBreak: 'break-all', fontSize: '1rem', fontWeight: '500', color: 'var(--primary)' }}>
                            {window.location.origin}/onboarding/empleado
                        </div>
                        
                        <button 
                            className="btn-primary" 
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/onboarding/empleado`);
                                showToast('¡Enlace copiado al portapapeles!');
                            }}
                        >
                            📋 Copiar Enlace Genérico
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

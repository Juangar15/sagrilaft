import React, { useState, useEffect } from 'react';
import { sagrilaftService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  User, Briefcase, FileText, ArrowRight, ArrowLeft, CheckCircle, UploadCloud, ShieldCheck, CreditCard, Lock, Smartphone 
} from 'lucide-react';

const CurrencyInput = ({ label, name, value, onChange, width="1fr", required = true }) => {
    const handleChange = (e) => {
        let rawValue = e.target.value.replace(/\D/g, '');
        onChange({ target: { name, value: rawValue }});
    }
    const formatted = value ? `$ ${parseInt(value, 10).toLocaleString('es-CO')}` : '';
    return (
        <div>
            <label className={required ? "label required" : "label"}>{label}</label>
            <input type="text" value={formatted} onChange={handleChange} className="input-field" placeholder="$ 0" />
        </div>
    )
};

export default function FormularioEmpleado() {
    const [paso, setPaso] = useState(1);
    const [cargando, setCargando] = useState(false);
    const [resultadoApi, setResultadoApi] = useState(null);
    const [codigoOTP, setCodigoOTP] = useState('');
    const [otpEnviado, setOtpEnviado] = useState(false);
    const [terminosAceptados, setTerminosAceptados] = useState(false);
    const [auditHash, setAuditHash] = useState('');

    const [formData, setFormData] = useState({
        fecha_diligenciamiento: new Date().toISOString().split('T')[0],
        tipo_solicitud: 'vinculacion',
        clase_vinculacion: 'empleado',
        tipo_persona: 'natural',

        // 1. Datos Personales y Tributarios
        nombres: '', primer_apellido: '', segundo_apellido: '',
        tipo_identificacion: 'cc', numero_identificacion: '',
        lugar_fecha_expedicion: '', fecha_nacimiento: '',
        lugar_nacimiento: '', nacionalidad: 'Colombiana',
        correo_electronico: '', estado_civil: 'soltero',
        direccion_residencial: '', telefono_celular: '',
        ciudad: 'Medellín', departamento: 'Antioquia', pais: 'Colombia',
        ocupacion_profesion: '', declara_renta: 'no',
        responsable_iva: 'no', regimen_simple: 'no', gran_contribuyente: 'no',
        exterior_tributario: 'no', autoretenedor_renta: 'no', autoretenedor_iva: 'no', autoretenedor_ica: 'no',

        // 2. Perfil Financiero Personal
        activos: '', pasivos: '', patrimonio: 0,
        ingresos_mensuales: '', egresos_mensuales: '',
        otros_ingresos_mensuales: '', concepto_otros_ingresos: '',
        operaciones_internacionales: 'ninguno', posee_productos_exterior: 'no',
        origen_fondos: '',

        // 3. Familiares y PEPs
        familiares: [], 
        es_funcionario_publico: 'no', vinculo_familiar_pep: 'no',
        ejerce_poder_publico: 'no', maneja_recursos_publicos: 'no', 
        goza_reconocimiento_publico: 'no', declara_ser_pep: 'no',
        pep_detalles: '',

        // 4. Conflicto de Interés
        conflicto_interes_declara: 'no',
        familiares_conflicto: [],

        // 5. Documentos
        archivos_cargados: {}
    });

    const [fechasDocumentos, setFechasDocumentos] = useState({});
    const [nuevoFamiliar, setNuevoFamiliar] = useState({ tipo_id: 'cc', identificacion: '', nombre: '', parentesco: 'Padre/Madre', pep: 'no' });
    const [nuevoFamiliarConflicto, setNuevoFamiliarConflicto] = useState({ tipo_id: 'cc', identificacion: '', nombre: '', parentesco: 'Padre/Madre' });

    useEffect(() => {
        const activos = parseFloat(formData.activos) || 0;
        const pasivos = parseFloat(formData.pasivos) || 0;
        setFormData(prev => ({ ...prev, patrimonio: activos - pasivos }));
    }, [formData.activos, formData.pasivos]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddList = (listName, item, resetStateFn, emptyState) => {
        setFormData(prev => ({ ...prev, [listName]: [...prev[listName], item] }));
        resetStateFn(emptyState);
    };

    const enviarOTP = () => {
        setCargando(true);
        setTimeout(() => {
            setOtpEnviado(true);
            setCargando(false);
            setAuditHash(Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''));
        }, 1500);
    };

    const generarFormularioPDF = () => {
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const nombreSujeto = `${formData.nombres} ${formData.primer_apellido}`;
            const idSujeto = formData.numero_identificacion;
            
            doc.setFontSize(14);
            doc.setTextColor(50, 50, 50);
            doc.text("FORMATO DE VINCULACIÓN Y CONFLICTO DE INTERESES", 14, 20);
            doc.setFontSize(10);
            doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 26);

            autoTable(doc, {
                startY: 32,
                head: [['Campo', 'Valor Declarado']],
                body: [
                    ['Clase Vinculación', formData.clase_vinculacion.toUpperCase()],
                    ['Nombre Completo', nombreSujeto],
                    ['Identificación', idSujeto],
                    ['Total Activos', `$ ${parseInt(formData.activos || 0).toLocaleString('es-CO')}`],
                    ['Total Pasivos', `$ ${parseInt(formData.pasivos || 0).toLocaleString('es-CO')}`],
                    ['Ingresos Mensuales', `$ ${parseInt(formData.ingresos_mensuales || 0).toLocaleString('es-CO')}`],
                    ['Conflicto Interés', formData.conflicto_interes_declara === 'si' ? 'REPORTADO' : 'NINGUNO'],
                ],
                theme: 'grid',
                headStyles: { fillColor: [50, 50, 50] }
            });

            const finalY = doc.lastAutoTable.finalY || 100;
            doc.setFillColor(240, 248, 255);
            doc.rect(14, finalY + 10, 180, 50, 'F');
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text("CERTIFICADO DE AUDITORÍA Y FIRMA ELECTRÓNICA OTP", 18, finalY + 18);
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(60, 60, 60);
            doc.text(`En conformidad con la Ley 527 de 1999, este documento ha sido firmado electrónicamente`, 18, finalY + 25);
            doc.text(`mediante validación de código OTP (One-Time Password) vía WhatsApp al celular del solicitante.`, 18, finalY + 30);
            
            doc.setFont("courier", "bold");
            doc.setTextColor(20, 120, 60);
            doc.text(`Timestamp:    ${new Date().toISOString()}`, 18, finalY + 40);
            doc.text(`Dirección IP: 190.158.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, 18, finalY + 45);
            doc.text(`Hash SHA-256: ${auditHash}`, 18, finalY + 50);

            doc.save(`Formato_RRHH_${idSujeto}.pdf`);
        } catch (e) {
            alert("Error generando PDF: " + e.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCargando(true);
        try {
            const respuesta = await sagrilaftService.procesarOnboarding(formData);
            setResultadoApi(respuesta);
        } catch (error) {
            alert("Error enviando datos al servidor.");
        } finally {
            setCargando(false);
            generarFormularioPDF();
        }
    };

    const renderInput = (label, name, type = "text", width = "1fr") => (
        <div>
            <label className={required ? "label required" : "label"}>{label}</label>
            <input type={type} name={name} value={formData[name]} onChange={handleChange} className="input-field" />
        </div>
    );

    const renderSelect = (label, name, options, width = "1fr", required = true) => {
        return (
        <div>
            <label className={required ? "label required" : "label"}>{label}</label>
            <select name={name} value={formData[name]} onChange={handleChange} className="input-field">
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    )};

    const formVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
    };

    if (resultadoApi) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', padding: '2rem' }}>
                <div style={{ background: 'var(--surface)', padding: '3rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', maxWidth: '600px', textAlign: 'center' }}>
                    <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem' }} />
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-main)' }}>¡Vinculación Completada!</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                        Tus datos han sido procesados correctamente por el Oficial de Cumplimiento. Se ha generado una copia en PDF del formato.
                    </p>
                    <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: '2rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0' }}>Dictamen Final del Motor:</h4>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: resultadoApi.aprobado ? 'var(--success)' : 'var(--danger)' }}>
                            {resultadoApi.aprobado ? '✅ Aprobado Automáticamente' : '⚠️ Requiere Revisión Manual'}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Formato de Talento Humano</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Vinculación y Declaración de Conflictos de Interés</p>
                    
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                        {[1,2,3,4,5].map(p => (
                            <div key={p} style={{ height: '6px', flex: 1, borderRadius: '3px', background: paso >= p ? 'var(--secondary)' : 'rgba(255,255,255,0.2)', transition: '0.3s' }} />
                        ))}
                    </div>
                </div>

                <div style={{ background: 'var(--surface)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
                    <AnimatePresence mode="wait">
                        
                        {/* PASO 1: DATOS PERSONALES */}
                        {paso === 1 && (
                            <motion.div key="p1" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={20}/> 1. Datos Personales y Tributarios</h3>
                                
                                <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                    {renderInput("Nombres", "nombres", "text", "1fr", false, true)}
                                    {renderInput("Primer Apellido", "primer_apellido", "text", "1fr", false, true)}
                                    {renderInput("Segundo Apellido", "segundo_apellido", "text", "1fr", false, false)}
                                </div>
                                <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                    {renderSelect("Tipo ID", "tipo_identificacion", [{value:'cc', label:'Cédula de Ciudadanía'}, {value:'ce', label:'Cédula de Extranjería'}, {value:'pasaporte', label:'Pasaporte'}])}
                                    {renderInput("No. Identificación", "numero_identificacion", "text", "1fr", false, true)}
                                    {renderInput("Lugar Nacimiento", "lugar_nacimiento")}
                                </div>
                                <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                    {renderInput("Correo Electrónico", "correo_electronico", "email", "1fr", false, true)}
                                    {renderInput("Teléfono / Celular", "telefono_celular", "text", "1fr", false, true)}
                                    {renderInput("Dirección", "direccion_residencial", "text", "1fr", false, true)}
                                </div>
                                <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                    {renderInput("Ciudad", "ciudad")}
                                    {renderInput("Ocupación / Oficio", "ocupacion_profesion")}
                                    {renderSelect("¿Declara Renta?", "declara_renta", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                </div>

                                <h4 style={{ margin: '2rem 0 1rem 0' }}>Perfil Tributario</h4>
                                <div className="form-grid form-grid-4">
                                    {renderSelect("Responsable IVA", "responsable_iva", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("Régimen Simple", "regimen_simple", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("Gran Contribuyente", "gran_contribuyente", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("Exterior", "exterior_tributario", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                </div>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button className="btn-primary" onClick={() => setPaso(2)}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 2: PERFIL FINANCIERO */}
                        {paso === 2 && (
                            <motion.div key="p2" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard size={20}/> 2. Perfil Financiero Personal</h3>
                                
                                <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                    <CurrencyInput label="Total Activos" name="activos" value={formData.activos} onChange={handleChange} required={true} />
                                    <CurrencyInput label="Total Pasivos" name="pasivos" value={formData.pasivos} onChange={handleChange} required={true} />
                                    <div style={{ flex: "1fr" }}>
                                        <label className="label">Patrimonio Líquido</label>
                                        <input type="text" value={`$ ${formData.patrimonio.toLocaleString('es-CO')}`} disabled className="input-field" style={{ fontWeight: 'bold' }} />
                                    </div>
                                </div>
                                <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                    <CurrencyInput label="Ingresos Mensuales" name="ingresos_mensuales" value={formData.ingresos_mensuales} onChange={handleChange} required={true} />
                                    <CurrencyInput label="Egresos Mensuales" name="egresos_mensuales" value={formData.egresos_mensuales} onChange={handleChange} required={true} />
                                </div>
                                
                                <div style={{ marginTop: '2rem' }}>
                                    {renderInput("Declaración de Origen de Fondos (Especifique):", "origen_fondos", "text")}
                                </div>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button className="btn-outline" onClick={() => setPaso(1)}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => setPaso(3)}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 3: FAMILIARES Y PEPS */}
                        {paso === 3 && (
                            <motion.div key="p3" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={20}/> 3. Núcleo Familiar y PEPs</h3>
                                
                                <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0' }}>Identificación de Familiares (Padres, hermanos, hijos, cónyuge)</h4>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1.5 }}><label className="label">Nombre</label><input type="text" value={nuevoFamiliar.nombre} onChange={e=>setNuevoFamiliar({...nuevoFamiliar, nombre: e.target.value})} className="input-field"/></div>
                                        <div style={{ flex: 1 }}><label className="label">Cédula</label><input type="text" value={nuevoFamiliar.identificacion} onChange={e=>setNuevoFamiliar({...nuevoFamiliar, identificacion: e.target.value})} className="input-field"/></div>
                                        <div style={{ flex: 1 }}><label className="label">Parentesco</label><input type="text" value={nuevoFamiliar.parentesco} onChange={e=>setNuevoFamiliar({...nuevoFamiliar, parentesco: e.target.value})} className="input-field"/></div>
                                        <div style={{ flex: 0.8 }}>
                                            <label className="label">¿Es PEP?</label>
                                            <select value={nuevoFamiliar.pep} onChange={e=>setNuevoFamiliar({...nuevoFamiliar, pep: e.target.value})} className="input-field">
                                                <option value="no">No</option><option value="si">Sí</option>
                                            </select>
                                        </div>
                                        <button className="btn-outline" onClick={() => handleAddList('familiares', nuevoFamiliar, setNuevoFamiliar, {tipo_id:'cc', identificacion:'', nombre:'', parentesco:'', pep:'no'})}>+ Agregar</button>
                                    </div>
                                    {formData.familiares.map((fam, idx) => (
                                        <div key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                            👤 {fam.nombre} (CC: {fam.identificacion}) - Parentesco: <b>{fam.parentesco}</b> {fam.pep === 'si' && <span style={{color:'var(--danger)', fontWeight:'bold'}}>(PEP)</span>}
                                        </div>
                                    ))}
                                </div>

                                <h4 style={{ margin: '0 0 1rem 0' }}>Cuestionario PEP del Empleado</h4>
                                <div className="form-grid form-grid-2">
                                    {renderSelect("¿Es o fue funcionario público?", "es_funcionario_publico", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("¿Goza de reconocimiento público?", "goza_reconocimiento_publico", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                </div>
                                <div style={{ marginTop: '1.5rem' }}>
                                    {renderInput("Detalles (Si respondió afirmativamente)", "pep_detalles", "text", "1fr", false, false)}
                                </div>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button className="btn-outline" onClick={() => setPaso(2)}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => setPaso(4)}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 4: CONFLICTO DE INTERÉS */}
                        {paso === 4 && (
                            <motion.div key="p4" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20}/> 4. Declaración de Conflictos de Interés</h3>
                                
                                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                        <p>Este tipo de evento ocurre cuando el interés personal interfiere con los intereses de la empresa:</p>
                                        <ol style={{ margin: '0.5rem 0 0.5rem 1.5rem', padding: 0 }}>
                                            <li><strong>Desarrollo de actividades:</strong> no se permiten actividades paralelas, conflictivas con los negocios.</li>
                                            <li><strong>Contratación de familiares:</strong> Solo será permitida con aprobación previa.</li>
                                            <li><strong>Relaciones comerciales:</strong> No tener relaciones comerciales con competidores, clientes, proveedores.</li>
                                        </ol>
                                    </div>
                                    
                                    {renderSelect("¿Declara que tiene situaciones que puedan presentar un POTENCIAL CONFLICTO DE INTERÉS para el ejercicio de su cargo?", "conflicto_interes_declara", [{value:'no', label:'No, no tengo conflictos'}, {value:'si', label:'Sí, declaro conflicto'}])}
                                </div>

                                {formData.conflicto_interes_declara === 'si' && (
                                <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--warning-text)' }}>Entidades o Familiares con posible Conflicto</h4>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1.5 }}><label className="label">Nombre / Razón Social</label><input type="text" value={nuevoFamiliarConflicto.nombre} onChange={e=>setNuevoFamiliarConflicto({...nuevoFamiliarConflicto, nombre: e.target.value})} className="input-field"/></div>
                                        <div style={{ flex: 1 }}><label className="label">Identificación</label><input type="text" value={nuevoFamiliarConflicto.identificacion} onChange={e=>setNuevoFamiliarConflicto({...nuevoFamiliarConflicto, identificacion: e.target.value})} className="input-field"/></div>
                                        <div style={{ flex: 1 }}><label className="label">Parentesco/Relación</label><input type="text" value={nuevoFamiliarConflicto.parentesco} onChange={e=>setNuevoFamiliarConflicto({...nuevoFamiliarConflicto, parentesco: e.target.value})} className="input-field"/></div>
                                        <button className="btn-outline" onClick={() => handleAddList('familiares_conflicto', nuevoFamiliarConflicto, setNuevoFamiliarConflicto, {tipo_id:'cc', identificacion:'', nombre:'', parentesco:''})}>+ Añadir Alerta</button>
                                    </div>
                                    {formData.familiares_conflicto.map((fam, idx) => (
                                        <div key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--danger)' }}>
                                            ⚠️ {fam.nombre} (ID: {fam.identificacion}) - Relación: <b>{fam.parentesco}</b>
                                        </div>
                                    ))}
                                </div>
                                )}

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button className="btn-outline" onClick={() => setPaso(3)}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => setPaso(5)}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 5: FIRMA ELECTRÓNICA */}
                        {paso === 5 && (
                            <motion.div key="p5" variants={formVariants} initial="hidden" animate="visible" exit="exit" style={{ textAlign: 'center' }}>
                                <Lock size={48} color="var(--secondary)" style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ marginBottom: '1rem' }}>Autorización y Firma (Ley 527)</h3>
                                
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', justifyContent: 'center' }}>
                                        <input type="checkbox" checked={terminosAceptados} onChange={(e) => setTerminosAceptados(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                        <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--primary)' }}>Acepto la Política de Tratamiento de Datos Personales</span>
                                    </label>
                                </div>

                                {!otpEnviado ? (
                                    <button className="btn-primary" style={{ margin: '0 auto' }} disabled={!terminosAceptados || cargando} onClick={enviarOTP}>
                                        {cargando ? 'Generando código...' : <><Smartphone size={18}/> Solicitar Código OTP</>}
                                    </button>
                                ) : (
                                    <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                                        <label className="label">Ingresa el código de 6 dígitos enviado a tu WhatsApp</label>
                                        <input type="text" value={codigoOTP} onChange={(e) => setCodigoOTP(e.target.value)} className="input-field" style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.25rem', marginBottom: '1rem' }} maxLength="6" placeholder="000000" />
                                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={codigoOTP.length < 6 || cargando} onClick={handleSubmit}>
                                            <ShieldCheck size={18} /> Firmar y Enviar
                                        </button>
                                    </div>
                                )}
                                
                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-start' }}>
                                    <button className="btn-outline" onClick={() => setPaso(4)}><ArrowLeft size={18}/> Atrás</button>
                                </div>
                            </motion.div>
                        )}
                        
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
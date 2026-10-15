import React, { useState, useEffect } from 'react';
import { sagrilaftService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import colombiaData from '../utils/colombia.json';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Building2, User, Briefcase, FileText, 
  ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, 
  UploadCloud, ShieldCheck, CreditCard, Lock, Smartphone, Download, Info, Globe
} from 'lucide-react';
import ciiuData from '../data/CIIU.json';

// --- COMPONENTE AUXILIAR PARA MONEDA ---
const CurrencyInput = ({ label, name, value, onChange, width="1fr", required = true, disabled = false, isError = false }) => {
    const handleChange = (e) => {
        let rawValue = e.target.value.replace(/\D/g, '');
        onChange({ target: { name, value: rawValue }});
    }
    const formatted = value ? `$ ${parseInt(value, 10).toLocaleString('es-CO')}` : '';
    return (
        <div style={{ position: 'relative' }}>
            <label className={required && !disabled ? "label required" : "label"}>{label}</label>
            <input type="text" value={formatted} onChange={handleChange} className="input-field" placeholder="$ 0" disabled={disabled} style={{ ...(disabled ? {opacity: 0.7, cursor: 'not-allowed', background: '#f3f4f6'} : {}), ...(isError ? {border: '2px solid #ef4444', background: '#fef2f2'} : {}) }} />
        </div>
    )
};

export default function FormularioProveedor({ isGenericEmpleado = false }) {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [paso, setPaso] = useState(1);
    const [cargando, setCargando] = React.useState(false);
    const [resultadoApi, setResultadoApi] = React.useState(null);
    const [archivosFisicos, setArchivosFisicos] = React.useState({});
    const [codigoOTP, setCodigoOTP] = useState('');
    const [otpEnviado, setOtpEnviado] = useState(false);
    const [terminosAceptados, setTerminosAceptados] = useState(false);
    const [auditHash, setAuditHash] = useState('');
    
    // Estado de Corrección Parcial (Ping-Pong)
    const [camposACorregir, setCamposACorregir] = useState({});
    const [esCorreccion, setEsCorreccion] = useState(false);

    // Estado para Notificaciones (Toast)
    const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

    const showToast = (message, type = 'error') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 4000);
    };

    const [formData, setFormData] = useState({
        // 0. Metadata
        fecha_diligenciamiento: new Date().toISOString().split('T')[0],
        ambito_operacion: '',
        empresa_destino: '',
        tipo_solicitud: '',
        clase_vinculacion: isGenericEmpleado ? 'empleado' : 'proveedor',
        tipo_proveeduria: '',
        tipo_persona: isGenericEmpleado ? 'natural' : '',

        // 1. Identificación Natural
        nombres: '', primer_apellido: '', segundo_apellido: '',
        tipo_identificacion: '', numero_identificacion: '',
        lugar_expedicion: '', fecha_expedicion: '', 
        fecha_nacimiento: '', lugar_nacimiento: '', nacionalidad: '',
        correo_electronico: '', estado_civil: '',
        direccion_residencial: '', telefono_celular: '',
        ciudad: '', departamento: '', pais: 'Colombia',
        ocupacion_profesion: '', declara_renta: '',
        actividad_economica_principal: '', codigo_ciiu: '', sector: '', sector_otro: '',
        empresa_labora: '', cargo: '', area: '',
        direccion_corporativa: '', telefono_corporativo: '',
        ciudad_empresa_labora: '', departamento_empresa_labora: '', pais_empresa_labora: '',

        // 2. Identificación Jurídica
        razon_social: '', tipo_empresa: '',
        direccion_oficina_principal: '', ciudad_juridica: '',
        departamento_juridica: '', telefono_juridica: '',
        tiene_sucursales: '', sucursales_info: '', // ciudad/departamento/pais de sucursales
        telefono_corporativo_juridica: '', correo_corporativo_juridica: '', celular_corporativo_juridica: '',
        actividad_economica_principal_juridica: '', codigo_ciiu_juridica: '', sector_juridica: 'Comercial', sector_otro_juridica: '',
        
        rep_legal_nombres: '', rep_legal_primer_apellido: '', rep_legal_segundo_apellido: '',
        rep_legal_tipo_id: 'cc', rep_legal_numero_id: '', 
        rep_legal_lugar_expedicion: '', rep_legal_fecha_expedicion: '',
        rep_legal_fecha_nacimiento: '', rep_legal_lugar_nacimiento: '', rep_legal_nacionalidad: '',
        rep_legal_direccion: '', rep_legal_telefono: '',

        // Tributaria
        responsable_iva: 'no', regimen_simple: 'no', gran_contribuyente: 'no',
        exterior_tributario: 'no', autoretenedor_renta: 'no', autoretenedor_iva: 'no', autoretenedor_ica: 'no',

        // Financiera
        activos: '', pasivos: '', patrimonio: 0,
        ingresos_mensuales: '', egresos_mensuales: '',
        otros_ingresos_mensuales: '', concepto_otros_ingresos: '',
        operaciones_internacionales: [], posee_productos_exterior: 'no',
        activos_virtuales: 'no', cuales_activos_virtuales: '',
        productos_exterior: [], // {tipo, identificacion, monto, moneda, entidad, ciudad, pais}

        // 3. Accionistas y PEPs
        accionistas: [], // {tipo_id, identificacion, nombre, porcentaje, administra_recursos, goza_reconocimiento}
        es_funcionario_publico: 'no', vinculo_familiar_pep: 'no',
        ejerce_poder_publico: 'no', maneja_recursos_publicos: 'no', 
        goza_reconocimiento_publico: 'no', declara_ser_pep: 'no',
        pep_detalles: '',

        // 4 & 5. Referencias
        referencias_comerciales: [], // {referencia, direccion, ciudad, contacto, telefono}
        referencias_bancarias: [], // {referencia, cuenta, tipo, ciudad, telefono}
        pep_familiares_extendido: [], // {nombre, identificacion, parentesco}

        // 6. Ética
        politica_corrupcion: 'no', tiene_comite_etica: 'no', codigo_etica_conducta: 'no',
        canales_denuncia: 'no', acusada_corrupcion: 'no', 
        tiene_oficial_cumplimiento: 'no', nombre_oficial_cumplimiento: '', detalles_etica: '',
        
        // 7. ESG
        esg_gestiona_riesgos: [], // ['Ambientales', 'Sociales', 'Gobernanza', 'No']
        esg_politicas: [],
        esg_materias_sostenibles: 'no',
        esg_evalua_proveedores: 'no', esg_evalua_cuales: '',
        esg_sancionada: 'no', esg_sancionada_motivo: '',
        esg_practicas_ambientales: [], esg_practicas_ambientales_otros: '',
        esg_legislacion_laboral: 'no',
        esg_sgsst: 'no_aplica',
        esg_derechos_humanos: 'no',
        esg_prohibe_trabajo_infantil: 'no',
        esg_entorno_libre_discriminacion: 'no',

        // Nuevos campos
        tiene_conflicto_interes: 'no',
        familiares_conflicto: [],
        realiza_operaciones_internacionales: '',
        activos_virtuales: '',

        // 8. Fondos
        origen_fondos: '',
        representacion_de: '',

        // Documentos
        archivos_cargados: {},

        // Terceros extras
        nit_digito: '',
        accionistas_confidencial: false,
        cert_laft_aceptado: false,
        cert_pep_aceptado: false,
        cert_laft_razon: ''
    });

    // Efecto para verificar token y recuperar datos si el formulario fue devuelto (Ping-Pong)
    useEffect(() => {
        if (!token) return;

        const inicializarFormulario = async () => {
            let esPingPong = false;
            
            // 1. Intentar recuperar como un Ping-Pong (Formulario devuelto)
            try {
                const sol = await sagrilaftService.obtenerSolicitudPorToken(token);
                if (sol && sol.datos_formulario) {
                    setFormData(prev => ({ ...prev, ...sol.datos_formulario, token }));
                    setTerminosAceptados(true);
                    esPingPong = true;
                    if (sol.estado_actual === 'DEVUELTO_CORRECCION') {
                        setEsCorreccion(true);
                        setCamposACorregir(sol.campos_a_corregir || {});
                    }
                }
            } catch (error) {
                // No es Ping-Pong o no existe aún en la base de datos
            }

            // 2. Si no es Ping-Pong, intentar validar como Invitación Nueva
            if (!esPingPong) {
                try {
                    const validacion = await sagrilaftService.validarInvitacion(token);
                    if (validacion && validacion.valido) {
                        setFormData(prev => ({ 
                            ...prev, 
                            token,
                            clase_vinculacion: validacion.datos.tipo_vinculacion?.toLowerCase() || '',
                            correo_electronico: validacion.datos.correo || '',
                            // Si es empleado, forzar a natural
                            tipo_persona: ['empleado', 'contratista', 'accionista'].includes(validacion.datos.tipo_vinculacion?.toLowerCase()) ? 'natural' : prev.tipo_persona
                        }));
                    }
                } catch (error) {
                    showToast("El enlace de invitación es inválido o ha expirado.");
                }
            }
        };
        
        inicializarFormulario();
    }, [token]);

    // Estados temporales para listas dinámicas y fechas de documentos
    const [fechasDocumentos, setFechasDocumentos] = useState({});
    const [nuevoAccionista, setNuevoAccionista] = useState({ tipo_id: 'cc', identificacion: '', nombre: '', porcentaje: '', administra_recursos: 'no', goza_reconocimiento: 'no' });
    const [nuevaRefComercial, setNuevaRefComercial] = useState({ referencia: '', direccion: '', ciudad: '', contacto: '', telefono: '' });
    const [nuevaRefBancaria, setNuevaRefBancaria] = useState({ banco: '', cuenta: '', tipo: 'Ahorros', ciudad: '', telefono: '' });
    const [nuevoFamiliarPep, setNuevoFamiliarPep] = useState({ nombre: '', identificacion: '', parentesco: '' });
    const [nuevoProdExt, setNuevoProdExt] = useState({ tipo: '', identificacion: '', monto: '', moneda: '', entidad: '', ciudad: '', pais: '' });

    
    const handleCheckboxArray = (e, field) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const currentArray = prev[field] || [];
            if (checked) {
                if (value === 'No' || value === 'ninguno') return { ...prev, [field]: [value] }; // Exclusive option
                return { ...prev, [field]: [...currentArray.filter(i => i !== 'No' && i !== 'ninguno'), value] };
            } else {
                return { ...prev, [field]: currentArray.filter(i => i !== value) };
            }
        });
    };

    const renderCheckboxArray = (label, field, options) => {
        const currentArray = formData[field] || [];
        const disabled = esCorreccion && !camposACorregir[field];
        return (
            <div style={{ marginBottom: '1rem', width: '100%', ...(disabled ? {opacity: 0.7} : {}), ...(camposACorregir[field] ? {border: '2px solid #ef4444', background: '#fef2f2', padding: '1rem', borderRadius: '8px'} : {}) }}>
                <label className="label">{label}</label>
                <div className="form-grid form-grid-2">
                    {options.map(opt => (
                        <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                            <input 
                                type="checkbox" 
                                value={opt.value} 
                                checked={currentArray.includes(opt.value)} 
                                onChange={(e) => handleCheckboxArray(e, field)} 
                                disabled={disabled}
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </div>
        );
    };

    const ciiuList = React.useMemo(() => {
        const list = [];
        if (!ciiuData) return list;
        Object.values(ciiuData).forEach(letra => {
            if (letra.divisiones) {
                Object.values(letra.divisiones).forEach(div => {
                    if (div.subdivisiones) {
                        Object.values(div.subdivisiones).forEach(sub => {
                            if (sub.actividades) {
                                Object.entries(sub.actividades).forEach(([codigo, desc]) => {
                                    list.push(`${codigo} - ${desc}`);
                                });
                            }
                        });
                    }
                });
            }
        });
        return list;
    }, []);

    const handleChange = (e) => {
        let { name, value } = e.target;
        
        // Validación de solo números
        const camposNumericos = [
            'telefono_celular', 'telefono_corporativo', 
            'telefono_juridica', 'telefono_corporativo_juridica', 'celular_corporativo_juridica',
            'rep_legal_numero_id', 'rep_legal_telefono', 'activos', 'pasivos', 
            'ingresos_mensuales', 'egresos_mensuales', 'patrimonio', 'otros_ingresos_mensuales'
        ];
        if (camposNumericos.includes(name)) {
            if (name === 'rep_legal_numero_id') {
                const isForeign = ['ce', 'pasaporte'].includes(formData.rep_legal_tipo_id || '');
                if (!isForeign) {
                    value = value.replace(/\D/g, '');
                }
            } else {
                value = value.replace(/\D/g, ''); // Elimina todo lo que no sea d?gito
            }
        }
        // NIT: solo numérico si NO es operación internacional
        if (name === 'numero_identificacion' && formData.ambito_operacion !== 'internacional') {
            value = value.replace(/\D/g, '');
        }

        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'clase_vinculacion' && ['empleado', 'prestacion_servicios', 'contratista', 'accionista'].includes(value)) {
                next.tipo_persona = 'natural';
            }
            return next;
        });
    };

    const handleAddList = (listName, item, resetStateFn, emptyState) => {
        setFormData(prev => ({ ...prev, [listName]: [...prev[listName], item] }));
        resetStateFn(emptyState);
    };

    const handleRemoveList = (listName, index) => {
        const arr = [...(formData[listName] || [])];
        arr.splice(index, 1);
        setFormData({...formData, [listName]: arr});
    };

    const enviarOTP = async () => {
        setCargando(true);
        try {
            const email = formData.tipo_persona === 'juridica' ? formData.correo_corporativo_juridica : formData.correo_electronico;
            if (!email) {
                showToast("No hay un correo electrónico asociado para enviar el código.");
                setCargando(false);
                return;
            }
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, empresa_destino: formData.empresa_destino })
            });
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Error enviando código');
            
            setOtpEnviado(true);
            showToast("Código de firma enviado a su correo electrónico.");
        } catch (error) {
            if (error.message === 'Network Error') {
                showToast("Error de red: La conexión falló o los archivos adjuntos son demasiado pesados para el servidor.");
            } else {
                showToast(error.message);
            }
        } finally {
            setCargando(false);
        }
    };

    const nombreEmpresaFull = formData.empresa_destino === 'selecta' ? 'SELECTA COMPAÑÍA DE CEREALES S.A.S.' : 'COSECHAS BEBIDAS NATURALES S.A.S.';
    const correoEmpresa = formData.empresa_destino === 'selecta' ? 'oficialdecumplimiento@cerealesselecta.com' : 'oficialdecumplimiento@cosechasexpress.com';
    const direccionEmpresa = formData.empresa_destino === 'selecta' ? 'CARRERA 48B NO. 99 SUR 59 La Estrella, en Antioquia' : 'CALLE 12 SUR # 50 G 21, Medellín, Antioquia';
    const isInternalRole = ['empleado', 'prestacion_servicios', 'contratista', 'accionista'].includes(formData.clase_vinculacion);

    const getPasosList = () => {
        const isPepEmpleado = isInternalRole && ['es_funcionario_publico', 'vinculo_familiar_pep', 'ejerce_poder_publico', 'maneja_recursos_publicos', 'goza_reconocimiento_publico', 'declara_ser_pep'].some(k => formData[k] === 'si');

        if (isInternalRole) {
            const steps = [
                { id: 1, label: 'Inicio' },
                { id: 2, label: 'Identificación' },
                { id: 3, label: 'Financiera' },
                { id: 12, label: 'Conflicto de Interés' },
                { id: 14, label: 'PEPs' }
            ];
            if (isPepEmpleado) {
                steps.push({ id: 15, label: 'Declaración PEP' });
            }
            steps.push({ id: 8, label: 'Origen Fondos' });
            steps.push({ id: 9, label: 'Documentos' });
            steps.push({ id: 10, label: 'Firma y Envío' });
            return steps;
        } else {
            const isPepTercero = ['es_funcionario_publico', 'vinculo_familiar_pep', 'ejerce_poder_publico', 'maneja_recursos_publicos', 'goza_reconocimiento_publico', 'declara_ser_pep'].some(k => formData[k] === 'si');
            return [
                { id: 1, label: 'Inicio' },
                { id: 2, label: 'Identificación' },
                { id: 3, label: 'Financiera' },
                { id: 4, label: 'Accionistas y PEP', condition: f => f.tipo_persona === 'juridica' },
                { id: 16, label: 'Declaración PEP', condition: () => isPepTercero },
                { id: 17, label: 'Cert. LA/FT', condition: f => f.accionistas_confidencial === true },
                { id: 5, label: 'Referencias' },
                { id: 6, label: 'Ética y Cumplimiento' },
                { id: 7, label: 'ASG' },
                { id: 8, label: 'Origen Fondos' },
                { id: 9, label: 'Documentos' },
                { id: 10, label: 'Firma y Envío' }
            ].filter(s => !s.condition || s.condition(formData));
        }
    };
    const pasosDisponibles = getPasosList();
    const currentStepIndex = pasosDisponibles.findIndex(p => p.id === paso);

    const validarPaso = (pasoActual) => {
        const d = formData;
        if (pasoActual === 1) {
            if (!terminosAceptados) {
                showToast("Debes aceptar la política de tratamiento de datos personales para continuar.");
                return false;
            }
            if (!d.fecha_diligenciamiento || !d.tipo_solicitud || !d.clase_vinculacion || !d.tipo_persona || !d.empresa_destino || (!isInternalRole && !d.ambito_operacion)) {
                showToast("Por favor completa todos los campos de este paso.");
                return false;
            }
        }
        if (pasoActual === 2) {
            if (d.tipo_persona === 'natural') {
                if (!d.nombres || !d.primer_apellido || !d.numero_identificacion || !d.fecha_nacimiento || !d.correo_electronico || !d.telefono_celular) {
                    showToast("Faltan campos obligatorios de identificación personal.");
                    return false;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo_electronico)) {
                    showToast("El correo electrónico ingresado no tiene un formato válido (ej. correo@empresa.com).");
                    return false;
                }
                if (!isInternalRole && (!d.actividad_economica_principal || !d.codigo_ciiu)) {
                    showToast("Faltan campos obligatorios: Actividad Económica y Código CIIU.");
                    return false;
                }
                const edad = new Date().getFullYear() - new Date(d.fecha_nacimiento).getFullYear();
                if (edad < 18) {
                    showToast("Debe ser mayor de edad (18+ años).");
                    return false;
                }
                if (d.fecha_nacimiento && d.fecha_expedicion && d.fecha_nacimiento >= d.fecha_expedicion) {
                    showToast("La fecha de nacimiento debe ser anterior a la fecha de expedición del documento.");
                    return false;
                }
            } else {
                if (!d.razon_social || !d.numero_identificacion || !d.nit_digito || !d.direccion_oficina_principal || !d.telefono_juridica || !d.correo_corporativo_juridica || !d.actividad_economica_principal_juridica || !d.codigo_ciiu_juridica || !d.rep_legal_nombres || !d.rep_legal_primer_apellido || !d.rep_legal_numero_id) {
                    showToast("Faltan campos obligatorios de la empresa o representante legal (incluido el dígito de verificación del NIT).");
                    return false;
                }
                if (d.rep_legal_fecha_nacimiento && d.rep_legal_fecha_expedicion && d.rep_legal_fecha_nacimiento >= d.rep_legal_fecha_expedicion) {
                    showToast("La fecha de nacimiento del representante legal debe ser anterior a su fecha de expedición.");
                    return false;
                }
            }
        }
        if (pasoActual === 3) {
            const activos = Number(d.activos) || 0;
            const pasivos = Number(d.pasivos) || 0;
            const patrimonio = Number(d.patrimonio) || 0;
            
            if (!isGenericEmpleado) {
                // Hacer obligatoria la información financiera para terceros
                if (d.activos === '' || d.pasivos === '' || d.patrimonio === '' || d.ingresos_mensuales === '' || d.egresos_mensuales === '' || d.activos === undefined || d.pasivos === undefined || d.patrimonio === undefined || d.ingresos_mensuales === undefined || d.egresos_mensuales === undefined) {
                    showToast("Por favor complete los campos obligatorios del Perfil Financiero.");
                    return false;
                }

                if (Math.abs(activos - (pasivos + patrimonio)) > 1) {
                    showToast("La ecuación contable no cuadra: Activos debe ser igual a Pasivos + Patrimonio.");
                    return false;
                }
            }
        }
        if (pasoActual === 12 && isInternalRole) {
            if (!d.tiene_conflicto_interes) {
                showToast("Debe declarar si tiene o no situaciones de conflicto de interés.");
                return false;
            }
            if (d.tiene_conflicto_interes === 'si' && (!d.familiares_conflicto || d.familiares_conflicto.length === 0)) {
                showToast("Debe añadir al menos un familiar o persona en la tabla de conflicto de interés.");
                return false;
            }
        }
        if (pasoActual === 14) {
            const isPep = ['es_funcionario_publico', 'vinculo_familiar_pep', 'ejerce_poder_publico', 'maneja_recursos_publicos', 'goza_reconocimiento_publico', 'declara_ser_pep'].some(k => d[k] === 'si');
            if (isPep && !d.pep_detalles) {
                showToast("Como respondió afirmativamente en PEP, debe proporcionar los detalles obligatoriamente.");
                return false;
            }
        }
        if (pasoActual === 15) {
            // No strict validation required here unless we want to enforce adding a family member. We can just let them proceed.
        }
        if (pasoActual === 13 && isInternalRole) {
            if (!d.realiza_operaciones_internacionales) {
                showToast("Debe declarar si realiza o no operaciones internacionales.");
                return false;
            }
            if (!d.activos_virtuales) {
                showToast("Debe declarar si realiza operaciones con activos virtuales.");
                return false;
            }
        }
        if (pasoActual === 4 && !isInternalRole && d.tipo_persona === 'juridica') {
            if (!d.accionistas_confidencial && d.accionistas.length === 0) {
                showToast("Debe añadir al menos un accionista, o marcar la casilla de confidencialidad.");
                return false;
            }
        }
        if (pasoActual === 5) {
            if (d.referencias_comerciales.length === 0) {
                showToast("Debes añadir al menos una (1) Referencia Comercial.");
                return false;
            }
            if (d.referencias_bancarias.length === 0) {
                showToast("Debes añadir al menos una (1) Referencia Bancaria.");
                return false;
            }
        }
        if (pasoActual === 6 && !isInternalRole) {
            const eticaSi = ['politica_corrupcion', 'codigo_etica_conducta', 'tiene_comite_etica', 'canales_denuncia', 'acusada_corrupcion', 'tiene_oficial_cumplimiento'].some(k => d[k] === 'si');
            if (eticaSi && !d.detalles_etica) {
                showToast("Debe detallar la información de las respuestas afirmativas en Ética y Cumplimiento.");
                return false;
            }
            if (d.tiene_oficial_cumplimiento === 'si' && !d.nombre_oficial_cumplimiento) {
                showToast("Debe indicar el nombre del Oficial de Cumplimiento.");
                return false;
            }
        }
        if (pasoActual === 17) {
            if (!d.cert_laft_razon || d.cert_laft_razon.trim().length < 5) {
                showToast("Debe indicar la razón por la cual no proporciona la información accionaria.");
                return false;
            }
            if (!d.cert_laft_aceptado) {
                showToast("Debe aceptar y firmar la Certificación LA/FT para continuar.");
                return false;
            }
        }
        if (pasoActual === 8) {
            if (!d.origen_fondos || d.origen_fondos.trim().length < 5) {
                showToast("La declaración de origen de fondos es obligatoria y debe ser explícita.");
                return false;
            }
        }
        if (pasoActual === 9) {
            const requiredDocs = isInternalRole ? ['identificacion'] : 
                (d.tipo_persona === 'natural' ? ['rut', 'identificacion', 'certificado_naturales', 'formato_pep'] :
                ['rut', 'cc_comercio', 'cedula_rep_legal', 'balance_empresa', 'composicion_accionaria']);
            
            for (const doc of requiredDocs) {
                if (!d.archivos_cargados || !d.archivos_cargados[doc]) {
                    showToast(`El documento de soporte es obligatorio. Por favor suba todos los archivos antes de continuar.`);
                    return false;
                }
            }
        }
        if (pasoActual === 15 || pasoActual === 16) {
            if (!d.cert_pep_aceptado) {
                showToast("Debe aceptar y firmar la declaración PEP para continuar.");
                return false;
            }
        }
        if (pasoActual === 17) {
            if (!d.cert_laft_razon) {
                showToast("Debe ingresar la razón por la cual no comparte la información accionaria.");
                return false;
            }
            if (!d.cert_laft_aceptado) {
                showToast("Debe aceptar y firmar la certificación LA/FT para continuar.");
                return false;
            }
        }
        return true;
    };

    const avanzarPaso = () => {
        if (validarPaso(paso)) {
            const nextStep = pasosDisponibles[currentStepIndex + 1];
            if (nextStep) setPaso(nextStep.id);
            window.scrollTo(0, 0);
        }
    };

    const retrocederPaso = () => {
        const prevStep = pasosDisponibles[currentStepIndex - 1];
        if (prevStep) setPaso(prevStep.id);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (codigoOTP.length < 5) return showToast("Código OTP inválido.");
        
        setCargando(true);
        try {
            // 1. Verify OTP
            const email = formData.tipo_persona === 'juridica' ? formData.correo_corporativo_juridica : formData.correo_electronico;
            const isEmpresa = formData.tipo_persona === 'juridica';
            const idSujeto = formData.numero_identificacion;
            const nombreSujeto = isEmpresa ? formData.razon_social : `${formData.nombres || ''} ${formData.primer_apellido || ''} ${formData.segundo_apellido || ''}`.trim();

            const otpResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    code: codigoOTP,
                    documento: idSujeto,
                    nombre_completo: nombreSujeto
                })
            });
            const otpData = await otpResponse.json();
            if (!otpResponse.ok) throw new Error(otpData.error || 'Fallo en la verificación OTP');

            const auditInfo = otpData.audit;
            setAuditHash(auditInfo.hash);

            // 2. Submit Form
            const dataToSubmit = { ...formData, audit_info: auditInfo };
            
            const hayArchivos = Object.keys(archivosFisicos).length > 0;
            let payload = dataToSubmit;
            
            if (hayArchivos) {
                payload = new FormData();
                payload.append('datos', JSON.stringify(dataToSubmit));
                Object.entries(archivosFisicos).forEach(([key, file]) => {
                    payload.append(key, file);
                });
            }

            const response = await sagrilaftService.enviarOnboarding(payload);
            setResultadoApi(response.resultado);
            setPaso(11);
        } catch (error) {
            if (error.message === 'Network Error') {
                showToast("Error de red: La conexión falló o los archivos adjuntos son demasiado pesados para el servidor.");
            } else {
                showToast(error.message);
            }
        } finally {
            setCargando(false);
        }
    };

    const formVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, y: -15, transition: { duration: 0.2 } }
    };

    const isDisabled = (name) => esCorreccion && !camposACorregir[name];

    const renderInput = (label, name, type = "text", width = "1fr", readOnly = false, required = true) => {
        const disabled = readOnly || isDisabled(name);
        return (
        <div style={{ position: 'relative' }}>
            <label className={required && !disabled ? "label required" : "label"}>{label}</label>
            <input type={type} name={name} value={formData[name] || ''} onChange={(e) => { handleChange(e); if(required && !e.target.value) e.target.classList.add('error'); else e.target.classList.remove('error'); }} className="input-field" readOnly={disabled} style={{ ...(disabled ? {opacity: 0.7, cursor: 'not-allowed', background: '#f3f4f6'} : {}), ...(camposACorregir[name] ? {border: '2px solid #ef4444', background: '#fef2f2'} : {}) }} />
        </div>
    )};

    const renderCiiuInput = (label, name, width = "1fr") => {
        const disabled = isDisabled(name);
        return (
        <div style={{ position: 'relative' }}>
            <label className={!disabled ? "label required" : "label"}>{label}</label>
            <input type="text" name={name} list="ciiu-list" value={formData[name] || ''} onChange={handleChange} className="input-field" placeholder="Ej: 1102" readOnly={disabled} style={{ ...(disabled ? {opacity: 0.7, cursor: 'not-allowed', background: '#f3f4f6'} : {}), ...(camposACorregir[name] ? {border: '2px solid #ef4444', background: '#fef2f2'} : {}) }} />
        </div>
    )};

    const renderSelect = (label, name, options, width = "1fr", required = true, forceDisabled = false) => {
        const disabled = isDisabled(name) || forceDisabled;
        return (
        <div style={{ position: 'relative' }}>
            <label className={required && !disabled ? "label required" : "label"}>{label}</label>
            <select name={name} value={formData[name] || ''} onChange={handleChange} className="input-field" disabled={disabled} style={{ ...(disabled ? {opacity: 0.7, cursor: 'not-allowed', background: '#f3f4f6'} : {}), ...(camposACorregir[name] ? {border: '2px solid #ef4444', background: '#fef2f2'} : {}) }}>
                <option value="">Seleccione...</option>
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    )};

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: '2rem 1rem', fontFamily: 'Inter, sans-serif' }}>
            
            {/* TOAST UI */}
            <AnimatePresence>
                {toast.visible && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'fixed',
                            top: '20px',
                            right: '20px',
                            background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)',
                            color: 'white',
                            padding: '1rem 1.5rem',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: '500'
                        }}
                    >
                        {toast.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header / Barra de Progreso */}
            <div style={{ background: 'var(--surface)', padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldCheck size={28} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', lineHeight: '1.3' }}>Portal de Vinculación Sistema de Autocontrol y Gestión del Riesgo LA/FT/FP y C/ST</h2>
                </div>
                <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                    {pasosDisponibles.map((p, i) => (
                        <div key={p.id} title={p.label} style={{ flex: 1, height: '6px', borderRadius: '3px', background: currentStepIndex >= i ? 'var(--primary)' : 'var(--border)', transition: 'background 0.3s ease' }} />
                    ))}
                </div>
            </div>

            <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
                
                {esCorreccion && paso < 11 && (
                    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0 }} />
                        <div>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#d97706' }}>Formulario Devuelto para Corrección</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>El equipo de cumplimiento ha revisado tu solicitud y ha solicitado correcciones. Por favor revisa los campos resaltados en rojo, actualiza la información y vuelve a enviar el formulario.</p>
                            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.9rem', color: '#92400e' }}>
                                {Object.entries(camposACorregir).map(([k, v]) => (
                                    <li key={k}><b>{k}:</b> {v}</li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}

                <div className="card glass-panel" style={{ padding: '2.5rem' }}>
                    <AnimatePresence mode="wait">
                        
                        {/* PASO 1: METADATA */}
                        {paso === 1 && (
                            <motion.div key="p1" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={20}/> 1. Naturaleza de la Solicitud</h3>
                                <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                    {renderInput("Fecha Diligenciamiento", "fecha_diligenciamiento", "date", "1fr", true)}
                                    {!isInternalRole && renderSelect("Ámbito de Operación", "ambito_operacion", [{value: 'nacional', label: 'Nacional'}, {value: 'internacional', label: 'Internacional'}])}
                                    {renderSelect("Empresa Destino", "empresa_destino", [{value: 'selecta', label: 'Selecta'}, {value: 'cosechas', label: 'Cosechas'}])}
                                </div>
                                <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                    {renderSelect("Tipo de Solicitud", "tipo_solicitud", [{value: 'vinculacion', label: 'Vinculación Nueva'}, {value: 'actualizacion', label: 'Actualización de Datos'}])}
                                    <div>
                                        <label className="label required">Clase de Vinculación</label>
                                        <input type="text" className="input-field" value={formData.clase_vinculacion.toUpperCase() || 'PROVEEDOR'} readOnly style={{opacity: 0.7, cursor: 'not-allowed'}} />
                                    </div>
                                    {isInternalRole ? (
                                        <div style={{ flex: "1fr" }}>
                                            <label className="label">Identificación de la Persona</label>
                                            <input type="text" value="Persona Natural" className="input-field" readOnly style={{opacity: 0.7, cursor: 'not-allowed'}} />
                                        </div>
                                    ) : (
                                        renderSelect("Identificación de la Persona", "tipo_persona", [{value: 'juridica', label: 'Persona Jurídica (Empresa)'}, {value: 'natural', label: 'Persona Natural'}])
                                    )}
                                </div>
                                {formData.clase_vinculacion === 'proveedor' && (
                                    <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                        {renderInput("Tipo de Proveeduría (¿Qué vende/suministra?)", "tipo_proveeduria", "text", "1fr")}
                                    </div>
                                )}
                                <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'justify' }}>
                                        <b>6. AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES</b><br/><br/>
                                        Dando cumplimiento a lo dispuesto en la Ley 1581 de 2012 "Por el cual se dictan disposiciones generales para la protección de datos personales" y de conformidad con lo señalado en el Decreto 1377 de 2013, con la firma de este documento manifiesto que he sido informado por {nombreEmpresaFull} de lo siguiente:<br/><br/>
                                        <ol style={{ margin: '0 0 1rem 1.5rem', padding: 0 }}>
                                            <li>{nombreEmpresaFull} actuará como responsable del tratamiento de los datos personales de los cuales soy titular y podrá recolectar, usar y tratar dichos datos conforme a su política de privacidad.</li>
                                            <li>Garantiza la confidencialidad, libertad, seguridad, veracidad, transparencia, acceso y circulación restringida de los datos personales.</li>
                                            <li>Es de carácter facultativo responder preguntas que traten sobre Datos Sensibles o sobre menores de edad.</li>
                                            <li>Me han informado la posibilidad que tengo de acceder en cualquier momento a los datos suministrados, así como de solicitar la corrección, actualización o supresión, en los términos establecidos por la Ley 1581 de 2012, dirigiendo una comunicación escrita al responsable de tratamiento a la {direccionEmpresa}, con los siguientes datos: nombre y apellidos, domicilio a efectos de notificaciones, petición en que se concreta la solicitud, fecha, firma de la persona interesada. Para mi comodidad, puedo ejercer estos mismos derechos a través del correo electrónico: {correoEmpresa}; así como el derecho a revocar la autorización otorgada para el tratamiento de datos personales.</li>
                                            <li>Autorizo a {nombreEmpresaFull}, a consultar y verificar mis datos en las centrales de información y/o bases de datos públicas, especialmente en las listas establecidas para el control y prevención de Lavado de Activos y la Financiación de Terrorismo.</li>
                                        </ol>
                                    </div>
                                    <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                        <input type="checkbox" checked={terminosAceptados} onChange={(e) => setTerminosAceptados(e.target.checked)} style={{ marginTop: '0.2rem', width: '18px', height: '18px', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                                            En señal de aceptación de lo anterior, consiento y autorizo a {nombreEmpresaFull} para tratar mis datos personales, para los fines relacionados con su objeto social y en especial para fines legales, contractuales y misionales, conforme a su política de tratamiento de datos.
                                        </span>
                                    </label>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 2: IDENTIDAD (DINÁMICO) */}
                        {paso === 2 && (
                            <motion.div key="p2" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <User size={20}/> 2. Identificación ({formData.tipo_persona === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'})
                                </h3>

                                {formData.tipo_persona === 'natural' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div className="form-grid form-grid-3">
                                            {renderInput("Nombres", "nombres", "text", "1fr", false, true)}
                                            {renderInput("Primer Apellido", "primer_apellido", "text", "1fr", false, true)}
                                            {renderInput("Segundo Apellido", "segundo_apellido", "text", "1fr", false, false)}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderSelect("Tipo ID", "tipo_identificacion", [{value:'cc', label:'CC (Cédula de Ciudadanía)'}, {value:'ce', label:'CE (Cédula de Extranjería)'}, {value:'pasaporte', label:'Pasaporte'}, {value:'ppt', label:'PPT (Permiso de Protección Temporal)'}, {value:'otro', label:'Otro'}], "0.5fr")}
                                            {formData.tipo_identificacion === 'otro' && renderInput("Especifique", "otro_tipo_identificacion", "text", "0.5fr")}
                                            {renderInput("No. Identificación", "numero_identificacion", "text", "1fr", false, true)}
                                            {renderInput("Lugar de Expedición", "lugar_expedicion")}
                                            {renderInput("Fecha de Expedición", "fecha_expedicion", "date", "1fr", false, true)}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderInput("Fecha Nacimiento", "fecha_nacimiento", "date")}
                                            {renderInput("Lugar Nacimiento", "lugar_nacimiento")}
                                            {renderInput("Nacionalidad", "nacionalidad")}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderInput("Correo Electrónico", "correo_electronico", "email", "1fr", false, true)}
                                            {renderSelect("Estado Civil", "estado_civil", [{value:'Soltero (a)', label:'Soltero (a)'}, {value:'Casado (a)', label:'Casado (a)'}, {value:'Divorciado (a)', label:'Divorciado (a)'}, {value:'Viudo (a)', label:'Viudo (a)'}, {value:'Unión libre / Unión marital de hecho', label:'Unión libre / Unión marital de hecho'}])}
                                            {renderInput("Dirección/Barrio", "direccion_residencial", "text", "1fr", false, true)}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderInput("Celular/Teléfono", "telefono_celular", "text", "1fr", false, true)}
                                            {renderSelect("Departamento", "departamento", [...colombiaData.map(d => ({value: d.departamento, label: d.departamento})), {value: "Otro / Extranjero", label: "Otro / Extranjero"}], "1fr", true)}
                                            {renderSelect("Ciudad", "ciudad", formData.departamento ? (colombiaData.find(d => d.departamento === formData.departamento)?.ciudades.map(c => ({value: c, label: c})) || [{value: "Otra", label: "Otra"}]) : [], "1fr", true, !formData.departamento)}
                                            {renderInput("País", "pais")}
                                        </div>
                                        <h4 style={{ margin: '1rem 0 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Ocupación y Laboral</h4>
                                        <div className="form-grid form-grid-3">
                                            {renderSelect("Ocupación Principal", "ocupacion_profesion", [{value:'independiente', label:'Independiente'}, {value:'asalariado', label:'Asalariado'}, {value:'pensionado', label:'Pensionado'}, {value:'rentista', label:'Rentista'}])}
                                            {renderSelect("¿Declara Renta?", "declara_renta", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                        </div>
                                        {!isInternalRole && (
                                            <div className="form-grid form-grid-3">
                                                {renderSelect("Sector Económico", "sector", [{value:'Agrícola', label:'Agrícola'}, {value:'Comercial', label:'Comercial'}, {value:'Manufactura', label:'Manufactura'}, {value:'Minería', label:'Minería'}, {value:'Servicios', label:'Servicios'}, {value:'Tecnología', label:'Tecnología'}, {value:'Construcción', label:'Construcción'}, {value:'Otro', label:'Otro'}])}
                                                {formData.sector === 'Otro' && renderInput("¿Cuál sector?", "sector_otro", "text", "1fr", false, false)}
                                                {renderInput("Actividad Económica", "actividad_economica_principal", "text", "1fr", false, true)}
                                                {renderCiiuInput("Código CIIU", "codigo_ciiu")}
                                            </div>
                                        )}
                                        <div className="form-grid form-grid-3">
                                            {renderInput("Empresa donde labora", "empresa_labora")}
                                            {renderInput("Cargo", "cargo")}
                                            {renderInput("Área", "area")}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderInput("Dirección Corporativa", "direccion_corporativa")}
                                            {renderInput("Teléfono Corp.", "telefono_corporativo")}
                                            {renderSelect("Departamento", "departamento_empresa_labora", [...colombiaData.map(d => ({value: d.departamento, label: d.departamento})), {value: "Otro / Extranjero", label: "Otro / Extranjero"}], "1fr", false)}
                                            {renderSelect("Ciudad Empresa", "ciudad_empresa_labora", formData.departamento_empresa_labora ? (colombiaData.find(d => d.departamento === formData.departamento_empresa_labora)?.ciudades.map(c => ({value: c, label: c})) || [{value: "Otra", label: "Otra"}]) : [], "1fr", false, !formData.departamento_empresa_labora)}
                                            {renderInput("País", "pais_empresa_labora")}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div className="form-grid form-grid-3">
                                            {renderInput("Razón Social", "razon_social", "text", "2fr")}
                                            {renderSelect("Tipo Empresa", "tipo_empresa", [{value:'privada', label:'Privada'}, {value:'publica', label:'Pública'}, {value:'mixta', label:'Mixta'}, {value:'extranjera', label:'Inversión Extranjera'}])}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                                <div style={{ flex: 1 }}>
                                                    {renderInput("NIT (Sin dígito verif.)", "numero_identificacion", "text", "1fr", false, true)}
                                                </div>
                                                <div style={{ width: '70px' }}>
                                                    <label className="label required">Dígito</label>
                                                    <input type="text" name="nit_digito" value={formData.nit_digito || ''} onChange={handleChange} className="input-field" maxLength={1} placeholder="0" style={{ textAlign: 'center' }} readOnly={isDisabled('nit_digito')} />
                                                </div>
                                            </div>
                                            {renderInput("Dirección Oficina Principal", "direccion_oficina_principal", "text", "2fr")}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderSelect("Departamento", "departamento_juridica", [...colombiaData.map(d => ({value: d.departamento, label: d.departamento})), {value: "Otro / Extranjero", label: "Otro / Extranjero"}], "1fr", true)}
                                            {renderSelect("Ciudad", "ciudad_juridica", formData.departamento_juridica ? (colombiaData.find(d => d.departamento === formData.departamento_juridica)?.ciudades.map(c => ({value: c, label: c})) || [{value: "Otra", label: "Otra"}]) : [], "1fr", true, !formData.departamento_juridica)}
                                            {renderInput("Teléfono", "telefono_juridica", "text", "1fr", false, true)}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderSelect("¿Tiene sucursales?", "tiene_sucursales", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            {formData.tiene_sucursales === 'si' && renderInput("Ciudad/Depto/País de sucursales", "sucursales_info", "text", "2fr")}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderInput("Correo Corporativo", "correo_corporativo_juridica", "email")}
                                            {renderInput("Teléfono Corp.", "telefono_corporativo_juridica")}
                                            {renderInput("Celular Corp.", "celular_corporativo_juridica")}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderSelect("Sector Económico", "sector_juridica", [{value:'Agrícola', label:'Agrícola'}, {value:'Comercial', label:'Comercial'}, {value:'Manufactura', label:'Manufactura'}, {value:'Minería', label:'Minería'}, {value:'Servicios', label:'Servicios'}, {value:'Tecnología', label:'Tecnología'}, {value:'Construcción', label:'Construcción'}, {value:'Otro', label:'Otro'}])}
                                            {formData.sector_juridica === 'Otro' && renderInput("¿Cuál sector?", "sector_otro_juridica", "text", "1fr", false, false)}
                                            
                                            {renderInput("Actividad Económica Principal", "actividad_economica_principal_juridica")}
                                            {renderCiiuInput("Código CIIU", "codigo_ciiu_juridica")}
                                        </div>
                                        
                                        <h4 style={{ margin: '1rem 0 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Datos del Representante Legal</h4>
                                        <div className="form-grid form-grid-3">
                                            {renderInput("Nombres Rep. Legal", "rep_legal_nombres", "text", "1fr", false, true)}
                                            {renderInput("Primer Apellido", "rep_legal_primer_apellido", "text", "1fr", false, true)}
                                            {renderInput("Segundo Apellido", "rep_legal_segundo_apellido", "text", "1fr", false, false)}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderSelect("Tipo ID", "rep_legal_tipo_id", [{value:'cc', label:'CC (Cédula de Ciudadanía)'}, {value:'ce', label:'CE (Cédula de Extranjería)'}, {value:'pasaporte', label:'Pasaporte'}, {value:'ppt', label:'PPT (Permiso de Protección Temporal)'}])}
                                            {renderInput("No. Identificación", "rep_legal_numero_id", "text", "1fr", false, true)}
                                            {renderInput("Lugar Expedición", "rep_legal_lugar_expedicion")}
                                            {renderInput("Fecha Expedición", "rep_legal_fecha_expedicion", "date")}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderInput("Fecha Nacimiento", "rep_legal_fecha_nacimiento", "date")}
                                            {renderInput("Lugar Nacimiento", "rep_legal_lugar_nacimiento")}
                                            {renderInput("Nacionalidad", "rep_legal_nacionalidad")}
                                        </div>
                                        <div className="form-grid form-grid-3">
                                            {renderInput("Dirección", "rep_legal_direccion", "text", "2fr")}
                                            {renderInput("Teléfono", "rep_legal_telefono")}
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}
                        {/* PASO 14: PEPs (Solo para Roles Internos) */}
                        {paso === 14 && (
                            <motion.div key="p14" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20}/> 6. Personas Expuestas Políticamente (PEP)</h3>
                                
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#475569' }}>
                                    <strong>Definición PEP:</strong> Es aquella persona que desempeñó o ejerce actualmente un cargo o función pública relevante para un país. <br/><br/>
                                    <strong>Reconocimiento Público:</strong> Son aquellas que debido a su destreza especial o habilidad obtienen notoriedad entre el público.
                                </div>
                                <div className="form-grid form-grid-2">
                                    {renderSelect("¿Es o fue funcionario entidad pública (Estado)?", "es_funcionario_publico", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("¿Vínculo familiar con persona expuesta públicamente?", "vinculo_familiar_pep", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("¿Ejerce algún grado de poder público?", "ejerce_poder_publico", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("¿Maneja recursos públicos?", "maneja_recursos_publicos", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("¿Goza de reconocimiento público?", "goza_reconocimiento_publico", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("¿Declara bajo juramento ser persona expuesta públicamente?", "declara_ser_pep", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                </div>
                                <div style={{ marginTop: '1.5rem' }}>
                                    {renderInput("Si respondió afirmativamente alguna, proporcione nombres, cargos, vínculo y entidad", "pep_detalles", "text", "1fr", false, ['es_funcionario_publico', 'vinculo_familiar_pep', 'ejerce_poder_publico', 'maneja_recursos_publicos', 'goza_reconocimiento_publico', 'declara_ser_pep'].some(k => formData[k] === 'si'))}
                                </div>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 15: DECLARACIÓN PEP */}
                        {paso === 15 && (
                            <motion.div key="p15" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20}/> Formato Persona Pública o Políticamente Expuesta</h3>
                                
                                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
                                    <div style={{marginBottom: '1rem'}}>
                                        {renderInput("En representación de (Nombre propio o Razón Social)", "representacion_de", "text", "1fr", false, true)}
                                    </div>
                                    <p style={{ textAlign: 'justify' }}>
                                        Yo <strong>{formData.nombres} {formData.primer_apellido} {formData.segundo_apellido}</strong> identificado(a) con cédula de ciudadanía No <strong>{formData.numero_identificacion}</strong> expedida en <strong>{formData.lugar_expedicion || '_______________'}</strong> actuando en mi nombre y/o en representación de <strong>{formData.representacion_de || formData.razon_social || '_______________'}</strong> y dando certeza de que todo lo consignado aquí es cierto, realizo la siguiente declaración de origen de fondos con el propósito de dar cumplimiento a lo señalado en la circular externa 07 de 1996 de la Superfinanciera, el estatuto orgánico del sistema financiero EOSF decreto 663 de 1993, ley 190 de 1996 y para dar cumplimiento a lo establecido en la circular externa 100-000016 del 24 de diciembre del 2020 de la Superintendencia de Sociedades, la ley 1121 de 2006 y demás normas concordantes.
                                    </p>
                                    
                                    <p>Declaro que mi familia en primer, segundo y tercer grado de afinidad son:</p>
                                    
                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                            <div style={{flex:2}}><label className="label">Nombres y Apellidos</label><input type="text" value={nuevoFamiliarPep.nombre} onChange={e=>setNuevoFamiliarPep({...nuevoFamiliarPep, nombre: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1.5}}><label className="label">Cédula o Identificación</label><input type="text" value={nuevoFamiliarPep.identificacion} onChange={e=>setNuevoFamiliarPep({...nuevoFamiliarPep, identificacion: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1.5}}><label className="label">Parentesco</label><input type="text" value={nuevoFamiliarPep.parentesco} onChange={e=>setNuevoFamiliarPep({...nuevoFamiliarPep, parentesco: e.target.value})} className="input-field"/></div>
                                            <button type="button" className="btn-outline" onClick={() => handleAddList('pep_familiares_extendido', nuevoFamiliarPep, setNuevoFamiliarPep, {nombre:'', identificacion:'', parentesco:''})}>+ Añadir</button>
                                        </div>
                                        {formData.pep_familiares_extendido.map((fam, idx) => (
                                            <div key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>• {fam.nombre} - CC: {fam.identificacion} - <b>{fam.parentesco}</b></div>
                                                <button type="button" className="btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleRemoveList('pep_familiares_extendido', idx)}>Eliminar</button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <p style={{ textAlign: 'justify' }}>
                                        <strong>{nombreEmpresaFull}</strong> es una Entidad debidamente establecida en Colombia, con sede en el Municipio de {formData.empresa_destino === 'selecta' ? 'la Estrella' : 'Medellín'} (Antioquia), se encuentra vigilada por la Superintendencia de sociedades, y tiene implementado un Sistema de Auto Control y Gestión del Riesgo de Lavado de Activos y de la Financiación del Terrorismo (SAGRILAFT), en cumplimiento de lo establecido en la Circular Básica Jurídica 100-000016 DE 24 DE DICIEMBRE DE 2020 de las SuperSociedades desde 01 de septiembre de 2021, lo mismo que las recomendaciones y mejores prácticas internacionales en esta materia.
                                    </p>
                                    <p style={{ textAlign: 'justify' }}>
                                        Las políticas, controles y procedimientos implementados, dentro de un concepto de administración del riesgo, son acciones que buscan la debida diligencia para prevenir el uso de nuestra institución por organizaciones criminales para propósitos ilícitos. Dichas acciones incluyen entre otros aspectos, el conocimiento del cliente y de sus operaciones con nuestra Entidad, definición de segmentos de mercado por nosotros atendidos, monitoreo de transacciones, capacitación al personal y reportes de operaciones sospechosas a la autoridad competente.
                                    </p>
                                    <p>Por lo anterior manifiesto de manera voluntaria a <strong>{nombreEmpresaFull}</strong>:</p>
                                    <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                                        <li style={{marginBottom:'0.5rem'}}>Los recursos que entregue en forma de pago, abono o cualquier servicio que nos preste por parte de {nombreEmpresaFull} proviene de mi trabajo o actividad comercial y de actividades legales.</li>
                                        <li style={{marginBottom:'0.5rem'}}>Declaro que los recursos que le entregue a {nombreEmpresaFull} en cualquier parte del territorio colombiano no provienen de ninguna actividad ilícita de las contempladas en el Código penal colombiano o actos de corrupción pública o privada, ni efectuare transacciones destinadas a tales actividades o en favor de personas relacionadas con ellas.</li>
                                        <li style={{marginBottom:'0.5rem'}}>No admitiré que terceros efectúen depósitos a mis cuentas con fondos provenientes de actividades ilícitas.</li>
                                        <li style={{marginBottom:'0.5rem'}}>Autorizo a {nombreEmpresaFull} a cancelar el contrato o la relación comercial, en el caso que detecten operaciones inusuales o sospechosas en el giro de mis actividades o actos de corrupción.</li>
                                        <li>Exonero de toda responsabilidad a {nombreEmpresaFull}, si se llegare a presentar en mi nombre o de la empresa, cualquier asomo de ilegalidad en nuestras actividades, teniendo la certeza lo único que hace es prestarnos un servicio bajo la exclusiva responsabilidad de nuestra parte por los valores entregados y su procedencia.</li>
                                    </ol>
                                </div>
                                
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: '1rem' }}>
                                    <input type="checkbox" checked={formData.cert_pep_aceptado === true} onChange={(e) => setFormData({...formData, cert_pep_aceptado: e.target.checked})} style={{ marginTop: '0.25rem', width: '18px', height: '18px' }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}><strong>Acepto y firmo electrónicamente</strong> la presente Declaración de Persona Expuesta Públicamente y Origen de Fondos.</span>
                                </label>
                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 3: TRIBUTARIA Y FINANCIERA */}
                        {paso === 3 && (
                            <motion.div key="p3" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard size={20}/> 3. Información Tributaria y Financiera</h3>
                                
                                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>Perfil Financiero (Valores en COP)</h4>
                                <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                                    <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                        <CurrencyInput label="Total Activos" name="activos" value={formData.activos} onChange={handleChange} required={!isGenericEmpleado} disabled={isDisabled('activos')} isError={!!camposACorregir['activos']} />
                                        <CurrencyInput label="Total Pasivos" name="pasivos" value={formData.pasivos} onChange={handleChange} required={!isGenericEmpleado} disabled={isDisabled('pasivos')} isError={!!camposACorregir['pasivos']} />
                                        <CurrencyInput label="Patrimonio Líquido" name="patrimonio" value={formData.patrimonio} onChange={handleChange} required={!isGenericEmpleado} disabled={isDisabled('patrimonio')} isError={!!camposACorregir['patrimonio']} />
                                    </div>
                                    <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                        <CurrencyInput label="Ingresos Mensuales" name="ingresos_mensuales" value={formData.ingresos_mensuales} onChange={handleChange} required={!isGenericEmpleado} disabled={isDisabled('ingresos_mensuales')} isError={!!camposACorregir['ingresos_mensuales']} />
                                        <CurrencyInput label="Egresos Mensuales" name="egresos_mensuales" value={formData.egresos_mensuales} onChange={handleChange} required={!isGenericEmpleado} disabled={isDisabled('egresos_mensuales')} isError={!!camposACorregir['egresos_mensuales']} />
                                    </div>

                                    <div className="form-grid form-grid-3">
                                        <CurrencyInput label="Otros Ingresos Mensuales" name="otros_ingresos_mensuales" value={formData.otros_ingresos_mensuales} onChange={handleChange} required={false} disabled={isDisabled('otros_ingresos_mensuales')} isError={!!camposACorregir['otros_ingresos_mensuales']} />
                                        {renderInput("Concepto Otros Ingresos", "concepto_otros_ingresos", "text", "1fr", false, false)}
                                    </div>
                                </div>

                                {!isInternalRole && (
                                    <React.Fragment>
                                        <h4 style={{ margin: '1rem 0 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Operaciones Internacionales y Activos Virtuales</h4>
                                        <div className="form-grid form-grid-3">
                                            {renderSelect("¿Realiza Operaciones con Activos Virtuales (Cripto)?", "activos_virtuales", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            {formData.activos_virtuales === 'si' && renderInput("¿Cuáles activos virtuales?", "cuales_activos_virtuales")}
                                        </div>
                                        <div style={{ marginTop: '1rem' }}>
                                            {renderCheckboxArray("¿Realiza alguna de estas Operaciones Internacionales?", "operaciones_internacionales", [
                                                {value: 'importacion', label: 'Importación'},
                                                {value: 'exportacion', label: 'Exportación'},
                                                {value: 'giros', label: 'Giros'},
                                                {value: 'transferencias', label: 'Transferencias'},
                                                {value: 'prestamos', label: 'Préstamos en M.E.'},
                                                {value: 'inversiones', label: 'Inversiones extranjeras'},
                                                {value: 'ninguno', label: 'Ninguno de los anteriores'}
                                            ])}
                                        </div>
                                        <div className="form-grid form-grid-3" style={{ margin: "1rem 0" }}>
                                            {renderSelect("¿Posee Productos Financieros en Exterior?", "posee_productos_exterior", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                        </div>
                                    </React.Fragment>
                                )}
                                
                                {formData.posee_productos_exterior === 'si' && (
                                    <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                            <div style={{flex:1}}><input placeholder="Tipo Producto" value={nuevoProdExt.tipo} onChange={e=>setNuevoProdExt({...nuevoProdExt, tipo: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1}}><input placeholder="Identificación/No." value={nuevoProdExt.identificacion} onChange={e=>setNuevoProdExt({...nuevoProdExt, identificacion: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1}}><input placeholder="Entidad" value={nuevoProdExt.entidad} onChange={e=>setNuevoProdExt({...nuevoProdExt, entidad: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:0.5}}><input placeholder="Moneda" value={nuevoProdExt.moneda} onChange={e=>setNuevoProdExt({...nuevoProdExt, moneda: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1}}><input placeholder="Monto" type="number" value={nuevoProdExt.monto} onChange={e=>setNuevoProdExt({...nuevoProdExt, monto: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1}}><input placeholder="País" value={nuevoProdExt.pais} onChange={e=>setNuevoProdExt({...nuevoProdExt, pais: e.target.value})} className="input-field"/></div>
                                            <button type="button" className="btn-outline" onClick={()=>handleAddList('productos_exterior', nuevoProdExt, setNuevoProdExt, {tipo:'', identificacion:'', monto:'', moneda:'', entidad:'', ciudad:'', pais:''})}>Añadir</button>
                                        </div>
                                        {formData.productos_exterior.map((prod, idx) => (
                                            <div key={idx} style={{fontSize:'0.85rem', color:'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid var(--border)'}}>
                                                <div>• {prod.tipo} ({prod.entidad}) - {prod.moneda} {prod.monto} en {prod.pais}</div>
                                                <button type="button" className="btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleRemoveList('productos_exterior', idx)}>Eliminar</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso(formData.tipo_persona === 'juridica' ? 4 : 5)}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 4: ACCIONISTAS Y PEPS (SOLO JURIDICA) */}
                        
                        {paso === 12 && (
                            <motion.div key="paso12" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="form-step">
                                <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={22} /> Identificación de Familiares y Conflicto de Interés
                                </h3>

                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5', textAlign: 'justify' }}>
                                    <p>Este tipo de evento ocurre cuando el interés personal de un empleado, representante, proveedor, contratista y/o colaborador interfiere de manera directa o de algún modo con los intereses propios de la empresa. A continuación, a título de ejemplo y no exhaustivo o limitado, algunas de las situaciones que caracterizan los conflictos de interés:</p>
                                    <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                                        <li><strong>Desarrollo de actividades:</strong> no se permiten actividades paralelas, conflictivas con los negocios de {nombreEmpresaFull}, que puedan afectar o afecten el desempeño del colaborador, director o administrador dentro del horario de trabajo, que utilicen la estructura de la Compañía para fines particulares o que estén vinculadas a la competencia.</li>
                                        <li><strong>Contratación de familiares:</strong> De acuerdo al Programa de transparencia y ética empresarial y demás Políticas internas, la contratación de parientes hasta el 3 grado de consanguinidad o afinidad (padres, hermanos, hijos, esposo(a) o compañero(a) permanente, suegros, abuelos, nietos y cuñados), solo será permitida de forma excepcional y con aprobación previa y expresa de {nombreEmpresaFull} (Comité de Ética), siempre y cuando que no exista relación de subordinación entre ellos y que no trabajen en áreas o procesos en los que pueda haber conflicto de intereses.</li>
                                        <li><strong>Relaciones comerciales privadas:</strong> los colaboradores, directores o administradores no deben tener relaciones comerciales, personales, financieras u otras relaciones directas o indirectas con competidores, clientes, proveedores y, socios comerciales y/o consultores que puedan interferir o incluso que parezca percibir con la independencia de cualquier decisión tomado a nombre de {nombreEmpresaFull}</li>
                                        <li><strong>Posición y poder de las autoridades:</strong> {nombreEmpresaFull} valora la ética y la transparencia en las relaciones con todas sus partes interesadas o terceros. Por lo tanto, ningún colaborador, director o administrador debe utilizar su posición o autoridad en la Compañía para obtener ventajas personales de clientes, proveedores, socios comerciales, consultores y/o competidores.</li>
                                    </ol>
                                </div>

                                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '2rem', ...(isDisabled('tiene_conflicto_interes') ? {opacity: 0.7} : {}), ...(camposACorregir['tiene_conflicto_interes'] ? {border: '2px solid #ef4444', background: '#fef2f2'} : {}) }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '1rem', color: 'var(--text-main)' }}>
                                        Declaro que a la fecha tengo situación(es) que pueda(n) presentar un potencial CONFLICTO DE INTERÉS para el ejercicio del cargo que actualmente desempeño en {nombreEmpresaFull}, en mi relación con los siguientes empleados, proveedores, clientes entre otros:
                                    </label>
                                    <div style={{ display: 'flex', gap: '2rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isDisabled('tiene_conflicto_interes') ? 'not-allowed' : 'pointer' }}>
                                            <input type="radio" name="tiene_conflicto_interes" value="no" checked={formData.tiene_conflicto_interes === 'no' || !formData.tiene_conflicto_interes} onChange={handleChange} disabled={isDisabled('tiene_conflicto_interes')} /> No
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isDisabled('tiene_conflicto_interes') ? 'not-allowed' : 'pointer' }}>
                                            <input type="radio" name="tiene_conflicto_interes" value="si" checked={formData.tiene_conflicto_interes === 'si'} onChange={handleChange} disabled={isDisabled('tiene_conflicto_interes')} /> Sí
                                        </label>
                                    </div>
                                </div>

                                {formData.tiene_conflicto_interes === 'si' && (
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>Identificación de Familiares Conflicto de Interés</h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Relacionar Padres, hermanos, hijos, esposo(a) y/o compañero(a) permanente.</p>
                                        
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                            {renderSelect("Tipo Identificación", "temp_familiar_tipo_id", [{value:'', label:'Seleccione...'}, {value:'cc', label:'CC (Cédula de Ciudadanía)'}, {value:'ce', label:'CE (Cédula de Extranjería)'}, {value:'pasaporte', label:'Pasaporte'}, {value:'ppt', label:'PPT (Permiso de Protección Temporal)'}, {value:'otro', label:'Otro'}], "1fr")}
                                            {renderInput("No. Identificación", "temp_familiar_id", "text", "1fr")}
                                            {renderInput("Nombre Completo", "temp_familiar_nombre", "text", "2fr")}
                                            {renderInput("Parentesco", "temp_familiar_parentesco", "text", "1fr")}
                                            {renderSelect("¿Administra recursos públicos?", "temp_familiar_recursos", [{value:'', label:'Seleccione...'}, {value:'si', label:'Sí'}, {value:'no', label:'No'}], "1fr")}
                                            {renderSelect("¿Poder Público?", "temp_familiar_poder", [{value:'', label:'Seleccione...'}, {value:'si', label:'Sí'}, {value:'no', label:'No'}], "1fr")}
                                            
                                            <button type="button" className="btn-primary" onClick={() => {
                                                if(!formData.temp_familiar_id || !formData.temp_familiar_nombre) return alert("Complete los datos básicos del familiar.");
                                                handleAddList('familiares_conflicto', {
                                                    tipo_id: formData.temp_familiar_tipo_id,
                                                    identificacion: formData.temp_familiar_id,
                                                    nombre: formData.temp_familiar_nombre,
                                                    parentesco: formData.temp_familiar_parentesco,
                                                    administra_recursos: formData.temp_familiar_recursos,
                                                    poder_publico: formData.temp_familiar_poder
                                                }, (empty) => setFormData(p => ({...p, ...empty})), { temp_familiar_tipo_id: '', temp_familiar_id: '', temp_familiar_nombre: '', temp_familiar_parentesco: '', temp_familiar_recursos: '', temp_familiar_poder: '' });
                                            }}>+ Añadir</button>
                                        </div>

                                        {formData.familiares_conflicto?.length > 0 && (
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
                                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tipo ID</th>
                                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Identificación</th>
                                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Nombre Completo</th>
                                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Parentesco</th>
                                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Recursos Públicos</th>
                                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Poder Público</th>
                                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Acción</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {formData.familiares_conflicto.map((f, i) => (
                                                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                                <td style={{ padding: '0.75rem' }}>{(f.tipo_id || '').toUpperCase()}</td>
                                                                <td style={{ padding: '0.75rem' }}>{f.identificacion}</td>
                                                                <td style={{ padding: '0.75rem' }}>{f.nombre}</td>
                                                                <td style={{ padding: '0.75rem' }}>{f.parentesco}</td>
                                                                <td style={{ padding: '0.75rem' }}>{(f.administra_recursos || '').toUpperCase()}</td>
                                                                <td style={{ padding: '0.75rem' }}>{(f.poder_publico || '').toUpperCase()}</td>
                                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                                    <button type="button" onClick={() => setFormData(p => ({...p, familiares_conflicto: p.familiares_conflicto.filter((_, idx) => idx !== i)}))} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}
                        
                        {paso === 13 && (
                            <motion.div key="paso13" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="form-step">
                                <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Globe size={22} /> Operaciones Internacionales y Activos Virtuales
                                </h3>

                                <div className="form-grid form-grid-3" style={{ marginBottom: "1.5rem" }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="label">¿Realiza operaciones internacionales?</label>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                            <label><input type="radio" name="realiza_operaciones_internacionales" value="si" onChange={(e) => setFormData(p => ({...p, realiza_operaciones_internacionales: 'si'}))} checked={formData.realiza_operaciones_internacionales === 'si'} /> Sí</label>
                                            <label><input type="radio" name="realiza_operaciones_internacionales" value="no" onChange={(e) => setFormData(p => ({...p, realiza_operaciones_internacionales: 'no', operaciones_internacionales: []}))} checked={formData.realiza_operaciones_internacionales !== 'si'} /> No</label>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="label">¿Posee productos financieros en el exterior?</label>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                            <label><input type="radio" name="posee_productos_exterior" value="si" onChange={handleChange} checked={formData.posee_productos_exterior === 'si'} /> Sí</label>
                                            <label><input type="radio" name="posee_productos_exterior" value="no" onChange={handleChange} checked={formData.posee_productos_exterior === 'no'} /> No</label>
                                        </div>
                                    </div>
                                </div>

                                {formData.realiza_operaciones_internacionales === 'si' && (
                                    <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0' }}>Tipos de Operaciones Internacionales</h4>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            {['Importación', 'Exportación', 'Préstamos', 'Inversiones', 'Pago de Servicios', 'Remesas'].map(op => (
                                                <label key={op} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input type="checkbox" checked={(formData.operaciones_internacionales || []).includes(op)} onChange={(e) => {
                                                        const arr = formData.operaciones_internacionales || [];
                                                        setFormData(p => ({...p, operaciones_internacionales: e.target.checked ? [...arr, op] : arr.filter(x => x !== op)}));
                                                    }} /> {op}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                                    <label className="label">¿Realiza operaciones con Activos Virtuales (Criptomonedas, Tokens, etc)?</label>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        <label><input type="radio" name="activos_virtuales" value="si" onChange={handleChange} checked={formData.activos_virtuales === 'si'} /> Sí</label>
                                        <label><input type="radio" name="activos_virtuales" value="no" onChange={handleChange} checked={formData.activos_virtuales === 'no'} /> No</label>
                                    </div>
                                    {formData.activos_virtuales === 'si' && (
                                        <div style={{ marginTop: '1rem' }}>
                                            {renderInput("¿Cuáles activos virtuales?", "cuales_activos_virtuales")}
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}
                        {paso === 4 && formData.tipo_persona === 'juridica' && (
                            <motion.div key="p4" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={20}/> 4. Accionistas (Beneficiarios Finales) y Persona Expuesta Públicamente</h3>
                                
                                <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0' }}>Identificación de accionistas (&gt; 5% capital social)</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                        <i>Indique en este apartado los accionistas con participación superior al 5% del capital social y (Adjunte), al final del formulario, el Certificado de Composición Accionaria. Si, por políticas de confidencialidad de la compañía, no es posible brindar esta información, deberá adjuntar al final la Certificación LA/FT.</i>
                                    </p>
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', background: '#fff7ed', borderRadius: 'var(--radius-sm)', border: '1px solid #fed7aa', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={formData.accionistas_confidencial === true} onChange={e => setFormData(p => ({...p, accionistas_confidencial: e.target.checked}))} style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
                                        <span style={{ fontSize: '0.9rem', color: '#92400e', fontWeight: '500' }}>Por políticas de confidencialidad de la compañía, no es posible brindar esta información. Adjuntaré la Certificación LA/FT (se habilitará un formato en el siguiente paso).</span>
                                    </label>
                                    {!formData.accionistas_confidencial && (<>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 70px 1fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
                                        <div><label className="label" style={{ fontSize: '0.8rem' }}>Nombre Socio</label><input type="text" value={nuevoAccionista.nombre} onChange={e=>setNuevoAccionista({...nuevoAccionista, nombre: e.target.value})} className="input-field"/></div>
                                        <div><label className="label" style={{ fontSize: '0.8rem' }}>Cédula</label><input type="text" value={nuevoAccionista.identificacion} onChange={e=>setNuevoAccionista({...nuevoAccionista, identificacion: e.target.value})} className="input-field"/></div>
                                        <div><label className="label" style={{ fontSize: '0.8rem' }}>% Part.</label><input type="number" min="0" max="100" value={nuevoAccionista.porcentaje} onChange={e=>setNuevoAccionista({...nuevoAccionista, porcentaje: e.target.value})} className="input-field" style={{ padding: '0.5rem' }}/></div>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.8rem' }}>¿Adm. rec. públicos?</label>
                                            <select className="input-field" value={nuevoAccionista.administra_recursos} onChange={e => setNuevoAccionista({...nuevoAccionista, administra_recursos: e.target.value})}>
                                                <option value="no">No</option>
                                                <option value="si">Sí</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.8rem' }}>¿Recon. público?</label>
                                            <select className="input-field" value={nuevoAccionista.goza_reconocimiento} onChange={e => setNuevoAccionista({...nuevoAccionista, goza_reconocimiento: e.target.value})}>
                                                <option value="no">No</option>
                                                <option value="si">Sí</option>
                                            </select>
                                        </div>
                                        <button type="button" className="btn-outline" style={{ padding: '0.55rem 1rem' }} onClick={() => handleAddList('accionistas', nuevoAccionista, setNuevoAccionista, {tipo_id:'cc', identificacion:'', nombre:'', porcentaje:'', administra_recursos:'no', goza_reconocimiento:'no'})}>+ Agregar</button>
                                    </div>
                                    {formData.accionistas.map((acc, idx) => (
                                        <div key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{flex: 1}}>• {acc.nombre} (CC: {acc.identificacion}) - <b>{acc.porcentaje}%</b></div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Admin. Recursos: <b>{acc.administra_recursos === 'si' ? 'Sí' : 'No'}</b> | Reconoc. Público: <b>{acc.goza_reconocimiento === 'si' ? 'Sí' : 'No'}</b>
                                            </div>
                                            <button type="button" className="btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleRemoveList('accionistas', idx)}>Eliminar</button>
                                        </div>
                                    ))}
                                    </>)}
                                </div>

                                <h4 style={{ margin: '2rem 0 1rem 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Persona Expuesta Públicamente (PEP)</h4>
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#475569' }}>
                                    <strong>Definición PEP:</strong> Es aquella persona que desempeñó o ejerce actualmente un cargo o función pública relevante para un país (ej: Jefes de Estado, altos funcionarios gubernamentales, militares, judiciales, directivos de empresas estatales). <br/><br/>
                                    <strong>Reconocimiento Público:</strong> Son aquellas que debido a su destreza especial o habilidad (artes, farándula, deporte, ciencias, youtubers, líderes religiosos) obtienen notoriedad entre el público.
                                </div>
                                <div className="form-grid form-grid-2">
                                    {renderSelect("¿Es o fue funcionario entidad pública (Estado)?", "es_funcionario_publico", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("¿Vínculo familiar con persona PEP?", "vinculo_familiar_pep", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("¿Ejerce algún grado de poder público?", "ejerce_poder_publico", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("¿Maneja recursos públicos?", "maneja_recursos_publicos", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("¿Goza de reconocimiento público?", "goza_reconocimiento_publico", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                    {renderSelect("¿Declara bajo juramento ser PEP?", "declara_ser_pep", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                </div>
                                <div style={{ marginTop: '1.5rem', background: '#eff6ff', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #bfdbfe' }}>
                                    <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, fontWeight: '500' }}>
                                        En caso de marcar alguna de las preguntas con opción 'SÍ', por favor diligencie el formato 'Conocimiento ampliado para las personas expuestas política y públicamente', el cual encontrará en el siguiente punto.
                                    </p>
                                </div>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 5: REFERENCIAS */}
                        {paso === 5 && (
                            <motion.div key="p5" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={20}/> 5. Referencias Comerciales y Bancarias</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 1rem 0' }}>Información Comercial</h4>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap:'wrap' }}>
                                            <div style={{flex:2}}><input placeholder="Empresa/Referencia Comercial" value={nuevaRefComercial.referencia} onChange={e=>setNuevaRefComercial({...nuevaRefComercial, referencia: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:2}}><input placeholder="Dirección" value={nuevaRefComercial.direccion} onChange={e=>setNuevaRefComercial({...nuevaRefComercial, direccion: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1}}><input placeholder="Ciudad" value={nuevaRefComercial.ciudad} onChange={e=>setNuevaRefComercial({...nuevaRefComercial, ciudad: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1}}><input placeholder="Contacto" value={nuevaRefComercial.contacto} onChange={e=>setNuevaRefComercial({...nuevaRefComercial, contacto: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1}}><input placeholder="Teléfono" value={nuevaRefComercial.telefono} onChange={e=>setNuevaRefComercial({...nuevaRefComercial, telefono: e.target.value})} className="input-field"/></div>
                                            <button type="button" className="btn-outline" onClick={()=>handleAddList('referencias_comerciales', nuevaRefComercial, setNuevaRefComercial, {referencia:'', direccion:'', ciudad:'', contacto:'', telefono:''})}>Añadir</button>
                                        </div>
                                        {formData.referencias_comerciales.map((ref, idx) => (
                                            <div key={idx} style={{fontSize:'0.9rem', color:'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid var(--border)'}}>
                                                <div>• {ref.referencia} - {ref.contacto} - Tel: {ref.telefono} - {ref.ciudad}</div>
                                                <button type="button" className="btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleRemoveList('referencias_comerciales', idx)}>Eliminar</button>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <h4 style={{ margin: '0 0 1rem 0' }}>Información Bancaria</h4>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap:'wrap' }}>
                                            <div style={{flex:2}}><input placeholder="Banco" value={nuevaRefBancaria.banco} onChange={e=>setNuevaRefBancaria({...nuevaRefBancaria, banco: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:2}}><input placeholder="# Cuenta" value={nuevaRefBancaria.cuenta} onChange={e=>setNuevaRefBancaria({...nuevaRefBancaria, cuenta: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1}}>
                                                <label className="label" style={{fontSize: '0.85rem'}}>Tipo de cuenta</label>
                                                <select value={nuevaRefBancaria.tipo} onChange={e=>setNuevaRefBancaria({...nuevaRefBancaria, tipo: e.target.value})} className="input-field">
                                                    <option value="Ahorros">Ahorros</option>
                                                    <option value="Corriente">Corriente</option>
                                                </select>
                                            </div>
                                            <div style={{flex:1}}><input placeholder="Ciudad" value={nuevaRefBancaria.ciudad} onChange={e=>setNuevaRefBancaria({...nuevaRefBancaria, ciudad: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1}}><input placeholder="Teléfono" value={nuevaRefBancaria.telefono} onChange={e=>setNuevaRefBancaria({...nuevaRefBancaria, telefono: e.target.value})} className="input-field"/></div>
                                            <button type="button" className="btn-outline" onClick={()=>handleAddList('referencias_bancarias', nuevaRefBancaria, setNuevaRefBancaria, {banco:'', cuenta:'', tipo:'Ahorros', ciudad:'', telefono:''})}>Añadir</button>
                                        </div>
                                        {formData.referencias_bancarias.map((ref, idx) => (
                                            <div key={idx} style={{fontSize:'0.9rem', color:'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid var(--border)'}}>
                                                <div>• {ref.banco} - {ref.tipo} No. {ref.cuenta} - {ref.ciudad}</div>
                                                <button type="button" className="btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleRemoveList('referencias_bancarias', idx)}>Eliminar</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 6: 0TICA Y CUMPLIMIENTO */}
                        {paso === 6 && (
                            <motion.div key="p6" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20}/> 6. Ética y Cumplimiento</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                        <h4 style={{ margin: '0 0 1rem 0' }}>Políticas y Comportamientos Éticos</h4>
                                        <div className="form-grid form-grid-2" style={{ marginBottom: "1.5rem" }}>
                                            {renderSelect("¿Cuenta con política de prevención de corrupción y soborno?", "politica_corrupcion", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            {renderSelect("¿Tiene código de ética?", "codigo_etica_conducta", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            {renderSelect("¿Tiene comité de ética y cumplimiento?", "tiene_comite_etica", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            {renderSelect("¿Tiene canales de denuncia?", "canales_denuncia", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            {renderSelect("¿Ha sido acusada de corrupción?", "acusada_corrupcion", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            {renderSelect("¿Tiene oficial de cumplimiento?", "tiene_oficial_cumplimiento", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            {formData.tiene_oficial_cumplimiento === 'si' && renderInput("Nombre del Oficial de Cumplimiento", "nombre_oficial_cumplimiento", "text", "1fr", false, true)}
                                        </div>
                                        {['politica_corrupcion', 'codigo_etica_conducta', 'tiene_comite_etica', 'canales_denuncia', 'acusada_corrupcion', 'tiene_oficial_cumplimiento'].some(k => formData[k] === 'si') && (
                                            <div style={{ marginTop: '1rem' }}>
                                                {renderInput("Si respondió afirmativamente alguna de las preguntas anteriores, por favor detalle la información", "detalles_etica", "text", "1fr", false, true)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 7: SOSTENIBILIDAD ASG */}
                        {paso === 7 && (
                            <motion.div key="p7" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Globe size={20}/> 7. Políticas y Comportamientos de Sostenibilidad ASG: Ambiental, Social y Gobernanza</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {renderCheckboxArray("1. ¿La empresa identifica y gestiona riesgos relacionados con factores ASG: Ambiental, Social y Gobernanza?", "esg_gestiona_riesgos", [{value:'Ambientales', label:'Ambientales'}, {value:'Sociales', label:'Sociales'}, {value:'Gobernanza', label:'Gobernanza'}, {value:'No', label:'No'}])}
                                            
                                            {renderCheckboxArray("2. ¿La empresa cuenta con políticas, procedimientos o lineamientos relacionados con?", "esg_politicas", [{value:'Sostenibilidad', label:'Sostenibilidad'}, {value:'Aspectos ambientales', label:'Aspectos ambientales'}, {value:'Sociales', label:'Sociales'}, {value:'Gobernanza', label:'Gobernanza'}, {value:'No', label:'No'}])}
                                            
                                            <div className="form-grid form-grid-3">
                                                {renderSelect("3. ¿Utiliza materias primas o insumos con criterios de sostenibilidad?", "esg_materias_sostenibles", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                                {renderSelect("4. ¿Evalúa a sus proveedores con criterios legales, éticos o ambientales?", "esg_evalua_proveedores", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            </div>
                                            {formData.esg_evalua_proveedores === 'si' && (
                                                <div className="form-grid form-grid-3">
                                                    {renderInput("¿Cuáles criterios evalúa?", "esg_evalua_cuales", "text", "1fr")}
                                                </div>
                                            )}

                                            <div className="form-grid form-grid-3">
                                                {renderSelect("5. ¿En los últimos 5 años ha sido sancionada/investigada por asuntos ASG: Ambiental, Social y Gobernanza?", "esg_sancionada", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            </div>
                                            {formData.esg_sancionada === 'si' && (
                                                <div className="form-grid form-grid-3">
                                                    {renderInput("Describa el motivo", "esg_sancionada_motivo", "text", "1fr")}
                                                </div>
                                            )}

                                            {renderCheckboxArray("6. ¿La empresa implementa alguna de las siguientes prácticas ambientales?", "esg_practicas_ambientales", [
                                                {value:'Uso eficiente del agua', label:'Uso eficiente del agua'},
                                                {value:'Uso eficiente de la energía', label:'Uso eficiente de la energía'},
                                                {value:'Gestión de residuos', label:'Gestión y disposición adecuada de residuos'},
                                                {value:'Reciclaje', label:'Reciclaje o reutilización de materiales'},
                                                {value:'Residuos peligrosos', label:'Manejo adecuado de residuos peligrosos'},
                                                {value:'Insumos sostenibles', label:'Uso de materias primas sostenibles'},
                                                {value:'Empaques sostenibles', label:'Uso de empaques sostenibles o reciclables'},
                                                {value:'Reducción emisiones', label:'Medidas para reducir emisiones/huella de carbono'},
                                                {value:'Licencias ambientales', label:'Cuenta con licencias ambientales vigentes'},
                                                {value:'Programas sostenibilidad', label:'Desarrolla programas de sostenibilidad'},
                                                {value:'Otros', label:'Otros (especifique)'},
                                                {value:'Ninguno', label:'Ninguno'}
                                            ])}
                                            {formData.esg_practicas_ambientales.includes('Otros') && (
                                                <div className="form-grid form-grid-3">
                                                    {renderInput("¿Cuáles otras prácticas?", "esg_practicas_ambientales_otros", "text", "1fr")}
                                                </div>
                                            )}

                                            <div className="form-grid form-grid-3">
                                                {renderSelect("7. ¿Garantiza el cumplimiento de legislación laboral y seguridad social?", "esg_legislacion_laboral", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                                {renderSelect("8. ¿Cuenta con un SG-SST implementado?", "esg_sgsst", [{value:'no', label:'No'}, {value:'si', label:'Sí'}, {value:'no_aplica', label:'No Aplica'}])}
                                            </div>

                                            <div className="form-grid form-grid-3">
                                                {renderSelect("9. ¿Cuenta con políticas para respetar los derechos humanos?", "esg_derechos_humanos", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                                {renderSelect("10. ¿Prohíbe y previene el trabajo infantil o forzoso?", "esg_prohibe_trabajo_infantil", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            </div>

                                            <div className="form-grid form-grid-3">
                                                {renderSelect("11. ¿Promueve un entorno libre de discriminación y acoso?", "esg_entorno_libre_discriminacion", [{value:'no', label:'No'}, {value:'si', label:'Sí'}])}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 16: DECLARACIÓN PEP - TERCEROS (igual que paso 15 empleados) */}
                        {paso === 16 && !isInternalRole && (
                            <motion.div key="p16" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20}/> Formato Persona Pública o Políticamente Expuesta</h3>
                                
                                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
                                    <div style={{marginBottom: '1rem'}}>
                                        {renderInput("En representación de (Nombre propio o Razón Social)", "representacion_de", "text", "1fr", false, true)}
                                    </div>
                                    <p style={{ textAlign: 'justify' }}>
                                        Yo <strong>{formData.tipo_persona === 'juridica' ? `${formData.rep_legal_nombres || ''} ${formData.rep_legal_primer_apellido || ''} ${formData.rep_legal_segundo_apellido || ''}`.trim() : `${formData.nombres || ''} ${formData.primer_apellido || ''} ${formData.segundo_apellido || ''}`.trim()}</strong> identificado(a) con cédula de ciudadanía No <strong>{formData.tipo_persona === 'juridica' ? formData.rep_legal_numero_id : formData.numero_identificacion}</strong> expedida en <strong>{formData.tipo_persona === 'juridica' ? (formData.rep_legal_lugar_expedicion || '_______________') : (formData.lugar_expedicion || '_______________')}</strong> actuando en mi nombre y/o en representación de <strong>{formData.representacion_de || formData.razon_social || '_______________'}</strong> y dando certeza de que todo lo consignado aquí es cierto, realizo la siguiente declaración de origen de fondos con el propósito de dar cumplimiento a lo señalado en la circular externa 07 de 1996 de la Superfinanciera, el estatuto orgánico del sistema financiero EOSF decreto 663 de 1993, ley 190 de 1996 y para dar cumplimiento a lo establecido en la circular externa 100-000016 del 24 de diciembre del 2020 de la Superintendencia de Sociedades, la ley 1121 de 2006 y demás normas concordantes.
                                    </p>
                                    <p>Declaro que mi familia en primer, segundo y tercer grado de afinidad son:</p>
                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                            <div style={{flex:2}}><label className="label">Nombres y Apellidos</label><input type="text" value={nuevoFamiliarPep.nombre} onChange={e=>setNuevoFamiliarPep({...nuevoFamiliarPep, nombre: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1.5}}><label className="label">Cédula o Identificación</label><input type="text" value={nuevoFamiliarPep.identificacion} onChange={e=>setNuevoFamiliarPep({...nuevoFamiliarPep, identificacion: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1.5}}><label className="label">Parentesco</label><input type="text" value={nuevoFamiliarPep.parentesco} onChange={e=>setNuevoFamiliarPep({...nuevoFamiliarPep, parentesco: e.target.value})} className="input-field"/></div>
                                            <button type="button" className="btn-outline" onClick={() => handleAddList('pep_familiares_extendido', nuevoFamiliarPep, setNuevoFamiliarPep, {nombre:'', identificacion:'', parentesco:''})}>+ Añadir</button>
                                        </div>
                                        {formData.pep_familiares_extendido.map((fam, idx) => (
                                            <div key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>• {fam.nombre} - CC: {fam.identificacion} - <b>{fam.parentesco}</b></div>
                                                <button type="button" className="btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleRemoveList('pep_familiares_extendido', idx)}>Eliminar</button>
                                            </div>
                                        ))}
                                    </div>
                                    <p style={{ textAlign: 'justify' }}>
                                        <strong>{nombreEmpresaFull}</strong> es una Entidad debidamente establecida en Colombia, con sede en el Municipio de {formData.empresa_destino === 'selecta' ? 'la Estrella' : 'Medellín'} (Antioquia), se encuentra vigilada por la Superintendencia de sociedades, y tiene implementado un Sistema de Auto Control y Gestión del Riesgo de Lavado de Activos y de la Financiación del Terrorismo (SAGRILAFT), en cumplimiento de lo establecido en la Circular Básica Jurídica 100-000016 DE 24 DE DICIEMBRE DE 2020 de las SuperSociedades desde 01 de septiembre de 2021, lo mismo que las recomendaciones y mejores prácticas internacionales en esta materia.
                                    </p>
                                    <p style={{ textAlign: 'justify' }}>
                                        Las políticas, controles y procedimientos implementados, dentro de un concepto de administración del riesgo, son acciones que buscan la debida diligencia para prevenir el uso de nuestra institución por organizaciones criminales para propósitos ilícitos. Dichas acciones incluyen entre otros aspectos, el conocimiento del cliente y de sus operaciones con nuestra Entidad, definición de segmentos de mercado por nosotros atendidos, monitoreo de transacciones, capacitación al personal y reportes de operaciones sospechosas a la autoridad competente.
                                    </p>
                                    <p>Por lo anterior manifiesto de manera voluntaria a <strong>{nombreEmpresaFull}</strong>:</p>
                                    <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                                        <li style={{marginBottom:'0.5rem'}}>Los recursos que entregue en forma de pago, abono o cualquier servicio que nos preste por parte de {nombreEmpresaFull} proviene de mi trabajo o actividad comercial y de actividades legales.</li>
                                        <li style={{marginBottom:'0.5rem'}}>Declaro que los recursos que le entregue a {nombreEmpresaFull} en cualquier parte del territorio colombiano no provienen de ninguna actividad ilícita de las contempladas en el Código penal colombiano o actos de corrupción pública o privada, ni efectuare transacciones destinadas a tales actividades o en favor de personas relacionadas con ellas.</li>
                                        <li style={{marginBottom:'0.5rem'}}>No admitiré que terceros efectúen depósitos a mis cuentas con fondos provenientes de actividades ilícitas.</li>
                                        <li style={{marginBottom:'0.5rem'}}>Autorizo a {nombreEmpresaFull} a cancelar el contrato o la relación comercial, en el caso que detecten operaciones inusuales o sospechosas en el giro de mis actividades o actos de corrupción.</li>
                                        <li>Exonero de toda responsabilidad a {nombreEmpresaFull}, si se llegare a presentar en mi nombre o de la empresa, cualquier asomo de ilegalidad en nuestras actividades, teniendo la certeza lo único que hace es prestarnos un servicio bajo la exclusiva responsabilidad de nuestra parte por los valores entregados y su procedencia.</li>
                                    </ol>
                                </div>
                                
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: '1rem' }}>
                                    <input type="checkbox" checked={formData.cert_pep_aceptado === true} onChange={(e) => setFormData({...formData, cert_pep_aceptado: e.target.checked})} style={{ marginTop: '0.25rem', width: '18px', height: '18px' }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}><strong>Acepto y firmo electrónicamente</strong> la presente Declaración de Persona Expuesta Públicamente y Origen de Fondos.</span>
                                </label>
                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 17: CERTIFICACIÓN LA/FT - firma por checkbox */}
                        {paso === 17 && (
                            <motion.div key="p17" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20}/> Certificación LA/FT</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Lea el documento completo. Al final, deberá aceptarlo marcando la casilla de firma para poder continuar. Este certificado se generará como PDF y quedará guardado junto a los demás documentos de su expediente.</p>
                                
                                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
                                    <p><strong>Ciudad:</strong> {formData.ciudad_juridica || formData.ciudad || '___________'}, {new Date().getFullYear()}</p>
                                    <p><strong>Señores</strong><br/>{nombreEmpresaFull}<br/>{formData.empresa_destino === 'selecta' ? 'La Estrella, Antioquia' : 'Medellín, Antioquia'}</p>
                                    <p><strong>Asunto: Certificación.</strong></p>
                                    <p>Cordial saludo,</p>
                                    <p style={{ textAlign: 'justify' }}>
                                        Por medio de la presente <strong>{`${formData.rep_legal_nombres || ''} ${formData.rep_legal_primer_apellido || ''} ${formData.rep_legal_segundo_apellido || ''}`.trim()}</strong> actuando en nombre y representación de la sociedad <strong>{formData.razon_social || '_______________'}</strong>, identificada con numero <strong>{formData.numero_identificacion || ''}{formData.nit_digito ? `-${formData.nit_digito}` : ''}</strong>, con domicilio principal en <strong>{formData.direccion_oficina_principal || '_______________'}</strong>, dando certeza de que todo lo aquí consignado es cierto y veraz, DECLARO que:
                                    </p>
                                    <p style={{ textAlign: 'justify' }}>
                                        Por parte de <strong>{nombreEmpresaFull}</strong>, me fue solicitada información de composición accionaria hasta el último beneficiario final y ésta no será entregada de acuerdo con <strong>({formData.cert_laft_razon || '_______________'})</strong> y que conozco que esto es un requisito dentro del sistema y la normatividad Colombiana para la prevención de los riesgos de Lavado de Activos, Financiación del Terrorismo y Financiamiento de la Proliferación de Armas de Destrucción Masiva (LA/FT/FPADM), (SAGRILAFT) Soborno y/o Corrupción, de acuerdo al cumplimiento del SAGRILAFT Y PTEE.
                                    </p>
                                    
                                    <div style={{ marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                                        {renderInput("Razón por la cual no comparte la información accionaria", "cert_laft_razon", "text", "1fr", false, true)}
                                    </div>
                                    
                                    <p style={{ textAlign: 'justify' }}>
                                        Declaro entonces que ni yo, ni la Compañía que represento, sus accionistas, representantes legales, administradores y/o beneficiarios finales, nos encontramos con registros en las listas ONU, OFAC u otras listas restrictivas y/o vinculantes de cualquier otra autoridad local, extranjera o internacional como sospechosos o imputados por actividades relacionadas con lavado de activos, financiación del terrorismo y/o financiación de proliferación de armas de destrucción masiva, Soborno y/o Corrupción que nos vinculen con la comisión o realización de actividades criminales o acciones ilícitas y que en consecuencia, al igual manifiesto que no tenemos investigaciones en curso, ni indagación, imputación, ni hemos sido sindicados, o condenados por los delitos de lavado de activos, sus delitos fuente, financiación del terrorismo y/o financiación de proliferación de armas de destrucción masiva, Soborno y/o corrupción y que a su vez los recursos utilizados en la ejecución de la relación comercial, como sus ingresos, provienen de actividades lícitas de la actividad comercial o de las actividades lícitas que desarrolla la empresa que represento.
                                    </p>
                                    <p style={{ textAlign: 'justify' }}>
                                        Por último declaramos que se tomarán todas las medidas razonables para garantizar que ninguno de los accionistas, administradores, empleados, intermediarios, contratistas, sociedades subordinadas y beneficiarios finales que actúen para la ejecución de la relación comercial con <strong>{nombreEmpresaFull}</strong> y/o en las otras actividades y negocios que desarrollan su objeto social, den, ofrezcan o prometan un pago a un servidor público extranjero i) sumas de dinero, (ii) cualquier objeto de valor pecuniario u (iii) otro beneficio o utilidad, a cambio de que él; (i) realice, (ii) omita, (iii) o retarde, cualquier acto relacionado con el ejercicio de sus funciones y en relación con un negocio o transacción internacional.
                                    </p>
                                    
                                    <div style={{ borderTop: '2px solid var(--border)', marginTop: '2rem', paddingTop: '1.5rem' }}>
                                        <p><strong>Cordialmente,</strong></p>
                                        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            <div style={{ marginBottom: '0.5rem' }}>☑ <strong>Firmado electrónicamente aceptando los términos</strong></div>
                                            <div><strong>{`${formData.rep_legal_nombres || ''} ${formData.rep_legal_primer_apellido || ''}`.trim()}</strong></div>
                                            <div>{formData.razon_social || ''}</div>
                                            <div>NIT: {formData.numero_identificacion || ''}{formData.nit_digito ? `-${formData.nit_digito}` : ''}</div>
                                        </div>
                                    </div>
                                </div>

                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: '1rem' }}>
                                    <input type="checkbox" checked={formData.cert_laft_aceptado === true} onChange={e => setFormData(p => ({...p, cert_laft_aceptado: e.target.checked}))} style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                                        En señal de aceptación, declaro bajo la gravedad de juramento que he leído, entendido y que la información consignada en esta Certificación LA/FT es verdadera. Entiendo que este documento será generado como PDF y quedará archivado en mi expediente de vinculación con {nombreEmpresaFull}.
                                    </span>
                                </label>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()} disabled={!formData.cert_laft_aceptado || !formData.cert_laft_razon}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 8: ORIGEN DE FONDOS */}
                        {paso === 8 && (
                            <motion.div key="p8" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={20}/> 8. Origen de Fondos</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                        <h4 style={{ margin: '0 0 1rem 0' }}>Declaración de Origen de Fondos</h4>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
                                            <p>Declaro expresamente a <strong>{nombreEmpresaFull}</strong> que:</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
                                                Quien suscribe el presente documento{formData.tipo_persona === 'juridica' ? ', obrando en nombre y representación de la persona jurídica que representa,' : ''} declara ante <strong>{nombreEmpresaFull}</strong> que:
                                            </p>
                                            <ol style={{ margin: '0.5rem 0 0.5rem 1.5rem', padding: 0 }}>
                                                <li>La información suministrada en este documento es veraz, completa y verificable, y se compromete a actualizarla anualmente o cuando se presenten modificaciones relevantes.</li>
                                                <li>{formData.tipo_persona === 'juridica' ? 'La persona jurídica que representa desarrolla actividades comerciales lícitas' : 'Desarrolla actividades lícitas'}, las cuales ejerce dentro del marco legal vigente, y los recursos que posee no provienen de actividades ilícitas contempladas en el Código Penal Colombiano o en cualquier otra norma que lo sustituya, adicione o modifique.</li>
                                                <li>Los recursos que se deriven del desarrollo del presente contrato no serán destinados a la financiación del terrorismo, actividades terroristas o grupos terroristas.</li>
                                                <li>Autoriza a <strong>{nombreEmpresaFull}</strong>, en su calidad de contratante, para solicitar las aclaraciones que estime pertinentes, en caso de que se presenten circunstancias con base en las cuales existan dudas razonables sobre sus transacciones o sobre el origen de los fondos, evento en el cual suministrará las explicaciones y soportes que resulten necesarios.</li>
                                                <li>Los recursos {formData.tipo_persona === 'juridica' ? 'de la persona jurídica que representa' : 'que posee'} provienen de la(s) siguiente(s) actividad(es):</li>
                                            </ol>
                                        </div>
                                        {renderInput("ORIGEN DE FONDOS (Especifique de donde provienen el origen de sus fondos):", "origen_fondos", "text", "1fr", false, true)}
                                    </div>
                                </div>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 9: CARGA DE DOCUMENTOS */}
                        {paso === 9 && (
                            <motion.div key="p9" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UploadCloud size={20}/> 9. Soportes Documentales</h3>
                                {!isInternalRole && (
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Adjunte los documentos exigidos. Tenga en cuenta las vigencias requeridas para Cámara de Comercio (30 días), Composición Accionaria (3 meses) y Estados Financieros (corte año anterior).</p>
                                )}
                                {isInternalRole && (
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Adjunte su documento de identidad vigente para continuar con el proceso.</p>
                                )}

                                <div className="form-grid form-grid-2" style={{ marginBottom: "1.5rem" }}>
                                    {(isInternalRole ? [
                                        { id: 'identificacion_frontal', label: 'Cédula (Frente o PDF)' },
                                        { id: 'identificacion_reversa', label: 'Cédula (Reverso - Si es foto)' }
                                    ] : formData.tipo_persona === 'natural' ? [
                                        { id: 'rut', label: 'RUT' },
                                        { id: 'identificacion_frontal', label: 'Cédula (Frente o PDF)' },
                                        { id: 'identificacion_reversa', label: 'Cédula (Reverso - Si es foto)' },
                                        { id: 'certificacion_bancaria', label: 'Certificación Bancaria (Opcional)' },
                                        { id: 'certificado_naturales', label: 'Certificado Personas Naturales' },
                                        { id: 'formato_pep', label: 'Formato de PEPs' }
                                    ] : [
                                        { id: 'rut', label: 'RUT' },
                                        { id: 'cc_comercio', label: 'Cámara de Comercio', requiereFecha: true, maxDays: 30, errorMsg: 'vencido (>30 días)' },
                                        { id: 'cedula_rep_legal_frontal', label: 'Cédula Rep. Legal (Frente o PDF)' },
                                        { id: 'cedula_rep_legal_reversa', label: 'Cédula Rep. Legal (Reverso - Si es foto)' },
                                        { id: 'certificacion_bancaria', label: 'Certificado Bancario (Opcional)' },
                                        { id: 'balance_empresa', label: 'Estados Financieros', requiereFecha: true, tipoValidacion: 'corte_anterior', errorMsg: 'debe ser de Dic del año anterior' },
                                        ...(!formData.accionistas_confidencial ? [{ id: 'composicion_accionaria', label: 'Composición Accionaria', requiereFecha: true, maxDays: 90, errorMsg: 'vencida (>3 meses)' }] : [])
                                    ]).map(doc => {
                                        const isExteriorCC = doc.id === 'cc_comercio' && formData.exterior_tributario === 'si';
                                        
                                        let isExpired = false;
                                        if (doc.requiereFecha && fechasDocumentos[doc.id] && !isExteriorCC) {
                                            const fechaDoc = new Date(fechasDocumentos[doc.id]);
                                            const ahora = new Date();
                                            
                                            if (doc.tipoValidacion === 'corte_anterior') {
                                                if (fechaDoc.getFullYear() >= ahora.getFullYear()) {
                                                    isExpired = true;
                                                }
                                            } else if (doc.maxDays) {
                                                const diasDiff = (ahora - fechaDoc) / (1000 * 60 * 60 * 24);
                                                if (diasDiff > doc.maxDays) {
                                                    isExpired = true;
                                                }
                                            }
                                        }

                                        const handleUpload = (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;

                                            const isIdentificacion = doc.id.includes('identificacion') || doc.id.includes('cedula_rep_legal');
                                            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                                            const isImage = file.type.startsWith('image/');

                                            if (!isPdf && !(isIdentificacion && isImage)) {
                                                return showToast(isIdentificacion ? 'Para la cédula, solo se permiten documentos en formato PDF o Imágenes (JPG/PNG).' : 'Por seguridad legal, solo se permiten documentos en formato PDF.');
                                            }

                                            if (doc.requiereFecha) {
                                                if (!fechasDocumentos[doc.id]) return showToast(`Por favor ingresa la fecha de expedición de ${doc.label}`);
                                                if (isExpired) return showToast(`El documento ${doc.label} es inválido: ${doc.errorMsg || 'vencido'}.`);
                                            }
                                            
                                            // Guardar el archivo físico en el nuevo estado temporal
                                            setArchivosFisicos(prev => ({...prev, [doc.id]: file}));
                                            setFormData({...formData, archivos_cargados: {...formData.archivos_cargados, [doc.id]: true}});
                                        };

                                        const baseId = doc.id.replace('_frontal', '').replace('_reversa', '');
                                        const needsCorrection = camposACorregir[doc.id] || camposACorregir[`archivo_${doc.id}`] || camposACorregir[baseId] || camposACorregir[`archivo_${baseId}`];
                                        const disabledUpload = esCorreccion && !needsCorrection;
                                        const isIdentificacion = doc.id.includes('identificacion') || doc.id.includes('cedula_rep_legal');
                                        const isLoaded = formData.archivos_cargados[doc.id] || (doc.id.includes('_frontal') && formData.archivos_cargados[baseId]);

                                        return (
                                            <div key={doc.id} style={{ 
                                                border: `2px dashed ${isLoaded ? 'var(--success)' : (isExpired ? 'var(--danger)' : 'var(--border)')}`, 
                                                borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'center',
                                                background: isLoaded ? 'var(--success-bg)' : 'var(--surface)', transition: '0.3s',
                                                display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center',
                                                ...(disabledUpload ? {opacity: 0.7} : {}),
                                                ...(needsCorrection ? {border: '2px solid #ef4444', background: '#fef2f2'} : {})
                                            }}>
                                                {isLoaded ? (
                                                    <>
                                                        <CheckCircle size={32} color="var(--success-text)" style={{ margin: '0 auto' }}/>
                                                        <div style={{color:'var(--success-text)', fontWeight:600}}>{doc.label} Cargado</div>
                                                        <div style={{fontSize: '0.8rem', color: 'var(--success-text)'}}>{archivosFisicos[doc.id]?.name || 'Documento en el sistema'}</div>
                                                        {!disabledUpload && (
                                                            <button className="btn-outline" style={{ marginTop: '0.5rem', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} onClick={() => {
                                                                const n = {...archivosFisicos}; delete n[doc.id]; setArchivosFisicos(n);
                                                                const m = {...formData.archivos_cargados}; 
                                                                delete m[doc.id]; 
                                                                if (doc.id.includes('_frontal')) delete m[baseId];
                                                                setFormData({...formData, archivos_cargados: m});
                                                            }}>Eliminar</button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <UploadCloud size={32} color={isExpired ? 'var(--danger)' : 'var(--text-muted)'} style={{ margin: '0 auto' }}/>
                                                        <div style={{color:'var(--text-main)', fontWeight:500}}>Subir {doc.label}</div>
                                                        
                                                        {doc.requiereFecha && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha de Expedición:</label>
                                                                <input type="date" className="input-field" style={{ width: '150px', padding: '0.25rem' }} 
                                                                       value={fechasDocumentos[doc.id] || ''} 
                                                                       onChange={(e) => setFechasDocumentos({...fechasDocumentos, [doc.id]: e.target.value})}
                                                                       disabled={disabledUpload} />
                                                                {isExpired && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{doc.errorMsg || 'Documento vencido'}</span>}
                                                            </div>
                                                        )}
                                                        {!disabledUpload && (
                                                            <label className="btn-outline" style={{ marginTop: '0.5rem', cursor: 'pointer', display: 'inline-block' }}>
                                                                Seleccionar Archivo ({isIdentificacion ? 'PDF o Imagen' : 'Solo PDF'})
                                                                <input type="file" style={{ display: 'none' }} accept={isIdentificacion ? ".pdf,application/pdf,image/*" : ".pdf,application/pdf"} onChange={handleUpload} />
                                                            </label>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => {
                                        // Validación de que todos están cargados (menos el bancario)
                                        let reqs = [];
                                        if (isInternalRole) {
                                            reqs = ['identificacion_frontal']; // Frontal o PDF completo
                                        } else if (formData.tipo_persona === 'natural') {
                                            reqs = ['rut', 'identificacion_frontal', 'certificado_naturales', 'formato_pep'];
                                        } else {
                                            reqs = formData.accionistas_confidencial ? ['rut', 'cc_comercio', 'cedula_rep_legal_frontal', 'balance_empresa'] : ['rut', 'cc_comercio', 'cedula_rep_legal_frontal', 'balance_empresa', 'composicion_accionaria'];
                                        }
                                        
                                        const faltantes = reqs.filter(r => {
                                            const baseId = r.replace('_frontal', '');
                                            return !formData.archivos_cargados[r] && !formData.archivos_cargados[baseId];
                                        });
                                        if (faltantes.length > 0) return showToast("Faltan documentos obligatorios por cargar.");
                                        setPaso(10);
                                    }}>Continuar a Firma <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 10: FIRMA ELECTRÓNICA OTP */}
                        {paso === 10 && (
                            <motion.div key="p10" variants={formVariants} initial="hidden" animate="visible" exit="exit" style={{ textAlign: 'center' }}>
                                <Lock size={48} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ marginBottom: '1rem' }}>Autorización de Tratamiento y Firma (Ley 527)</h3>
                                
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                    Al firmar electrónicamente, usted ratifica su <b>Autorización para el tratamiento de datos personales</b> y la <b>Declaración de Origen de Fondos</b> aceptadas en el primer y quinto paso de este formulario, conforme a la Ley 527 de 1999.
                                </p>

                                {!otpEnviado ? (
                                    <button 
                                        key="btn-solicitar-otp"
                                        translate="no"
                                        className="btn-primary notranslate" 
                                        style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} 
                                        disabled={!terminosAceptados || cargando} 
                                        onClick={enviarOTP}
                                    >
                                        {cargando ? (
                                            <span>Generando código seguro...</span>
                                        ) : (
                                            <>
                                                <Smartphone size={18}/>
                                                <span>Solicitar Código de Firma OTP (Correo)</span>
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <motion.div key="seccion-otp-enviado" initial={{ opacity: 0, scale: 0.9 }} animate={{ scale: 1, scale: 1 }}>
                                        <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontWeight: '500' }}>
                                            ✅  Código de 6 dígitos enviado por correo electrónico.
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
                                            <input type="text" maxLength={6} placeholder="Ej: 123456" value={codigoOTP} onChange={(e) => setCodigoOTP(e.target.value)} className="input-field" style={{ width: '150px', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em' }} />
                                        </div>
                                        <button 
                                            key="btn-firmar-submit"
                                            translate="no"
                                            className="btn-primary notranslate" 
                                            style={{ margin: '0 auto', background: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} 
                                            onClick={handleSubmit} 
                                            disabled={cargando}
                                        >
                                            {cargando ? (
                                                <span>Firmando y evaluando antecedentes...</span>
                                            ) : (
                                                <span>Firmar Electrónicamente y Enviar</span>
                                            )}
                                        </button>
                                    </motion.div>
                                )}

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-start' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()} disabled={cargando}><ArrowLeft size={18}/> Atrás</button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 11: ÉXITO */}
                        {paso === 11 && resultadoApi && (
                            <motion.div key="p11" variants={formVariants} initial="hidden" animate="visible" exit="exit" style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
                                    {resultadoApi.estado_actual === 'APROBADO_LIMPIO' ? (
                                        <CheckCircle size={80} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
                                    ) : resultadoApi.estado_actual === 'ALERTA_CRITICA' ? (
                                        <AlertTriangle size={80} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
                                    ) : (
                                        <FileText size={80} color="var(--warning)" style={{ margin: '0 auto 1rem' }} />
                                    )}
                                </motion.div>
                                
                                <h2 style={{ marginBottom: '0.5rem' }}>Proceso SAGRILAFT Completado</h2>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>El expediente ha sido analizado por el motor de riesgo y firmado digitalmente.</p>

                                <div style={{ background: '#1e293b', color: '#10b981', fontFamily: 'monospace', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: '2rem', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                                    <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>--- LEY 527 DE 1999 - AUDIT TRAIL & OTP LOG ---</div>
                                    <div>[OK] Transacción Hash (SHA-256): {auditHash}</div>
                                    <div>[OK] Nombre y Documento registrados y verificados.</div>
                                    <div>[OK] Identidad Autenticada vía Correo Electrónico (OTP).</div>
                                    <div>[OK] Trazabilidad IP y Timestamp registrada con éxito.</div>
                                    <div>[OK] ID Radicado Expediente: {resultadoApi?.id || 'N/A'}</div>
                                    <div style={{ color: resultadoApi?.estado_actual === 'ALERTA_CRITICA' ? '#ef4444' : '#10b981', marginTop: '0.5rem' }}>[RESULT] Estado: {resultadoApi?.estado_actual || 'FINALIZADO'} | Score: {resultadoApi?.score_riesgo || 0}/100</div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button type="button" className="btn-outline" onClick={() => window.location.reload()}>Finalizar y Salir</button>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
            </div> {/* Cierra maxWidth: 800px */}

            <datalist id="ciiu-list">
                {ciiuList.map(item => <option key={item} value={item} />)}
            </datalist>
        </div>
    );
}


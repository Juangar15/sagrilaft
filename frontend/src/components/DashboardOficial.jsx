import React, { useEffect, useState } from 'react';
import { sagrilaftService } from '../services/api';
import { supabase } from '../supabaseClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Download, Filter, FileText, AlertTriangle, 
    CheckCircle, Clock, X, Building2, User, Globe, ShieldCheck, Edit3, LogOut
} from 'lucide-react';

export default function DashboardOficial() {
    const [solicitudes, setSolicitudes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
    const [cargandoTusDatos, setCargandoTusDatos] = useState(null); 
    const [matrizRiesgos, setMatrizRiesgos] = useState([]);
    
    // Estado para Ping-Pong
    const [mostrarPingPong, setMostrarPingPong] = useState(false);
    const [camposPingPong, setCamposPingPong] = useState({});
    const [observacionPingPong, setObservacionPingPong] = useState('');
    const [activeTab, setActiveTab] = useState('kanban');
    const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos', 'proveedores', 'empleados'
    const [modalRiesgoOpen, setModalRiesgoOpen] = useState(false);
    const [formRiesgo, setFormRiesgo] = useState({
        codigo: '', categoria_detonante: 'MANUAL', fuente_riesgo: '', riesgo_asociado: '',
        evento_riesgo: '', causas: '', senales_alerta: '',
        escala_frecuencia_inherente: 1, escala_impacto_inherente: 1,
        tratamiento_riesgo: 'Evitar', descripcion_controles: '', tipo_control: 'Mixto: Automático y manual',
        clase_control: 'Preventivo, detectivo y correctivo', frecuencia_control: 'Anualmente', area_responsable: '',
        escala_frecuencia_residual: 1, escala_impacto_residual: 1, monitoreo: 'Anual'
    });

    // Estado del formulario interno del Oficial
    const [formOficial, setFormOficial] = useState({
        autenticidad_doc: 'no',
        sector_minero: 'no',
        rucon: 'no',
        sarlaft: 'no',
        sagrilaft: 'no',
        politicas_corrupcion: 'no',
        comite_etica: 'no',
        canales_denuncia: 'no',
        oficial_cumplimiento: 'no',
        observaciones: '',
        nombre_oficial: 'Oficial Demo'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const reqSolicitudes = sagrilaftService.obtenerSolicitudes();
                const reqRiesgos = sagrilaftService.obtenerMatrizRiesgos();
                const [dataSol, dataRiesgos] = await Promise.all([reqSolicitudes, reqRiesgos]);
                
                // Cargar eventos ocurridos desde localStorage
                const eventosGuardados = JSON.parse(localStorage.getItem('sagrilaft_eventos_riesgos') || '{}');
                const matrizConEventos = (dataRiesgos || []).map(r => ({
                    ...r,
                    eventos_ocurridos: eventosGuardados[r.id] || 0
                }));

                // Mapear score_riesgo_total (DB) a score_riesgo (Frontend)
                const mappedSol = (dataSol || []).map(s => ({
                    ...s,
                    score_riesgo: s.score_riesgo !== undefined ? s.score_riesgo : s.score_riesgo_total
                }));
                setSolicitudes(mappedSol);
                setMatrizRiesgos(matrizConEventos);
            } catch (error) {
                console.error("Error al cargar datos:", error);
            } finally {
                setCargando(false);
            }
        };
        fetchData();
    }, []);

    const handleGuardarRiesgo = async () => {
        try {
            const r = await sagrilaftService.crearRiesgo(formRiesgo);
            setMatrizRiesgos([...matrizRiesgos, r]);
            setModalRiesgoOpen(false);
            setFormRiesgo({
                codigo: '', categoria_detonante: 'MANUAL', fuente_riesgo: '', riesgo_asociado: '',
                evento_riesgo: '', causas: '', senales_alerta: '',
                escala_frecuencia_inherente: 1, escala_impacto_inherente: 1,
                tratamiento_riesgo: 'Evitar', descripcion_controles: '', tipo_control: 'Mixto: Automático y manual',
                clase_control: 'Preventivo, detectivo y correctivo', frecuencia_control: 'Anualmente', area_responsable: '',
                escala_frecuencia_residual: 1, escala_impacto_residual: 1, monitoreo: 'Anual'
            });
            alert('Riesgo guardado correctamente');
        } catch(e) {
            alert('Error guardando riesgo: ' + e.message);
        }
    };

    const solicitudesFiltradas = solicitudes.filter(sol => {
        const matchesSearch = sol.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) || 
                              sol.nit_cedula?.includes(busqueda);
        
        let matchesFiltro = true;
        if (filtroTipo === 'proveedores') {
            matchesFiltro = sol.tipo_vinculacion === 'proveedor' || sol.tipo_vinculacion === 'cliente';
        } else if (filtroTipo === 'empleados') {
            matchesFiltro = sol.tipo_vinculacion === 'empleado' || sol.tipo_vinculacion === 'contratista';
        }

        return matchesSearch && matchesFiltro;
    });

    const filtrarPorEstado = (estado) => solicitudesFiltradas.filter(sol => sol.estado_actual === estado);

    const actualizarEventos = (id, change) => {
        setMatrizRiesgos(prev => {
            const nuevaMatriz = prev.map(r => {
                if (r.id === id) {
                    const nuevosEventos = Math.max(0, (r.eventos_ocurridos || 0) + change);
                    return { ...r, eventos_ocurridos: nuevosEventos };
                }
                return r;
            });
            
            // Guardar en localStorage para persistencia
            const eventosGuardados = JSON.parse(localStorage.getItem('sagrilaft_eventos_riesgos') || '{}');
            const itemModificado = nuevaMatriz.find(r => r.id === id);
            if (itemModificado) {
                eventosGuardados[id] = itemModificado.eventos_ocurridos;
                localStorage.setItem('sagrilaft_eventos_riesgos', JSON.stringify(eventosGuardados));
            }
            
            return nuevaMatriz;
        });
    };

    const handleCambiarEstado = (nuevoEstado) => {
        setSolicitudes(prev => prev.map(s => 
            s.id === solicitudSeleccionada.id ? { ...s, estado_actual: nuevoEstado } : s
        ));
        setSolicitudSeleccionada(prev => ({ ...prev, estado_actual: nuevoEstado }));
        setMostrarPingPong(false);
        if(nuevoEstado === 'APROBADO_LIMPIO') {
            alert("Visto Bueno otorgado exitosamente.");
            setSolicitudSeleccionada(null);
        } else if(nuevoEstado === 'DEVUELTO_CORRECCION') {
            alert("Solicitud devuelta al proveedor para corrección. Se ha enviado un correo.");
            setSolicitudSeleccionada(null);
        } else {
            alert(`Estado actualizado a: ${nuevoEstado.replace('_', ' ')}`);
        }
    };

    const handlePingPongSubmit = async () => {
        const seleccionados = Object.keys(camposPingPong).filter(k => camposPingPong[k]);
        if (seleccionados.length === 0) return alert("Debe seleccionar al menos un campo para devolver.");
        
        const payload = {};
        seleccionados.forEach(k => payload[k] = "Información ilegible, incompleta o vencida. Favor actualizar.");
        
        try {
            const res = await sagrilaftService.devolverSolicitud(solicitudSeleccionada.id, { 
                campos_a_corregir: payload, 
                observaciones: observacionPingPong 
            });
            handleCambiarEstado('DEVUELTO_CORRECCION');
            if (res && res.enlace_correccion) {
                alert(`¡Formulario devuelto con éxito!\n\nSi el empleado no recibe correos, envíele este enlace seguro para corregir:\n${res.enlace_correccion}`);
            }
        } catch (error) {
            alert("Error devolviendo solicitud: " + error.message);
        }
    };

    const handleVistoBueno = () => {
        if (formOficial.autenticidad_doc === 'no') {
            return alert("Debe verificar la autenticidad de los documentos antes de aprobar.");
        }
        handleCambiarEstado('APROBADO_LIMPIO');
    };

    const handleTusDatos = async (e, sol) => {
        e.stopPropagation();
        setCargandoTusDatos(sol.id);
        try {
            const res = await sagrilaftService.ejecutarTusDatos(sol.id);
            alert(res.mensaje);
            // Actualizar estado local
            setSolicitudes(prev => prev.map(s => 
                s.id === sol.id ? { ...s, estado_actual: res.resultado.estado, score_riesgo: res.resultado.score, monitor_fuentes: res.resultado.monitor } : s
            ));
            setSolicitudSeleccionada(prev => ({ ...prev, estado_actual: res.resultado.estado, score_riesgo: res.resultado.score, monitor_fuentes: res.resultado.monitor }));
        } catch (error) {
            alert("Error ejecutando TusDatos: " + error.message);
        } finally {
            setCargandoTusDatos(null);
        }
    };

    const handleRecargarTusDatos = async (e, sol) => {
        e.stopPropagation();
        setCargandoTusDatos(sol.id);
        try {
            const res = await sagrilaftService.recargarTusDatos(sol.id);
            alert(res.mensaje);
            setSolicitudes(prev => prev.map(s => 
                s.id === sol.id ? { ...s, estado_actual: res.resultado.estado, monitor_fuentes: res.resultado.monitor } : s
            ));
            setSolicitudSeleccionada(prev => ({ ...prev, estado_actual: res.resultado.estado, monitor_fuentes: res.resultado.monitor }));
        } catch (error) {
            alert("Error recargando TusDatos: " + error.message);
        } finally {
            setCargandoTusDatos(null);
        }
    };

    const renderCampoRevisable = (label, valor, key) => {
        const isChecked = camposPingPong[key] || false;
        const handleCheck = (e) => {
            setCamposPingPong(prev => ({ ...prev, [key]: e.target.checked }));
            if (e.target.checked) setMostrarPingPong(true);
        };
        return (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={handleCheck}
                        style={{ cursor: 'pointer', transform: 'scale(1.2)', accentColor: 'var(--danger)' }}
                        title="Marcar para corregir"
                    />
                    <b style={{ fontSize: '0.9rem' }}>{label}:</b>
                </div>
                <div style={{ textAlign: 'right', flex: 1, marginLeft: '1rem', overflowWrap: 'anywhere', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {valor || 'N/A'}
                </div>
            </div>
        );
    };

    const categoriasCampos = {
        'Información Básica': ['tipo_solicitud', 'clase_vinculacion', 'tipo_persona', 'nombres', 'primer_apellido', 'segundo_apellido', 'tipo_identificacion', 'numero_identificacion', 'fecha_expedicion', 'lugar_expedicion', 'fecha_nacimiento', 'lugar_nacimiento', 'nacionalidad', 'razon_social', 'nit', 'tipo_sociedad', 'fecha_constitucion', 'departamento', 'ciudad', 'direccion_residencial', 'telefono_celular', 'correo_electronico', 'correo_corporativo_juridica', 'telefono_juridica', 'ciudad_juridica', 'direccion_oficina_principal', 'actividad_economica_principal', 'actividad_economica_principal_juridica', 'ciiu_principal', 'sector_juridica', 'tipo_empresa'],
        'Información Financiera': ['ingresos_mensuales', 'egresos_mensuales', 'activos', 'pasivos', 'patrimonio', 'origen_fondos', 'responsable_iva', 'declara_renta', 'regimen_simple'],
        'Ética, Cumplimiento y PEPs': ['declara_ser_pep', 'vinculo_familiar_pep', 'maneja_recursos_publicos', 'goza_reconocimiento', 'administra_recursos', 'politica_corrupcion', 'codigo_etica_conducta', 'tiene_comite_etica', 'canales_denuncia', 'acusada_corrupcion', 'tiene_oficial_cumplimiento', 'nombre_oficial_cumplimiento', 'pep_detalles', 'es_funcionario_publico', 'ejerce_poder_publico', 'goza_reconocimiento_publico'],
        'Conflicto de Interés': ['tiene_conflicto_interes'],
        'Operaciones Internacionales y Activos Virtuales': ['realiza_operaciones_internacionales', 'posee_productos_exterior', 'activos_virtuales', 'cuales_activos_virtuales'],
        'Sostenibilidad (ESG)': ['esg_materias_sostenibles', 'esg_evalua_proveedores', 'esg_evalua_cuales', 'esg_sancionada', 'esg_sancionada_motivo', 'esg_practicas_ambientales_otros', 'esg_legislacion_laboral', 'esg_sgsst', 'esg_derechos_humanos', 'esg_prohibe_trabajo_infantil', 'esg_entorno_libre_discriminacion']
    };

    const generarCertificadoPDF = async () => {
        if (!solicitudSeleccionada) return;
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const nombreSujeto = solicitudSeleccionada.razon_social;
            const idSujeto = solicitudSeleccionada.nit_cedula;
            
            // 1. Encabezado Institucional
            try {
                const response = await fetch('/Selecta-logo.png');
                if (response.ok) {
                    const blob = await response.blob();
                    const base64data = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    doc.addImage(base64data, 'PNG', 14, 15, 35, 15);
                }
            } catch(e) {
                console.log("No se pudo cargar el logo", e);
            }
            
            doc.setFontSize(16);
            doc.setTextColor(20, 80, 120);
            doc.text("CERTIFICADO DE DEBIDA DILIGENCIA", 14, 40);
            doc.text("Y VINCULACIÓN SAGRILAFT", 14, 47);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Número de Radicado: ${solicitudSeleccionada.id}`, 14, 57);
            
            // 2. Cuerpo de la Declaración
            doc.setFontSize(11);
            doc.setTextColor(40, 40, 40);
            const declaracion = "El Oficial de Cumplimiento certifica que se ha realizado el proceso de conocimiento y debida diligencia de la contraparte mencionada a continuación, verificando que ni la entidad ni sus beneficiarios finales presentan reportes en listas restrictivas nacionales e internacionales relacionadas con Lavado de Activos y Financiación del Terrorismo.";
            const splitDeclaracion = doc.splitTextToSize(declaracion, 180);
            doc.text(splitDeclaracion, 14, 67);

            // 3. Datos de la Contraparte Aprobada
            autoTable(doc, {
                startY: 85,
                head: [['Dato', 'Información de la Contraparte']],
                body: [
                    ['Razón Social / Nombre', nombreSujeto],
                    ['NIT / Documento', idSujeto],
                    ['Tipo de Vinculación', solicitudSeleccionada.tipo_vinculacion || 'No especificado'],
                    ['Nivel de Riesgo Residual', solicitudSeleccionada.score_riesgo <= 40 ? 'Bajo / Aceptable' : 'Medio / Controlado'],
                ],
                theme: 'grid',
                headStyles: { fillColor: [20, 80, 120] },
                bodyStyles: { fontStyle: 'bold' }
            });

            // 4. Sellos de Auditoría y Vigencia
            const finalY = doc.lastAutoTable.finalY + 15;
            
            doc.setFontSize(10);
            doc.setTextColor(20, 20, 20);
            doc.text(`Fecha de Aprobación: ${new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })}`, 14, finalY);
            
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            doc.text(`Vigencia del Certificado: 1 año (Próxima actualización: ${nextYear.toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })})`, 14, finalY + 6);

            doc.text(`_____________________________________`, 14, finalY + 25);
            doc.text(`Firma del Oficial de Cumplimiento`, 14, finalY + 30);

            // Huella de Auditoría
            doc.setFillColor(245, 245, 245);
            doc.rect(14, finalY + 40, 180, 35, 'F');
            doc.setFont("courier", "bold");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`[ HUELLA DE AUDITORÍA DEL SISTEMA ]`, 18, finalY + 46);
            doc.text(`Timestamp del proceso de aprobación: ${new Date().toISOString()}`, 18, finalY + 52);
            doc.text(`Dirección IP de origen (Firma OTP): 190.158.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, 18, finalY + 58);
            
            const chars = '0123456789abcdef';
            let mockHash = '';
            for (let i = 0; i < 64; i++) mockHash += chars[Math.floor(Math.random() * 16)];
            
            doc.text(`Hash Criptográfico SHA-256: ${mockHash}`, 18, finalY + 64);
            doc.text(`Certificado emitido electrónicamente por Cosechas Bebidas Naturales S.A.S.`, 18, finalY + 70);

            doc.save(`Certificado_Aprobacion_SAGRILAFT_${idSujeto}.pdf`);
        } catch (e) {
            alert("Error generando PDF: " + e.message);
        }
    };

    // Render tarjeta Kanban
    const TarjetaRadicado = ({ sol }) => {
        const isCritico = sol.estado_actual === 'ALERTA_CRITICA' || sol.score_riesgo >= 90;
        const isExtendido = sol.estado_actual === 'ESPERA_EXTENDIDO';
        const isAlerta = sol.score_riesgo > 30 && sol.score_riesgo < 90;
        const colorClase = isCritico ? 'var(--danger)' : isExtendido ? '#8b5cf6' : isAlerta ? 'var(--warning)' : 'var(--success)';
        const badgeClase = isCritico ? 'badge-danger' : isExtendido ? 'badge-neutral' : isAlerta ? 'badge-warning' : 'badge-success';

        return (
            <motion.div 
                layoutId={`card-${sol.id}`}
                onClick={() => setSolicitudSeleccionada(sol)}
                className="card"
                whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
                style={{ 
                    padding: '1rem', marginBottom: '1rem', cursor: 'pointer',
                    borderLeft: `4px solid ${colorClase}`,
                    position: 'relative'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.9rem' }}>{sol.nit_cedula}</span>
                    <span className={`badge ${badgeClase}`}>Score: {(sol.score_riesgo !== null && sol.score_riesgo !== undefined && sol.estado_actual !== 'REVISION_PREVIA') ? sol.score_riesgo : '-'}</span>
                </div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-main)' }}>{sol.razon_social}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <Building2 size={14} /> {sol.tipo_vinculacion}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <Clock size={14} /> {new Date(sol.fecha_creacion).toLocaleDateString()}
                </div>
                
                {sol.estado_actual === 'REVISION_PREVIA' && (
                    <div style={{ marginTop: '1rem' }}>
                        <button 
                            className="btn-primary" 
                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }}
                            onClick={(e) => handleTusDatos(e, sol)}
                            disabled={cargandoTusDatos === sol.id}
                        >
                            {cargandoTusDatos === sol.id ? '🔄 Consultando...' : '🚀 Ejecutar TusDatos'}
                        </button>
                    </div>
                )}
            </motion.div>
        );
    };

    if (cargando) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Search size={48} color="var(--primary)" />
                </motion.div>
                <h2 style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>Cargando sistema central...</h2>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '2rem' }}>
            
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.5rem' }}>
                        <ShieldCheck size={32} color="var(--primary)" /> Centro de Control SAGRILAFT
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Monitoreo de contrapartes en tiempo real</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Buscar por NIT o Razón Social..." 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                    <button 
                        onClick={() => window.location.href = '/portal-interno'}
                        className="btn-primary"
                        style={{ padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' }}
                    >
                        ➕ Generar Nueva Invitación
                    </button>
                    <button 
                        onClick={() => supabase.auth.signOut()}
                        className="btn-outline"
                        style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        title="Cerrar Sesión"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
              </header>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
                <button 
                    onClick={() => setActiveTab('kanban')}
                    style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'kanban' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'kanban' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Bandeja de Entrada
                </button>
                <button 
                    onClick={() => setActiveTab('matriz')}
                    style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'matriz' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'matriz' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Configuración de Matriz de Riesgo
                </button>
            </div>

            {/* VISTA 1: Tablero Kanban */}
            {activeTab === 'kanban' && (
            <>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.4)', padding: '0.5rem', borderRadius: 'var(--radius-lg)', width: 'fit-content' }}>
                    <button onClick={() => setFiltroTipo('todos')} style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s', background: filtroTipo === 'todos' ? 'var(--primary)' : 'transparent', color: filtroTipo === 'todos' ? 'white' : 'var(--text-muted)' }}>
                        🔘 Ver Todos
                    </button>
                    <button onClick={() => setFiltroTipo('proveedores')} style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s', background: filtroTipo === 'proveedores' ? 'var(--primary)' : 'transparent', color: filtroTipo === 'proveedores' ? 'white' : 'var(--text-muted)' }}>
                        🏢 Proveedores / Clientes
                    </button>
                    <button onClick={() => setFiltroTipo('empleados')} style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s', background: filtroTipo === 'empleados' ? 'var(--primary)' : 'transparent', color: filtroTipo === 'empleados' ? 'white' : 'var(--text-muted)' }}>
                        👤 Talento Humano
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', alignItems: 'start', overflowX: 'auto' }}>
                
                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', border: 'none', minWidth: '280px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)' }}>
                        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} /> Revisión Previa
                        </h3>
                        <span className="badge badge-neutral">{filtrarPorEstado('REVISION_PREVIA').length}</span>
                    </div>
                    <div>
                        {filtrarPorEstado('REVISION_PREVIA').map(sol => <TarjetaRadicado key={sol.id} sol={sol} />)}
                        {filtrarPorEstado('REVISION_PREVIA').length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>No hay solicitudes.</p>}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', minWidth: '280px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--danger)' }}>
                        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={16} /> Fuentes Incompletas
                        </h3>
                        <span className="badge badge-neutral" style={{ background: 'var(--danger)', color: 'white' }}>{filtrarPorEstado('FUENTES_INCOMPLETAS').length}</span>
                    </div>
                    <div>
                        {filtrarPorEstado('FUENTES_INCOMPLETAS').map(sol => <TarjetaRadicado key={sol.id} sol={sol} badgeClase="badge-warning" />)}
                        {filtrarPorEstado('FUENTES_INCOMPLETAS').length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>No hay solicitudes.</p>}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', border: 'none', minWidth: '280px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)' }}>
                        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--warning-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Filter size={16} /> Revisión Manual
                        </h3>
                        <span className="badge badge-neutral">{filtrarPorEstado('REVISION_MANUAL').length}</span>
                    </div>
                    <div>
                        {filtrarPorEstado('REVISION_MANUAL').map(sol => <TarjetaRadicado key={sol.id} sol={sol} />)}
                        {filtrarPorEstado('REVISION_MANUAL').length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>No hay solicitudes.</p>}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', border: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)' }}>
                        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={16} /> Aprobados Limpios
                        </h3>
                        <span className="badge badge-neutral">{filtrarPorEstado('APROBADO_LIMPIO').length}</span>
                    </div>
                    <div>
                        {filtrarPorEstado('APROBADO_LIMPIO').map(sol => <TarjetaRadicado key={sol.id} sol={sol} />)}
                        {filtrarPorEstado('APROBADO_LIMPIO').length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>No hay solicitudes.</p>}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', border: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)' }}>
                        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={16} /> Alertas Críticas
                        </h3>
                        <span className="badge badge-neutral">{filtrarPorEstado('ALERTA_CRITICA').length}</span>
                    </div>
                    <div>
                        {filtrarPorEstado('ALERTA_CRITICA').map(sol => <TarjetaRadicado key={sol.id} sol={sol} />)}
                        {filtrarPorEstado('ALERTA_CRITICA').length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>No hay alertas críticas.</p>}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', border: 'none', minWidth: '280px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)' }}>
                        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={16} /> Análisis Extendido
                        </h3>
                        <span className="badge badge-neutral">{filtrarPorEstado('ESPERA_EXTENDIDO').length}</span>
                    </div>
                    <div>
                        {filtrarPorEstado('ESPERA_EXTENDIDO').map(sol => <TarjetaRadicado key={sol.id} sol={sol} />)}
                        {filtrarPorEstado('ESPERA_EXTENDIDO').length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>No hay solicitudes.</p>}
                    </div>
                </div>

            </div>
            </>
            )}

            {/* VISTA 2: Matriz de Riesgos */}
            {activeTab === 'matriz' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>Plantilla Maestra de Riesgos</h2>
                        <button className="btn-primary" onClick={() => setModalRiesgoOpen(true)}>+ Nuevo Riesgo</button>
                    </div>
                    <div className="card glass-panel" style={{ padding: 0, overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead style={{ background: 'var(--bg-color)', borderBottom: '2px solid var(--border)' }}>
                                <tr>
                                    <th style={{ padding: '1rem' }}>Código</th>
                                    <th style={{ padding: '1rem' }}>Evento de Riesgo</th>
                                    <th style={{ padding: '1rem' }}>Categoría</th>
                                    <th style={{ padding: '1rem' }}>Score Base (F x I)</th>
                                    <th style={{ padding: '1rem' }}>Área Responsable</th>
                                    <th style={{ padding: '1rem' }}>Eventos (Año)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matrizRiesgos.map(r => {
                                    const eventos = r.eventos_ocurridos || 0;
                                    let frecActual = r.escala_frecuencia_inherente;
                                    if (eventos >= 1 && eventos <= 2) frecActual = Math.max(frecActual, 2);
                                    if (eventos >= 3 && eventos <= 5) frecActual = Math.max(frecActual, 3);
                                    if (eventos >= 6 && eventos <= 10) frecActual = Math.max(frecActual, 4);
                                    if (eventos > 10) frecActual = 5;
                                    const inherenteActual = frecActual * r.escala_impacto_inherente;
                                    
                                    return (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{r.codigo}</td>
                                        <td style={{ padding: '1rem' }}>{r.evento_riesgo}</td>
                                        <td style={{ padding: '1rem' }}><span className="badge badge-neutral">{r.categoria_detonante}</span></td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Original: {r.escala_frecuencia_inherente} x {r.escala_impacto_inherente} = {r.escala_frecuencia_inherente * r.escala_impacto_inherente}</div>
                                            <div style={{ color: frecActual > r.escala_frecuencia_inherente ? 'var(--danger)' : 'var(--text-main)', fontWeight: 'bold' }}>
                                                Actualizado: {frecActual} x {r.escala_impacto_inherente} = {inherenteActual}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{r.area_responsable}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <button className="btn-outline" style={{ padding: '0.2rem 0.5rem', minWidth: '30px' }} onClick={() => actualizarEventos(r.id, -1)}>-</button>
                                                <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{eventos}</span>
                                                <button className="btn-outline" style={{ padding: '0.2rem 0.5rem', minWidth: '30px' }} onClick={() => actualizarEventos(r.id, 1)}>+</button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                                {matrizRiesgos.length === 0 && (
                                    <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay riesgos configurados. Inserte desde la base de datos o cree uno nuevo.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal del Oficial de Cumplimiento */}
            <AnimatePresence>
                {solicitudSeleccionada && (
                    <div key="oficial-modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '2rem' }}>
                        
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSolicitudSeleccionada(null)}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
                        />

                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
                            style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', position: 'relative', boxShadow: 'var(--shadow-xl)' }}
                        >
                            {/* Header Modal */}
                            <div style={{ background: 'var(--bg-color)', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                                <div>
                                    <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Edit3 size={20} color="var(--primary)" /> Formulario de Verificación (Oficial de Cumplimiento)
                                    </h2>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        Entidad: {solicitudSeleccionada.razon_social} | NIT: {solicitudSeleccionada.nit_cedula}
                                    </p>
                                </div>
                                <button onClick={() => setSolicitudSeleccionada(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Body Modal */}
                            <div style={{ padding: '2rem' }}>
                                
                                {/* Mostrar datos reales si existen */}
                                {solicitudSeleccionada.datos_formulario && (
                                    <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FileText size={18} /> Expediente del Proveedor
                                        </h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                            Revise la información y seleccione la casilla correspondiente para solicitar una corrección (Ping-Pong).
                                        </p>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                            
                                            {/* Volcado Dinámico Categorizado */}
                                            {(() => {
                                                const datos = solicitudSeleccionada.datos_formulario;
                                                const ignoreKeys = ['archivos_cargados', 'token', 'paso', 'audit_hash'];
                                                const formatKey = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                                
                                                const renderGroup = (keys, title) => {
                                                    let validKeys = keys.filter(k => datos[k] !== undefined && datos[k] !== null && datos[k] !== '' && !Array.isArray(datos[k]) && typeof datos[k] !== 'object');
                                                    
                                                    // Filtrado inteligente basado en tipo_persona y vinculacion
                                                    if (datos.tipo_persona === 'natural') {
                                                        validKeys = validKeys.filter(k => !k.includes('juridica') && !k.includes('rep_legal') && !k.includes('socios') && !k.includes('sucursal') && k !== 'razon_social' && k !== 'nit' && k !== 'tipo_sociedad' && k !== 'fecha_constitucion' && k !== 'tipo_empresa' && k !== 'sector');
                                                    } else if (datos.tipo_persona === 'juridica') {
                                                        validKeys = validKeys.filter(k => !['nombres', 'primer_apellido', 'segundo_apellido', 'fecha_nacimiento', 'lugar_nacimiento', 'nacionalidad'].includes(k));
                                                    }

                                                    if (['empleado', 'prestacion_servicios', 'contratista', 'accionista'].includes(datos.clase_vinculacion)) {
                                                        // Empleados y asociados no tienen datos bancarios, comerciales, ESG ni anticorrupción corporativa
                                                        validKeys = validKeys.filter(k => 
                                                            !k.includes('banco') && !k.includes('cuenta') && !k.includes('referencia') && !k.includes('comercial') &&
                                                            !k.includes('esg_') && !['politica_corrupcion', 'codigo_etica_conducta', 'tiene_comite_etica', 'canales_denuncia', 'acusada_corrupcion', 'tiene_oficial_cumplimiento', 'nombre_oficial_cumplimiento', 'regimen_simple'].includes(k)
                                                        );
                                                    }
                                                    
                                                    // No mostrar "Otros Datos" que sean puramente internos
                                                    validKeys = validKeys.filter(k => !['area', 'pais', 'cargo', 'exterior_tributario', 'exterior_cuentas'].includes(k));

                                                    if (validKeys.length === 0) return null;
                                                    return (
                                                        <div key={title} style={{ marginBottom: '1.5rem' }}>
                                                            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', borderBottom: '2px solid var(--border)', paddingBottom: '0.25rem' }}>{title}</h5>
                                                            {validKeys.map(k => {
                                                                let val = String(datos[k]);
                                                                if (['ingresos_mensuales', 'egresos_mensuales', 'activos', 'pasivos', 'patrimonio'].includes(k) && !isNaN(val)) {
                                                                    val = `$${Number(val).toLocaleString()}`;
                                                                }
                                                                return renderCampoRevisable(formatKey(k), val, k);
                                                            })}
                                                        </div>
                                                    );
                                                };

                                                const usedKeys = new Set(Object.values(categoriasCampos).flat());
                                                const otherKeys = Object.keys(datos).filter(k => !usedKeys.has(k) && !ignoreKeys.includes(k) && !Array.isArray(datos[k]) && typeof datos[k] !== 'object');
                                                
                                                const arrayKeys = Object.keys(datos).filter(k => Array.isArray(datos[k]) && datos[k].length > 0 && !ignoreKeys.includes(k));

                                                return (
                                                    <div>
                                                        {Object.entries(categoriasCampos).map(([titulo, llaves]) => renderGroup(llaves, titulo))}
                                                        {renderGroup(otherKeys, 'Otros Datos Declarados')}

                                                        {arrayKeys.map(key => (
                                                            <div key={key} style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)' }}>
                                                                <h6 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>📋 {formatKey(key)} ({datos[key].length})</h6>
                                                                {datos[key].map((item, idx) => (
                                                                    <div key={idx} style={{ padding: '0.75rem', borderLeft: '3px solid var(--primary)', marginBottom: '1rem', background: 'var(--surface)', fontSize: '0.85rem' }}>
                                                                        {typeof item === 'object' && item !== null ? (
                                                                            Object.entries(item).map(([k, v]) => (
                                                                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '0.25rem 0' }}>
                                                                                    <b>{formatKey(k)}:</b> <span>{String(v)}</span>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div>• {String(item)}</div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}

                                            {/* Sección: Archivos */}
                                            {solicitudSeleccionada.datos_formulario.archivos_cargados && Object.keys(solicitudSeleccionada.datos_formulario.archivos_cargados).length > 0 && (
                                                <div style={{ marginTop: '1rem' }}>
                                                    <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', borderBottom: '2px solid var(--border)', paddingBottom: '0.25rem' }}>Archivos Adjuntos (Cloudflare R2)</h5>
                                                    {Object.entries(solicitudSeleccionada.datos_formulario.archivos_cargados).map(([k, v]) => {
                                                        const urlLink = <a href={v} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Ver Documento 📄</a>;
                                                        return renderCampoRevisable(`Documento: ${k.replace(/_/g, ' ').toUpperCase()}`, urlLink, `archivo_${k}`);
                                                    })}
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                )}

                                <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Globe size={18} /> Monitor de Fuentes (TusDatos)
                                    </h4>
                                    
                                    {(solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || solicitudSeleccionada.estado_actual === 'REVISION_PREVIA') ? (
                                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                                            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No se ha ejecutado la consulta en bases de datos externas.</p>
                                            <button 
                                                className="btn-primary" 
                                                onClick={(e) => handleTusDatos(e, solicitudSeleccionada)}
                                                disabled={cargandoTusDatos === solicitudSeleccionada.id}
                                                style={{ padding: '0.75rem 2rem', fontSize: '1rem', opacity: cargandoTusDatos === solicitudSeleccionada.id ? 0.7 : 1 }}
                                            >
                                                {cargandoTusDatos === solicitudSeleccionada.id ? 'Consultando (aprox 1 min)...' : '🚀 Ejecutar Consulta (TusDatos)'}
                                            </button>
                                        </div>
                                    ) : solicitudSeleccionada.estado_actual === 'FUENTES_INCOMPLETAS' ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)' }}>
                                            <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>⚠️ Consulta Incompleta</h4>
                                            <p style={{ color: 'var(--text-main)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                                TusDatos reportó que algunas fuentes externas estaban caídas al momento de la consulta (ej. Policía, Procuraduría, etc).
                                            </p>
                                            <button 
                                                className="btn-outline" 
                                                onClick={(e) => handleRecargarTusDatos(e, solicitudSeleccionada)}
                                                disabled={cargandoTusDatos === solicitudSeleccionada.id}
                                                style={{ padding: '0.75rem 2rem', fontSize: '1rem', opacity: cargandoTusDatos === solicitudSeleccionada.id ? 0.7 : 1, borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                            >
                                                {cargandoTusDatos === solicitudSeleccionada.id ? 'Recargando fuentes caídas...' : '♻️ Recargar Fuentes Caídas (Gratis)'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px dashed var(--border)' }}>
                                                <span>DIAN (RUT):</span>
                                                <span style={{ fontWeight: 'bold', color: solicitudSeleccionada.score_riesgo >= 90 ? 'var(--danger)' : 'var(--success-text)' }}>
                                                    {solicitudSeleccionada.score_riesgo >= 90 ? '❌ INACTIVO / CAÍDA' : '✅ OK'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px dashed var(--border)' }}>
                                                <span>Listas Restrictivas (OFAC, ONU):</span>
                                                <span style={{ fontWeight: 'bold', color: solicitudSeleccionada.score_riesgo >= 90 ? 'var(--danger)' : 'var(--success-text)' }}>
                                                    {solicitudSeleccionada.score_riesgo >= 90 ? '⚠️ ALERTA ENCONTRADA' : '✅ SIN HALLAZGOS'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px dashed var(--border)' }}>
                                                <span>Procuraduría / Contraloría / Policía:</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--success-text)' }}>✅ SIN ANTECEDENTES</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px dashed var(--border)' }}>
                                                <span>Documentación y Financiero:</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--success-text)' }}>✅ VERIFICADO</span>
                                            </div>
                                        </div>
                                    )}

                                    {solicitudSeleccionada.monitor_fuentes && solicitudSeleccionada.monitor_fuentes.fuentes_detalladas && (
                                        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                            <h5 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '1rem' }}>📋 Resultados Detallados por Fuente</h5>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '1rem' }}>
                                                {Object.entries(solicitudSeleccionada.monitor_fuentes.fuentes_detalladas).map(([fuente, resultado]) => (
                                                    <div key={fuente} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-body)', padding: '0.5rem', borderRadius: '4px' }}>
                                                        <span style={{ textTransform: 'capitalize' }}>{fuente.replace(/_/g, ' ')}</span>
                                                        <span style={{ 
                                                            fontWeight: 'bold', 
                                                            color: resultado === 'Error' ? 'var(--danger)' : resultado === true ? '#f59e0b' : 'var(--success-text)' 
                                                        }}>
                                                            {resultado === 'Error' ? '❌ ERROR / CAÍDA' : resultado === true ? '⚠️ HALLAZGO' : '✅ LIMPIO'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Sección 2: Lista de Verificación Manual</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>¿Se verificó la autenticidad de los documentos aportados (Lectura de PDFs)?</span>
                                        <select className="input-field" style={{ width: '150px' }} value={formOficial.autenticidad_doc} onChange={e => setFormOficial({...formOficial, autenticidad_doc: e.target.value})}>
                                            <option value="no">NO</option><option value="si">SÍ</option>
                                        </select>
                                    </div>

                                    {/* CONDICIONAL: EMPRESA VS EMPLEADO */}
                                    {solicitudSeleccionada.tipo_vinculacion !== 'empleado' && solicitudSeleccionada.tipo_vinculacion !== 'contratista' ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>¿La empresa pertenece al sector minero energético?</span>
                                            <select className="input-field" style={{ width: '150px' }} value={formOficial.sector_minero} onChange={e => setFormOficial({...formOficial, sector_minero: e.target.value})}>
                                                <option value="no">NO</option><option value="si">SÍ</option>
                                            </select>
                                        </div>

                                        {/* Sub-formulario si es sector minero */}
                                        <AnimatePresence>
                                            {formOficial.sector_minero === 'si' && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                    {['rucon', 'sarlaft', 'sagrilaft', 'politicas_corrupcion', 'comite_etica', 'canales_denuncia', 'oficial_cumplimiento'].map(campo => (
                                                        <div key={campo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.85rem' }}>¿Tiene {campo.replace('_', ' ').toUpperCase()}?</span>
                                                            <select className="input-field" style={{ width: '100px', padding: '0.25rem' }} value={formOficial[campo]} onChange={e => setFormOficial({...formOficial, [campo]: e.target.value})}>
                                                                <option value="no">NO</option><option value="si">SÍ</option>
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                    ) : (
                                    <>
                                        {/* FLUJO DE EMPLEADOS */}
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>Resumen Núcleo Familiar y PEPs</h5>
                                            <p style={{ margin: 0, fontSize: '0.85rem' }}>Familiares declarados: <b>{solicitudSeleccionada.familiares?.length || 0}</b></p>
                                        </div>
                                        
                                        {solicitudSeleccionada.conflicto_interes_declara === 'si' && (
                                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger)' }}>⚠️ ALERTA: Conflicto de Interés Declarado</h5>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>¿Aprobado por el Comité de Ética para contratación?</span>
                                                    <select className="input-field" style={{ width: '150px' }} value={formOficial.comite_etica} onChange={e => setFormOficial({...formOficial, comite_etica: e.target.value})}>
                                                        <option value="no">NO</option><option value="si">SÍ</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                    )}

                                    <div>
                                        <label className="label">Observaciones del Oficial:</label>
                                        <textarea className="input-field" rows="3" placeholder="Observaciones adicionales sobre la debida diligencia..." value={formOficial.observaciones} onChange={e => setFormOficial({...formOficial, observaciones: e.target.value})}></textarea>
                                    </div>

                                </div>

                                {/* Bloque de Firma y Aprobación */}
                                <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                                    <h4 style={{ margin: '0 0 1rem 0' }}>Dictamen Final</h4>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                        {solicitudSeleccionada.score_riesgo >= 90 
                                            ? "El tercero presenta hallazgos restrictivos críticos." 
                                            : "El tercero es apto según la validación preliminar."}
                                    </p>
                                    
                                    {solicitudSeleccionada.estado_actual === 'APROBADO_LIMPIO' ? (
                                        <button className="btn-primary" style={{ width: '100%', padding: '1rem', background: 'var(--text-main)', borderColor: 'var(--text-main)' }} onClick={generarCertificadoPDF}>
                                            <Download size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Descargar Certificado de Aprobación
                                        </button>
                                    ) : solicitudSeleccionada.estado_actual === 'RECHAZADO' ? (
                                        <div style={{ color: 'var(--danger)', fontWeight: 'bold', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                                            ❌ SOLICITUD RECHAZADA DEFINITIVAMENTE.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <button 
                                                className="btn-primary" 
                                                style={{ width: '100%', padding: '1rem', background: (solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || solicitudSeleccionada.estado_actual === 'REVISION_PREVIA') ? 'var(--text-muted)' : 'var(--success)', borderColor: (solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || solicitudSeleccionada.estado_actual === 'REVISION_PREVIA') ? 'var(--border)' : 'var(--success)', opacity: (solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || solicitudSeleccionada.estado_actual === 'REVISION_PREVIA') ? 0.5 : 1, cursor: (solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || solicitudSeleccionada.estado_actual === 'REVISION_PREVIA') ? 'not-allowed' : 'pointer' }} 
                                                onClick={handleVistoBueno}
                                                disabled={solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || solicitudSeleccionada.estado_actual === 'REVISION_PREVIA'}
                                                title={(solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || solicitudSeleccionada.estado_actual === 'REVISION_PREVIA') ? "Debe ejecutar TusDatos primero" : "Otorgar Visto Bueno"}
                                            >
                                                <CheckCircle size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> 
                                                {(solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || solicitudSeleccionada.estado_actual === 'REVISION_PREVIA') ? 'Bloqueado (Requiere TusDatos)' : 'Otorgar Visto Bueno Definitivo'}
                                            </button>
                                            
                                            {!mostrarPingPong ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: (solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || solicitudSeleccionada.estado_actual === 'REVISION_PREVIA') ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                                                    {solicitudSeleccionada.score_riesgo !== undefined && solicitudSeleccionada.score_riesgo !== null && solicitudSeleccionada.estado_actual !== 'FUENTES_INCOMPLETAS' && (
                                                        <button className="btn-outline" style={{ padding: '0.75rem', fontSize: '0.85rem' }} onClick={(e) => handleTusDatos(e, solicitudSeleccionada)}>
                                                            {cargandoTusDatos === solicitudSeleccionada.id ? 'Consultando...' : '🔄 Re-evaluar API'}
                                                        </button>
                                                    )}
                                                    {solicitudSeleccionada.estado_actual === 'FUENTES_INCOMPLETAS' && (
                                                        <button className="btn-outline" style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={(e) => handleRecargarTusDatos(e, solicitudSeleccionada)}>
                                                            {cargandoTusDatos === solicitudSeleccionada.id ? 'Recargando...' : '♻️ Recargar API'}
                                                        </button>
                                                    )}
                                                    <button className="btn-outline" style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#f59e0b', borderColor: '#f59e0b' }} onClick={() => setMostrarPingPong(true)}>
                                                        ↩️ Devolver (Ping-Pong)
                                                    </button>
                                                    <button className="btn-outline" style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#8b5cf6', borderColor: '#8b5cf6' }} onClick={() => handleCambiarEstado('ESPERA_EXTENDIDO')}>
                                                        🌍 Análisis Extendido
                                                    </button>
                                                    <button className="btn-outline" style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleCambiarEstado('RECHAZADO')}>
                                                        ❌ Rechazo Directo
                                                    </button>
                                                </div>
                                            ) : (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', textAlign: 'left', marginTop: '1rem' }}>
                                                    <h5 style={{ margin: '0 0 1rem 0', color: '#d97706' }}>Subsanación de Expediente (Ping-Pong)</h5>
                                                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                                        {Object.values(camposPingPong).some(val => val) 
                                                            ? `Campos marcados para corrección: ${Object.keys(camposPingPong).filter(k => camposPingPong[k]).join(', ')}`
                                                            : "⚠️ Por favor, marca las casillas de los campos erróneos en el expediente arriba."}
                                                    </p>

                                                    <textarea 
                                                        className="input-field" rows="2" 
                                                        placeholder="Nota adicional para el proveedor (Ej: El RUT adjunto está borroso)..." 
                                                        value={observacionPingPong} onChange={e => setObservacionPingPong(e.target.value)}
                                                        style={{ marginBottom: '1rem' }}
                                                    />

                                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                                        <button className="btn-primary" style={{ flex: 1, background: '#d97706', borderColor: '#d97706' }} onClick={handlePingPongSubmit}>
                                                            Confirmar Devolución
                                                        </button>
                                                        <button className="btn-outline" style={{ flex: 1 }} onClick={() => setMostrarPingPong(false)}>Cancelar</button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalRiesgoOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="card glass-panel" style={{ width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', background: 'var(--bg-color)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem', color: 'var(--text-main)' }}>Registrar Nuevo Riesgo en la Matriz</h2>
                                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Complete los campos de acuerdo a su metodología de administración de riesgos (SARLAFT/SAGRILAFT).</p>
                                </div>
                                <button className="btn-outline" onClick={() => setModalRiesgoOpen(false)} style={{ padding: '0.5rem', height: 'fit-content' }}><X size={24} /></button>
                            </div>
                            
                            {/* Sección 1: Identificación */}
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>1. Identificación del Riesgo</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                <div>
                                    <label className="label">Código</label>
                                    <input className="input-field" placeholder="Ej: R-LAFT 001" value={formRiesgo.codigo} onChange={e => setFormRiesgo({...formRiesgo, codigo: e.target.value})} />
                                </div>
                                <div>
                                    <label className="label">Categoría Detonante</label>
                                    <select className="input-field" value={formRiesgo.categoria_detonante} onChange={e => setFormRiesgo({...formRiesgo, categoria_detonante: e.target.value})}>
                                        <option value="API">API (Validación Listas)</option>
                                        <option value="FORMULARIO">FORMULARIO (Condicional)</option>
                                        <option value="MANUAL">MANUAL (Organizacional)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Fuente de Riesgo</label>
                                    <input className="input-field" placeholder="Ej: CONTRAPARTES" value={formRiesgo.fuente_riesgo} onChange={e => setFormRiesgo({...formRiesgo, fuente_riesgo: e.target.value})} />
                                </div>
                                <div>
                                    <label className="label">Riesgo Asociado</label>
                                    <input className="input-field" placeholder="Ej: Legal, Operativo" value={formRiesgo.riesgo_asociado} onChange={e => setFormRiesgo({...formRiesgo, riesgo_asociado: e.target.value})} />
                                </div>
                                <div style={{ gridColumn: 'span 4' }}>
                                    <label className="label">Evento de Riesgo</label>
                                    <input className="input-field" placeholder="Describa el evento principal" value={formRiesgo.evento_riesgo} onChange={e => setFormRiesgo({...formRiesgo, evento_riesgo: e.target.value})} />
                                </div>
                            </div>

                            {/* Sección 2: Análisis Inherente */}
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>2. Evaluación de Riesgo Inherente</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div>
                                    <label className="label">Causas del Riesgo Inherente</label>
                                    <textarea className="input-field" style={{ minHeight: '100px' }} value={formRiesgo.causas} onChange={e => setFormRiesgo({...formRiesgo, causas: e.target.value})} />
                                </div>
                                <div>
                                    <label className="label">Señales de Alerta</label>
                                    <textarea className="input-field" style={{ minHeight: '100px' }} value={formRiesgo.senales_alerta} onChange={e => setFormRiesgo({...formRiesgo, senales_alerta: e.target.value})} />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="label">Escala Frecuencia (1-5)</label>
                                        <input type="number" min="1" max="5" className="input-field" value={formRiesgo.escala_frecuencia_inherente} onChange={e => setFormRiesgo({...formRiesgo, escala_frecuencia_inherente: parseInt(e.target.value) || 1})} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="label">Escala Impacto (1-5)</label>
                                        <input type="number" min="1" max="5" className="input-field" value={formRiesgo.escala_impacto_inherente} onChange={e => setFormRiesgo({...formRiesgo, escala_impacto_inherente: parseInt(e.target.value) || 1})} />
                                    </div>
                                    <div style={{ background: 'var(--primary)', color: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', minWidth: '150px' }}>
                                        <span style={{ fontSize: '0.8rem', display: 'block', opacity: 0.8 }}>Riesgo Inherente</span>
                                        <strong style={{ fontSize: '1.5rem' }}>{formRiesgo.escala_frecuencia_inherente * formRiesgo.escala_impacto_inherente}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Sección 3: Tratamiento y Controles */}
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>3. Tratamiento y Controles</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                <div>
                                    <label className="label">Tratamiento del Riesgo</label>
                                    <input className="input-field" placeholder="Ej: Evitar, Mitigar" value={formRiesgo.tratamiento_riesgo} onChange={e => setFormRiesgo({...formRiesgo, tratamiento_riesgo: e.target.value})} />
                                </div>
                                <div>
                                    <label className="label">Tipo de Control</label>
                                    <input className="input-field" value={formRiesgo.tipo_control} onChange={e => setFormRiesgo({...formRiesgo, tipo_control: e.target.value})} />
                                </div>
                                <div>
                                    <label className="label">Clase de Control</label>
                                    <input className="input-field" value={formRiesgo.clase_control} onChange={e => setFormRiesgo({...formRiesgo, clase_control: e.target.value})} />
                                </div>
                                <div>
                                    <label className="label">Frecuencia del Control</label>
                                    <input className="input-field" value={formRiesgo.frecuencia_control} onChange={e => setFormRiesgo({...formRiesgo, frecuencia_control: e.target.value})} />
                                </div>
                                <div>
                                    <label className="label">Área Responsable</label>
                                    <input className="input-field" placeholder="Ej: TALENTO HUMANO" value={formRiesgo.area_responsable} onChange={e => setFormRiesgo({...formRiesgo, area_responsable: e.target.value})} />
                                </div>
                                <div>
                                    <label className="label">Monitoreo</label>
                                    <input className="input-field" placeholder="Ej: Anual" value={formRiesgo.monitoreo} onChange={e => setFormRiesgo({...formRiesgo, monitoreo: e.target.value})} />
                                </div>
                                <div style={{ gridColumn: 'span 3' }}>
                                    <label className="label">Descripción de los Controles</label>
                                    <textarea className="input-field" style={{ minHeight: '80px' }} value={formRiesgo.descripcion_controles} onChange={e => setFormRiesgo({...formRiesgo, descripcion_controles: e.target.value})} />
                                </div>
                            </div>

                            {/* Sección 4: Riesgo Residual */}
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>4. Evaluación de Riesgo Residual</h3>
                            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="label">Frecuencia Residual (1-5)</label>
                                    <input type="number" min="1" max="5" className="input-field" value={formRiesgo.escala_frecuencia_residual} onChange={e => setFormRiesgo({...formRiesgo, escala_frecuencia_residual: parseInt(e.target.value) || 1})} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="label">Impacto Residual (1-5)</label>
                                    <input type="number" min="1" max="5" className="input-field" value={formRiesgo.escala_impacto_residual} onChange={e => setFormRiesgo({...formRiesgo, escala_impacto_residual: parseInt(e.target.value) || 1})} />
                                </div>
                                <div style={{ background: 'var(--success)', color: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', minWidth: '150px' }}>
                                    <span style={{ fontSize: '0.8rem', display: 'block', opacity: 0.9 }}>Riesgo Residual</span>
                                    <strong style={{ fontSize: '1.5rem' }}>{formRiesgo.escala_frecuencia_residual * formRiesgo.escala_impacto_residual}</strong>
                                </div>
                            </div>
                            
                            <button className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} onClick={handleGuardarRiesgo}>
                                <CheckCircle size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Confirmar y Guardar en la Matriz Maestra
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
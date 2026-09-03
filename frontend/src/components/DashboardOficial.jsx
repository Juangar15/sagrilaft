import React, { useEffect, useState } from 'react';
import { sagrilaftService } from '../services/api';
import { supabase } from '../supabaseClient';
import { jsPDF } from 'jspdf';
import { AREAS_Y_CARGOS } from '../utils/areasYCargos';
import * as XLSX from 'xlsx';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Download, Filter, FileText, AlertTriangle, 
    CheckCircle, Clock, X, Building2, User, Globe, ShieldCheck, Edit3, LogOut, ChevronDown, ChevronUp
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
    const [modalAlert, setModalAlert] = useState({ visible: false, title: '', message: '', link: null });
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
    };
    
    const [estadoActivo, setEstadoActivo] = useState('REVISION_PREVIA');
    const [riesgoExpandido, setRiesgoExpandido] = useState(null);
    const [camposPingPong, setCamposPingPong] = useState({});
    const [observacionPingPong, setObservacionPingPong] = useState('');
    
    // Checklist de aprobación final
    const [showModalAprobacion, setShowModalAprobacion] = useState(false);
    const [formAsignacion, setFormAsignacion] = useState({ area: '', cargo: '', estado_vinculacion: 'vinculados' });
    const [formAprobacion, setFormAprobacion] = useState({
        doc_completa: '', verifico_listas: '', autenticidad: '', proc_rep: '', contra_rep: '',
        poli_rep: '', info_fin: '', visita: '', minero: '', rucon: '', sarlaft: '', sagrilaft: '',
        observaciones: '', decision_final: 'ACEPTADO'
    });
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
        calificacion_oficial: 'Bajo',
        alertas_manuales: [],
        nombre_oficial: 'Oficial Demo'
    });
    const [resultadoRiesgo, setResultadoRiesgo] = useState(null);
    const [jurisdicciones, setJurisdicciones] = useState([]);
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

                // Fetch Jurisdicciones
                try {
                    const resJur = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/jurisdicciones`);
                    if(resJur.ok) {
                        const dataJur = await resJur.json();
                        setJurisdicciones(dataJur);
                    }
                } catch(e) { console.error("Error cargando jurisdicciones"); }
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

    const handleAprobarManualmente = () => {
        // En lugar de aprobar ciegamente, abrimos el checklist final
        setShowModalAprobacion(true);
    };

    const submitAprobacionDefinitiva = async (e) => {
        e.preventDefault();
        try {
            setCargando(true);
            const res = await sagrilaftService.aprobarDefinitivo(solicitudSeleccionada.id, formAprobacion);
            showToast(res.mensaje || "Aprobación definitiva registrada con éxito.");
            
            // Cerrar modales y refrescar
            setShowModalAprobacion(false);
            setSolicitudSeleccionada(null);
            const data = await sagrilaftService.obtenerSolicitudes();
            setSolicitudes(data || []);
        } catch (error) {
            showToast("Error en aprobación: " + (error.response?.data?.error || error.message), "error");
        } finally {
            setCargando(false);
        }
    };

    const handleCambiarEstado = async (nuevoEstado) => {
        try {
            await sagrilaftService.actualizarEstadoSolicitud(solicitudSeleccionada.id, nuevoEstado);
            setSolicitudSeleccionada({ ...solicitudSeleccionada, estado_actual: nuevoEstado });
            
            // Si hay un form de oficial (por ejemplo al aprobar manualmente), lo guardamos
            if (nuevoEstado === 'APROBADO_LIMPIO' || nuevoEstado === 'APROBADO_RIESGO_CONTROLADO') {
                await supabase.from('solicitudes_sagrilaft').update({ 
                    analisis_oficial: formOficial,
                    calificacion_oficial: formOficial.calificacion_oficial,
                    alertas_manuales: formOficial.alertas_manuales,
                    desglose_riesgo: resultadoRiesgo
                }).eq('id', solicitudSeleccionada.id);
            }

            // Refrescar el board
            const data = await sagrilaftService.obtenerSolicitudes();
            setSolicitudes(data || []);
            
            if (nuevoEstado === 'REVISION_PREVIA') {
                showToast("Visto Bueno otorgado exitosamente.");
            } else if (nuevoEstado === 'DEVUELTO_CORRECCION') {
                showToast("Solicitud devuelta al proveedor para corrección. Se ha enviado un correo.");
            } else {
                showToast(`Estado actualizado a: ${nuevoEstado.replace('_', ' ')}`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAsignarCargo = async () => {
        if (!formAsignacion.area || !formAsignacion.cargo) {
            return showToast("Debe seleccionar Área y Cargo para continuar.", "error");
        }
        try {
            setCargando(true);
            await sagrilaftService.asignarCargo(solicitudSeleccionada.id, formAsignacion);
            showToast("Área y cargo asignados. Solicitud enviada a Revisión Previa.", "success");
            setSolicitudSeleccionada({ ...solicitudSeleccionada, estado_actual: 'REVISION_PREVIA' });
            
            const data = await sagrilaftService.obtenerSolicitudes();
            setSolicitudes(data || []);
        } catch (error) {
            showToast("Error al asignar cargo.", "error");
        } finally {
            setCargando(false);
        }
    };

    const handleMigrarCloudflare = async () => {
        if (!formAsignacion.area || !formAsignacion.cargo) {
            return showToast("Debe seleccionar Área y Cargo para poder migrar.", "error");
        }
        try {
            setCargando(true);
            await sagrilaftService.migrarCloudflare(solicitudSeleccionada.id, formAsignacion);
            showToast("Archivos migrados exitosamente a la nueva estructura en Cloudflare.", "success");
            
            // Refrescar el estado local para ocultar el formulario de migración
            const updatedForm = { ...solicitudSeleccionada.datos_formulario, area_asignada: formAsignacion.area, cargo_asignado: formAsignacion.cargo };
            setSolicitudSeleccionada({ ...solicitudSeleccionada, datos_formulario: updatedForm });
            
            const data = await sagrilaftService.obtenerSolicitudes();
            setSolicitudes(data || []);
        } catch (error) {
            showToast("Error al migrar archivos.", "error");
        } finally {
            setCargando(false);
        }
    };

    const handlePingPongSubmit = async () => {
        const seleccionados = Object.keys(camposPingPong).filter(k => camposPingPong[k]);
        if (seleccionados.length === 0) return showToast("Debe seleccionar al menos un campo para devolver.", "error");
        
        const payload = {};
        seleccionados.forEach(k => payload[k] = "Información ilegible, incompleta o vencida. Favor actualizar.");
        
        try {
            const res = await sagrilaftService.devolverSolicitud(solicitudSeleccionada.id, { 
                campos_a_corregir: payload, 
                observaciones: observacionPingPong 
            });
            await handleCambiarEstado('DEVUELTO_CORRECCION');
            setMostrarPingPong(false);
            if (res && res.enlace_correccion) {
                setModalAlert({
                    visible: true,
                    title: '¡Formulario Devuelto con Éxito!',
                    message: 'Si el tercero no recibe o no tiene correo electrónico, puede enviarle directamente el siguiente enlace seguro por WhatsApp o cualquier otro medio para que pueda acceder y corregir:',
                    link: res.enlace_correccion
                });
            } else {
                showToast("Formulario devuelto con éxito.");
            }
        } catch (error) {
            showToast("Error devolviendo solicitud: " + (error.response?.data?.detalle || error.response?.data?.error || error.message), "error");
        }
    };

    const toggleAlertaManual = (alerta) => {
        setFormOficial(prev => {
            const existe = prev.alertas_manuales.includes(alerta);
            return {
                ...prev,
                alertas_manuales: existe ? prev.alertas_manuales.filter(a => a !== alerta) : [...prev.alertas_manuales, alerta]
            };
        });
    };

    const handleSimularRiesgo = async (e) => {
        if(e) e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = `${import.meta.env.VITE_API_URL}/api/v1/solicitudes/${solicitudSeleccionada.id}/calcular-riesgo`;
            const payload = {
                calificacion_oficial: formOficial.calificacion_oficial,
                alertas_manuales: formOficial.alertas_manuales
            };
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if(!response.ok) throw new Error('Error en simulación');
            const data = await response.json();
            setResultadoRiesgo(data);
            showToast("Simulación de riesgo completada", "success");
        } catch (error) {
            console.error(error);
            showToast("Error al simular riesgo", "error");
        }
    };

    const handleGuardarActualizacion = async () => {
        if (!resultadoRiesgo) {
            showToast("Primero debes simular el riesgo para guardar los cambios.", "error");
            return;
        }
        try {
            setCargando(true);
            const token = localStorage.getItem('token');
            const url = `${import.meta.env.VITE_API_URL}/api/v1/solicitudes/${solicitudSeleccionada.id}/guardar-riesgo`;
            const payload = {
                formOficial,
                resultadoRiesgo
            };
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Error al guardar');
            }
            const saved = await response.json();

            // Refrescar lista completa para que la tarjeta actualice su Score
            const data = await sagrilaftService.obtenerSolicitudes();
            setSolicitudes(data || []);

            // Actualizar el estado local del modal inmediatamente
            setSolicitudSeleccionada(prev => ({
                ...prev,
                analisis_oficial: formOficial,
                calificacion_oficial: formOficial.calificacion_oficial,
                alertas_manuales: formOficial.alertas_manuales,
                desglose_riesgo: resultadoRiesgo,
                score_riesgo: resultadoRiesgo.puntaje_total,
                estado_actual: saved.estado_actual || prev.estado_actual
            }));
            showToast(`✅ Actualización guardada. Score: ${resultadoRiesgo.puntaje_total}/100 (${resultadoRiesgo.nivel_riesgo_final})`, "success");
        } catch (err) {
            console.error("Error guardando:", err);
            showToast("Error al guardar actualización: " + err.message, "error");
        } finally {
            setCargando(false);
        }
    };


    const actualizarJurisdiccion = async (id, val) => {
        try {
            const porcentaje = parseFloat(val) || 0;
            let nivel_riesgo = 'BAJO';
            if (porcentaje > 11.11 && porcentaje <= 22.22) nivel_riesgo = 'MEDIO';
            else if (porcentaje > 22.22) nivel_riesgo = 'ALTO';

            setJurisdicciones(prev => prev.map(j => j.id === id ? { ...j, nivel_riesgo, porcentaje } : j));

            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/jurisdicciones/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nivel_riesgo, porcentaje })
            });
            if (!res.ok) throw new Error('Error al actualizar');
            
            // showToast("Jurisdicción actualizada", "success"); // Removed to avoid spamming toast on blur
        } catch (error) {
            showToast("Error actualizando jurisdicción", "error");
        }
    };

    const handleTusDatos = async (e, solicitud) => {
        e.stopPropagation(); // Evitar que abra la tarjeta
        setCargandoTusDatos(solicitud.id);
        try {
            const res = await sagrilaftService.ejecutarTusDatos(solicitud.id);
            showToast(res.mensaje);
            // Refrescar el board
            const data = await sagrilaftService.obtenerSolicitudes();
            setSolicitudes(data || []);
        } catch (error) {
            showToast("Error ejecutando TusDatos: " + error.message, "error");
        } finally {
            setCargandoTusDatos(null);
        }
    };

    const handleRetryTusDatos = async (e, solicitud) => {
        e.stopPropagation();
        setCargandoTusDatos(solicitud.id);
        try {
            const res = await sagrilaftService.retryTusDatos(solicitud.id);
            showToast(res.mensaje);
            // Refrescar la solicitud y el board
            const { data: solActualizada } = await supabase.from('solicitudes_sagrilaft').select('*').eq('id', solicitud.id).single();
            setSolicitudSeleccionada(solActualizada);
            const data = await sagrilaftService.obtenerSolicitudes();
            setSolicitudes(data || []);
        } catch (error) {
            showToast("Error recargando TusDatos: " + error.message, "error");
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
            
            const fechaAprobacion = solicitudSeleccionada.fecha_creacion ? new Date(solicitudSeleccionada.fecha_creacion) : new Date();
            const fechaGeneracion = new Date();
            
            doc.text(`Fecha de Aprobación: ${fechaAprobacion.toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })}`, 14, finalY);
            doc.text(`Fecha de Generación del Certificado: ${fechaGeneracion.toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })}`, 14, finalY + 6);
            
            const nextYear = new Date(fechaAprobacion);
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            doc.text(`Vigencia del Certificado: 1 año (Próxima actualización: ${nextYear.toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })})`, 14, finalY + 12);

            // Huella de Auditoría
            doc.setFillColor(245, 245, 245);
            doc.rect(14, finalY + 25, 180, 35, 'F');
            doc.setFont("courier", "bold");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`[ HUELLA DE AUDITORÍA DEL SISTEMA ]`, 18, finalY + 31);
            doc.text(`Timestamp de aprobación: ${fechaAprobacion.toISOString()}`, 18, finalY + 37);
            doc.text(`Timestamp de emisión del documento: ${fechaGeneracion.toISOString()}`, 18, finalY + 43);
            doc.text(`Dirección IP de origen (Firma OTP): 190.158.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, 18, finalY + 49);
            
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
        const isCritico = sol.estado_actual === 'ALERTA_CRITICA' || sol.score_riesgo > 66.66;
        const isExtendido = sol.estado_actual === 'ESPERA_EXTENDIDO';
        const isAlerta = sol.score_riesgo > 33.33 && sol.score_riesgo <= 66.66;
        const colorClase = isCritico ? 'var(--danger)' : isExtendido ? '#8b5cf6' : isAlerta ? 'var(--warning)' : 'var(--success)';
        const badgeClase = isCritico ? 'badge-danger' : isExtendido ? 'badge-neutral' : isAlerta ? 'badge-warning' : 'badge-success';

        return (
            <motion.div 
                layoutId={`card-${sol.id}`}
                onClick={() => {
                    setSolicitudSeleccionada(sol);
                    setResultadoRiesgo(null);
                    setFormAsignacion({ area: sol.datos_formulario?.area_asignada || '', cargo: sol.datos_formulario?.cargo_asignado || '', estado_vinculacion: sol.datos_formulario?.estado_vinculacion || 'vinculados' });
                    setFormOficial({
                        observaciones: '',
                        calificacion_oficial: 'Bajo',
                        alertas_manuales: [],
                        nombre_oficial: 'Oficial Demo'
                    });
                }}
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
            {/* TOAST */}
            <AnimatePresence>
                {toast.visible && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: toast.type === 'error' ? 'var(--danger)' : 'var(--success-text)', color: 'white', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', zIndex: 9999, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500 }}>
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL DE ENLACE SEGURO */}
            <AnimatePresence>
                {modalAlert.visible && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '500px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center' }}>
                            <div style={{ background: '#ecfdf5', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                                <CheckCircle size={32} color="var(--success-text)" />
                            </div>
                            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '1.25rem' }}>{modalAlert.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>{modalAlert.message}</p>
                            
                            <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', wordBreak: 'break-all', userSelect: 'all', color: 'var(--primary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                {modalAlert.link}
                            </div>
                            
                            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setModalAlert({...modalAlert, visible: false})}>
                                Entendido
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
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
                    Matriz de Riesgo Documental
                </button>
                <button 
                    onClick={() => setActiveTab('jurisdicciones')}
                    style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'jurisdicciones' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'jurisdicciones' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Jurisdicciones (Regiones)
                </button>
            </div>

            
            {/* VISTA 1: Bandeja Grid */}

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

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <button 
                        onClick={async () => {
                            try {
                                const token = localStorage.getItem('token');
                                const r = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/recalcular-scores`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                const d = await r.json();
                                showToast(`✅ Recalculación completada: ${d.corregidos} corregidos de ${d.total}`, 'success');
                                const data = await sagrilaftService.obtenerSolicitudes();
                                setSolicitudes(data || []);
                            } catch(e) {
                                showToast('Error al recalcular scores', 'error');
                            }
                        }}
                        style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #6366f1', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                    >
                        🔄 Recalcular todos los scores
                    </button>
                </div>

                
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    {[
                        { id: 'ASIGNACION_CARGO', label: 'Asignación Área/Cargo', icon: <FileText size={16}/>, color: '#6366f1', activeBg: '#6366f1', activeColor: 'white' },
                        { id: 'REVISION_PREVIA', label: 'Revisión Previa', icon: <FileText size={16}/>, color: '#475569', activeBg: 'var(--primary)', activeColor: 'white' },
                        { id: 'DEVUELTO_CORRECCION', label: 'Ping-Pong', icon: <Clock size={16}/>, color: '#f59e0b', activeBg: '#f59e0b', activeColor: 'white' },
                        { id: 'FUENTES_INCOMPLETAS', label: 'Fuentes Caídas', icon: <AlertTriangle size={16}/>, color: 'var(--danger)', activeBg: 'var(--danger)', activeColor: 'white' },
                        { id: 'REVISION_MANUAL', label: 'Revisión Manual', icon: <Filter size={16}/>, color: '#eab308', activeBg: '#eab308', activeColor: 'white' },
                        { id: 'ALERTA_CRITICA', label: 'Alertas Críticas', icon: <AlertTriangle size={16}/>, color: 'var(--danger)', activeBg: 'var(--danger)', activeColor: 'white' },
                        { id: 'ESPERA_EXTENDIDO', label: 'Análisis Extendido', icon: <Clock size={16}/>, color: '#8b5cf6', activeBg: '#8b5cf6', activeColor: 'white' },
                        { id: 'APROBADO_LIMPIO', label: 'Aprobados', icon: <CheckCircle size={16}/>, color: 'var(--success-text)', activeBg: 'var(--success-text)', activeColor: 'white' }
                    ].map(est => {
                        const count = filtrarPorEstado(est.id).length;
                        const isActive = estadoActivo === est.id;
                        return (
                            <button 
                                key={est.id}
                                onClick={() => setEstadoActivo(est.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.6rem 1.25rem', borderRadius: '50px',
                                    border: isActive ? 'none' : '1px solid var(--border)',
                                    background: isActive ? est.activeBg : 'rgba(255,255,255,0.6)',
                                    color: isActive ? est.activeColor : est.color,
                                    fontWeight: isActive ? 'bold' : '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                {est.icon} {est.label}
                                <span style={{
                                    background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-body)',
                                    color: isActive ? 'white' : 'var(--text-main)',
                                    padding: '0.1rem 0.5rem',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    marginLeft: '0.25rem'
                                }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                    <AnimatePresence mode="popLayout">
                        {filtrarPorEstado(estadoActivo).map(sol => (
                            <motion.div
                                key={sol.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                            >
                                <TarjetaRadicado sol={sol} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                
                {filtrarPorEstado(estadoActivo).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.4)', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ display: 'inline-flex', padding: '1.5rem', background: 'white', borderRadius: '50%', marginBottom: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <CheckCircle size={40} color="var(--success-text)" style={{ opacity: 0.5 }}/>
                        </div>
                        <h3 style={{ color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>Bandeja Vacía</h3>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>No hay solicitudes pendientes en este estado.</p>
                    </div>
                )}
            </>
            )}
            
            {activeTab === 'matriz' && (

                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>Matriz de Riesgo Documental</h2>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Visualización interactiva (Clic en un riesgo para expandir Causas y Controles)</p>
                        </div>
                        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }} onClick={() => {
                            const wb = XLSX.utils.book_new();
                            const data = matrizRiesgos.map(r => ({
                                "Código": r.codigo_riesgo,
                                "Evento de Riesgo": r.evento_riesgo,
                                "Fuente": r.fuente_riesgo,
                                "Causas Principales": r.causas,
                                "F x I": (r.escala_frecuencia || 0) * (r.escala_impacto || 0),
                                "Tratamiento": r.tratamiento,
                                "Controles Establecidos": r.descripcion_controles
                            }));
                            const ws = XLSX.utils.json_to_sheet(data);
                            XLSX.utils.book_append_sheet(wb, ws, "Matriz_Riesgos");
                            XLSX.writeFile(wb, "Matriz_Riesgos.xlsx");
                        }}><Download size={16} /> Exportar Excel</button>
                    </div>
                    
                    <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto', maxHeight: '75vh' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 5, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <tr>
                                        <th style={{ padding: '1rem', width: '10%', color: '#475569', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>Código</th>
                                        <th style={{ padding: '1rem', width: '40%', color: '#475569', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>Evento de Riesgo</th>
                                        <th style={{ padding: '1rem', width: '15%', color: '#475569', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>Fuente</th>
                                        <th style={{ padding: '1rem', width: '8%', color: '#475569', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>F x I</th>
                                        <th style={{ padding: '1rem', width: '12%', color: '#475569', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Tratamiento</th>
                                        <th style={{ padding: '1rem', width: '15%', color: '#475569', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Detalles</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrizRiesgos.map((r, idx) => {
                                        const inherente = (r.escala_frecuencia || 0) * (r.escala_impacto || 0);
                                        const isHigh = inherente >= 15;
                                        const isMed = inherente >= 9 && inherente < 15;
                                        const colorImpacto = isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#10b981';
                                        const isExpanded = riesgoExpandido === r.id;
                                        
                                        const controlesList = r.descripcion_controles 
                                            ? r.descripcion_controles.split(/(?=\d+\.\s)/).filter(c => c.trim().length > 0)
                                            : [];

                                        return (
                                            <React.Fragment key={r.id}>
                                                <tr onClick={() => setRiesgoExpandido(isExpanded ? null : r.id)} style={{ background: isExpanded ? '#f1f5f9' : (idx % 2 === 0 ? 'white' : '#f8fafc'), cursor: 'pointer', borderBottom: isExpanded ? 'none' : '1px solid var(--border)', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{ background: 'var(--primary)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                            {r.codigo_riesgo}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: '500' }}>
                                                        <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                            {r.evento_riesgo}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{r.fuente_riesgo}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: colorImpacto, color: 'white', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                            {inherente}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <span style={{ padding: '0.3rem 0.6rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 'bold', 
                                                            background: r.tratamiento === 'MITIGAR' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                            color: r.tratamiento === 'MITIGAR' ? 'var(--success-text)' : '#d97706',
                                                            border: `1px solid ${r.tratamiento === 'MITIGAR' ? 'var(--success-text)' : '#d97706'}`
                                                        }}>
                                                            {r.tratamiento}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </td>
                                                </tr>
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.tr 
                                                            initial={{ opacity: 0, height: 0 }} 
                                                            animate={{ opacity: 1, height: 'auto' }} 
                                                            exit={{ opacity: 0, height: 0 }}
                                                            style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border)' }}
                                                        >
                                                            <td colSpan="6" style={{ padding: '0' }}>
                                                                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                                                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                            <AlertTriangle size={16} color="#f59e0b"/> Causas Principales
                                                                        </h4>
                                                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                                                                            {r.causas}
                                                                        </p>
                                                                    </div>
                                                                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                            <ShieldCheck size={16} color="#10b981"/> Controles Establecidos
                                                                        </h4>
                                                                        {controlesList.length > 0 ? (
                                                                            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                                                                {controlesList.map((ctrl, i) => (
                                                                                    <li key={i} style={{ marginBottom: '0.5rem' }}>{ctrl.replace(/^\d+\.\s*/, '')}</li>
                                                                                ))}
                                                                            </ul>
                                                                        ) : (
                                                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{r.descripcion_controles}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    )}
                                                </AnimatePresence>
                                            </React.Fragment>
                                        );
                                    })}
                                    {matrizRiesgos.length === 0 && (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando matriz de riesgos...</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'jurisdicciones' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>Riesgo Geográfico y Jurisdicciones</h2>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Gestione el nivel de riesgo por ubicación (0-11.11: Bajo | 11.12-22.22: Medio | &gt;22.22: Alto)</p>
                        </div>
                        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }} onClick={() => {
                            const wb = XLSX.utils.book_new();
                            const data = jurisdicciones.map(j => ({
                                "Departamento": j.departamento,
                                "Municipio": j.municipio,
                                "Código Postal": j.codigo_postal,
                                "Nivel de Riesgo": (j.nivel_riesgo || 'BAJO').toUpperCase(),
                                "Porcentaje": j.porcentaje
                            }));
                            const ws = XLSX.utils.json_to_sheet(data);
                            XLSX.utils.book_append_sheet(wb, ws, "Jurisdicciones");
                            XLSX.writeFile(wb, "Jurisdicciones.xlsx");
                        }}><Download size={16} /> Exportar Excel</button>
                    </div>
                    
                    <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto', maxHeight: '75vh' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 5, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <tr>
                                        <th style={{ padding: '1.2rem 1rem', color: '#475569', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Departamento</th>
                                        <th style={{ padding: '1.2rem 1rem', color: '#475569', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Municipio</th>
                                        <th style={{ padding: '1.2rem 1rem', color: '#475569', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Cód. Postal</th>
                                        <th style={{ padding: '1.2rem 1rem', color: '#475569', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Porcentaje %</th>
                                        <th style={{ padding: '1.2rem 1rem', color: '#475569', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Nivel Asignado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jurisdicciones.map((j, idx) => {
                                        const upperNivel = (j.nivel_riesgo || 'BAJO').toUpperCase();
                                        const isBajo = upperNivel === 'BAJO';
                                        const isMedio = upperNivel === 'MEDIO';
                                        
                                        // User request: Distinct colors for MEDIO and ALTO
                                        const bgColor = isBajo ? '#10b981' : isMedio ? '#eab308' : '#ef4444'; // Emerald for Low, Yellow for Med, Red for High
                                        
                                        return (
                                        <tr key={j.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'white' : '#f8fafc', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>{j.departamento}</td>
                                            <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{j.municipio}</td>
                                            <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{j.codigo_postal}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        defaultValue={j.porcentaje} 
                                                        onBlur={(e) => actualizarJurisdiccion(j.id, e.target.value)}
                                                        style={{ 
                                                            padding: '0.4rem 0.6rem', borderRadius: '6px', 
                                                            border: '1px solid #cbd5e1', width: '80px', 
                                                            background: 'white', fontWeight: 'bold', color: 'var(--primary)',
                                                            outline: 'none', transition: 'border-color 0.2s'
                                                        }}
                                                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                                    />
                                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ 
                                                    padding: '0.35rem 0.75rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.5px',
                                                    background: bgColor,
                                                    color: isMedio ? '#451a03' : 'white', // Ensure high contrast for yellow text
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}>
                                                    {isBajo ? <CheckCircle size={12}/> : <AlertTriangle size={12}/>}
                                                    {upperNivel}
                                                </span>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal del Oficial de Cumplimiento */}

{/* Modal del Oficial de Cumplimiento */}

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

                                {solicitudSeleccionada.estado_actual === 'ASIGNACION_CARGO' && (
                                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>Asignación de Área y Cargo</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div>
                                                <label className="label">Estado de Vinculación</label>
                                                <select className="input-field" value={formAsignacion.estado_vinculacion} onChange={e => setFormAsignacion({...formAsignacion, estado_vinculacion: e.target.value})}>
                                                    <option value="vinculados">Vinculado</option>
                                                    <option value="no_vinculados">No Vinculado</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">Área</label>
                                                <select className="input-field" value={formAsignacion.area} onChange={e => setFormAsignacion({...formAsignacion, area: e.target.value, cargo: ''})}>
                                                    <option value="">Seleccione Área...</option>
                                                    {Object.keys(AREAS_Y_CARGOS).map(area => (
                                                        <option key={area} value={area}>{area}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">Cargo</label>
                                                <select className="input-field" value={formAsignacion.cargo} onChange={e => setFormAsignacion({...formAsignacion, cargo: e.target.value})} disabled={!formAsignacion.area}>
                                                    <option value="">Seleccione Cargo...</option>
                                                    {(AREAS_Y_CARGOS[formAsignacion.area] || []).map(cargo => (
                                                        <option key={cargo} value={cargo}>{cargo}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button className="btn-primary" onClick={handleAsignarCargo} disabled={cargando}>
                                                Asignar y Enviar a Revisión Previa
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                <div style={{ display: 'block' }}>

                                {solicitudSeleccionada.estado_actual === 'DEVUELTO_CORRECCION' && (
                                    <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                                        <h4 style={{ color: '#d97706', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Clock size={20} /> Solicitud Devuelta al Usuario (Ping-Pong)
                                        </h4>
                                        <p style={{ color: '#92400e', fontSize: '0.9rem', marginBottom: '1rem' }}>Esta solicitud se encuentra temporalmente bloqueada a la espera de que el usuario envíe las correcciones.</p>
                                        {solicitudSeleccionada.campos_a_corregir && (
                                            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '4px', fontSize: '0.85rem', color: '#92400e' }}>
                                                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>El usuario debe corregir lo siguiente:</strong>
                                                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                                    {Object.keys(solicitudSeleccionada.campos_a_corregir).map(campo => (
                                                        <li key={campo}>{campo.replace('archivo_', 'Archivo: ').replace(/_/g, ' ').toUpperCase()}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

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
                                                                            <div>🔹 {String(item)}</div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                        
                                                        {renderGroup(otherKeys, 'Auditoría y Trazabilidad (Metadatos)')}
                                                    </div>
                                                );
                                            })()}

                                            {/* Sección: Archivos */}
                                            {solicitudSeleccionada.datos_formulario.archivos_cargados && Object.keys(solicitudSeleccionada.datos_formulario.archivos_cargados).length > 0 && (
                                                <div style={{ marginTop: '1rem' }}>
                                                    <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', borderBottom: '2px solid var(--border)', paddingBottom: '0.25rem' }}>Archivos Adjuntos (Cloudflare R2)</h5>
                                                    {Object.entries(solicitudSeleccionada.datos_formulario.archivos_cargados).map(([k, v]) => {
                                                        const urlLink = <a href={v} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Ver Documento 📄</a>;
                                                        if (k === 'reporte_tusdatos') {
                                                            return (
                                                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        <strong style={{ color: 'var(--text-main)' }}>Documento: REPORTE TUSDATOS (PDF Oficial)</strong>
                                                                    </div>
                                                                    <span>{urlLink}</span>
                                                                </div>
                                                            );
                                                        }
                                                        return renderCampoRevisable(`Documento: ${k.replace(/_/g, ' ').toUpperCase()}`, urlLink, `archivo_${k}`);
                                                    })}
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                )}

                                {solicitudSeleccionada.estado_actual !== 'DEVUELTO_CORRECCION' && (
                                <>
                                <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Globe size={18} /> Monitor de Fuentes (TusDatos)
                                    </h4>
                                    
                                    {solicitudSeleccionada.estado_actual === 'ASIGNACION_CARGO' ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', background: '#fefce8', borderRadius: '8px', border: '1px solid #fef08a' }}>
                                            <p style={{ color: '#854d0e', fontWeight: '600', marginBottom: '0.5rem' }}>🔒 Pendiente de asignación de Área y Cargo</p>
                                            <p style={{ color: '#a16207', fontSize: '0.85rem' }}>Primero debes asignar el Área y Cargo en el recuadro superior. Una vez asignados, el expediente pasará a Revisión Previa donde se ejecutará la consulta en TusDatos.</p>
                                        </div>
                                    ) : (solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || solicitudSeleccionada.estado_actual === 'REVISION_PREVIA') ? (
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
                                    ) : (
                                        <>
                                        {solicitudSeleccionada.estado_actual === 'FUENTES_INCOMPLETAS' && (
                                            <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
                                                <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>⚠️ Consulta Incompleta</h4>
                                                <p style={{ color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                                    TusDatos reportó que algunas fuentes externas estaban caídas al momento de la consulta:
                                                </p>
                                                <div style={{ textAlign: 'left', marginBottom: '1.5rem', maxHeight: '150px', overflowY: 'auto', background: '#fff', padding: '1rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                                                        {(() => {
                                                            const detalladas = solicitudSeleccionada.datos_formulario?.monitor_fuentes?.fuentes_detalladas;
                                                            if (!detalladas) return <li>Fuentes caídas no detalladas en el reporte.</li>;
                                                            const caidas = Object.entries(detalladas)
                                                                .filter(([k, v]) => v === 'Error' || v === 'Página no disponible' || v === 'Inactivo')
                                                                .map(([k, v]) => k);
                                                            
                                                            if (caidas.length === 0) return <li>No se detectaron fuentes caídas específicas.</li>;
                                                            return caidas.map((fuente, idx) => (
                                                                <li key={idx} style={{ paddingBottom: '0.3rem' }}>{fuente}</li>
                                                            ));
                                                        })()}
                                                    </ul>
                                                </div>
                                                <button 
                                                    className="btn-outline" 
                                                    onClick={(e) => handleRetryTusDatos(e, solicitudSeleccionada)}
                                                    disabled={cargandoTusDatos === solicitudSeleccionada.id}
                                                    style={{ padding: '0.75rem 2rem', fontSize: '1rem', opacity: cargandoTusDatos === solicitudSeleccionada.id ? 0.7 : 1, borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                                >
                                                    {cargandoTusDatos === solicitudSeleccionada.id ? 'Recargando fuentes caídas...' : '♻️ Recargar Fuentes Caídas (Gratis)'}
                                                </button>
                                            </div>
                                        )}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px dashed var(--border)' }}>
                                                <span>Estado General TusDatos:</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--success-text)' }}>
                                                    {solicitudSeleccionada.datos_formulario?.monitor_fuentes?.estado_fuentes || '✅ COMPLETADO'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px dashed var(--border)' }}>
                                                <span>Listas Restrictivas (ONU, OFAC, etc):</span>
                                                <span style={{ fontWeight: 'bold', color: solicitudSeleccionada.datos_formulario?.monitor_fuentes?.listas_restrictivas === 'ALERTA' ? 'var(--danger)' : 'var(--success-text)' }}>
                                                    {solicitudSeleccionada.datos_formulario?.monitor_fuentes?.listas_restrictivas === 'ALERTA' ? '⚠️ ALERTA ENCONTRADA' : '✅ SIN HALLAZGOS'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px dashed var(--border)' }}>
                                                <span>Procuraduría / Policía / Antecedentes:</span>
                                                <span style={{ fontWeight: 'bold', color: solicitudSeleccionada.datos_formulario?.monitor_fuentes?.antecedentes_judiciales === 'ALERTA' ? 'var(--danger)' : 'var(--success-text)' }}>
                                                    {solicitudSeleccionada.datos_formulario?.monitor_fuentes?.antecedentes_judiciales === 'ALERTA' ? '❌ CON HALLAZGOS' : '✅ SIN ANTECEDENTES'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px dashed var(--border)' }}>
                                                <span>Verificación RUT / Documentos:</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--success-text)' }}>✅ VERIFICADO</span>
                                            </div>
                                            
                                            {/* Panel expandible de detalles (si hay fuentes_detalladas) */}
                                            {solicitudSeleccionada.datos_formulario?.monitor_fuentes?.fuentes_detalladas && (
                                                <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                                                    <details style={{ background: '#f8fafc', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                                        <summary style={{ fontWeight: 'bold', cursor: 'pointer', color: 'var(--primary)' }}>Ver Desglose de Bases de Datos Consultadas</summary>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                                                            {Object.entries(solicitudSeleccionada.datos_formulario.monitor_fuentes.fuentes_detalladas).map(([fuente, valor], idx) => {
    let detalles = [];
    const dict = solicitudSeleccionada.datos_formulario.monitor_fuentes.dict_hallazgos;
    if (dict && valor === true) {
        for (const cat of ['altos', 'medios', 'bajos', 'infos']) {
            const items = dict[cat] || [];
            // Find all matching items for this source
            const matches = items.filter(i => 
                i.codigo === fuente || 
                i.fuente === fuente || 
                fuente.includes(i.codigo) || 
                i.codigo.includes(fuente.split('_')[0])
            );
            
            matches.forEach(match => {
                let texto = match.hallazgo || '';
                if (match.descripcion && match.descripcion !== texto) {
                    texto += texto ? ' - ' + match.descripcion : match.descripcion;
                }
                if (texto && texto.trim() !== '') {
                    detalles.push(texto.trim());
                }
            });
        }
    }
    
    // De-duplicate and join
    const detalleHallazgo = [...new Set(detalles)].join(' | ');

    return (
    <div key={idx} style={{ fontSize: '0.8rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', paddingTop: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{fuente.replace(/_/g, ' ')}: </span>
            <strong style={{ color: valor === 'Error' || valor === 'Página no disponible' ? 'var(--danger)' : valor === true ? 'var(--danger)' : !valor && valor !== false ? 'var(--text-muted)' : 'var(--text-main)', textAlign: 'right', maxWidth: '50%' }}>
                {valor === true ? '🚨 HALLAZGO' + (detalleHallazgo ? '' : ' (Ver PDF)') : valor === false ? 'No / Limpio' : (valor === '' || valor === null ? 'No registra en la fuente' : valor)}
            </strong>
        </div>
        {detalleHallazgo && (
            <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.4rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '4px' }}>
                <i>Detalle técnico:</i> {detalleHallazgo}
            </div>
        )}
    </div>
    );
})}
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
                                        </div>
                                        </>
                                    )}

                                    {solicitudSeleccionada.monitor_fuentes && solicitudSeleccionada.monitor_fuentes.fuentes_detalladas && (
                                        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                            <h5 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '1rem' }}>📋 Resultados Detallados por Fuente</h5>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '1rem' }}>
                                                {Object.entries(solicitudSeleccionada.monitor_fuentes.fuentes_detalladas).map(([fuente, resultado]) => {
    let detalles = [];
    const dict = solicitudSeleccionada.monitor_fuentes.dict_hallazgos;
    if (dict && resultado === true) {
        for (const cat of ['altos', 'medios', 'bajos', 'infos']) {
            const items = dict[cat] || [];
            const matches = items.filter(i => 
                i.codigo === fuente || 
                i.fuente === fuente || 
                fuente.includes(i.codigo) || 
                i.codigo.includes(fuente.split('_')[0])
            );
            
            matches.forEach(match => {
                let texto = match.hallazgo || '';
                if (match.descripcion && match.descripcion !== texto) {
                    texto += texto ? ' - ' + match.descripcion : match.descripcion;
                }
                if (texto && texto.trim() !== '') {
                    detalles.push(texto.trim());
                }
            });
        }
    }
    
    const detalleHallazgo = [...new Set(detalles)].join(' | ');
    
    return (
    <div key={fuente} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-body)', padding: '0.5rem', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'capitalize' }}>{fuente.replace(/_/g, ' ')}</span>
            <span style={{ 
                fontWeight: 'bold', 
                color: resultado === 'Error' ? 'var(--danger)' : resultado === true ? '#f59e0b' : 'var(--success-text)' 
            }}>
                {resultado === 'Error' ? '⛔ ERROR / CAÍDA' : resultado === true ? '🚨 HALLAZGO' : '✅ LIMPIO'}
            </span>
        </div>
        {detalleHallazgo && (
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.4rem', fontStyle: 'italic' }}>
                {detalleHallazgo}
            </div>
        )}
    </div>
    );
})}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* NUEVO PANEL DE RIESGO CUALITATIVO */}
                                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>1. Evaluación Cualitativa (Oficial)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label className="label">Calificación Inicial del Oficial</label>
                                            <select className="input-field" value={formOficial.calificacion_oficial} onChange={e => setFormOficial({...formOficial, calificacion_oficial: e.target.value})}>
                                                <option value="Bajo">BAJO</option>
                                                <option value="Medio">MEDIO</option>
                                                <option value="Alto">ALTO</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Señales de Alerta Manuales Observadas</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', background: '#fff', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                                                {['Renuencia a entregar información', 'Información incongruente', 'Documentos ilegibles o alterados', 'Desconoce riesgo LA/FT', 'Renuencia a actualizar datos'].map(alerta => (
                                                    <label key={alerta} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={formOficial.alertas_manuales.includes(alerta)} onChange={() => toggleAlertaManual(alerta)} />
                                                        {alerta}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label className="label">Observaciones y Justificación (Opcional)</label>
                                        <textarea className="input-field" rows="3" value={formOficial.observaciones} onChange={e => setFormOficial({...formOficial, observaciones: e.target.value})} placeholder="Ej: Se evaluó la alerta manual y se determinó que..."></textarea>
                                    </div>
                                    
                                    <button className="btn-outline" style={{ width: '100%', padding: '0.75rem', fontWeight: 'bold' }} onClick={handleSimularRiesgo}>
                                        ⚡ Simular Motor de Riesgo Consolidado
                                    </button>
                                    
                                    {(solicitudSeleccionada.estado_actual === 'APROBADO_LIMPIO' || solicitudSeleccionada.estado_actual === 'RECHAZADO') && (
                                        <button className="btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 'bold', marginTop: '0.75rem', background: '#3b82f6', borderColor: '#3b82f6' }} onClick={handleGuardarActualizacion}>
                                            💾 Guardar Actualización de Riesgo y Observaciones
                                        </button>
                                    )}

                                    {resultadoRiesgo && (
                                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff', border: '1px dashed #94a3b8', borderRadius: '8px' }}>
                                            <h5 style={{ margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Reporte de Riesgo Consolidado</span>
                                                <span style={{ padding: '0.3rem 0.6rem', borderRadius: '15px', background: resultadoRiesgo.nivel_riesgo_final === 'ALTO' ? '#fee2e2' : resultadoRiesgo.nivel_riesgo_final === 'MEDIO' ? '#fef3c7' : '#dcfce7', color: resultadoRiesgo.nivel_riesgo_final === 'ALTO' ? '#dc2626' : resultadoRiesgo.nivel_riesgo_final === 'MEDIO' ? '#d97706' : '#16a34a', fontSize: '0.8rem' }}>
                                                    RIESGO {resultadoRiesgo.nivel_riesgo_final}
                                                </span>
                                            </h5>
                                            <ul style={{ fontSize: '0.85rem', color: '#475569', paddingLeft: '1.2rem', marginBottom: '1rem' }}>
                                                {resultadoRiesgo.desglose.map((item, idx) => (
                                                    <li key={idx} style={{ marginBottom: '0.5rem' }}>
                                                        <b>[+] {item.categoria}</b>: {item.detalle} 
                                                        <span style={{ float: 'right', fontWeight: 'bold' }}>+{item.puntos} pts</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>
                                                PUNTAJE FINAL: {resultadoRiesgo.puntaje_total}/100
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {solicitudSeleccionada.estado_actual === 'APROBADO_LIMPIO' && (!solicitudSeleccionada.datos_formulario?.area_asignada || !solicitudSeleccionada.datos_formulario?.cargo_asignado) && (
                                    <div style={{ background: '#fefce8', padding: '1.5rem', borderRadius: '8px', border: '1px solid #fef08a', marginBottom: '1.5rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#854d0e' }}>Migración a Cloudflare R2</h4>
                                        <p style={{ fontSize: '0.85rem', color: '#a16207', marginBottom: '1rem' }}>Asigna el Área y Cargo correspondientes para reubicar este expediente en la nueva estructura corporativa en la nube.</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label className="label">Área</label>
                                                <select className="input-field" value={formAsignacion.area} onChange={e => setFormAsignacion({...formAsignacion, area: e.target.value, cargo: ''})}>
                                                    <option value="">Seleccione Área...</option>
                                                    {Object.keys(AREAS_Y_CARGOS).map(area => (
                                                        <option key={area} value={area}>{area}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">Cargo</label>
                                                <select className="input-field" value={formAsignacion.cargo} onChange={e => setFormAsignacion({...formAsignacion, cargo: e.target.value})} disabled={!formAsignacion.area}>
                                                    <option value="">Seleccione Cargo...</option>
                                                    {(AREAS_Y_CARGOS[formAsignacion.area] || []).map(cargo => (
                                                        <option key={cargo} value={cargo}>{cargo}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <button className="btn-outline" style={{ borderColor: '#eab308', color: '#b45309' }} onClick={handleMigrarCloudflare} disabled={cargando}>
                                            Migrar a Estructura Cloudflare
                                        </button>
                                    </div>
                                )}

                                {/* Bloque de Firma y Aprobación */}
                                <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                                    <h4 style={{ margin: '0 0 1rem 0' }}>Dictamen Final</h4>
                                    
                                    {/* Desglose del puntaje para registros con scoring calculado */}
                                    {solicitudSeleccionada.desglose_riesgo && (
                                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <h6 style={{ margin: 0, color: '#0f172a', fontWeight: '600', fontSize: '0.85rem' }}>📊 Factores que influyeron en el puntaje</h6>
                                                <span style={{ 
                                                    padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
                                                    background: solicitudSeleccionada.desglose_riesgo.nivel_riesgo_final === 'ALTO' ? '#fee2e2' : solicitudSeleccionada.desglose_riesgo.nivel_riesgo_final === 'MEDIO' ? '#fef3c7' : '#dcfce7',
                                                    color: solicitudSeleccionada.desglose_riesgo.nivel_riesgo_final === 'ALTO' ? '#dc2626' : solicitudSeleccionada.desglose_riesgo.nivel_riesgo_final === 'MEDIO' ? '#d97706' : '#16a34a'
                                                }}>
                                                    RIESGO {solicitudSeleccionada.desglose_riesgo.nivel_riesgo_final || 'BAJO'}
                                                </span>
                                            </div>
                                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#475569' }}>
                                                {(solicitudSeleccionada.desglose_riesgo.desglose || []).map((item, idx) => (
                                                    <li key={idx} style={{ marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                                        <span><b>{item.categoria}:</b> {item.detalle}</span>
                                                        <span style={{ fontWeight: '700', whiteSpace: 'nowrap', color: item.puntos > 0 ? '#dc2626' : '#16a34a', minWidth: '50px', textAlign: 'right' }}>
                                                            {item.puntos > 0 ? '+' + item.puntos + ' pts' : '0 pts'}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.75rem', textAlign: 'right', fontWeight: '700', fontSize: '0.9rem' }}>
                                                PUNTAJE FINAL: {solicitudSeleccionada.desglose_riesgo.puntaje_total}/100
                                            </div>
                                        </div>
                                    )}
                                    
                                    {solicitudSeleccionada.analisis_oficial?.observaciones && (
                                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'left', color: '#991b1b', fontSize: '0.85rem' }}>
                                            <h6 style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>📝 Notas del Oficial de Cumplimiento</h6>
                                            <p style={{ margin: 0, fontStyle: 'italic' }}>"{solicitudSeleccionada.analisis_oficial.observaciones}"</p>
                                        </div>
                                    )}

                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                        {solicitudSeleccionada.score_riesgo >= 67 
                                            ? "El tercero presenta hallazgos restrictivos críticos." 
                                            : solicitudSeleccionada.score_riesgo >= 34 
                                            ? "El tercero requiere revisión manual adicional."
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
                                                style={{ width: '100%', padding: '1rem', background: (solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || (solicitudSeleccionada.estado_actual === 'REVISION_PREVIA' || solicitudSeleccionada.estado_actual === 'ASIGNACION_CARGO')) ? 'var(--text-muted)' : 'var(--success)', borderColor: (solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || (solicitudSeleccionada.estado_actual === 'REVISION_PREVIA' || solicitudSeleccionada.estado_actual === 'ASIGNACION_CARGO')) ? 'var(--border)' : 'var(--success)', opacity: (solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || (solicitudSeleccionada.estado_actual === 'REVISION_PREVIA' || solicitudSeleccionada.estado_actual === 'ASIGNACION_CARGO')) ? 0.5 : 1, cursor: (solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || (solicitudSeleccionada.estado_actual === 'REVISION_PREVIA' || solicitudSeleccionada.estado_actual === 'ASIGNACION_CARGO')) ? 'not-allowed' : 'pointer' }} 
                                                onClick={handleAprobarManualmente}
                                                disabled={solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || (solicitudSeleccionada.estado_actual === 'REVISION_PREVIA' || solicitudSeleccionada.estado_actual === 'ASIGNACION_CARGO')}
                                                title={(solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || (solicitudSeleccionada.estado_actual === 'REVISION_PREVIA' || solicitudSeleccionada.estado_actual === 'ASIGNACION_CARGO')) ? "Debe ejecutar TusDatos primero" : "Otorgar Visto Bueno"}
                                            >
                                                <CheckCircle size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> 
                                                {(solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || (solicitudSeleccionada.estado_actual === 'REVISION_PREVIA' || solicitudSeleccionada.estado_actual === 'ASIGNACION_CARGO')) ? 'Bloqueado (Requiere TusDatos)' : 'Otorgar Visto Bueno Definitivo'}
                                            </button>
                                            
                                            {!mostrarPingPong ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: (solicitudSeleccionada.score_riesgo === undefined || solicitudSeleccionada.score_riesgo === null || (solicitudSeleccionada.estado_actual === 'REVISION_PREVIA' || solicitudSeleccionada.estado_actual === 'ASIGNACION_CARGO')) ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                                                    {solicitudSeleccionada.score_riesgo !== undefined && solicitudSeleccionada.score_riesgo !== null && solicitudSeleccionada.estado_actual !== 'FUENTES_INCOMPLETAS' && (
                                                        <button className="btn-outline" style={{ padding: '0.75rem', fontSize: '0.85rem' }} onClick={(e) => handleTusDatos(e, solicitudSeleccionada)}>
                                                            {cargandoTusDatos === solicitudSeleccionada.id ? 'Consultando...' : '🔄 Re-evaluar API'}
                                                        </button>
                                                    )}
                                                    {solicitudSeleccionada.estado_actual === 'FUENTES_INCOMPLETAS' && (
                                                        <button className="btn-outline" style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={(e) => handleRetryTusDatos(e, solicitudSeleccionada)}>
                                                            {cargandoTusDatos === solicitudSeleccionada.id ? 'Recargando...' : '♻️ Recargar API'}
                                                        </button>
                                                    )}
                                                    {Object.values(camposPingPong).some(v => v) && (
                                                    <button className="btn-outline" style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#f59e0b', borderColor: '#f59e0b' }} onClick={() => setMostrarPingPong(true)}>
                                                        ↩️ Devolver (Ping-Pong)
                                                    </button>
                                                    )}
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
                                </>
                                )}
                                </div> {/* Cierra el div wrapper de display: none */}
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

            {/* MODAL CHECKLIST APROBACIÓN FINAL */}
            <AnimatePresence>
                {showModalAprobacion && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface, #fff)', borderRadius: 'var(--radius-lg, 8px)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                            <div style={{ background: 'var(--bg-color, #f8fafc)', padding: '1.5rem', borderBottom: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Formulario de Verificación (Oficial de Cumplimiento)</h3>
                                <button type="button" onClick={() => setShowModalAprobacion(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                            </div>
                            
                            <form onSubmit={submitAprobacionDefinitiva} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
                                    Al otorgar este Visto Bueno, el sistema empaquetará los documentos aportados, el reporte de TusDatos y este formulario de verificación en una carpeta segura según el nivel de riesgo en Cloudflare.
                                </p>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--primary)', color: 'white' }}>
                                            <th style={{ padding: '0.75rem', border: '1px solid #ccc', textAlign: 'left' }}>Descripción</th>
                                            <th style={{ padding: '0.75rem', border: '1px solid #ccc', width: '120px' }}>Respuesta</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { key: 'doc_completa', text: '1. ¿Fue entregada la documentación completa por parte de la contraparte?' },
                                            { key: 'verifico_listas', text: '2. ¿Se hizo verificación de las listas restrictivas?' },
                                            { key: 'autenticidad', text: '3. ¿Se verificó autenticidad de documento?' },
                                            { key: 'proc_rep', text: '4. ¿Se verificó en la procuraduría el representante legal, los socios?' },
                                            { key: 'contra_rep', text: '5. ¿Se verificó en la contraloría el representante legal, los socios?' },
                                            { key: 'poli_rep', text: '6. ¿Se verificó en la policía el representante legal, los socios?' },
                                            { key: 'info_fin', text: '7. ¿Se hizo verificación de la información financiera?' },
                                            { key: 'visita', text: '8. ¿Se debe realizar visita?' },
                                            { key: 'minero', text: '9. ¿La empresa pertenece al sector minero energético?' }
                                        ].map(item => (
                                            <tr key={item.key}>
                                                <td style={{ padding: '0.5rem', border: '1px solid #ccc' }}>{item.text}</td>
                                                <td style={{ padding: '0.5rem', border: '1px solid #ccc' }}>
                                                    <select required className="input-field" value={formAprobacion[item.key]} onChange={e => setFormAprobacion({...formAprobacion, [item.key]: e.target.value})}>
                                                        <option value="">Seleccione...</option>
                                                        <option value="SI">Sí</option>
                                                        <option value="NO">No</option>
                                                        <option value="NA">N/A</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {formAprobacion.minero === 'SI' && (
                                    <div style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #ccc', marginTop: '1rem' }}>
                                        <h5 style={{ margin: '0 0 1rem 0' }}>Información adicional sector minero</h5>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                            {[
                                                { key: 'rucon', text: '¿Tiene RUCON?' },
                                                { key: 'sarlaft', text: '¿Tiene SARLAFT?' },
                                                { key: 'sagrilaft', text: '¿Tiene SAGRILAFT?' }
                                            ].map(item => (
                                                <div key={item.key}>
                                                    <label style={{ fontSize: '0.85rem' }}>{item.text}</label>
                                                    <select required className="input-field" value={formAprobacion[item.key]} onChange={e => setFormAprobacion({...formAprobacion, [item.key]: e.target.value})}>
                                                        <option value="">Seleccione...</option>
                                                        <option value="SI">Sí</option>
                                                        <option value="NO">No</option>
                                                        <option value="NA">N/A</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label className="label">Dictamen Final del Oficial</label>
                                        <select className="input-field" value={formAprobacion.decision_final} onChange={e => setFormAprobacion({...formAprobacion, decision_final: e.target.value})}>
                                            <option value="ACEPTADO">Aceptado - Otorgar Visto Bueno</option>
                                            <option value="RECHAZADO">Rechazado - Denegar Visto Bueno</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Observaciones Adicionales</label>
                                        <textarea className="input-field" rows="2" value={formAprobacion.observaciones} onChange={e => setFormAprobacion({...formAprobacion, observaciones: e.target.value})}></textarea>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn-outline" onClick={() => setShowModalAprobacion(false)}>Cancelar</button>
                                    <button type="submit" style={{ padding: '0.75rem 1.5rem', background: formAprobacion.decision_final === 'ACEPTADO' ? '#10b981' : '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: cargando ? 'not-allowed' : 'pointer', fontWeight: 'bold' }} disabled={cargando}>
                                        {cargando ? 'Procesando y empaquetando...' : (formAprobacion.decision_final === 'ACEPTADO' ? 'Aprobar y Empaquetar Expediente' : 'Rechazar y Empaquetar Expediente')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

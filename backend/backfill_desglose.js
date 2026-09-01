require('dotenv').config({ path: 'C:/Users/Programación/Desktop/sagrilaft-mvp/backend/.env' });
const supabase = require('C:/Users/Programación/Desktop/sagrilaft-mvp/backend/supabase.js');
const { calcularRiesgoConsolidado } = require('C:/Users/Programación/Desktop/sagrilaft-mvp/backend/utils/riskEngine.js');

async function run() {
    console.log("Rellenando desglose_riesgo para registros aprobados...");
    
    const { data: solicitudes, error } = await supabase
        .from('solicitudes_sagrilaft')
        .select('*')
        .in('estado_actual', ['APROBADO_LIMPIO', 'APROBADO_RIESGO_CONTROLADO', 'REVISION_MANUAL']);
    
    if (error) { console.error(error); return; }
    console.log(`Procesando ${solicitudes.length} registros...`);
    
    for (const sol of solicitudes) {
        try {
            const datos = sol.datos_formulario || {};
            const dict_hallazgos = datos.monitor_fuentes?.dict_hallazgos || {};
            
            // Same score logic as server.js
            const numAltos = (dict_hallazgos.altos || []).length;
            const numMedios = (dict_hallazgos.medios || []).length;
            const numBajos = (dict_hallazgos.bajos || []).length;
            
            let tusDatosScore = 0;
            if (numAltos > 0) tusDatosScore = 100;
            else {
                tusDatosScore += Math.min(numMedios * 15, 45);
                tusDatosScore += Math.min(numBajos * 5, 15);
            }
            
            // Get jurisdiction
            const { data: jurisData } = await supabase.from('sagrilaft_jurisdicciones').select('departamento, municipio, nivel_riesgo, porcentaje').limit(2000);
            
            let jurisdiccionScore = 0;
            let nivelJurisdiccion = 'BAJO';
            const depto = datos.departamento_principal || datos.departamento || '';
            const muni = datos.municipio_principal || datos.ciudad_principal || datos.municipio || datos.ciudad || '';
            
            const normalizeStr = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            
            if (depto || muni) {
                const j = (jurisData || []).find(jd => 
                    normalizeStr(jd.departamento) === normalizeStr(depto) &&
                    normalizeStr(jd.municipio) === normalizeStr(muni)
                );
                if (j) {
                    nivelJurisdiccion = (j.nivel_riesgo || 'BAJO').toUpperCase();
                    if (nivelJurisdiccion === 'ALTO') jurisdiccionScore = 20;
                    else if (nivelJurisdiccion === 'MEDIO') jurisdiccionScore = 10;
                }
            }
            
            // PEPs
            let pepScore = 0;
            const esPep = String(datos.es_pep).toLowerCase() === 'si' || String(datos.vinculo_familiar_pep).toLowerCase() === 'si' || String(datos.tiene_vinculo_pep).toLowerCase() === 'si';
            if (esPep) pepScore = 15;
            
            const scoreFinal = Math.min(Math.round(tusDatosScore + jurisdiccionScore + pepScore), 100);
            
            // Build desglose
            const desglose = [];
            
            if (numAltos > 0) {
                desglose.push({ categoria: 'Listas Restrictivas (ONU/OFAC)', detalle: `${numAltos} coincidencias en listas internacionales`, puntos: 100, tipo: 'AUTOMATICO' });
            }
            if (numMedios > 0) {
                desglose.push({ categoria: 'Antecedentes (Procuraduría/Contraloría)', detalle: `${numMedios} hallazgos disciplinarios o fiscales`, puntos: Math.min(numMedios * 15, 45), tipo: 'AUTOMATICO' });
            }
            if (numBajos > 0) {
                desglose.push({ categoria: 'Hallazgos Menores (RUAF/SIMIT)', detalle: `${numBajos} hallazgos informativos o menores`, puntos: Math.min(numBajos * 5, 15), tipo: 'AUTOMATICO' });
            }
            if (jurisdiccionScore > 0) {
                desglose.push({ categoria: 'Riesgo Geográfico', detalle: `${muni}, ${depto} → Nivel ${nivelJurisdiccion}`, puntos: jurisdiccionScore, tipo: 'AUTOMATICO' });
            }
            if (pepScore > 0) {
                desglose.push({ categoria: 'Persona Expuesta Políticamente (PEP)', detalle: 'El sujeto o su vinculado es PEP declarado', puntos: pepScore, tipo: 'AUTOMATICO' });
            }
            if (desglose.length === 0) {
                desglose.push({ categoria: 'Sin factores de riesgo detectados', detalle: 'No se encontraron hallazgos en fuentes consultadas', puntos: 0, tipo: 'AUTOMATICO' });
            }
            
            const desgloseData = {
                puntaje_total: scoreFinal,
                nivel_riesgo_final: scoreFinal <= 33 ? 'BAJO' : scoreFinal <= 66 ? 'MEDIO' : 'ALTO',
                desglose
            };
            
            await supabase.from('solicitudes_sagrilaft').update({
                score_riesgo: scoreFinal,
                desglose_riesgo: desgloseData
            }).eq('id', sol.id);
            
            console.log(`[${sol.nit_cedula}] Score: ${scoreFinal} | Nivel: ${desgloseData.nivel_riesgo_final}`);
        } catch (err) {
            console.error(`[${sol.nit_cedula}] Error:`, err.message);
        }
    }
    
    console.log("¡Proceso terminado!");
}

run();

require('dotenv').config({ path: 'C:/Users/Programación/Desktop/sagrilaft-mvp/backend/.env' });
const supabase = require('C:/Users/Programación/Desktop/sagrilaft-mvp/backend/supabase.js');

async function run() {
    console.log("Iniciando recalculo de scores...");
    
    // 1. Get all risks and jurisdictions
    const { data: riesgos } = await supabase.from('matriz_riesgos_master').select('*').eq('activo', true);
    const { data: jurisdicciones } = await supabase.from('sagrilaft_jurisdicciones').select('*');
    
    // 2. Get all requests
    const { data: solicitudes, error } = await supabase.from('solicitudes_sagrilaft').select('*');
    if (error) {
        console.error("Error fetching solicitudes:", error);
        return;
    }
    
    console.log(`Procesando ${solicitudes.length} solicitudes...`);
    
    for (const sol of solicitudes) {
        const datos = sol.datos_formulario || {};
        const dict_hallazgos = sol.monitor_fuentes?.dict_hallazgos || {};
        
        // 2.1 TusDatos
        const numAltos = (dict_hallazgos.altos || []).length;
        const numMedios = (dict_hallazgos.medios || []).length;
        const numBajos = (dict_hallazgos.bajos || []).length;
        
        let tusDatosScore = 0;
        if (numAltos > 0) tusDatosScore = 100;
        else {
            tusDatosScore += Math.min(numMedios * 15, 45);
            tusDatosScore += Math.min(numBajos * 5, 15);
        }
        
        // 2.2 Jurisdiccion
        let jurisdiccionScore = 0;
        const depto = (datos.departamento_principal || datos.departamento || '').toLowerCase();
        const muni = (datos.municipio_principal || datos.municipio || datos.ciudad || datos.ciudad_principal || '').toLowerCase();
        
        if (depto || muni) {
            const j = (jurisdicciones || []).find(j => 
                j.departamento.toLowerCase().includes(depto) && 
                j.municipio.toLowerCase().includes(muni)
            );
            if (j) {
                const nivel = (j.nivel_riesgo || 'BAJO').toUpperCase();
                if (nivel === 'ALTO') jurisdiccionScore = 20;
                else if (nivel === 'MEDIO') jurisdiccionScore = 10;
            }
        }
        
        // 2.3 PEPs
        let pepScore = 0;
        const esPep = String(datos.es_pep).toLowerCase() === 'si' || String(datos.tiene_vinculo_pep).toLowerCase() === 'si';
        if (esPep) pepScore = 15;
        
        // 2.4 Final Score
        const scoreFinal = Math.min(Math.round(tusDatosScore + jurisdiccionScore + pepScore), 100);
        
        // Update Score in DB
        await supabase.from('solicitudes_sagrilaft').update({ score_riesgo: scoreFinal }).eq('id', sol.id);
        
        // 2.5 Matriz de riesgos
        const evaluaciones = [];
        if (riesgos && riesgos.length > 0) {
            for (const riesgo of riesgos) {
                let frec = riesgo.escala_frecuencia_inherente || 1;
                let imp = riesgo.escala_impacto_inherente || 1;
                let detalles = "Evaluación base estable.";

                if (riesgo.codigo === 'R-001') {
                    if (numAltos > 0) { frec = 5; detalles = `Riesgo extremo: ${numAltos} coincidencias en Listas Restrictivas Internacionales.`; }
                } else if (riesgo.codigo === 'R-002') {
                    if (numMedios > 0) { frec = 4; detalles = `Riesgo alto: ${numMedios} antecedentes o anotaciones fiscales/disciplinarias.`; }
                    else if (numBajos > 0) { frec = 3; detalles = `Riesgo medio: ${numBajos} hallazgos menores o informativos.`; }
                } else if (riesgo.codigo === 'R-004') {
                    if (esPep) { frec = 4; detalles = "Contraparte o vinculado está marcado como Persona Expuesta Políticamente (PEP)."; }
                }

                evaluaciones.push({
                    solicitud_id: sol.id,
                    riesgo_id: riesgo.id,
                    frecuencia_aplicada: frec,
                    impacto_aplicado: imp,
                    riesgo_residual_calculado: frec * imp,
                    detalles_calculo: detalles
                });
            }
            
            await supabase.from('evaluacion_riesgos_resultado').delete().eq('solicitud_id', sol.id);
            await supabase.from('evaluacion_riesgos_resultado').insert(evaluaciones);
        }
        
        console.log(`[${sol.nit_cedula}] Score actualizado a: ${scoreFinal}`);
    }
    
    console.log("¡Proceso terminado!");
}

run();

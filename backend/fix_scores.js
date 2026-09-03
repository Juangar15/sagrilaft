const supabase = require('./supabase');
const { calcularRiesgoConsolidado } = require('./utils/riskEngine');

async function fixScores() {
    const { data: solicitudes, error } = await supabase.from('solicitudes_sagrilaft').select('*');
    if (error) {
        console.error("Error fetching", error);
        return;
    }
    console.log(`Checking ${solicitudes.length} records...`);
    let count = 0;
    for (const sol of solicitudes) {
        if (!sol.datos_formulario) continue;
        const calc = await calcularRiesgoConsolidado(sol.datos_formulario);
        if (sol.score_riesgo !== calc.puntaje_total) {
            console.log(`Fixing ${sol.nit_cedula}: ${sol.score_riesgo} -> ${calc.puntaje_total}`);
            
            let estadoGeneral = sol.estado_actual;
            if (['APROBADO_LIMPIO', 'REVISION_MANUAL', 'ALERTA_CRITICA'].includes(sol.estado_actual)) {
                if (calc.puntaje_total <= 33.33) estadoGeneral = "APROBADO_LIMPIO";
                else if (calc.puntaje_total <= 66.66) estadoGeneral = "REVISION_MANUAL";
                else estadoGeneral = "ALERTA_CRITICA";
            }

            const newForm = { ...sol.datos_formulario, desglose_riesgo: calc };
            await supabase.from('solicitudes_sagrilaft').update({
                score_riesgo: calc.puntaje_total,
                datos_formulario: newForm,
                estado_actual: estadoGeneral
            }).eq('id', sol.id);
            count++;
        }
    }
    console.log(`Fixed ${count} records.`);
}
fixScores();

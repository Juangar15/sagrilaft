require('dotenv').config({ path: 'C:/Users/Programación/Desktop/sagrilaft-mvp/backend/.env' });
const supabase = require('C:/Users/Programación/Desktop/sagrilaft-mvp/backend/supabase.js');

// Tabla de pesos exacta - misma que server.js
const PESOS_TUSDATOS = {
    policia: 20, procuraduria: 20, contraloria: 20, inpec: 25,
    rnmc: 8, juzgados: 20, peps: 15, peps_nombre: 15,
    secop: 10, secop1: 10, secop2: 10, paco: 15, offshore: 20,
    garantias_mobiliarias: 5,
    // Informativos = 0
    ruaf_pensiones_estado: 0, ruaf_salud_estado: 0, ruaf_salud_tipo: 0,
    sisben: 0, sena: 0, libretamilitar_info: 0,
    runt_licencia_automoviles: 0, runt_licencia_restriccion: 0, runt_licencia_moto: 0,
    reputacional_news: 2, rues_estado: 0, registraduria: 0, rut: 0,
    sigep: 0, fopep: 0, simit: 3,
};

function calcularTusDatosScore(dict_hallazgos) {
    const td = dict_hallazgos || {};
    if ((td.altos || []).length > 0) return { score: 100, desglose: [{ categoria: 'ALERTA MÁXIMA: Listas Restrictivas', puntos: 100 }] };
    
    let score = 0;
    const desglose = [];
    const todosMedios = [...(td.medios || []), ...(td.bajos || [])];
    
    todosMedios.forEach(h => {
        const peso = PESOS_TUSDATOS[h.codigo];
        if (peso !== undefined && peso > 0) {
            score += peso;
            desglose.push({ categoria: h.hallazgo, detalle: h.descripcion?.slice(0, 80) || '', puntos: peso, tipo: 'AUTOMATICO' });
        } else if (peso === undefined) {
            const esMedio = (td.medios || []).some(m => m.codigo === h.codigo);
            if (esMedio) { score += 5; desglose.push({ categoria: h.hallazgo, detalle: '', puntos: 5, tipo: 'AUTOMATICO' }); }
        }
    });
    
    return { score: Math.min(score, 60), desglose };
}

async function run() {
    console.log("Re-calculando scores con tabla de pesos precisa...");
    
    const { data: solicitudes } = await supabase.from('solicitudes_sagrilaft').select('*');
    const { data: jurisData } = await supabase.from('sagrilaft_jurisdicciones').select('departamento, municipio, nivel_riesgo, porcentaje').limit(2000);
    
    const normalizeStr = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    
    for (const sol of solicitudes) {
        const datos = sol.datos_formulario || {};
        const dict_hallazgos = datos.monitor_fuentes?.dict_hallazgos || {};
        
        // TusDatos
        const { score: tdScore, desglose: tdDesglose } = calcularTusDatosScore(dict_hallazgos);
        
        // Jurisdiccion
        let jurisdiccionScore = 0;
        let nivelJurisdiccion = 'BAJO';
        const depto = datos.departamento_principal || datos.departamento || '';
        const muni = datos.municipio_principal || datos.ciudad_principal || datos.municipio || datos.ciudad || '';
        
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
        
        // PEP
        let pepScore = 0;
        const esPep = String(datos.es_pep).toLowerCase() === 'si' || 
                      String(datos.declara_ser_pep).toLowerCase() === 'si' ||
                      String(datos.vinculo_familiar_pep).toLowerCase() === 'si';
        if (esPep) pepScore = 15;
        
        const scoreFinal = Math.min(Math.round(tdScore + jurisdiccionScore + pepScore), 100);
        
        // Desglose completo
        const desglose = [...tdDesglose];
        if (jurisdiccionScore > 0) {
            desglose.push({ categoria: 'Riesgo Geográfico', detalle: `${muni}, ${depto} → Nivel ${nivelJurisdiccion}`, puntos: jurisdiccionScore, tipo: 'AUTOMATICO' });
        }
        if (pepScore > 0) {
            desglose.push({ categoria: 'PEP (Persona Expuesta Políticamente)', detalle: 'El sujeto o vinculado es PEP declarado', puntos: pepScore, tipo: 'AUTOMATICO' });
        }
        if (desglose.length === 0) {
            desglose.push({ categoria: 'Sin factores de riesgo significativos', detalle: 'No se detectaron alertas relevantes para LAFT', puntos: 0, tipo: 'AUTOMATICO' });
        }
        
        const nivelFinal = scoreFinal <= 33 ? 'BAJO' : scoreFinal <= 66 ? 'MEDIO' : 'ALTO';
        const desgloseData = { puntaje_total: scoreFinal, nivel_riesgo_final: nivelFinal, desglose };
        
        await supabase.from('solicitudes_sagrilaft').update({
            score_riesgo: scoreFinal,
            desglose_riesgo: desgloseData
        }).eq('id', sol.id);
        
        console.log(`[${sol.nit_cedula}] ${String(sol.razon_social || '').slice(0,25).padEnd(25)} | TD:${tdScore} + Geo:${jurisdiccionScore} + PEP:${pepScore} = SCORE: ${scoreFinal} → ${nivelFinal}`);
    }
    
    console.log("\n¡Proceso terminado!");
}

run();

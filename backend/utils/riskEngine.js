const supabase = require('../supabase');

const PESOS_TUSDATOS = {
    policia: 20, procuraduria: 20, contraloria: 20, inpec: 25,
    rnmc: 8, juzgados: 20, peps: 15, peps_nombre: 15,
    secop: 10, secop1: 10, secop2: 10, paco: 15, offshore: 20,
    garantias_mobiliarias: 5,
    ruaf_pensiones_estado: 0, ruaf_salud_estado: 0, ruaf_salud_tipo: 0,
    sisben: 0, sena: 0, libretamilitar_info: 0,
    runt_licencia_automoviles: 0, runt_licencia_restriccion: 0, runt_licencia_moto: 0,
    reputacional_news: 2, rues_estado: 0, registraduria: 0, rut: 0,
    sigep: 0, fopep: 0, simit: 3,
};

function calcularTusDatosScore(dict_hallazgos) {
    const td = dict_hallazgos || {};
    if ((td.altos || []).length > 0) {
        return { score: 100, desglose: [{ categoria: 'ALERTA MÁXIMA: Listas Restrictivas', detalle: 'Coincidencia en listas internacionales', puntos: 100, tipo: 'AUTOMATICO' }] };
    }
    
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
            if (esMedio) { 
                score += 5; 
                desglose.push({ categoria: h.hallazgo, detalle: '', puntos: 5, tipo: 'AUTOMATICO' }); 
            }
        }
    });
    
    return { score: Math.min(score, 60), desglose };
}

async function calcularRiesgoConsolidado(datos_formulario, alertas_manuales = [], calificacion_oficial = 'Bajo') {
    let puntos_totales = 0;
    let desglose = [];

    // 1. TUS DATOS (si existe)
    const dict_hallazgos = datos_formulario.monitor_fuentes?.dict_hallazgos || {};
    const tdResult = calcularTusDatosScore(dict_hallazgos);
    puntos_totales += tdResult.score;
    desglose.push(...tdResult.desglose);

    // 2. EVALUAR JURISDICCIÓN (Riesgo Geográfico)
    let dpto = datos_formulario.departamento_principal || datos_formulario.departamento || datos_formulario.departamento_empresa || '';
    let mun = datos_formulario.municipio_principal || datos_formulario.ciudad_principal || datos_formulario.municipio || datos_formulario.ciudad || datos_formulario.municipio_empresa || datos_formulario.ciudad_empresa || '';
    
    if (dpto.trim() || mun.trim()) {
        const { data } = await supabase.from('sagrilaft_jurisdicciones').select('departamento, municipio, nivel_riesgo').limit(2000);
        if (data && data.length > 0) {
            const normalizeStr = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            const j = data.find(jd => normalizeStr(jd.departamento) === normalizeStr(dpto) && normalizeStr(jd.municipio) === normalizeStr(mun));
            if (j) {
                let ptsJur = 0;
                const nivel = (j.nivel_riesgo || 'BAJO').toUpperCase();
                if (nivel === 'ALTO') ptsJur = 20;
                else if (nivel === 'MEDIO') ptsJur = 10;

                if (ptsJur > 0) {
                    puntos_totales += ptsJur;
                    desglose.push({ categoria: 'Riesgo Geográfico', detalle: `Ubicación: ${mun}, ${dpto} (Nivel ${nivel})`, puntos: ptsJur, tipo: 'AUTOMATICO' });
                }
            }
        }
    }

    // 3. PEP
    const esPep = String(datos_formulario.es_pep).toLowerCase() === 'si' || 
                  String(datos_formulario.declara_ser_pep).toLowerCase() === 'si' ||
                  String(datos_formulario.vinculo_familiar_pep).toLowerCase() === 'si';
    if (esPep) {
        puntos_totales += 15;
        desglose.push({ categoria: 'PEP (Persona Expuesta Políticamente)', detalle: 'El sujeto o vinculado es PEP declarado', puntos: 15, tipo: 'AUTOMATICO' });
    }

    // 4. ALERTAS MANUALES (Oficial)
    if (alertas_manuales && alertas_manuales.length > 0) {
        let ptsManuales = alertas_manuales.length * 15;
        puntos_totales += ptsManuales;
        desglose.push({
            categoria: 'Alertas Cualitativas (Manuales)',
            detalle: alertas_manuales.join(', '),
            puntos: ptsManuales,
            tipo: 'MANUAL'
        });
    }

    // 5. CALIFICACIÓN DEL OFICIAL (Juicio Experto)
    let ptsOficial = 0;
    if (calificacion_oficial.toLowerCase() === 'bajo') ptsOficial = 5;
    if (calificacion_oficial.toLowerCase() === 'medio') ptsOficial = 15;
    if (calificacion_oficial.toLowerCase() === 'alto') ptsOficial = 25;

    if (ptsOficial > 0) {
        puntos_totales += ptsOficial;
        desglose.push({
            categoria: 'Calificación Base (Oficial)',
            detalle: `El oficial asignó un riesgo cualitativo base: ${calificacion_oficial.toUpperCase()}`,
            puntos: ptsOficial,
            tipo: 'MANUAL'
        });
    }

    if (desglose.length === 0) {
        desglose.push({ categoria: 'Sin factores de riesgo', detalle: 'No se detectaron alertas', puntos: 0, tipo: 'AUTOMATICO' });
    }

    // 6. CALCULAR CATEGORÍA FINAL (0-33 BAJO | 34-66 MEDIO | 67-100 ALTO)
    const puntaje_final = Math.min(puntos_totales, 100);
    let nivel_final = 'BAJO';
    if (puntaje_final >= 34 && puntaje_final <= 66) nivel_final = 'MEDIO';
    if (puntaje_final > 66) nivel_final = 'ALTO';

    return {
        puntaje_total: puntaje_final,
        nivel_riesgo_final: nivel_final,
        desglose: desglose
    };
}

module.exports = { calcularRiesgoConsolidado, calcularTusDatosScore, PESOS_TUSDATOS };

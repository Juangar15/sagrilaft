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

const fs = require('fs');
const path = require('path');

let cargosData = {};
try {
    const p = path.join(__dirname, 'cargos_riesgos.json');
    cargosData = JSON.parse(fs.readFileSync(p, 'utf-8'));
} catch(e) {
    console.warn("No se pudo cargar cargos_riesgos.json");
}

async function calcularRiesgoConsolidado(datos_formulario, alertas_manuales = [], calificacion_oficial = 'Bajo', calificaciones_partes = null) {
    let puntos_totales = 0;
    let desglose = [];

    // 1. TUS DATOS (si existe) - NO SUMA PUNTOS (TusDatos no influye en el puntaje de riesgo)
    const dict_hallazgos = datos_formulario?.monitor_fuentes?.dict_hallazgos || {};
    const tdResult = calcularTusDatosScore(dict_hallazgos);
    const desgloseCero = tdResult.desglose.map(d => ({...d, puntos: 0}));
    desglose.push(...desgloseCero);

    // 2. RIESGO GEOGRÁFICO (Max 3 puntos)
    let dpto = datos_formulario?.departamento_principal || datos_formulario?.departamento || datos_formulario?.departamento_empresa || datos_formulario?.departamento_empresa_labora || datos_formulario?.departamento_juridica || '';
    let mun = datos_formulario?.municipio_principal || datos_formulario?.ciudad_principal || datos_formulario?.municipio || datos_formulario?.ciudad || datos_formulario?.municipio_empresa || datos_formulario?.ciudad_empresa || datos_formulario?.ciudad_empresa_labora || datos_formulario?.ciudad_juridica || '';
    
    if (dpto.trim() || mun.trim()) {
        const { data } = await supabase.from('sagrilaft_jurisdicciones').select('departamento, municipio, nivel_riesgo').limit(2000);
        if (data && data.length > 0) {
            const normalizeStr = (str) => (str || '').normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
            const j = data.find(jd => normalizeStr(jd.departamento) === normalizeStr(dpto) && normalizeStr(jd.municipio) === normalizeStr(mun));
            if (j) {
                let ptsJur = 0;
                const nivel = (j.nivel_riesgo || 'BAJO').toUpperCase();
                if (nivel === 'ALTO') ptsJur = 3;
                else if (nivel === 'MEDIO') ptsJur = 1;

                if (ptsJur > 0) {
                    puntos_totales += ptsJur;
                    desglose.push({ categoria: 'Riesgo Geográfico', detalle: `Ubicación: ${mun}, ${dpto} (Nivel ${nivel})`, puntos: ptsJur, tipo: 'AUTOMATICO' });
                }
            }
        }
    }

    // 3. RIESGO POR CARGO (Max 3 puntos - Solo aplica a empleados, en terceros/proveedores no aplica)
    const esProveedor = (datos_formulario?.tipo_vinculacion || '').toLowerCase() === 'proveedor';
    if (!esProveedor) {
        let cargo = (datos_formulario?.cargo_asignado || datos_formulario?.cargo || '').normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
        cargo = cargo.replace(/\s+/g, ' '); // quitar multiples espacios
        if (cargo && cargosData[cargo]) {
            const infoCargo = cargosData[cargo];
            puntos_totales += infoCargo.puntaje;
            desglose.push({ categoria: 'Riesgo por Cargo', detalle: `Cargo: ${infoCargo.cargo} (Riesgo ${infoCargo.riesgo})`, puntos: infoCargo.puntaje, tipo: 'AUTOMATICO' });
        }
    }

    // 4. CALIFICACIÓN DEL OFICIAL (Max 4 puntos)
    // En terceros/proveedores: la calificación se asigna individualmente a cada una de las partes
    // (razón social, representante legal, accionistas, sub-accionistas) y se calcula el promedio.
    // En empleados: se asigna una calificación global única.
    let ptsOficial = 0;
    let nivelCalificacionOficial = (calificacion_oficial || 'Bajo').toUpperCase();
    const partesEval = calificaciones_partes || datos_formulario?.calificaciones_partes || null;

    if (partesEval && typeof partesEval === 'object' && Object.keys(partesEval).length > 0) {
        const valorPuntos = { bajo: 0, medio: 2, alto: 4 };
        const keys = Object.keys(partesEval);
        let sumaPuntos = 0;
        let conteo = { Bajo: 0, Medio: 0, Alto: 0 };

        keys.forEach(k => {
            const v = (partesEval[k] || 'Bajo').toString().toLowerCase();
            const pts = valorPuntos[v] !== undefined ? valorPuntos[v] : 0;
            sumaPuntos += pts;
            const norm = v === 'alto' ? 'Alto' : v === 'medio' ? 'Medio' : 'Bajo';
            conteo[norm] = (conteo[norm] || 0) + 1;
        });

        const promedio = keys.length > 0 ? (sumaPuntos / keys.length) : 0;
        ptsOficial = Math.round(promedio); // Redondeado a entero para almacenamiento en BD

        if (promedio >= 3) nivelCalificacionOficial = 'ALTO';
        else if (promedio >= 1.5) nivelCalificacionOficial = 'MEDIO';
        else nivelCalificacionOficial = 'BAJO';

        puntos_totales += ptsOficial;
        desglose.push({
            categoria: 'Calificación Oficial (Promedio de Partes)',
            detalle: `Promedio de ${keys.length} partes evaluadas (${conteo.Bajo} Bajo, ${conteo.Medio} Medio, ${conteo.Alto} Alto): ${promedio.toFixed(2)} pts → Nivel ${nivelCalificacionOficial}`,
            puntos: ptsOficial,
            tipo: 'MANUAL'
        });
    } else {
        if (calificacion_oficial.toLowerCase() === 'medio') ptsOficial = 2;
        if (calificacion_oficial.toLowerCase() === 'alto') ptsOficial = 4;

        if (ptsOficial > 0) {
            puntos_totales += ptsOficial;
            desglose.push({
                categoria: 'Calificación Base (Oficial)',
                detalle: `El oficial asignó un riesgo cualitativo base: ${calificacion_oficial.toUpperCase()}`,
                puntos: ptsOficial,
                tipo: 'MANUAL'
            });
        }
    }

    if (desglose.length === 0) {
        desglose.push({ categoria: 'Sin factores de riesgo', detalle: 'No se detectaron alertas', puntos: 0, tipo: 'AUTOMATICO' });
    }

    // 5. CALCULAR CATEGORÍA FINAL (0-3 BAJO | 4-6 MEDIO | 7-10 ALTO)
    const puntaje_final = Math.min(puntos_totales, 10);
    let nivel_final = 'BAJO';
    if (puntaje_final >= 4 && puntaje_final <= 6) nivel_final = 'MEDIO';
    if (puntaje_final >= 7) nivel_final = 'ALTO';

    return {
        puntaje_total: puntaje_final,
        nivel_riesgo_final: nivel_final,
        calificacion_oficial_consolidada: nivelCalificacionOficial,
        desglose: desglose
    };
}

module.exports = { calcularRiesgoConsolidado, calcularTusDatosScore, PESOS_TUSDATOS };
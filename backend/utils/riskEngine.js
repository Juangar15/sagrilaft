const supabase = require('../supabase');

/**
 * Calcula el nivel de riesgo consolidado cruzando los datos del formulario, 
 * la matriz, la jurisdicción y el juicio del Oficial.
 * 
 * @param {Object} datos_formulario Los datos JSON extraídos de la solicitud
 * @param {Array} alertas_manuales Array de códigos de alertas marcadas por la Oficial
 * @param {String} calificacion_oficial 'Bajo', 'Medio' o 'Alto'
 * @returns {Object} Desglose completo de la puntuación
 */
async function calcularRiesgoConsolidado(datos_formulario, alertas_manuales = [], calificacion_oficial = 'Bajo') {
    let puntos_totales = 0;
    let desglose = [];

    // 1. EVALUAR JURISDICCIÓN (Riesgo Geográfico)
    let dpto = datos_formulario.departamento_principal || datos_formulario.departamento || datos_formulario.departamento_empresa || '';
    let mun = datos_formulario.municipio_principal || datos_formulario.ciudad_principal || datos_formulario.municipio || datos_formulario.ciudad || datos_formulario.municipio_empresa || datos_formulario.ciudad_empresa || '';
    
        // Normalizar para la búsqueda (Sin acentos)
    const buscarJurisdiccion = async () => {
        if (!dpto.trim() && !mun.trim()) return null;
        
        const { data } = await supabase
            .from('sagrilaft_jurisdicciones')
            .select('departamento, municipio, nivel_riesgo, porcentaje')
            .limit(2000);
            
        if (data && data.length > 0) {
            const normalizeStr = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            const dptoNorm = normalizeStr(dpto);
            const munNorm = normalizeStr(mun);
            
            const j = data.find(jd => 
                normalizeStr(jd.departamento) === dptoNorm && 
                normalizeStr(jd.municipio) === munNorm
            );
            return j || null;
        }
        return null;
    };

    const jur = await buscarJurisdiccion();
    if (jur) {
        let ptsJur = parseFloat(jur.porcentaje) || 0;
        puntos_totales += ptsJur;
        desglose.push({
            categoria: 'Riesgo Geográfico',
            detalle: `Ubicación: ${jur.municipio}, ${jur.departamento} (Nivel ${jur.nivel_riesgo})`,
            puntos: ptsJur,
            tipo: 'AUTOMÁTICO'
        });
    } else {
        desglose.push({
            categoria: 'Riesgo Geográfico',
            detalle: `Ubicación no encontrada en tabla de riesgo (${mun}, ${dpto})`,
            puntos: 0,
            tipo: 'AUTOMÁTICO'
        });
    }

    // 2. EVALUAR MATRIZ (Riesgos Automáticos basados en el formulario)
    let alertas_automaticas = [];
    
    // Regla 1: PEP
    if (datos_formulario.es_pep === 'si' || datos_formulario.rep_legal_pep === 'si' || datos_formulario.accionistas_pep === 'si') {
        alertas_automaticas.push('PEP'); 
    }
    // Regla 2: Operaciones Internacionales
    if (datos_formulario.operaciones_internacionales === 'si') {
        alertas_automaticas.push('OP_INT'); 
    }
    // Regla 3: Moneda Virtual / Criptoactivos
    if (datos_formulario.operaciones_criptoactivos === 'si') {
        alertas_automaticas.push('CRIPTO'); 
    }

    // Unir las automáticas con las manuales elegidas por el Oficial
    const todas_las_alertas = [...alertas_automaticas, ...alertas_manuales];

    // Simular puntaje por alertas (Esto luego se cruzará exacto con la tabla de la matriz si tienes códigos específicos)
    // Por ahora asignaremos pesos estándar si la alerta existe
    let puntosMatriz = 0;
    let detalleMatriz = [];

    todas_las_alertas.forEach(alerta => {
        let pts = 0;
        if (alerta === 'PEP') pts = 15;
        if (alerta === 'OP_INT') pts = 10;
        if (alerta === 'CRIPTO') pts = 20;
        
        // Si es una alerta cualitativa manual genérica
        if (alertas_manuales.includes(alerta)) pts = 15; // Riesgo cualitativo pesa fuerte

        puntosMatriz += pts;
        detalleMatriz.push(`${alerta} (+${pts})`);
    });

    if (puntosMatriz > 0) {
        puntos_totales += puntosMatriz;
        desglose.push({
            categoria: 'Riesgo Contraparte (Matriz)',
            detalle: `Alertas detectadas: ${detalleMatriz.join(', ')}`,
            puntos: puntosMatriz,
            tipo: alertas_manuales.length > 0 ? 'MIXTO' : 'AUTOMÁTICO'
        });
    }

    // 3. CALIFICACIÓN DEL OFICIAL (Juicio Experto)
    let ptsOficial = 0;
    if (calificacion_oficial.toLowerCase() === 'bajo') ptsOficial = 10;
    if (calificacion_oficial.toLowerCase() === 'medio') ptsOficial = 20;
    if (calificacion_oficial.toLowerCase() === 'alto') ptsOficial = 30;

    puntos_totales += ptsOficial;
    desglose.push({
        categoria: 'Calificación Inicial Oficial',
        detalle: `El oficial determinó un riesgo base: ${calificacion_oficial.toUpperCase()}`,
        puntos: ptsOficial,
        tipo: 'MANUAL'
    });

    // 4. CALCULAR CATEGORÍA FINAL (0-33 BAJO | 34-66 MEDIO | 67-100 ALTO)
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

module.exports = {
    calcularRiesgoConsolidado
};

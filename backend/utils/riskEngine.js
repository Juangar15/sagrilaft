const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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
    let dpto = datos_formulario.departamento || '';
    let mun = datos_formulario.municipio || '';
    
    // Normalizar para la búsqueda
    const buscarJurisdiccion = async () => {
        const { data } = await supabase
            .from('sagrilaft_jurisdicciones')
            .select('*')
            .ilike('departamento', `%${dpto.trim()}%`)
            .ilike('municipio', `%${mun.trim()}%`)
            .limit(1);
        return data && data.length > 0 ? data[0] : null;
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

    // 4. CALCULAR CATEGORÍA FINAL
    // Escala teórica sobre 100 puntos (configurable según política interna)
    let nivel_final = 'BAJO';
    if (puntos_totales >= 40 && puntos_totales <= 65) nivel_final = 'MEDIO';
    if (puntos_totales > 65) nivel_final = 'ALTO';

    return {
        puntaje_total: puntos_totales,
        nivel_riesgo_final: nivel_final,
        desglose: desglose
    };
}

module.exports = {
    calcularRiesgoConsolidado
};

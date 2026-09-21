import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add DeleteObjectCommand to imports
import_line = "const { S3Client, PutObjectCommand, CopyObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');"
if import_line in c:
    c = c.replace(import_line, "const { S3Client, PutObjectCommand, CopyObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');")
else:
    c = re.sub(r'const \{ ([^}]+) \} = require\(\'@aws-sdk/client-s3\'\);', r'const { \1, DeleteObjectCommand } = require(\'@aws-sdk/client-s3\');', c)

# 2. Add moveFileInR2 and reubicarCarpetaR2
new_functions = """
async function moveFileInR2(sourceUrl, destinationFolder, filename) {
    if (!sourceUrl || !sourceUrl.includes(process.env.R2_PUBLIC_URL)) return sourceUrl;
    const urlObj = new URL(sourceUrl);
    // Para CopySource se necesita codificado, para Key (borrar) se necesita decodificado
    const sourceKeyEncoded = urlObj.pathname.substring(1); 
    const sourceKeyDecoded = decodeURIComponent(sourceKeyEncoded);
    const destKey = `${destinationFolder}/${filename}`;
    
    if (sourceKeyDecoded === destKey) return sourceUrl;

    try {
        await s3Client.send(new CopyObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            CopySource: `${process.env.R2_BUCKET_NAME}/${sourceKeyEncoded}`,
            Key: destKey
        }));
        await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: sourceKeyDecoded
        }));
        // URL devuelta codifica espacios para que el browser la lea bien
        return `https://${process.env.R2_PUBLIC_URL}/${destKey.replace(/ /g, '%20')}`;
    } catch (err) {
        console.error("Error moviendo archivo en R2:", err.message);
        return sourceUrl;
    }
}

async function reubicarCarpetaR2(sol, puntajeNuevo, estadoNuevo) {
    if (!['APROBADO_LIMPIO', 'REVISION_MANUAL', 'ALERTA_CRITICA', 'RECHAZADO'].includes(sol.estado_actual)) return sol;

    const nit = sol.nit_cedula;
    const tipoVinculacion = sol.tipo_vinculacion || '';
    const formAprobacion = sol.datos_formulario?.analisis_oficial || {};
    
    const { area, cargo, estado_vinculacion } = formAprobacion;
    const isEmpleado = ['empleado', 'prestacion_servicios', 'contratista'].includes(tipoVinculacion.toLowerCase());
    
    // Extraemos el a?o del primer archivo cargado o usamos el actual
    let year = new Date().getFullYear();
    const unArchivo = Object.values(sol.datos_formulario?.archivos_cargados || {})[0];
    if (unArchivo && typeof unArchivo === 'string' && unArchivo.includes('sagrilaft/')) {
        const parts = unArchivo.split('/');
        const yearIndex = parts.indexOf('empleados') !== -1 ? parts.indexOf('empleados') + 1 : parts.indexOf('terceros') + 1;
        if (yearIndex > 0 && parts[yearIndex]) year = parts[yearIndex];
    }
    const folderRoot = isEmpleado ? `sagrilaft/empleados/${year}` : `sagrilaft/terceros/${year}`;

    let oldScore = sol.score_riesgo || 0;
    let oldColor = 'verde';
    if (oldScore >= 33.34 && oldScore <= 66.66) oldColor = 'amarillo';
    if (oldScore > 66.66) oldColor = 'rojo';
    const oldStatusFolder = sol.estado_actual === 'APROBADO_LIMPIO' ? 'aceptados' : 'no_aceptados';

    let newScore = puntajeNuevo || 0;
    let newColor = 'verde';
    if (newScore >= 33.34 && newScore <= 66.66) newColor = 'amarillo';
    if (newScore > 66.66) newColor = 'rojo';
    const newStatusFolder = estadoNuevo === 'APROBADO_LIMPIO' ? 'aceptados' : 'no_aceptados';

    let oldFolderR2 = '';
    let newFolderR2 = '';

    if (isEmpleado) {
        const areaStr = area || 'sin_area';
        const cargoStr = cargo || 'sin_cargo';
        const vinculacionStr = estado_vinculacion || 'vinculados';
        oldFolderR2 = `${folderRoot}/${oldStatusFolder}/${vinculacionStr}/${areaStr}/${cargoStr}/${oldColor}/${nit}`;
        newFolderR2 = `${folderRoot}/${newStatusFolder}/${vinculacionStr}/${areaStr}/${cargoStr}/${newColor}/${nit}`;
    } else {
        oldFolderR2 = `${folderRoot}/${oldStatusFolder}/${oldColor}/${nit}`;
        newFolderR2 = `${folderRoot}/${newStatusFolder}/${newColor}/${nit}`;
    }

    if (oldFolderR2 !== newFolderR2) {
        console.log(`Reubicando archivos de ${oldFolderR2} a ${newFolderR2}`);
        let archivosActualizados = {};
        let archivosAnteriores = sol.datos_formulario?.archivos_cargados || {};
        
        for (const [key, url] of Object.entries(archivosAnteriores)) {
            if (url.includes(process.env.R2_PUBLIC_URL) && url.includes(`/${oldColor}/`)) { // Check oldColor to ensure we only move if it was in the old folder
                const filename = decodeURIComponent(url.split('/').pop());
                const newUrl = await moveFileInR2(url, newFolderR2, filename);
                archivosActualizados[key] = newUrl;
            } else {
                archivosActualizados[key] = url;
            }
        }
        
        const dt = new Date().toLocaleDateString('es-CO');
        sol.datos_formulario.riesgo_anterior = {
            riesgo: oldColor,
            fecha: dt,
            score: oldScore
        };
        sol.datos_formulario.archivos_cargados = archivosActualizados;
    }
    return sol;
}

// Funci?n auxiliar para copiar en S3/R2"""

c = c.replace("// Funci?n auxiliar para copiar en S3/R2", new_functions)
c = c.replace("// Función auxiliar para copiar en S3/R2", new_functions)

# 3. Use it in recalcular-scores
old_recalcular = """                const newForm = { ...sol.datos_formulario, desglose_riesgo: calc };
                await supabase.from('solicitudes_sagrilaft').update({
                    score_riesgo: puntajeNuevo,
                    datos_formulario: newForm,
                    estado_actual: nuevoEstado
                }).eq('id', sol.id);"""

new_recalcular = """                let newForm = { ...sol.datos_formulario, desglose_riesgo: calc };
                let solModificada = { ...sol, datos_formulario: newForm };
                
                // Intentar reubicar en R2 si cambi?
                solModificada = await reubicarCarpetaR2(solModificada, puntajeNuevo, nuevoEstado);

                await supabase.from('solicitudes_sagrilaft').update({
                    score_riesgo: puntajeNuevo,
                    datos_formulario: solModificada.datos_formulario,
                    estado_actual: nuevoEstado
                }).eq('id', sol.id);"""
                
c = c.replace(old_recalcular, new_recalcular)

# 4. Use it in guardar-riesgo
old_guardar = """        // Todo va dentro de datos_formulario ? no existen columnas sueltas para analisis_oficial, etc.
        const datosActualizados = {
            ...(sol.datos_formulario || {}),
            analisis_oficial: formOficial,
            calificacion_oficial: formOficial?.calificacion_oficial || 'Bajo',
            alertas_manuales: formOficial?.alertas_manuales || [],
            desglose_riesgo: resultadoRiesgo
        };

        const { error: errUpd } = await supabase.from('solicitudes_sagrilaft').update({
            datos_formulario: datosActualizados,
            estado_actual: nuevoEstado,
            score_riesgo: resultadoRiesgo.puntaje_total
        }).eq('id', id);"""

new_guardar = """        // Todo va dentro de datos_formulario ? no existen columnas sueltas para analisis_oficial, etc.
        let datosActualizados = {
            ...(sol.datos_formulario || {}),
            analisis_oficial: formOficial,
            calificacion_oficial: formOficial?.calificacion_oficial || 'Bajo',
            alertas_manuales: formOficial?.alertas_manuales || [],
            desglose_riesgo: resultadoRiesgo
        };
        
        let solModificada = { ...sol, datos_formulario: datosActualizados };
        solModificada = await reubicarCarpetaR2(solModificada, resultadoRiesgo.puntaje_total, nuevoEstado);

        const { error: errUpd } = await supabase.from('solicitudes_sagrilaft').update({
            datos_formulario: solModificada.datos_formulario,
            estado_actual: nuevoEstado,
            score_riesgo: resultadoRiesgo.puntaje_total
        }).eq('id', id);"""

c = c.replace(old_guardar, new_guardar)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(c)

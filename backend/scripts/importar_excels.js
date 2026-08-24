require('dotenv').config({ path: '../.env' }); // Cargar variables del servidor superior si aplica o en la misma carpeta
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function importarJurisdicciones() {
    console.log("Importando Jurisdicciones...");
    try {
        const filePath = path.join(require('os').homedir(), 'Desktop', 'Jurisdicciones con codigos postales.xlsx');
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        let inserts = data.map(row => {
            return {
                departamento: row['Departamento']?.toString() || '',
                municipio: row['Municipio']?.toString() || '',
                codigo_postal: row['Codigo postal ']?.toString() || '',
                nivel_riesgo: row['Nivel de Riesgo']?.toString() || '',
                porcentaje: parseFloat(row['Porcentaje '] || 0) || 0
            };
        }).filter(r => r.departamento && r.municipio); // Filtrar filas vacías

        // Subir en lotes para evitar límites de API
        const batchSize = 100;
        for (let i = 0; i < inserts.length; i += batchSize) {
            const batch = inserts.slice(i, i + batchSize);
            const { error } = await supabase.from('sagrilaft_jurisdicciones').insert(batch);
            if (error) throw error;
        }
        
        console.log(`✅ Jurisdicciones importadas correctamente: ${inserts.length} registros.`);
    } catch (error) {
        console.error("❌ Error importando jurisdicciones:", error.message);
    }
}

async function importarMatriz() {
    console.log("\nImportando Matriz de Riesgos...");
    try {
        const filePath = path.join(require('os').homedir(), 'Desktop', 'Matriz SAGRILAFT - SELECTA COMPANIA DE CEREALES SAS 2025.xlsx');
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames.find(n => n.includes('SAGRILAFT')) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // La tabla tiene encabezados un poco desfasados o múltiples líneas de título.
        // Vamos a usar raw y procesarlo manualmente basándonos en la vista anterior.
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        
        // Encontrar fila de encabezados (buscamos "CODIGO RIESGO")
        let headerIndex = -1;
        for(let i = 0; i < 10; i++) {
            if (data[i] && data[i].includes('CODIGO RIESGO')) {
                headerIndex = i;
                break;
            }
        }

        if (headerIndex === -1) throw new Error("No se encontraron los encabezados de la matriz");

        const headers = data[headerIndex];
        let inserts = [];

        for (let i = headerIndex + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[headers.indexOf('CODIGO RIESGO')]) continue; // Saltar vacías

            inserts.push({
                codigo_riesgo: row[headers.indexOf('CODIGO RIESGO')] || '',
                evento_riesgo: row[headers.indexOf('EVENTO DE RIESGO')] || '',
                fuente_riesgo: row[headers.indexOf('FUENTE DE RIESGO')] || '',
                causas: row[headers.indexOf('CAUSAS DEL RIESGO INHERENTE')] || '',
                senales_alerta: row[headers.indexOf('SEÑALES DE ALERTA')] || '',
                riesgo_asociado: row[headers.indexOf('RIESGO ASOCIADO')] || '',
                escala_frecuencia: parseFloat(row[headers.indexOf('ESCALA DE FRECUENCIA (Calificación) ')]) || 0,
                escala_impacto: parseFloat(row[headers.indexOf('ESCALA DE IMPACTO')]) || 0,
                riesgo_inherente: parseFloat(row[headers.indexOf('RIESGO INHERENTE')]) || 0,
                tratamiento: row[headers.indexOf('TRATAMIENTO DEL RIESGO')] || row[headers.indexOf('MITIGAR')] || '',
                tipo_control: row[headers.indexOf('TIPO DE CONTROL')] || ''
            });
        }

        const { error } = await supabase.from('sagrilaft_matriz').insert(inserts);
        if (error) throw error;
        
        console.log(`✅ Matriz importada correctamente: ${inserts.length} registros.`);
    } catch (error) {
        console.error("❌ Error importando matriz:", error.message);
    }
}

async function run() {
    console.log("Iniciando migración de datos...");
    await importarJurisdicciones();
    await importarMatriz();
    console.log("Migración finalizada.");
}

run();

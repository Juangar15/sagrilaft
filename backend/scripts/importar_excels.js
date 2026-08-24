require('dotenv').config({ path: '../.env' }); // Cargar variables del servidor superior si aplica o en la misma carpeta
require('dotenv').config();
global.WebSocket = require('ws'); // Parche necesario para Node.js 20+ con Supabase

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

        // Primero borramos la tabla jurisdicciones para evitar duplicados
        await supabase.from('sagrilaft_jurisdicciones').delete().neq('id', '00000000-0000-0000-0000-000000000000');

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
        const filePath = path.join(require('os').homedir(), 'Desktop', 'Matriz SAGRILAFT - SELECTA COMPAÑIA DE CEREALES SAS 2025.xlsx');
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

        for (let i = headerIndex + 2; i < data.length; i++) { // saltamos la fila secundaria de encabezados
            const row = data[i];
            if (!row || !row[1]) continue; // Saltar si no hay CODIGO RIESGO en índice 1

            const safe = (idx) => row[idx] ? row[idx].toString().trim() : '';
            const safeNum = (idx) => parseFloat(row[idx]) || 0;

            // Determinar Tratamiento (Índices 9 y 10 basados en la estructura del Excel)
            let tratamiento = '';
            if (safe(9).toUpperCase() === 'X') tratamiento = 'EVITAR';
            else if (safe(10).toUpperCase() === 'X') tratamiento = 'MITIGAR';

            inserts.push({
                codigo_riesgo: safe(0),
                evento_riesgo: safe(1),
                fuente_riesgo: safe(2),
                causas: safe(3),
                senales_alerta: safe(4),
                riesgo_asociado: safe(5),
                escala_frecuencia: safeNum(6),
                escala_impacto: safeNum(7),
                riesgo_inherente: safeNum(8),
                tratamiento: tratamiento,
                descripcion_controles: safe(15),
                tipo_control: safe(16),
                clase_control: safe(17),
                frecuencia_control: safe(18),
                area_responsable: safe(19),
                escala_frecuencia_residual: safeNum(20),
                escala_impacto_residual: safeNum(21),
                riesgo_residual: safeNum(22),
                monitoreo: safe(23)
            });
        }

        // Primero borramos la tabla matriz para volverla a subir limpia
        await supabase.from('sagrilaft_matriz').delete().neq('id', '00000000-0000-0000-0000-000000000000');

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

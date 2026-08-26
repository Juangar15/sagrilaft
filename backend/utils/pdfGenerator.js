const PDFDocument = require('pdfkit-table');

/**
 * Genera un PDF de Evidencia de Debida Diligencia con validez legal/trazabilidad.
 */
async function generarEvidenciaPDF(solicitud, finalData, empresa_destino) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // 1. Cabecera Institucional
            const nombreEmpresaFull = empresa_destino === 'selecta' 
                ? 'SELECTA COMPAÑÍA DE CEREALES S.A.S.' 
                : 'COSECHAS BEBIDAS NATURALES S.A.S.';
            
            doc.fontSize(16).font('Helvetica-Bold').text('REPORTE OFICIAL DE DEBIDA DILIGENCIA', { align: 'center' });
            doc.fontSize(12).font('Helvetica').text('Consulta en Listas Restrictivas y Bases de Datos (SAGRILAFT)', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica-Oblique').text(`Emitido para: ${nombreEmpresaFull}`, { align: 'center' });
            doc.moveDown(2);

            // 2. Metadatos de Trazabilidad (Validez Legal)
            doc.fontSize(12).font('Helvetica-Bold').text('1. INFORMACIÓN DE TRAZABILIDAD');
            doc.moveDown(0.5);
            
            doc.fontSize(10).font('Helvetica');
            const fechaActual = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
            const metadata = [
                `Fecha y Hora de Consulta: ${fechaActual}`,
                `Proveedor Tecnológico: TusDatos.co (vía integración API)`,
                `ID de Reporte (Trazabilidad): ${finalData.id || 'N/A'}`,
                `Sujeto Consultado: ${solicitud.razon_social || solicitud.nombre_representante || 'N/A'}`,
                `Identificación: ${solicitud.nit_cedula || 'N/A'}`
            ];
            
            metadata.forEach(line => doc.text(line, { indent: 15 }));
            doc.moveDown(2);

            // 3. Resumen Ejecutivo
            doc.fontSize(12).font('Helvetica-Bold').text('2. RESUMEN EJECUTIVO');
            doc.moveDown(0.5);
            
            const hallazgo = finalData.hallazgo ? 'SÍ (Posible Alerta)' : 'NO (Sin hallazgos / Limpio)';
            doc.fontSize(10).font('Helvetica');
            doc.text(`¿Se encontraron hallazgos o coincidencias?: `, { continued: true, indent: 15 })
               .font('Helvetica-Bold').text(hallazgo);
            
            const fuentes_detalladas = finalData.results || {};
            const totalFuentes = Object.keys(fuentes_detalladas).length;
            doc.font('Helvetica').text(`Total de bases de datos consultadas exitosamente: ${totalFuentes}`, { indent: 15 });
            doc.moveDown(2);

            // 4. Detalle de Fuentes (Tabla)
            doc.fontSize(12).font('Helvetica-Bold').text('3. DETALLE DE FUENTES CONSULTADAS');
            doc.moveDown(0.5);

            const tableRows = [];
            for (const [fuente, valor] of Object.entries(fuentes_detalladas)) {
                let resultadoStr = '';
                if (valor === false) resultadoStr = 'No registra / Limpio';
                else if (valor === true) resultadoStr = 'SÍ REGISTRA (Hallazgo)';
                else resultadoStr = String(valor);

                tableRows.push([fuente, resultadoStr]);
            }

            const tableArray = {
                headers: ["Base de Datos / Fuente Consultada", "Resultado de la Consulta"],
                rows: tableRows
            };

            doc.table(tableArray, {
                prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font('Helvetica').fontSize(9);
                }
            });

            // 5. Pie de página legal
            doc.moveDown(2);
            doc.fontSize(8).font('Helvetica-Oblique').fillColor('gray');
            const disclaimer = "Este documento es generado automáticamente por el sistema de Gestión de Cumplimiento SAGRILAFT. " +
                "La información contenida proviene de fuentes de acceso público y bases de datos oficiales consolidadas a través del proveedor TusDatos.co. " +
                "Su uso es estrictamente confidencial y para fines de evaluación de riesgo LA/FT/FPADM.";
            doc.text(disclaimer, { align: 'justify' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generarEvidenciaPDF };

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
            const identificacion = solicitud.numero_identificacion || solicitud.nit || solicitud.nit_cedula || 'N/A';
            let nombre = solicitud.nombre_razon_social || solicitud.razon_social || 'N/A';
            if (nombre === 'N/A' && solicitud.nombres) {
                nombre = solicitud.nombres + (solicitud.apellidos ? ' ' + solicitud.apellidos : '');
            }

            const metadata = [
                `Fecha y Hora de Consulta: ${fechaActual}`,
                `Proveedor Tecnológico: TusDatos.co (vía integración API)`,
                `ID de Reporte (Trazabilidad): ${finalData.id || finalData.jobid || 'N/A'}`,
                `Sujeto Consultado: ${nombre}`,
                `Identificación: ${identificacion}`
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
                let detalles = [];

                if (valor === true && finalData.dict_hallazgos) {
                    for (const cat of ['altos', 'medios', 'bajos', 'infos']) {
                        const items = finalData.dict_hallazgos[cat] || [];
                        const matches = items.filter(i => 
                            i.codigo === fuente || 
                            i.fuente === fuente || 
                            fuente.includes(i.codigo) || 
                            i.codigo.includes(fuente.split('_')[0])
                        );
                        
                        matches.forEach(match => {
                            let texto = match.hallazgo || '';
                            if (match.descripcion && match.descripcion !== texto) {
                                texto += texto ? ' - ' + match.descripcion : match.descripcion;
                            }
                            if (texto && texto.trim() !== '') {
                                detalles.push(texto.trim());
                            }
                        });
                    }
                }
                
                const detalle = [...new Set(detalles)].join(' | ');

                if (valor === false) resultadoStr = 'No registra / Limpio';
                else if (valor === true) resultadoStr = 'SÍ REGISTRA (Hallazgo)' + (detalle ? `\nDetalle: ${detalle}` : '');
                else if (valor === 'Error' || valor === 'Página no disponible') resultadoStr = valor;
                else if (valor === null || valor === '') resultadoStr = 'No registra / Limpio';
                else resultadoStr = String(valor);

                const mapNombres = {
                    libretamilitar: 'Libreta Militar', personeria_bogota: 'Personería de Bogotá',
                    reputacional: 'Análisis Reputacional', contaduria: 'Contaduría General de la Nación',
                    cidob: 'CIDOB Peps nivel mundial', defunciones_registraduria: 'Defunciones Registraduría',
                    juzgados_tyba: 'Juzgados Tyba - Justicia XXI', policia: 'Policía Nacional de Colombia',
                    ofac: 'Offshore Leaks Database / OFAC', rut: 'Registro Único Tributario (RUT)'
                };
                const nombreFuente = mapNombres[fuente] || fuente.replace(/_/g, ' ').toUpperCase();

                tableRows.push([nombreFuente, resultadoStr]);
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

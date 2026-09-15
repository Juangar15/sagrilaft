const PDFDocument = require('pdfkit-table');

async function generarDeclaracionPEPPDF(formData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const empresaFull = formData.empresa_destino === 'selecta' ? 'SELECTA COMPAÑIA DE CEREALES S.A.S' : 'COSECHAS BEBIDAS NATURALES S.A.S';
            const municipio = formData.empresa_destino === 'selecta' ? 'la Estrella' : 'Medellín';

            doc.fontSize(14).font('Helvetica-Bold').text('FORMATO PERSONA PÚBLICA O POLÍTICAMENTE EXPUESTA', { align: 'center' });
            doc.moveDown(2);

            doc.fontSize(10).font('Helvetica');
            const p1 = `Yo ${formData.nombres || ''} ${formData.primer_apellido || ''} ${formData.segundo_apellido || ''} identificado(a) con cédula de ciudadanía No ${formData.numero_identificacion} expedida en ${formData.lugar_expedicion || '_______________'} actuando en mi nombre y/o en representación de ${formData.razon_social || '_______________'} y dando certeza de que todo lo consignado aquí es cierto, realizo la siguiente declaración de origen de fondos con el propósito de dar cumplimiento a lo señalado en la circular externa 07 de 1996 de la Superfinanciera, el estatuto orgánico del sistema financiero EOSF decreto 663 de 1993, ley 190 de 1996 y para dar cumplimiento a lo establecido en la circular externa 100-000016 del 24 de diciembre del 2020 de la Superintendencia de Sociedades, la ley 1121 de 2006 y demás normas concordantes.`;
            doc.text(p1, { align: 'justify' });
            doc.moveDown();

            doc.text('Declaro que mi familia en primer, segundo y tercer grado de afinidad son:');
            doc.moveDown();

            const familiares = formData.pep_familiares_extendido || [];
            if (familiares.length > 0) {
                const table = {
                    headers: ['NOMBRES Y APELLIDOS', 'CÉDULA O IDENTIFICACIÓN', 'PARENTESCO'],
                    rows: familiares.map(f => [f.nombre || '', f.identificacion || '', f.parentesco || ''])
                };
                doc.table(table, {
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9),
                    prepareRow: (row, i) => doc.font('Helvetica').fontSize(9)
                });
            } else {
                doc.text('NO APLICA / NO REGISTRA', { font: 'Helvetica-Oblique' });
            }
            doc.moveDown();

            const p2 = `${empresaFull} es una Entidad debidamente establecida en Colombia, con sede en el Municipio de ${municipio} (Antioquia), se encuentra vigilada por la Superintendencia de sociedades, y tiene implementado un Sistema de Auto Control y Gestión del Riesgo de Lavado de Activos y de la Financiación del Terrorismo (SAGRILAFT), en cumplimiento de lo establecido en la Circular Básica Jurídica 100-000016 DE 24 DE DICIEMBRE DE 2020 de las SuperSociedades desde 01 de septiembre de 2021, lo mismo que las recomendaciones y mejores prácticas internacionales en esta materia.`;
            const p3 = `Las políticas, controles y procedimientos implementados, dentro de un concepto de administración del riesgo, son acciones que buscan la debida diligencia para prevenir el uso de nuestra institución por organizaciones criminales para propósitos ilícitos. Dichas acciones incluyen entre otros aspectos, el conocimiento del cliente y de sus operaciones con nuestra Entidad, definición de segmentos de mercado por nosotros atendidos, monitoreo de transacciones, capacitación al personal y reportes de operaciones sospechosas a la autoridad competente.`;
            
            doc.text(p2, { align: 'justify' });
            doc.moveDown();
            doc.text(p3, { align: 'justify' });
            doc.moveDown();

            doc.text(`Por lo anterior manifiesto de manera voluntaria a ${empresaFull}:`);
            doc.moveDown(0.5);

            const items = [
                `Los recursos que entregue en forma de pago, abono o cualquier servicio que nos preste por parte de ${empresaFull} proviene de mi trabajo o actividad comercial y de actividades legales.`,
                `Declaro que los recursos que le entregue a ${empresaFull} en cualquier parte del territorio colombiano no provienen de ninguna actividad ilícita de las contempladas en el Código penal colombiano o actos de corrupción pública o privada, ni efectuare transacciones destinadas a tales actividades o en favor de personas relacionadas con ellas.`,
                `No admitiré que terceros efectúen depósitos a mis cuentas con fondos provenientes de actividades ilícitas.`,
                `Autorizo a ${empresaFull} a cancelar el contrato o la relación comercial, en el caso que detecten operaciones inusuales o sospechosas en el giro de mis actividades o actos de corrupción.`,
                `Exonero de toda responsabilidad a ${empresaFull}, si se llegare a presentar en mi nombre o de la empresa, cualquier asomo de ilegalidad en nuestras actividades, teniendo la certeza lo único que hace es prestarnos un servicio bajo la exclusiva responsabilidad de nuestra parte por los valores entregados y su procedencia.`
            ];

            items.forEach((item, index) => {
                doc.text(`${index + 1}. ${item}`, { align: 'justify' });
                doc.moveDown(0.5);
            });
            doc.moveDown(2);

            // Firma info
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('FIRMA ELECTRÓNICA Y ACEPTACIÓN');
            doc.font('Helvetica').fontSize(9);
            const authInfo = formData.audit_info || {};
            doc.text(`Nombre: ${formData.nombres || ''} ${formData.primer_apellido || ''}`);
            doc.text(`Identificación: ${formData.numero_identificacion}`);
            doc.text(`Fecha y Hora: ${authInfo.timestamp || new Date().toISOString()}`);
            doc.text(`IP de Origen: ${authInfo.ip || 'Registrada en plataforma'}`);
            doc.text(`Geolocalización: ${authInfo.location?.latitude || 'N/A'}, ${authInfo.location?.longitude || 'N/A'}`);
            
            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = { generarDeclaracionPEPPDF };

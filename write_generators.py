import codecs
import os

pdfPep_content = """const PDFDocument = require('pdfkit-table');

async function generarDeclaracionPEPPDF(formData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const empresaFull = formData.empresa_destino === 'selecta' ? 'SELECTA COMPAÑÍA DE CEREALES S.A.S.' : 'EMPAQUES ANTIOQUIA S.A.S.';
            const municipio = formData.empresa_destino === 'selecta' ? 'la Estrella' : 'Medellín';

            doc.fontSize(14).font('Helvetica-Bold').text('FORMATO PERSONA PÚBLICA O POLÍTICAMENTE EXPUESTA', { align: 'center' });
            doc.moveDown(2);

            const nombreFirma = formData.tipo_persona === 'juridica' 
                ? `${formData.rep_legal_nombres || ''} ${formData.rep_legal_primer_apellido || ''} ${formData.rep_legal_segundo_apellido || ''}`.trim()
                : `${formData.nombres || ''} ${formData.primer_apellido || ''} ${formData.segundo_apellido || ''}`.trim();
            const cedula = formData.tipo_persona === 'juridica' ? formData.rep_legal_numero_id : formData.numero_identificacion;
            const exp = formData.tipo_persona === 'juridica' ? (formData.rep_legal_lugar_expedicion || '_______________') : (formData.lugar_expedicion || '_______________');
            const razon = formData.representacion_de || formData.razon_social || '_______________';

            doc.fontSize(10).font('Helvetica');
            const p1 = `Yo ${nombreFirma} identificado(a) con cédula de ciudadanía No ${cedula} expedida en ${exp} actuando en mi nombre y/o en representación de ${razon} y dando certeza de que todo lo consignado aquí es cierto, realizo la siguiente declaración de origen de fondos con el propósito de dar cumplimiento a lo señalado en la circular externa 07 de 1996 de la Superfinanciera, el estatuto orgánico del sistema financiero EOSF decreto 663 de 1993, ley 190 de 1996 y para dar cumplimiento a lo establecido en la circular externa 100-000016 del 24 de diciembre del 2020 de la Superintendencia de Sociedades, la ley 1121 de 2006 y demás normas concordantes.`;
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
            doc.text(`Nombre: ${nombreFirma}`);
            doc.text(`Identificación: ${cedula}`);
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
"""

pdfLaft_content = """const PDFDocument = require('pdfkit-table');

async function generarCertificadoLAFTPDF(formData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const empresaFull = formData.empresa_destino === 'selecta' ? 'SELECTA COMPAÑÍA DE CEREALES S.A.S.' : 'EMPAQUES ANTIOQUIA S.A.S.';
            const destinoCiudad = formData.empresa_destino === 'selecta' ? 'La Estrella, Antioquia' : 'Medellín, Antioquia';
            const ciudadOrigen = formData.ciudad_juridica || formData.ciudad || '___________';
            const year = new Date().getFullYear();

            const nombresRep = `${formData.rep_legal_nombres || ''} ${formData.rep_legal_primer_apellido || ''} ${formData.rep_legal_segundo_apellido || ''}`.trim();
            const razonSocial = formData.razon_social || '_______________';
            const nit = `${formData.numero_identificacion || ''}${formData.nit_digito ? '-' + formData.nit_digito : ''}`;
            const direccion = formData.direccion_oficina_principal || '_______________';

            doc.fontSize(10).font('Helvetica');
            doc.text(`Ciudad: ${ciudadOrigen}, ${year}`);
            doc.moveDown(1.5);
            doc.font('Helvetica-Bold');
            doc.text(`Señores\\n${empresaFull}\\n${destinoCiudad}`);
            doc.moveDown();
            doc.text('Asunto: Certificación.');
            doc.moveDown();
            doc.font('Helvetica');
            doc.text('Cordial saludo,');
            doc.moveDown();

            const p1 = `Por medio de la presente ${nombresRep} actuando en nombre y representación de la sociedad ${razonSocial}, identificada con numero ${nit}, con domicilio principal en ${direccion}, dando certeza de que todo lo aquí consignado es cierto y veraz, DECLARO que:`;
            doc.text(p1, { align: 'justify' });
            doc.moveDown();

            const razonConfidencial = formData.cert_laft_razon || '_______________';
            const p2 = `Por parte de ${empresaFull}, me fue solicitada información de composición accionaria hasta el último beneficiario final y ésta no será entregada de acuerdo con (${razonConfidencial}) y que conozco que esto es un requisito dentro del sistema y la normatividad Colombiana para la prevención de los riesgos de Lavado de Activos, Financiación del Terrorismo y Financiamiento de la Proliferación de Armas de Destrucción Masiva (LA/FT/FPADM), (SAGRILAFT) Soborno y/o Corrupción, de acuerdo al cumplimiento del SAGRILAFT Y PTEE.`;
            doc.text(p2, { align: 'justify' });
            doc.moveDown();

            const p3 = `Declaro entonces que ni yo, ni la Compañía que represento, sus accionistas, representantes legales, administradores y/o beneficiarios finales, nos encontramos con registros en las listas ONU, OFAC u otras listas restrictivas y/o vinculantes de cualquier otra autoridad local, extranjera o internacional como sospechosos o imputados por actividades relacionadas con lavado de activos, financiación del terrorismo y/o financiación de proliferación de armas de destrucción masiva, Soborno y/o Corrupción que nos vinculen con la comisión o realización de actividades criminales o acciones ilícitas y que en consecuencia, al igual manifiesto que no tenemos investigaciones en curso, ni indagación, imputación, ni hemos sido sindicados, o condenados por los delitos de lavado de activos, sus delitos fuente, financiación del terrorismo y/o financiación de proliferación de armas de destrucción masiva, Soborno y/o corrupción y que a su vez los recursos utilizados en la ejecución de la relación comercial, como sus ingresos, provienen de actividades lícitas de la actividad comercial o de las actividades lícitas que desarrolla la empresa que represento.`;
            doc.text(p3, { align: 'justify' });
            doc.moveDown();

            const p4 = `Por último declaramos que se tomarán todas las medidas razonables para garantizar que ninguno de los accionistas, administradores, empleados, intermediarios, contratistas, sociedades subordinadas y beneficiarios finales que actúen para la ejecución de la relación comercial con ${empresaFull} y/o en las otras actividades y negocios que desarrollan su objeto social, den, ofrezcan o prometan un pago a un servidor público extranjero i) sumas de dinero, (ii) cualquier objeto de valor pecuniario u (iii) otro beneficio o utilidad, a cambio de que él; (i) realice, (ii) omita, (iii) o retarde, cualquier acto relacionado con el ejercicio de sus funciones y en relación con un negocio o transacción internacional.`;
            doc.text(p4, { align: 'justify' });
            doc.moveDown(2);

            // Firma info
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Cordialmente,');
            doc.moveDown(1.5);
            doc.text('☑ Firmado electrónicamente aceptando los términos');
            doc.font('Helvetica').fontSize(9);
            const authInfo = formData.audit_info || {};
            doc.text(`Nombre: ${nombresRep}`);
            doc.text(`Empresa: ${razonSocial}`);
            doc.text(`NIT: ${nit}`);
            doc.text(`Fecha y Hora: ${authInfo.timestamp || new Date().toISOString()}`);
            doc.text(`IP de Origen: ${authInfo.ip || 'Registrada en plataforma'}`);
            
            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = { generarCertificadoLAFTPDF };
"""

with codecs.open('backend/utils/pdfPepGenerator.js', 'w', 'utf-8') as f:
    f.write(pdfPep_content)
    
with codecs.open('backend/utils/pdfLaftGenerator.js', 'w', 'utf-8') as f:
    f.write(pdfLaft_content)
    
print("Generators written successfully")

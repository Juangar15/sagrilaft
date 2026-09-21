const PDFDocument = require('pdfkit-table');

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
            doc.text(`Señores\n${empresaFull}\n${destinoCiudad}`);
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

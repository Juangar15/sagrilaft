const PDFDocument = require('pdfkit-table');

async function generarFormularioFinalPDF(sol, formAprobacion) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            doc.fontSize(16).font('Helvetica-Bold').text('SAGRILAFT', { align: 'center' });
            doc.fontSize(12).text('VERIFICACIÓN OFICIAL DE CUMPLIMIENTO', { align: 'center' });
            doc.moveDown(2);

            doc.fontSize(10).font('Helvetica-Bold').text('INFORMACIÓN GENERAL DE LA CONTRAPARTE');
            doc.moveDown(0.5);
            doc.font('Helvetica');
            doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`);
            doc.text(`Nombre/ Razón social: ${sol.datos_formulario?.razon_social || sol.datos_formulario?.nombres || ''}`);
            doc.text(`Nit / CC: ${sol.nit_cedula}`);
            doc.text(`Nombre del Representante Legal: ${sol.datos_formulario?.nombre_representante || 'N/A'}`);
            doc.moveDown(2);

            doc.font('Helvetica-Bold').text('Lista de Verificación: Favor contestar cada uno de los ítems con su respectivo análisis');
            doc.moveDown(0.5);

            const tableRows = [
                ['1. Fue entregada la documentación completa por parte de la contraparte', formAprobacion.doc_completa],
                ['2. Se hizo verificación de las listas restrictivas', formAprobacion.verifico_listas],
                ['3. Se verificó autenticidad de documento', formAprobacion.autenticidad],
                ['4. Se verificó en la procuraduría el rep. legal, los socios', formAprobacion.proc_rep],
                ['5. Se verificó en la contraloría el rep. legal, los socios', formAprobacion.contra_rep],
                ['6. Se verificó en la policía el rep. legal, los socios', formAprobacion.poli_rep],
                ['7. Se hizo verificación de la información financiera', formAprobacion.info_fin],
                ['8. Se debe realizar visita', formAprobacion.visita],
                ['9. La empresa pertenece al sector minero energético', formAprobacion.minero]
            ];

            if (formAprobacion.minero === 'SI') {
                tableRows.push(['10. La empresa tiene RUCON', formAprobacion.rucon]);
                tableRows.push(['11. La empresa tiene sarlaft', formAprobacion.sarlaft]);
                tableRows.push(['12. La empresa tiene Sagrilaft', formAprobacion.sagrilaft]);
            }

            doc.table({
                headers: ['Descripción', 'Respuesta'],
                rows: tableRows
            }, {
                prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9),
                prepareRow: () => doc.font('Helvetica').fontSize(9)
            });

            doc.moveDown(2);
            doc.font('Helvetica-Bold').text('Visto bueno para relaciones comerciales: ' + formAprobacion.decision_final);
            doc.font('Helvetica').text('Observaciones: ' + (formAprobacion.observaciones || 'Ninguna'));

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generarFormularioFinalPDF };

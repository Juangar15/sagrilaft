import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Add import for pdfLaftGenerator
if 'pdfLaftGenerator' not in c:
    c = c.replace(
        "const { generarDeclaracionPEPPDF } = require('./utils/pdfPepGenerator');",
        "const { generarDeclaracionPEPPDF } = require('./utils/pdfPepGenerator');\nconst { generarCertificadoLAFTPDF } = require('./utils/pdfLaftGenerator');"
    )

# Fix the PEP and LAFT generation logic
old_pep_logic = """        // Generar PDF PEP si aplica
        const isPepEmpleado = ['empleado', 'prestacion_servicios', 'contratista', 'accionista'].includes(formData.clase_vinculacion) && 
            ['es_funcionario_publico', 'vinculo_familiar_pep', 'ejerce_poder_publico', 'maneja_recursos_publicos', 'goza_reconocimiento_publico', 'declara_ser_pep'].some(k => formData[k] === 'si');
            
        if (isPepEmpleado && process.env.R2_ACCOUNT_ID) {
            try {
                const pepPdfBuffer = await generarDeclaracionPEPPDF(formData);
                const pepUrl = await uploadFileToR2(pepPdfBuffer, `Formato_PEP_${nit}.pdf`, `recepcion/${nit}`, 'application/pdf');
                formData.archivos_cargados.formato_pep = pepUrl;
            } catch (e) {
                console.error("Error generando PDF PEP:", e);
            }
        }"""

new_logic = """        // Generar PDF PEP si aplica (para empleados y terceros)
        const isPep = ['es_funcionario_publico', 'vinculo_familiar_pep', 'ejerce_poder_publico', 'maneja_recursos_publicos', 'goza_reconocimiento_publico', 'declara_ser_pep'].some(k => formData[k] === 'si');
            
        if (isPep && process.env.R2_ACCOUNT_ID) {
            try {
                const pepPdfBuffer = await generarDeclaracionPEPPDF(formData);
                const pepUrl = await uploadFileToR2(pepPdfBuffer, `Formato_PEP_${nit}.pdf`, `recepcion/${nit}`, 'application/pdf');
                formData.archivos_cargados.formato_pep = pepUrl;
            } catch (e) {
                console.error("Error generando PDF PEP:", e);
            }
        }
        
        // Generar PDF Certificacion LA/FT si aplica (terceros juridicos)
        if (formData.accionistas_confidencial && formData.cert_laft_aceptado && process.env.R2_ACCOUNT_ID) {
            try {
                const laftPdfBuffer = await generarCertificadoLAFTPDF(formData);
                const laftUrl = await uploadFileToR2(laftPdfBuffer, `Certificacion_LAFT_${nit}.pdf`, `recepcion/${nit}`, 'application/pdf');
                formData.archivos_cargados.certificacion_laft = laftUrl;
            } catch (e) {
                console.error("Error generando PDF LAFT:", e);
            }
        }"""

if old_pep_logic in c:
    c = c.replace(old_pep_logic, new_logic)
    print("Replaced PEP logic in server.js")
else:
    print("Could not find PEP logic in server.js")
    # let's try regex or similar if not found
    
with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(c)

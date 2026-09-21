import re

with open('frontend/src/components/FormularioProveedor.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add validation logic for Paso 15, 16, 17
new_val = """        if (pasoActual === 15 || pasoActual === 16) {
            if (!d.cert_pep_aceptado) {
                showToast("Debe aceptar y firmar la declaración PEP para continuar.");
                return false;
            }
        }
        if (pasoActual === 17) {
            if (!d.cert_laft_razon) {
                showToast("Debe ingresar la razón por la cual no comparte la información accionaria.");
                return false;
            }
            if (!d.cert_laft_aceptado) {
                showToast("Debe aceptar y firmar la certificación LA/FT para continuar.");
                return false;
            }
        }
        return true;"""

if new_val not in c:
    c = c.replace('        return true;', new_val, 1)

# 2. Add checkbox in Paso 15
checkbox_pep = """                                </div>

                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: '1rem' }}>
                                    <input type="checkbox" checked={formData.cert_pep_aceptado === true} onChange={(e) => setFormData({...formData, cert_pep_aceptado: e.target.checked})} style={{ marginTop: '0.25rem', width: '18px', height: '18px' }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}><strong>Acepto y firmo electrónicamente</strong> la presente Declaración de Persona Expuesta Públicamente y Origen de Fondos.</span>
                                </label>
                                
                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>"""

# For Paso 15:
paso15_search = "                                </div>\n                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>"
if paso15_search in c:
    # First match is likely Paso 15, let's just do it directly around "Exonero de toda responsabilidad"
    idx = c.find('Exonero de toda responsabilidad')
    idx_end = c.find('</ol>\n                                </div>', idx)
    if idx_end != -1:
        replace_target = c[idx_end:idx_end+150]
        # find the div
        div_end = c.find('</div>', idx_end+5)
        # We know what the structure is, let's use regex
        pass

# Let's use a more robust way to insert the checkbox before the buttons in Paso 15 and 16
c = re.sub(
    r'(<li>Exonero de toda responsabilidad a \{nombreEmpresaFull\}.*?</li>\s*</ol>\s*</div>)',
    r'\1\n' + checkbox_pep.replace('                                <div style={{ marginTop: \'2rem\', display: \'flex\', justifyContent: \'space-between\' }}>', ''),
    c
)

with open('frontend/src/components/FormularioProveedor.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

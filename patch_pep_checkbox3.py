import re

with open('frontend/src/components/FormularioProveedor.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add state
if 'cert_pep_aceptado:' not in c:
    c = c.replace(
        "cert_laft_aceptado: false,",
        "cert_laft_aceptado: false,\n        cert_pep_aceptado: false,"
    )

# 2. Validation
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

c = c.replace('        return true;', new_val, 1) # Only first occurrence, which is in validarPaso

# 3. Insert Checkbox UI for Paso 15 and 16
# Find all occurrences of the end of the PEP list:
search_text = "valores entregados y su procedencia.</li>\n                                    </ol>\n                                </div>"

replacement_text = """valores entregados y su procedencia.</li>
                                    </ol>
                                </div>
                                
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: '1rem' }}>
                                    <input type="checkbox" checked={formData.cert_pep_aceptado === true} onChange={(e) => setFormData({...formData, cert_pep_aceptado: e.target.checked})} style={{ marginTop: '0.25rem', width: '18px', height: '18px' }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}><strong>Acepto y firmo electrónicamente</strong> la presente Declaración de Persona Expuesta Públicamente y Origen de Fondos.</span>
                                </label>"""

c = c.replace(search_text, replacement_text)

with open('frontend/src/components/FormularioProveedor.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

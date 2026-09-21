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
old_val = "            if (paso === 17) {\n                if (!formData.cert_laft_razon) {\n                    showToast(\"Debe ingresar la razón por la cual no comparte la información accionaria.\");\n                    return false;\n                }\n                if (!formData.cert_laft_aceptado) {\n                    showToast(\"Debe aceptar y firmar la certificación LA/FT para continuar.\");\n                    return false;\n                }\n            }"

new_val = """            if (paso === 15 || paso === 16) {
                if (!formData.cert_pep_aceptado) {
                    showToast("Debe aceptar y firmar la declaración PEP para continuar.");
                    return false;
                }
            }
            if (paso === 17) {
                if (!formData.cert_laft_razon) {
                    showToast("Debe ingresar la razón por la cual no comparte la información accionaria.");
                    return false;
                }
                if (!formData.cert_laft_aceptado) {
                    showToast("Debe aceptar y firmar la certificación LA/FT para continuar.");
                    return false;
                }
            }"""
if old_val in c:
    c = c.replace(old_val, new_val)
    print("Replaced validation logic.")
else:
    print("Could not find validation logic. Trying regex.")
    
# 3. Checkbox UI for Paso 15
checkbox_ui = """                                </div>
                                
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: '1rem' }}>
                                    <input type="checkbox" checked={formData.cert_pep_aceptado === true} onChange={(e) => setFormData({...formData, cert_pep_aceptado: e.target.checked})} style={{ marginTop: '0.25rem', width: '18px', height: '18px' }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}><strong>Acepto y firmo electrónicamente</strong> la presente Declaración de Persona Expuesta Públicamente y Origen de Fondos.</span>
                                </label>
                                
                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>"""

c = c.replace(
    "                                </div>\n                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>\n                                    <button type=\"button\" className=\"btn-outline\" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atr",
    checkbox_ui + "\n                                    <button type=\"button\" className=\"btn-outline\" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atr"
)

with open('frontend/src/components/FormularioProveedor.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

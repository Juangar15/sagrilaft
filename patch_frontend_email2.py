with open('frontend/src/components/FormularioProveedor.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

old = '''if (!d.nombres || !d.primer_apellido || !d.numero_identificacion || !d.fecha_nacimiento || !d.correo_electronico || !d.telefono_celular) {
                    showToast("Faltan campos obligatorios de identificación personal.");
                    return false;
                }'''

new = '''if (!d.nombres || !d.primer_apellido || !d.numero_identificacion || !d.fecha_nacimiento || !d.correo_electronico || !d.telefono_celular) {
                    showToast("Faltan campos obligatorios de identificación personal.");
                    return false;
                }
                if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(d.correo_electronico)) {
                    showToast("El correo electrónico ingresado no tiene un formato válido (ej. correo@empresa.com).");
                    return false;
                }'''

if old in c:
    c = c.replace(old, new)
else:
    # Try finding with ? instead of ó
    old2 = old.replace('identificación', 'identificaci?n')
    if old2 in c:
        c = c.replace(old2, new)
    else:
        # manual replace
        idx = c.find('!d.correo_electronico')
        idx2 = c.find('return false;', idx) + 14
        c = c[:idx2] + '''
                if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(d.correo_electronico)) {
                    showToast("El correo electrónico ingresado no tiene un formato válido.");
                    return false;
                }''' + c[idx2:]

with open('frontend/src/components/FormularioProveedor.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

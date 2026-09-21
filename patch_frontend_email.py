import re

with open('frontend/src/components/FormularioProveedor.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

old_check = '''if (!d.nombres || !d.primer_apellido || !d.numero_identificacion || !d.fecha_nacimiento || !d.correo_electronico || !d.telefono_celular) {
                    showToast("Faltan campos obligatorios de identificaci?n personal.");
                    return false;
                }'''
old_check = old_check.replace('?', 'ó') # just in case, but let's use regex to be safe

c = re.sub(
    r'if \(!d\.nombres \|\| !d\.primer_apellido \|\| !d\.numero_identificacion \|\| !d\.fecha_nacimiento \|\| !d\.correo_electronico \|\| !d\.telefono_celular\) \{[^\}]+\}',
    '''if (!d.nombres || !d.primer_apellido || !d.numero_identificacion || !d.fecha_nacimiento || !d.correo_electronico || !d.telefono_celular) {
                    showToast("Faltan campos obligatorios de identificaci?n personal.");
                    return false;
                }
                if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(d.correo_electronico)) {
                    showToast("El correo electr?nico ingresado no tiene un formato v?lido.");
                    return false;
                }''',
    c
)

with open('frontend/src/components/FormularioProveedor.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

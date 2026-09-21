with open('frontend/src/components/FormularioProveedor.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

old = '''} catch (error) {
            showToast(error.message);
        } finally {'''

new = '''} catch (error) {
            if (error.message === 'Network Error') {
                showToast("Error de red: La conexión falló o los archivos adjuntos son demasiado pesados para el servidor.");
            } else {
                showToast(error.message);
            }
        } finally {'''

if old in c:
    c = c.replace(old, new)

with open('frontend/src/components/FormularioProveedor.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

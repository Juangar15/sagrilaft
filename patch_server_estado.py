import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    c = f.read()

estado_logic = "const estado_inicial = ['empleado', 'prestacion_servicios', 'contratista', 'accionista'].includes(tipo_vinculacion) ? 'ASIGNACION_CARGO' : 'REVISION_PREVIA';"

# 1. Update in solicitudExistente update block
old_update = """            const { error: errUpdate } = await supabase
                .from('solicitudes_sagrilaft')
                .update({
                    datos_formulario: formData,
                    campos_a_corregir: {}, // Limpiamos correcciones
                    estado_actual: 'ASIGNACION_CARGO',
                    razon_social: razon_social,
                    nit_cedula: nit
                })"""
new_update = f"""            {estado_logic}
            const {{ error: errUpdate }} = await supabase
                .from('solicitudes_sagrilaft')
                .update({{
                    datos_formulario: formData,
                    campos_a_corregir: {{}}, // Limpiamos correcciones
                    estado_actual: estado_inicial,
                    razon_social: razon_social,
                    nit_cedula: nit
                }})"""

# 2. Update in else insert block
old_insert = """            const { data: nuevaSolicitud, error: errorSolicitud } = await supabase
                .from('solicitudes_sagrilaft')
                .insert([{
                    nit_cedula: nit,
                    razon_social: razon_social,
                    tipo_vinculacion: tipo_vinculacion,
                    estado_actual: 'ASIGNACION_CARGO',
                    token_asociado: token,
                    datos_formulario: formData
                }])"""
new_insert = f"""            {estado_logic}
            const {{ data: nuevaSolicitud, error: errorSolicitud }} = await supabase
                .from('solicitudes_sagrilaft')
                .insert([{{
                    nit_cedula: nit,
                    razon_social: razon_social,
                    tipo_vinculacion: tipo_vinculacion,
                    estado_actual: estado_inicial,
                    token_asociado: token,
                    datos_formulario: formData
                }}])"""

# 3. Update return response
old_return = """        // Retornamos éxito inmediatamente
        return res.status(201).json({
            mensaje: "Formulario recibido exitosamente. En asignación de cargo.",
            resultado: {
                id: resultId,
                estado: "ASIGNACION_CARGO",
                mensaje: "El área de cumplimiento asignará el cargo antes de continuar."
            }
        });"""

new_return = f"""        {estado_logic}
        // Retornamos éxito inmediatamente
        return res.status(201).json({{
            mensaje: "Formulario recibido exitosamente.",
            resultado: {{
                id: resultId,
                estado: estado_inicial,
                mensaje: estado_inicial === 'ASIGNACION_CARGO' ? "El área de cumplimiento asignará el cargo antes de continuar." : "El formulario ha pasado a revisión previa."
            }}
        }});"""

c = c.replace(old_update, new_update)
c = c.replace(old_insert, new_insert)
c = c.replace(old_return, new_return)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(c)

import re

with open('frontend/src/components/FormularioProveedor.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
changes = []

def apply(old, new, label):
    global content
    if old in content:
        content = content.replace(old, new, 1)
        changes.append(f"OK: {label}")
    else:
        changes.append(f"MISS: {label}")

# ===== 1. STATE ADDITIONS =====
apply(
    "        // Documentos\n        archivos_cargados: {}",
    "        // Documentos\n        archivos_cargados: {},\n\n        // Terceros extras\n        nit_digito: '',\n        accionistas_confidencial: false,\n        cert_laft_aceptado: false,\n        cert_laft_razon: ''",
    "State: nit_digito, accionistas_confidencial, cert_laft"
)

# ===== 2. camposNumericos - NIT condicional =====
apply(
    "        const camposNumericos = [\n            'numero_identificacion', 'telefono_celular', 'telefono_corporativo', \n            'telefono_juridica', 'telefono_corporativo_juridica', 'celular_corporativo_juridica',\n            'rep_legal_numero_id', 'rep_legal_telefono', 'activos', 'pasivos', \n            'ingresos_mensuales', 'egresos_mensuales', 'patrimonio', 'otros_ingresos_mensuales'\n        ];\n        if (camposNumericos.includes(name)) {\n            value = value.replace(/\\D/g, ''); // Elimina todo lo que no sea dígito\n        }",
    "        const camposNumericos = [\n            'telefono_celular', 'telefono_corporativo', \n            'telefono_juridica', 'telefono_corporativo_juridica', 'celular_corporativo_juridica',\n            'rep_legal_numero_id', 'rep_legal_telefono', 'activos', 'pasivos', \n            'ingresos_mensuales', 'egresos_mensuales', 'patrimonio', 'otros_ingresos_mensuales'\n        ];\n        if (camposNumericos.includes(name)) {\n            value = value.replace(/\\D/g, ''); // Elimina todo lo que no sea dígito\n        }\n        // NIT: solo numérico si NO es operación internacional\n        if (name === 'numero_identificacion' && formData.ambito_operacion !== 'internacional') {\n            value = value.replace(/\\D/g, '');\n        }",
    "camposNumericos NIT condicional"
)

# ===== 3. getPasosList !isInternalRole - quitar 12 y 13, agregar 16 y 17 =====
apply(
    "        } else {\n            return [\n                { id: 1, label: 'Inicio' },\n                { id: 2, label: 'Ident. Natural' },\n                { id: 4, label: 'Ident. Jurídica', condition: f => f.tipo_persona === 'juridica' },\n                { id: 3, label: 'Financiera' },\n                { id: 6, label: 'Accionistas y PEPs' },\n                { id: 5, label: 'Referencias' },\n                { id: 12, label: 'Conflicto de Interés' },\n                { id: 13, label: 'Operaciones Internacionales' },\n                { id: 7, label: 'Ética y ESG' },\n                { id: 8, label: 'Origen Fondos' },\n                { id: 9, label: 'Documentos' },\n                { id: 10, label: 'Firma y Envío' }\n            ].filter(s => !s.condition || s.condition(formData));\n        }",
    "        } else {\n            const isPepTercero = ['es_funcionario_publico', 'vinculo_familiar_pep', 'ejerce_poder_publico', 'maneja_recursos_publicos', 'goza_reconocimiento_publico', 'declara_ser_pep'].some(k => formData[k] === 'si');\n            return [\n                { id: 1, label: 'Inicio' },\n                { id: 2, label: 'Identificación' },\n                { id: 4, label: 'Accionistas y PEP', condition: f => f.tipo_persona === 'juridica' },\n                { id: 3, label: 'Financiera' },\n                { id: 16, label: 'Declaración PEP', condition: () => isPepTercero },\n                { id: 17, label: 'Cert. LA/FT', condition: f => f.accionistas_confidencial === true },\n                { id: 5, label: 'Referencias' },\n                { id: 6, label: 'Ética y Cumplimiento' },\n                { id: 7, label: 'ASG' },\n                { id: 8, label: 'Origen Fondos' },\n                { id: 9, label: 'Documentos' },\n                { id: 10, label: 'Firma y Envío' }\n            ].filter(s => !s.condition || s.condition(formData));\n        }",
    "getPasosList terceros"
)

# ===== 4. Validación paso 2 - NIT dígito + fechas =====
apply(
    "                if (!d.razon_social || !d.numero_identificacion || !d.direccion_oficina_principal || !d.telefono_juridica || !d.correo_corporativo_juridica || !d.actividad_economica_principal_juridica || !d.codigo_ciiu_juridica || !d.rep_legal_nombres || !d.rep_legal_primer_apellido || !d.rep_legal_numero_id) {\n                    showToast(\"Faltan campos obligatorios de la empresa o representante legal.\");\n                    return false;\n                }",
    "                if (!d.razon_social || !d.numero_identificacion || !d.nit_digito || !d.direccion_oficina_principal || !d.telefono_juridica || !d.correo_corporativo_juridica || !d.actividad_economica_principal_juridica || !d.codigo_ciiu_juridica || !d.rep_legal_nombres || !d.rep_legal_primer_apellido || !d.rep_legal_numero_id) {\n                    showToast(\"Faltan campos obligatorios de la empresa o representante legal (incluido el dígito de verificación del NIT).\");\n                    return false;\n                }\n                if (d.rep_legal_fecha_nacimiento && d.rep_legal_fecha_expedicion && d.rep_legal_fecha_nacimiento >= d.rep_legal_fecha_expedicion) {\n                    showToast(\"La fecha de nacimiento del representante legal debe ser anterior a su fecha de expedición.\");\n                    return false;\n                }",
    "Validacion paso2 juridica"
)

apply(
    "                const edad = new Date().getFullYear() - new Date(d.fecha_nacimiento).getFullYear();\n                if (edad < 18) {\n                    showToast(\"Debe ser mayor de edad (18+ años).\");\n                    return false;\n                }",
    "                const edad = new Date().getFullYear() - new Date(d.fecha_nacimiento).getFullYear();\n                if (edad < 18) {\n                    showToast(\"Debe ser mayor de edad (18+ años).\");\n                    return false;\n                }\n                if (d.fecha_nacimiento && d.fecha_expedicion && d.fecha_nacimiento >= d.fecha_expedicion) {\n                    showToast(\"La fecha de nacimiento debe ser anterior a la fecha de expedición del documento.\");\n                    return false;\n                }",
    "Validacion paso2 natural fecha nacimiento < expedicion"
)

# ===== 5. Validación paso 12 - solo isInternalRole =====
apply(
    "        if (pasoActual === 12) {\n            if (!d.tiene_conflicto_interes) {",
    "        if (pasoActual === 12 && isInternalRole) {\n            if (!d.tiene_conflicto_interes) {",
    "Validacion paso 12 solo isInternalRole"
)

# ===== 6. Validación paso 13 - solo isInternalRole =====
apply(
    "        if (pasoActual === 13) {\n            if (!d.realiza_operaciones_internacionales) {",
    "        if (pasoActual === 13 && isInternalRole) {\n            if (!d.realiza_operaciones_internacionales) {",
    "Validacion paso 13 solo isInternalRole"
)

# ===== 7. Validación paso 4 (accionistas) y paso 6 (ética) =====
apply(
    "        if (pasoActual === 5) {\n            if (d.referencias_comerciales.length === 0) {",
    "        if (pasoActual === 4 && !isInternalRole && d.tipo_persona === 'juridica') {\n            if (!d.accionistas_confidencial && d.accionistas.length === 0) {\n                showToast(\"Debe añadir al menos un accionista, o marcar la casilla de confidencialidad.\");\n                return false;\n            }\n        }\n        if (pasoActual === 5) {\n            if (d.referencias_comerciales.length === 0) {",
    "Validacion paso 4 accionistas terceros"
)

apply(
    "        if (pasoActual === 8) {\n            if (!d.origen_fondos || d.origen_fondos.trim().length < 5) {",
    "        if (pasoActual === 6 && !isInternalRole) {\n            const eticaSi = ['politica_corrupcion', 'codigo_etica_conducta', 'tiene_comite_etica', 'canales_denuncia', 'acusada_corrupcion', 'tiene_oficial_cumplimiento'].some(k => d[k] === 'si');\n            if (eticaSi && !d.detalles_etica) {\n                showToast(\"Debe detallar la información de las respuestas afirmativas en Ética y Cumplimiento.\");\n                return false;\n            }\n            if (d.tiene_oficial_cumplimiento === 'si' && !d.nombre_oficial_cumplimiento) {\n                showToast(\"Debe indicar el nombre del Oficial de Cumplimiento.\");\n                return false;\n            }\n        }\n        if (pasoActual === 17) {\n            if (!d.cert_laft_razon || d.cert_laft_razon.trim().length < 5) {\n                showToast(\"Debe indicar la razón por la cual no proporciona la información accionaria.\");\n                return false;\n            }\n            if (!d.cert_laft_aceptado) {\n                showToast(\"Debe aceptar y firmar la Certificación LA/FT para continuar.\");\n                return false;\n            }\n        }\n        if (pasoActual === 8) {\n            if (!d.origen_fondos || d.origen_fondos.trim().length < 5) {",
    "Validacion paso 6 etica y paso 17 cert_laft"
)

# ===== 8. Paso 2 - Campo NIT + dígito de verificación =====
apply(
    '                                        <div className="form-grid form-grid-3">\n                                            {renderInput(\"NIT (Sin dígito verif.)\", \"numero_identificacion\", \"text\", \"1fr\", false, true)}\n                                            {renderInput(\"Dirección Oficina Principal\", \"direccion_oficina_principal\", \"text\", \"2fr\")}\n                                        </div>',
    '                                        <div className="form-grid form-grid-3">\n                                            <div style={{ display: \'flex\', gap: \'0.5rem\', alignItems: \'flex-end\' }}>\n                                                <div style={{ flex: 1 }}>\n                                                    {renderInput("NIT (Sin dígito verif.)", "numero_identificacion", "text", "1fr", false, true)}\n                                                </div>\n                                                <div style={{ width: \'70px\' }}>\n                                                    <label className="label required">Dígito</label>\n                                                    <input type="text" name="nit_digito" value={formData.nit_digito || \'\'} onChange={handleChange} className="input-field" maxLength={1} placeholder="0" style={{ textAlign: \'center\' }} readOnly={isDisabled(\'nit_digito\')} />\n                                                </div>\n                                            </div>\n                                            {renderInput("Dirección Oficina Principal", "direccion_oficina_principal", "text", "2fr")}\n                                        </div>',
    "Paso 2: NIT + dígito verificación"
)

# ===== 9. Paso 4 - Título section =====
apply(
    "<h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={20}/> 4. Accionistas (Ben. Finales) y PEPs</h3>",
    "<h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={20}/> 4. Accionistas (Beneficiarios Finales) y Persona Expuesta Públicamente</h3>",
    "Paso 4: título"
)

# ===== 10. Paso 4 - Nota + checkbox confidencial =====
apply(
    "                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>\n                                        <i>Nota: Si por políticas de privacidad de la compañía decide no listar a los beneficiarios finales aquí, <b>será obligatorio adjuntar el Certificado de Composición Accionaria</b> en el paso final de documentos.</i>\n                                    </p>",
    "                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>\n                                        <i>Indique en este apartado los accionistas con participación superior al 5% del capital social y adjunte, al final del formulario, el Certificado de Composición Accionaria. Si, por políticas de confidencialidad de la compañía, no es posible brindar esta información, deberá adjuntar al final la Certificación LA/FT.</i>\n                                    </p>\n                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', background: '#fff7ed', borderRadius: 'var(--radius-sm)', border: '1px solid #fed7aa', cursor: 'pointer' }}>\n                                        <input type=\"checkbox\" checked={formData.accionistas_confidencial === true} onChange={e => setFormData(p => ({...p, accionistas_confidencial: e.target.checked}))} style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />\n                                        <span style={{ fontSize: '0.9rem', color: '#92400e', fontWeight: '500' }}>Por políticas de confidencialidad de la compañía, no es posible brindar esta información. Adjuntaré la Certificación LA/FT (se habilitará un formato en el siguiente paso).</span>\n                                    </label>",
    "Paso 4: nota accionistas + checkbox confidencial"
)

# Abrir condicional para form accionistas
apply(
    "                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 70px 1fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>",
    "                                    {!formData.accionistas_confidencial && (<>\n                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 70px 1fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>",
    "Paso 4: abrir condicional accionistas"
)

# Cerrar condicional + cambiar título PEP
apply(
    "                                    )}\n                                </div>\n\n\n\n                                <h4 style={{ margin: '2rem 0 1rem 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Personas Expuestas Políticamente (PEP) y Conflictos de Interés</h4>",
    "                                    )}\n                                    </>)}\n                                </div>\n\n                                <h4 style={{ margin: '2rem 0 1rem 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Persona Expuesta Públicamente (persona expuesta públicamente)</h4>",
    "Paso 4: cerrar condicional accionistas + título PEP"
)

# ===== 11. PEP questions - expandir abreviaciones =====
apply(
    '"¿Vínculo familiar con persona PEP?"',
    '"¿Vínculo familiar con persona expuesta públicamente?"',
    "PEP: vínculo familiar"
)
apply(
    '"¿Declara bajo juramento ser PEP?"',
    '"¿Declara bajo juramento ser persona expuesta públicamente?"',
    "PEP: declara ser"
)

# ===== 12. pep_detalles en paso 4 → cuadro informativo =====
apply(
    "                                <div style={{ marginTop: '1.5rem' }}>\n                                    {renderInput(\"Si respondió afirmativamente alguna, proporcione nombres, cargos, vínculo y entidad\", \"pep_detalles\", \"text\", \"1fr\", false, ['es_funcionario_publico', 'vinculo_familiar_pep', 'ejerce_poder_publico', 'maneja_recursos_publicos', 'goza_reconocimiento_publico', 'declara_ser_pep'].some(k => formData[k] === 'si'))}\n                                </div>\n\n                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>\n                                    <button type=\"button\" className=\"btn-outline\" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>\n                                    <button className=\"btn-primary\" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>\n                                </div>\n                            </motion.div>\n                        )}\n\n                        {/* PASO 5: REFERENCIAS */}",
    "                                <div style={{ marginTop: '1.5rem', background: '#eff6ff', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #bfdbfe' }}>\n                                    <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, fontWeight: '500' }}>\n                                        En caso de marcar alguna de las preguntas con opción 'SÍ', por favor diligencie el formato 'Conocimiento ampliado para las personas expuestas política y públicamente', el cual encontrará en el siguiente punto.\n                                    </p>\n                                </div>\n\n                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>\n                                    <button type=\"button\" className=\"btn-outline\" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>\n                                    <button className=\"btn-primary\" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>\n                                </div>\n                            </motion.div>\n                        )}\n\n                        {/* PASO 5: REFERENCIAS */}",
    "Paso 4: pep_detalles → cuadro informativo"
)

# ===== 13. Paso 5 - Label "Tipo de cuenta" =====
apply(
    "                                            <div style={{flex:1}}>\n                                                <select value={nuevaRefBancaria.tipo} onChange={e=>setNuevaRefBancaria({...nuevaRefBancaria, tipo: e.target.value})} className=\"input-field\">\n                                                    <option>Ahorros</option><option>Corriente</option>\n                                                </select>\n                                            </div>",
    "                                            <div style={{flex:1}}>\n                                                <label className=\"label\" style={{fontSize: '0.85rem'}}>Tipo de cuenta</label>\n                                                <select value={nuevaRefBancaria.tipo} onChange={e=>setNuevaRefBancaria({...nuevaRefBancaria, tipo: e.target.value})} className=\"input-field\">\n                                                    <option value=\"Ahorros\">Ahorros</option>\n                                                    <option value=\"Corriente\">Corriente</option>\n                                                </select>\n                                            </div>",
    "Paso 5: label Tipo de cuenta"
)

# ===== 14. Paso 6 - Preguntas Ética =====
apply(
    '"¿Prevención de corrupción y soborno?"',
    '"¿Cuenta con política de prevención de corrupción y soborno?"',
    "Paso 6: pregunta 1"
)
apply(
    '"¿Tiene código de ética y/o conducta?"',
    '"¿Tiene código de ética?"',
    "Paso 6: pregunta 2"
)
apply(
    "                                            {formData.tiene_oficial_cumplimiento === 'si' && renderInput(\"Nombre del Oficial de Cumplimiento\", \"nombre_oficial_cumplimiento\")}\n                                        </div>\n                                    </div>\n                                </div>\n\n                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>\n                                    <button type=\"button\" className=\"btn-outline\" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>\n                                    <button className=\"btn-primary\" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>\n                                </div>\n                            </motion.div>\n                        )}\n\n                        {/* PASO 7: SOSTENIBILIDAD ESG */}",
    "                                            {formData.tiene_oficial_cumplimiento === 'si' && renderInput(\"Nombre del Oficial de Cumplimiento\", \"nombre_oficial_cumplimiento\", \"text\", \"1fr\", false, true)}\n                                        </div>\n                                        {['politica_corrupcion', 'codigo_etica_conducta', 'tiene_comite_etica', 'canales_denuncia', 'acusada_corrupcion', 'tiene_oficial_cumplimiento'].some(k => formData[k] === 'si') && (\n                                            <div style={{ marginTop: '1rem' }}>\n                                                {renderInput(\"Si respondió afirmativamente alguna de las preguntas anteriores, por favor detalle la información\", \"detalles_etica\", \"text\", \"1fr\", false, true)}\n                                            </div>\n                                        )}\n                                    </div>\n                                </div>\n\n                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>\n                                    <button type=\"button\" className=\"btn-outline\" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>\n                                    <button className=\"btn-primary\" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>\n                                </div>\n                            </motion.div>\n                        )}\n\n                        {/* PASO 7: SOSTENIBILIDAD ASG */}",
    "Paso 6: detalles_etica + oficial obligatorio"
)

# ===== 15. Paso 7 - ESG → ASG =====
apply(
    '7. Políticas y Comportamientos de Sostenibilidad (ESG)',
    '7. Políticas y Comportamientos de Sostenibilidad ASG: Ambiental, Social y Gobernanza',
    "Paso 7: título ASG"
)
apply(
    '"1. ¿La empresa identifica y gestiona riesgos relacionados con factores (ESG)?"',
    '"1. ¿La empresa identifica y gestiona riesgos relacionados con factores ASG: Ambiental, Social y Gobernanza?"',
    "Paso 7: pregunta 1 ASG"
)
apply(
    '"5. ¿En los últimos 5 años ha sido sancionada/investigada por asuntos ESG?"',
    '"5. ¿En los últimos 5 años ha sido sancionada/investigada por asuntos ASG: Ambiental, Social y Gobernanza?"',
    "Paso 7: pregunta 5 ASG"
)
# Agregar Ninguno al punto 6
apply(
    "                                                {value:'Otros', label:'Otros (especifique)'}\n                                            ])}",
    "                                                {value:'Otros', label:'Otros (especifique)'},\n                                                {value:'Ninguno', label:'Ninguno'}\n                                            ])}",
    "Paso 7: Ninguno en punto 6"
)

# ===== 16. Paso 9 - Documentos condicional composicion_accionaria =====
apply(
    "reqs = ['rut', 'cc_comercio', 'cedula_rep_legal_frontal', 'balance_empresa', 'composicion_accionaria'];",
    "reqs = formData.accionistas_confidencial ? ['rut', 'cc_comercio', 'cedula_rep_legal_frontal', 'balance_empresa'] : ['rut', 'cc_comercio', 'cedula_rep_legal_frontal', 'balance_empresa', 'composicion_accionaria'];",
    "Paso 9: validacion docs condicional"
)
apply(
    "                                        { id: 'composicion_accionaria', label: 'Composición Accionaria', requiereFecha: true, maxDays: 90, errorMsg: 'vencida (>3 meses)' }",
    "                                        ...(!formData.accionistas_confidencial ? [{ id: 'composicion_accionaria', label: 'Composición Accionaria', requiereFecha: true, maxDays: 90, errorMsg: 'vencida (>3 meses)' }] : [])",
    "Paso 9: render docs condicional"
)

# ===== 17. Insertar Pasos 16 (PEP = idéntico al 15 empleados) y 17 (Cert LAFT con checkbox) =====
PASO_16_17 = '''                        {/* PASO 16: DECLARACIÓN PEP - TERCEROS (igual que paso 15 empleados) */}
                        {paso === 16 && !isInternalRole && (
                            <motion.div key="p16" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20}/> Formato Persona Pública o Políticamente Expuesta</h3>
                                
                                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
                                    <div style={{marginBottom: '1rem'}}>
                                        {renderInput("En representación de (Nombre propio o Razón Social)", "representacion_de", "text", "1fr", false, true)}
                                    </div>
                                    <p style={{ textAlign: 'justify' }}>
                                        Yo <strong>{formData.tipo_persona === 'juridica' ? `${formData.rep_legal_nombres || ''} ${formData.rep_legal_primer_apellido || ''} ${formData.rep_legal_segundo_apellido || ''}`.trim() : `${formData.nombres || ''} ${formData.primer_apellido || ''} ${formData.segundo_apellido || ''}`.trim()}</strong> identificado(a) con cédula de ciudadanía No <strong>{formData.tipo_persona === 'juridica' ? formData.rep_legal_numero_id : formData.numero_identificacion}</strong> expedida en <strong>{formData.tipo_persona === 'juridica' ? (formData.rep_legal_lugar_expedicion || '_______________') : (formData.lugar_expedicion || '_______________')}</strong> actuando en mi nombre y/o en representación de <strong>{formData.representacion_de || formData.razon_social || '_______________'}</strong> y dando certeza de que todo lo consignado aquí es cierto, realizo la siguiente declaración de origen de fondos con el propósito de dar cumplimiento a lo señalado en la circular externa 07 de 1996 de la Superfinanciera, el estatuto orgánico del sistema financiero EOSF decreto 663 de 1993, ley 190 de 1996 y para dar cumplimiento a lo establecido en la circular externa 100-000016 del 24 de diciembre del 2020 de la Superintendencia de Sociedades, la ley 1121 de 2006 y demás normas concordantes.
                                    </p>
                                    <p>Declaro que mi familia en primer, segundo y tercer grado de afinidad son:</p>
                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                            <div style={{flex:2}}><label className="label">Nombres y Apellidos</label><input type="text" value={nuevoFamiliarPep.nombre} onChange={e=>setNuevoFamiliarPep({...nuevoFamiliarPep, nombre: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1.5}}><label className="label">Cédula o Identificación</label><input type="text" value={nuevoFamiliarPep.identificacion} onChange={e=>setNuevoFamiliarPep({...nuevoFamiliarPep, identificacion: e.target.value})} className="input-field"/></div>
                                            <div style={{flex:1.5}}><label className="label">Parentesco</label><input type="text" value={nuevoFamiliarPep.parentesco} onChange={e=>setNuevoFamiliarPep({...nuevoFamiliarPep, parentesco: e.target.value})} className="input-field"/></div>
                                            <button type="button" className="btn-outline" onClick={() => handleAddList('pep_familiares_extendido', nuevoFamiliarPep, setNuevoFamiliarPep, {nombre:'', identificacion:'', parentesco:''})}>+ Añadir</button>
                                        </div>
                                        {formData.pep_familiares_extendido.map((fam, idx) => (
                                            <div key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>• {fam.nombre} - CC: {fam.identificacion} - <b>{fam.parentesco}</b></div>
                                                <button type="button" className="btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleRemoveList('pep_familiares_extendido', idx)}>Eliminar</button>
                                            </div>
                                        ))}
                                    </div>
                                    <p style={{ textAlign: 'justify' }}>
                                        <strong>{nombreEmpresaFull}</strong> es una Entidad debidamente establecida en Colombia, con sede en el Municipio de {formData.empresa_destino === 'selecta' ? 'la Estrella' : 'Medellín'} (Antioquia), se encuentra vigilada por la Superintendencia de sociedades, y tiene implementado un Sistema de Auto Control y Gestión del Riesgo de Lavado de Activos y de la Financiación del Terrorismo (SAGRILAFT), en cumplimiento de lo establecido en la Circular Básica Jurídica 100-000016 DE 24 DE DICIEMBRE DE 2020 de las SuperSociedades desde 01 de septiembre de 2021, lo mismo que las recomendaciones y mejores prácticas internacionales en esta materia.
                                    </p>
                                    <p style={{ textAlign: 'justify' }}>
                                        Las políticas, controles y procedimientos implementados, dentro de un concepto de administración del riesgo, son acciones que buscan la debida diligencia para prevenir el uso de nuestra institución por organizaciones criminales para propósitos ilícitos. Dichas acciones incluyen entre otros aspectos, el conocimiento del cliente y de sus operaciones con nuestra Entidad, definición de segmentos de mercado por nosotros atendidos, monitoreo de transacciones, capacitación al personal y reportes de operaciones sospechosas a la autoridad competente.
                                    </p>
                                    <p>Por lo anterior manifiesto de manera voluntaria a <strong>{nombreEmpresaFull}</strong>:</p>
                                    <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                                        <li style={{marginBottom:'0.5rem'}}>Los recursos que entregue en forma de pago, abono o cualquier servicio que nos preste por parte de {nombreEmpresaFull} proviene de mi trabajo o actividad comercial y de actividades legales.</li>
                                        <li style={{marginBottom:'0.5rem'}}>Declaro que los recursos que le entregue a {nombreEmpresaFull} en cualquier parte del territorio colombiano no provienen de ninguna actividad ilícita de las contempladas en el Código penal colombiano o actos de corrupción pública o privada, ni efectuare transacciones destinadas a tales actividades o en favor de personas relacionadas con ellas.</li>
                                        <li style={{marginBottom:'0.5rem'}}>No admitiré que terceros efectúen depósitos a mis cuentas con fondos provenientes de actividades ilícitas.</li>
                                        <li style={{marginBottom:'0.5rem'}}>Autorizo a {nombreEmpresaFull} a cancelar el contrato o la relación comercial, en el caso que detecten operaciones inusuales o sospechosas en el giro de mis actividades o actos de corrupción.</li>
                                        <li>Exonero de toda responsabilidad a {nombreEmpresaFull}, si se llegare a presentar en mi nombre o de la empresa, cualquier asomo de ilegalidad en nuestras actividades, teniendo la certeza lo único que hace es prestarnos un servicio bajo la exclusiva responsabilidad de nuestra parte por los valores entregados y su procedencia.</li>
                                    </ol>
                                </div>
                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 17: CERTIFICACIÓN LA/FT - firma por checkbox */}
                        {paso === 17 && (
                            <motion.div key="p17" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20}/> Certificación LA/FT</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Lea el documento completo. Al final, deberá aceptarlo marcando la casilla de firma para poder continuar. Este certificado se generará como PDF y quedará guardado junto a los demás documentos de su expediente.</p>
                                
                                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
                                    <p><strong>Ciudad:</strong> {formData.ciudad_juridica || formData.ciudad || '___________'}, {new Date().getFullYear()}</p>
                                    <p><strong>Señores</strong><br/>{nombreEmpresaFull}<br/>Ciudad.</p>
                                    <p><strong>Asunto: Certificación.</strong></p>
                                    <p>Cordial saludo,</p>
                                    <p style={{ textAlign: 'justify' }}>
                                        Por medio de la presente <strong>{`${formData.rep_legal_nombres || ''} ${formData.rep_legal_primer_apellido || ''} ${formData.rep_legal_segundo_apellido || ''}`.trim()}</strong> actuando en nombre y representación de la sociedad <strong>{formData.razon_social || '_______________'}</strong>, identificada con numero <strong>{formData.numero_identificacion || ''}{formData.nit_digito ? `-${formData.nit_digito}` : ''}</strong>, con domicilio principal en <strong>{formData.direccion_oficina_principal || '_______________'}</strong>, dando certeza de que todo lo aquí consignado es cierto y veraz, DECLARO que:
                                    </p>
                                    <p style={{ textAlign: 'justify' }}>
                                        Por parte de <strong>{nombreEmpresaFull}</strong>, me fue solicitada información de composición accionaria hasta el último beneficiario final y ésta no será entregada de acuerdo con <strong>({formData.cert_laft_razon || '_______________'})</strong> y que conozco que esto es un requisito dentro del sistema y la normatividad Colombiana para la prevención de los riesgos de Lavado de Activos, Financiación del Terrorismo y Financiamiento de la Proliferación de Armas de Destrucción Masiva (LA/FT/FPADM), (SAGRILAFT) Soborno y/o Corrupción, de acuerdo al cumplimiento del SAGRILAFT Y PTEE.
                                    </p>
                                    
                                    <div style={{ marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                                        {renderInput("Razón por la cual no comparte la información accionaria", "cert_laft_razon", "text", "1fr", false, true)}
                                    </div>
                                    
                                    <p style={{ textAlign: 'justify' }}>
                                        Declaro entonces que ni yo, ni la Compañía que represento, sus accionistas, representantes legales, administradores y/o beneficiarios finales, nos encontramos con registros en las listas ONU, OFAC u otras listas restrictivas y/o vinculantes de cualquier otra autoridad local, extranjera o internacional como sospechosos o imputados por actividades relacionadas con lavado de activos, financiación del terrorismo y/o financiación de proliferación de armas de destrucción masiva, Soborno y/o Corrupción que nos vinculen con la comisión o realización de actividades criminales o acciones ilícitas y que en consecuencia, al igual manifiesto que no tenemos investigaciones en curso, ni indagación, imputación, ni hemos sido sindicados, o condenados por los delitos de lavado de activos, sus delitos fuente, financiación del terrorismo y/o financiación de proliferación de armas de destrucción masiva, Soborno y/o corrupción y que a su vez los recursos utilizados en la ejecución de la relación comercial, como sus ingresos, provienen de actividades lícitas de la actividad comercial o de las actividades lícitas que desarrolla la empresa que represento.
                                    </p>
                                    <p style={{ textAlign: 'justify' }}>
                                        Por último declaramos que se tomarán todas las medidas razonables para garantizar que ninguno de los accionistas, administradores, empleados, intermediarios, contratistas, sociedades subordinadas y beneficiarios finales que actúen para la ejecución de la relación comercial con <strong>{nombreEmpresaFull}</strong> y/o en las otras actividades y negocios que desarrollan su objeto social, den, ofrezcan o prometan un pago a un servidor público extranjero i) sumas de dinero, (ii) cualquier objeto de valor pecuniario u (iii) otro beneficio o utilidad, a cambio de que él; (i) realice, (ii) omita, (iii) o retarde, cualquier acto relacionado con el ejercicio de sus funciones y en relación con un negocio o transacción internacional.
                                    </p>
                                    
                                    <div style={{ borderTop: '2px solid var(--border)', marginTop: '2rem', paddingTop: '1.5rem' }}>
                                        <p><strong>Cordialmente,</strong></p>
                                        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            <div>____________________________________</div>
                                            <div style={{ marginTop: '0.25rem' }}>FIRMA</div>
                                            <div><strong>{`${formData.rep_legal_nombres || ''} ${formData.rep_legal_primer_apellido || ''}`.trim()}</strong></div>
                                            <div>{formData.razon_social || ''}</div>
                                            <div>NIT: {formData.numero_identificacion || ''}{formData.nit_digito ? `-${formData.nit_digito}` : ''}</div>
                                        </div>
                                    </div>
                                </div>

                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: '1rem' }}>
                                    <input type="checkbox" checked={formData.cert_laft_aceptado === true} onChange={e => setFormData(p => ({...p, cert_laft_aceptado: e.target.checked}))} style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                                        En señal de aceptación, declaro bajo la gravedad de juramento que he leído, entendido y que la información consignada en esta Certificación LA/FT es verdadera. Entiendo que este documento será generado como PDF y quedará archivado en mi expediente de vinculación con {nombreEmpresaFull}.
                                    </span>
                                </label>

                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="btn-outline" onClick={() => retrocederPaso()}><ArrowLeft size={18}/> Atrás</button>
                                    <button className="btn-primary" onClick={() => avanzarPaso()} disabled={!formData.cert_laft_aceptado || !formData.cert_laft_razon}>Siguiente <ArrowRight size={18}/></button>
                                </div>
                            </motion.div>
                        )}

                        {/* PASO 8: ORIGEN DE FONDOS */}'''

apply(
    "                        {/* PASO 8: ORIGEN DE FONDOS */}",
    PASO_16_17,
    "Insertar Pasos 16 y 17"
)

with open('frontend/src/components/FormularioProveedor.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Original: {original_len} | Nuevo: {len(content)}")
print()
for c in changes:
    print(c)

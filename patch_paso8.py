import re

with open('frontend/src/components/FormularioProveedor.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Update Paso 8 text
old_paso8 = '''                                            <p>Declaro expresamente a {formData.empresa_destino === 'selecta' ? 'SELECTA COMPAÑÍA DE CEREALES' : 'COSECHAS BEBIDAS NATURALES S.A.S.'} que:</p>
                                            <ol style={{ margin: '0.5rem 0 0.5rem 1.5rem', padding: 0 }}>
                                                <li>La información que he suministrado en este documento es veraz y verificable y me comprometo a actualizarla anualmente.</li>
                                                <li>Tanto mis actividades, profesión u oficio son lícitas, las ejerzo dentro del marco legal y los recursos que poseo no provienen de actividades ilícitas de las contempladas en el Código Penal Colombiano o en cualquier norma que lo sustituya, adicione o modifique.</li>
                                                <li>Los recursos que se deriven del desarrollo de este contrato, no serán destinados a la financiación del terrorismo, actividades terroristas o grupos terroristas.</li>
                                                <li>Acepto que {formData.empresa_destino === 'selecta' ? 'SELECTA COMPAÑÍA DE CEREALES' : 'COSECHAS BEBIDAS NATURALES S.A.S.'} está en la obligación legal de solicitar las aclaraciones que estime pertinente, en el evento en que se presenten circunstancias con base en las cuales se pueda tener dudas razonables sobre mis transacciones, así como del origen de mis fondos, evento en el cual suministraré las aclaraciones que sean necesarias del caso.</li>
                                                <li>Los recursos que poseo provienen de la(s) siguiente(s) actividad(es):</li>
                                            </ol>
                                        </div>
                                        {renderInput("ORIGEN DE FONDOS (Especifique de donde provienen el origen de sus fondos):", "origen_fondos", "text")}'''

new_paso8 = '''                                            <p>Declaro expresamente a <strong>{nombreEmpresaFull}</strong> que:</p>
                                            <ol style={{ margin: '0.5rem 0 0.5rem 1.5rem', padding: 0 }}>
                                                <li>La información que he suministrado en este documento es veraz y verificable y me comprometo a actualizarla anualmente.</li>
                                                <li>Tanto mis actividades, profesión u oficio son lícitas, las ejerzo dentro del marco legal y los recursos que poseo no provienen de actividades ilícitas de las contempladas en el Código Penal Colombiano o en cualquier norma que lo sustituya, adicione o modifique.</li>
                                                <li>Los recursos que se deriven del desarrollo de este contrato no serán destinados a la financiación del terrorismo, actividades terroristas o grupos terroristas.</li>
                                                <li>Acepto que <strong>{nombreEmpresaFull}</strong> está en la obligación legal de solicitar las aclaraciones que estime pertinentes, en el evento en que se presenten circunstancias con base en las cuales se puedan tener dudas razonables sobre mis transacciones, así como sobre el origen de mis fondos, evento en el cual suministraré las aclaraciones que sean necesarias.</li>
                                                <li>Los recursos que poseo provienen de la(s) siguiente(s) actividad(es):</li>
                                            </ol>
                                        </div>
                                        {renderInput("ORIGEN DE FONDOS: Especifique de dónde provienen sus recursos:", "origen_fondos", "text", "1fr", false, true)}'''

if old_paso8 in c:
    c = c.replace(old_paso8, new_paso8)
    print("Replaced Paso 8")
else:
    print("Could not find Paso 8")
    
with open('frontend/src/components/FormularioProveedor.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

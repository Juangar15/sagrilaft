import re

with open('frontend/src/components/DashboardOficial.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

history_ui = """                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-main)' }}>{sol.razon_social}</h4>
                {sol.datos_formulario?.riesgo_anterior && (
                    <div style={{ background: 'var(--surface-hover)', padding: '0.35rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', border: '1px dashed var(--border)' }}>
                        <span style={{ display: 'block', marginBottom: '2px' }}>🔄 Anterior: <b style={{ color: sol.datos_formulario.riesgo_anterior.riesgo === 'rojo' ? 'var(--danger)' : sol.datos_formulario.riesgo_anterior.riesgo === 'amarillo' ? 'var(--warning-text)' : 'var(--success-text)' }}>{sol.datos_formulario.riesgo_anterior.riesgo.toUpperCase()}</b> (Score: {sol.datos_formulario.riesgo_anterior.score})</span>
                        <span style={{ fontSize: '0.7rem' }}>Movido en R2 el {sol.datos_formulario.riesgo_anterior.fecha}</span>
                    </div>
                )}"""

c = c.replace("                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-main)' }}>{sol.razon_social}</h4>", history_ui)

with open('frontend/src/components/DashboardOficial.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

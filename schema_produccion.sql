-- ==============================================================================
-- SCRIPT DE MIGRACIÓN: SAGRILAFT MVP
-- Ejecutar en el SQL Editor del Supabase del VPS (puerto 3001)
-- ==============================================================================

-- 1. Crear Tabla Principal de Solicitudes
CREATE TABLE IF NOT EXISTS public.solicitudes_sagrilaft (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nit_cedula TEXT NOT NULL,
    razon_social TEXT NOT NULL,
    tipo_vinculacion TEXT NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    datos_formulario JSONB DEFAULT '{}'::jsonb,
    estado_actual TEXT DEFAULT 'REVISION_PREVIA',
    score_riesgo INTEGER DEFAULT NULL,
    audit_hash TEXT,
    documentos_verificados TEXT DEFAULT 'no'
);

-- 2. Crear Tabla Maestra de Matriz de Riesgos
CREATE TABLE IF NOT EXISTS public.matriz_riesgos_master (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    categoria_detonante TEXT,
    fuente_riesgo TEXT,
    riesgo_asociado TEXT,
    evento_riesgo TEXT,
    causas TEXT,
    senales_alerta TEXT,
    escala_frecuencia_inherente INTEGER DEFAULT 1,
    escala_impacto_inherente INTEGER DEFAULT 1,
    tratamiento_riesgo TEXT,
    descripcion_controles TEXT,
    tipo_control TEXT,
    clase_control TEXT,
    frecuencia_control TEXT,
    area_responsable TEXT,
    escala_frecuencia_residual INTEGER DEFAULT 1,
    escala_impacto_residual INTEGER DEFAULT 1,
    monitoreo TEXT,
    eventos_ocurridos INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear Tabla de Resultados de Evaluación (Los 3 Baldes)
CREATE TABLE IF NOT EXISTS public.evaluacion_riesgos_resultado (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    solicitud_id UUID REFERENCES public.solicitudes_sagrilaft(id) ON DELETE CASCADE,
    riesgo_id UUID REFERENCES public.matriz_riesgos_master(id) ON DELETE CASCADE,
    frecuencia_aplicada INTEGER,
    impacto_aplicado INTEGER,
    riesgo_residual_calculado INTEGER,
    detalles_calculo TEXT,
    fecha_evaluacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- INSERCIÓN DE RIESGOS BASE (OPCIONAL PERO RECOMENDADO)
-- ==============================================================================
INSERT INTO public.matriz_riesgos_master (codigo, categoria_detonante, evento_riesgo, escala_frecuencia_inherente, escala_impacto_inherente)
VALUES 
('R-001', 'API', 'Aparición en listas restrictivas (ONU, OFAC, etc.)', 1, 5),
('R-002', 'API', 'Antecedentes judiciales o fiscales (Policía, Procuraduría)', 2, 4),
('R-003', 'MANUAL', 'Inconsistencias en autenticidad de documentos aportados', 3, 3),
('R-004', 'FORMULARIO', 'Contraparte declara ser Persona Expuesta Políticamente (PEP)', 2, 4)
ON CONFLICT (codigo) DO NOTHING;

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS) - BÁSICAS PARA MVP
-- ==============================================================================
ALTER TABLE public.solicitudes_sagrilaft ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriz_riesgos_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluacion_riesgos_resultado ENABLE ROW LEVEL SECURITY;

-- Permitir todo el acceso temporalmente (o mediante anon key del servidor)
CREATE POLICY "Permitir Todo Solicitudes" ON public.solicitudes_sagrilaft FOR ALL USING (true);
CREATE POLICY "Permitir Todo Matriz" ON public.matriz_riesgos_master FOR ALL USING (true);
CREATE POLICY "Permitir Todo Evaluaciones" ON public.evaluacion_riesgos_resultado FOR ALL USING (true);

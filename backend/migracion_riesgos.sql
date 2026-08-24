-- 1. Crear tabla para las Jurisdicciones (Códigos Postales)
CREATE TABLE IF NOT EXISTS public.sagrilaft_jurisdicciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    departamento TEXT,
    municipio TEXT,
    codigo_postal TEXT,
    nivel_riesgo TEXT, -- BAJO, MEDIO, ALTO
    porcentaje NUMERIC, -- Ej. 11.11, 22.22, 33.33
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla para la Matriz de Riesgos
CREATE TABLE IF NOT EXISTS public.sagrilaft_matriz (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo_riesgo TEXT,
    evento_riesgo TEXT,
    fuente_riesgo TEXT,
    causas TEXT,
    senales_alerta TEXT,
    riesgo_asociado TEXT,
    escala_frecuencia NUMERIC,
    escala_impacto NUMERIC,
    riesgo_inherente NUMERIC,
    tratamiento TEXT,
    tipo_control TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Actualizar la tabla de solicitudes para soportar el nuevo desglose de riesgos
-- Solo añadimos las columnas, las antiguas permanecen intactas
ALTER TABLE public.solicitudes_sagrilaft 
ADD COLUMN IF NOT EXISTS calificacion_oficial TEXT, -- 'bajo', 'medio', 'alto'
ADD COLUMN IF NOT EXISTS alertas_manuales JSONB DEFAULT '[]'::jsonb, -- Las alertas cualitativas que marca el oficial manualmente
ADD COLUMN IF NOT EXISTS desglose_riesgo JSONB; -- El reporte consolidado de puntos

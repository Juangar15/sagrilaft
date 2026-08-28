const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/Programación/Desktop/sagrilaft-mvp/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('solicitudes_sagrilaft')
        .select('datos_formulario')
        .not('datos_formulario', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) console.error(error);
    else {
        const monitor = data[0].datos_formulario.monitor_fuentes;
        console.log("dict_hallazgos:", JSON.stringify(monitor.dict_hallazgos, null, 2));
    }
}
check();

require('dotenv').config();
const supabase = require('./supabase');

async function run() {
    console.log("Moviendo registros en REVISION_PREVIA y DEVUELTO_CORRECCION a ASIGNACION_CARGO...");
    const { data, error } = await supabase
        .from('solicitudes_sagrilaft')
        .update({ estado_actual: 'ASIGNACION_CARGO' })
        .in('estado_actual', ['REVISION_PREVIA', 'DEVUELTO_CORRECCION']);
        
    if (error) {
        console.error("Error actualizando registros:", error);
    } else {
        console.log("Registros actualizados.");
    }
}
run();

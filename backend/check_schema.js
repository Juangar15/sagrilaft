// Quick script to check what columns exist in the solicitudes_sagrilaft table
require('dotenv').config();
const supabase = require('./supabase');

async function checkSchema() {
    // Try to select one row and see what fields come back
    const { data, error } = await supabase
        .from('solicitudes_sagrilaft')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    if (data && data.length > 0) {
        console.log('Columns in solicitudes_sagrilaft:');
        Object.keys(data[0]).forEach(k => {
            const val = data[0][k];
            const type = val === null ? 'null' : typeof val === 'object' ? 'json/object' : typeof val;
            console.log(`  ${k}: ${type}`);
        });
    } else {
        console.log('No rows found');
    }
}

checkSchema().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

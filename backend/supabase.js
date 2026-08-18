// supabase.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ Faltan credenciales de Supabase en el archivo .env");
}

let options = {
    auth: {
        persistSession: false
    }
};

if (typeof window === 'undefined') {
    // Estamos en el backend (Node.js)
    options.global = {};
    try {
        const WebSocket = require('ws');
        options.global.WebSocket = WebSocket;
    } catch (e) {
        console.warn("Módulo ws no encontrado");
    }
}

const supabase = createClient(supabaseUrl, supabaseKey, options);

module.exports = supabase;
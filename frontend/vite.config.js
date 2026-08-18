import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import fs from 'fs';

// Copiar archivo JSON al iniciar Vite
if (!fs.existsSync('src/data')) fs.mkdirSync('src/data', { recursive: true });
if (!fs.existsSync('src/data/CIIU.json')) {
  try {
    fs.copyFileSync('C:/Users/Programación/Desktop/CIIU.json', 'src/data/CIIU.json');
    console.log('CIIU.json copiado exitosamente.');
  } catch (e) {
    console.error('No se pudo copiar CIIU.json:', e);
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

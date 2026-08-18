// src/services/api.js
import axios from 'axios';

// Configuramos la URL base apuntando al backend desde las variables de entorno
const baseURL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api/v1` 
    : 'http://localhost:3001/api/v1';

const api = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const sagrilaftService = {
    // Función para enviar el formulario del proveedor (soporta FormData)
    enviarOnboarding: async (datosProveedor) => {
        // Si es FormData, axios ajusta los headers automáticamente
        const config = datosProveedor instanceof FormData
            ? { headers: { 'Content-Type': 'multipart/form-data' } }
            : {};
        const response = await api.post('/onboarding', datosProveedor, config);
        return response.data;
    },

    obtenerSolicitudPorToken: async (token) => {
        const response = await api.get(`/solicitudes/token/${token}`);
        return response.data;
    },

    devolverSolicitud: async (id, payload) => {
        const response = await api.post(`/solicitudes/${id}/devolver`, payload);
        return response.data;
    },

    obtenerSolicitudes: async () => {
        const response = await api.get('/solicitudes');
        return response.data;
    },

    obtenerMatrizRiesgos: async () => {
        const response = await api.get('/matriz-riesgos');
        return response.data;
    },

    crearRiesgo: async (riesgoData) => {
        const response = await api.post('/matriz-riesgos', riesgoData);
        return response.data;
    },

    generarInvitacion: async (datos) => {
        const response = await api.post('/invitaciones', datos);
        return response.data;
    },

    validarInvitacion: async (token) => {
        const response = await api.post('/invitaciones/validar', { token });
        return response.data;
    },

    ejecutarTusDatos: async (solicitudId) => {
        const response = await api.post(`/solicitudes/${solicitudId}/tusdatos`);
        return response.data;
    },

    recargarTusDatos: async (solicitudId) => {
        const response = await api.post(`/solicitudes/${solicitudId}/tusdatos/retry`);
        return response.data;
    }
};

export default api;
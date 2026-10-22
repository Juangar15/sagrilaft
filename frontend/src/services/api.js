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
    enviarOnboarding: async (datosProveedor) => {
        // Axios manejará automáticamente el boundary si le pasamos FormData,
        // pero debemos asegurarnos de que NO tome el 'application/json' por defecto.
        const config = datosProveedor instanceof FormData
            ? { headers: { 'Content-Type': undefined } }
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

    actualizarEstadoSolicitud: async (id, estado) => {
        const response = await api.post(`/solicitudes/${id}/cambiar_estado`, { estado });
        return response.data;
    },

    aprobarDefinitivo: async (id, payload) => {
        const response = await api.post(`/solicitudes/${id}/aprobar_definitivo`, payload);
        return response.data;
    },

    ejecutarTusDatos: async (id, payload = {}) => {
        const response = await api.post(`/solicitudes/${id}/tusdatos`, payload);
        return response.data;
    },

    asignarCargo: async (id, payload) => {
        const response = await api.post(`/solicitudes/${id}/asignar-cargo`, payload);
        return response.data;
    },

    migrarCloudflare: async (id, payload) => {
        const response = await api.post(`/solicitudes/${id}/migrar-cloudflare`, payload);
        return response.data;
    },

    retryTusDatos: async (id, payload = {}) => {
        const response = await api.post(`/solicitudes/${id}/tusdatos/retry`, payload);
        return response.data;
    },

    recargarTusDatos: async (solicitudId, payload = {}) => {
        const response = await api.post(`/solicitudes/${solicitudId}/tusdatos/retry`, payload);
        return response.data;
    },

    guardarActualizacionRiesgo: async (id, payload) => {
        const response = await api.post(`/solicitudes/${id}/guardar-riesgo`, payload);
        return response.data;
    },

    recalcularScoresMasivo: async () => {
        const response = await api.post('/admin/recalcular-scores');
        return response.data;
    },

    explorarArchivos: async (prefix = 'sagrilaft/') => {
        const response = await api.get('/archivos/explorar', { params: { prefix } });
        return response.data;
    },

    firmarArchivoUrl: async (key) => {
        const response = await api.post('/archivos/firmar', { key });
        return response.data;
    },

    // Gestión de Borradores (Guardar / Reanudar con OTP)
    guardarBorrador: async (payload) => {
        const response = await api.post('/borradores/guardar', payload);
        return response.data;
    },

    solicitarOtpBorrador: async (payload) => {
        const response = await api.post('/borradores/solicitar-codigo', payload);
        return response.data;
    },

    recuperarBorrador: async (payload) => {
        const response = await api.post('/borradores/recuperar', payload);
        return response.data;
    },

    obtenerBorradorPorToken: async (token) => {
        const response = await api.get(`/borradores/token/${token}`);
        return response.data;
    }
};

export default api;
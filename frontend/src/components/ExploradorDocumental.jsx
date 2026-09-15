import React, { useState, useEffect } from 'react';
import { Folder, FileText, ChevronRight, CornerUpLeft, Loader, ExternalLink } from 'lucide-react';
import { sagrilaftService } from '../services/api';

export default function ExploradorDocumental() {
    const [historialPrefix, setHistorialPrefix] = useState(['sagrilaft/']);
    const [carpetas, setCarpetas] = useState([]);
    const [archivos, setArchivos] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    const prefixActual = historialPrefix[historialPrefix.length - 1];

    useEffect(() => {
        cargarContenido(prefixActual);
    }, [prefixActual]);

    const cargarContenido = async (prefix) => {
        setCargando(true);
        setError(null);
        try {
            const data = await sagrilaftService.explorarArchivos(prefix);
            setCarpetas(data.folders || []);
            setArchivos(data.files || []);
        } catch (err) {
            setError('Error al cargar la carpeta.');
        } finally {
            setCargando(false);
        }
    };

    const entrarCarpeta = (folderPrefix) => {
        setHistorialPrefix([...historialPrefix, folderPrefix]);
    };

    const subirNivel = () => {
        if (historialPrefix.length > 1) {
            setHistorialPrefix(historialPrefix.slice(0, -1));
        }
    };

    const abrirArchivo = async (fileKey) => {
        try {
            const res = await sagrilaftService.firmarArchivoUrl(fileKey);
            if (res.url) {
                window.open(res.url, '_blank');
            }
        } catch (err) {
            alert('Error al generar el enlace de acceso seguro.');
        }
    };

    const getFolderName = (folderPath) => {
        const parts = folderPath.split('/').filter(p => p !== '');
        return parts[parts.length - 1];
    };

    const getFileName = (filePath) => {
        const parts = filePath.split('/');
        return parts[parts.length - 1];
    };

    return (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Folder size={24} color="var(--primary)" /> Explorador Documental Seguro
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Explora el repositorio en Cloudflare R2. Los archivos se abren mediante enlaces firmados temporalmente (vencen en 5 minutos) para garantizar máxima seguridad.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', background: 'var(--bg-color)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <button 
                    onClick={subirNivel} 
                    disabled={historialPrefix.length === 1}
                    style={{ background: 'none', border: 'none', cursor: historialPrefix.length > 1 ? 'pointer' : 'default', color: historialPrefix.length > 1 ? 'var(--primary)' : 'var(--border)' }}
                >
                    <CornerUpLeft size={18} />
                </button>
                <div style={{ borderLeft: '1px solid var(--border)', height: '20px', margin: '0 0.5rem' }}></div>
                
                {historialPrefix.map((prefix, idx) => {
                    const label = prefix === 'sagrilaft/' ? 'Raíz' : getFolderName(prefix);
                    return (
                        <React.Fragment key={prefix}>
                            <button 
                                onClick={() => setHistorialPrefix(historialPrefix.slice(0, idx + 1))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: idx === historialPrefix.length - 1 ? 'var(--text-main)' : 'var(--primary)', fontWeight: idx === historialPrefix.length - 1 ? '600' : '400' }}
                            >
                                {label}
                            </button>
                            {idx < historialPrefix.length - 1 && <ChevronRight size={14} color="var(--text-muted)" />}
                        </React.Fragment>
                    );
                })}
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', minHeight: '300px' }}>
                {cargando ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
                        <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
                        <span style={{ marginLeft: '1rem' }}>Cargando repositorio...</span>
                    </div>
                ) : error ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
                ) : (
                    <div>
                        {carpetas.length === 0 && archivos.length === 0 && (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Esta carpeta está vacía.</div>
                        )}
                        
                        {carpetas.map(folder => (
                            <div 
                                key={folder} 
                                onClick={() => entrarCarpeta(folder)}
                                style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: 'transparent' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <Folder size={20} fill="#fcd34d" color="#d97706" />
                                <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{getFolderName(folder)}</span>
                            </div>
                        ))}
                        
                        {archivos.map(file => (
                            <div 
                                key={file.key} 
                                onClick={() => abrirArchivo(file.key)}
                                style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'transparent' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <FileText size={20} color="var(--primary)" />
                                    <span style={{ color: 'var(--text-main)' }}>{getFileName(file.key)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                                    <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                                    <ExternalLink size={16} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

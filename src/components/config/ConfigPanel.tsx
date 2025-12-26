'use client';

import { useState } from 'react';
import type { NivelEducativo, ConceptMapConfig } from '@/types/concept-map';
import { GRADOS_POR_NIVEL } from '@/types/concept-map';
import { SparklesIcon, BookOpenIcon, GraduationCapIcon, SettingsIcon } from '@/components/icons/Icons';

interface ConfigPanelProps {
  onGenerate: (config: ConceptMapConfig) => void;
  isLoading: boolean;
}

/**
 * Panel de configuración para el generador de mapas conceptuales
 * 
 * Permite al docente:
 * - Ingresar el tema del mapa conceptual
 * - Seleccionar el nivel educativo
 * - Seleccionar el grado específico
 */
export function ConfigPanel({ onGenerate, isLoading }: ConfigPanelProps) {
  const [tema, setTema] = useState('');
  const [nivel, setNivel] = useState<NivelEducativo>('primaria');
  const [grado, setGrado] = useState('');

  // Obtener grados disponibles según nivel seleccionado
  const gradosDisponibles = GRADOS_POR_NIVEL[nivel];

  // Manejar cambio de nivel (resetear grado)
  const handleNivelChange = (nuevoNivel: NivelEducativo) => {
    setNivel(nuevoNivel);
    setGrado(''); // Resetear grado al cambiar nivel
  };

  // Validar y enviar configuración
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tema.trim() || !grado) {
      return;
    }

    onGenerate({
      tema: tema.trim(),
      nivel,
      grado,
    });
  };

  const isFormValid = tema.trim().length > 0 && grado.length > 0;

  return (
    <div className="card animate-fade-in-up">
      {/* Título del panel */}
      <div className="config-title">
        <div className="config-title-icon">
          <SettingsIcon size={18} />
        </div>
        <span>Configuración</span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {/* Campo: Tema */}
        <div className="input-group">
          <label htmlFor="tema" className="input-label">
            Tema del Mapa Conceptual
          </label>
          <input
            type="text"
            id="tema"
            className="input"
            placeholder="Ej: La Fotosíntesis, El Sistema Solar..."
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        {/* Campo: Nivel Educativo */}
        <div className="input-group">
          <label htmlFor="nivel" className="input-label">
            Nivel Educativo
          </label>
          <select
            id="nivel"
            className="input select"
            value={nivel}
            onChange={(e) => handleNivelChange(e.target.value as NivelEducativo)}
            disabled={isLoading}
          >
            <option value="inicial">Inicial</option>
            <option value="primaria">Primaria</option>
            <option value="secundaria">Secundaria</option>
          </select>
        </div>

        {/* Campo: Grado */}
        <div className="input-group">
          <label htmlFor="grado" className="input-label">
            Grado
          </label>
          <select
            id="grado"
            className="input select"
            value={grado}
            onChange={(e) => setGrado(e.target.value)}
            disabled={isLoading}
          >
            <option value="">Selecciona un grado</option>
            {gradosDisponibles.map((g) => (
              <option key={g} value={g}>
                {g} {nivel === 'inicial' ? '' : nivel.charAt(0).toUpperCase() + nivel.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Botón de generar */}
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={!isFormValid || isLoading}
          style={{ marginTop: 'var(--spacing-sm)' }}
        >
          {isLoading ? (
            <>
              <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              Generando...
            </>
          ) : (
            <>
              <SparklesIcon size={20} />
              Generar Mapa
            </>
          )}
        </button>
      </form>

      {/* Tip */}
      <div style={{
        marginTop: 'var(--spacing-lg)',
        padding: 'var(--spacing-md)',
        background: 'rgba(99, 102, 241, 0.08)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
      }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
          💡 Sé específico: "El ciclo del agua" es mejor que "agua".
        </p>
      </div>
    </div>
  );
}

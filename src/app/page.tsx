'use client';

import { useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { ConfigPanel } from '@/components/config/ConfigPanel';
import { ConceptMapViewer } from '@/components/concept-map/ConceptMapViewer';
import { MapIcon, DownloadIcon, RefreshIcon, ExpandIcon } from '@/components/icons/Icons';
import {
  generateConceptMap,
  layoutFromTree,
  addExpansionsToTree,
  type ConceptTree,
  type TreeNode
} from '@/services/concept-map-generator';
import type { ConceptMapConfig } from '@/types/concept-map';

// Límite máximo de expansiones
const MAX_EXPANSIONS = 2;

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<ConceptMapConfig | null>(null);
  const [expansionCount, setExpansionCount] = useState(0);
  // NUEVO: Estado para el árbol conceptual
  const [conceptTree, setConceptTree] = useState<ConceptTree | null>(null);

  const handleGenerate = useCallback(async (config: ConceptMapConfig) => {
    setIsLoading(true);
    setError(null);
    setCurrentConfig(config);
    setExpansionCount(0);
    setConceptTree(null);

    try {
      const response = await generateConceptMap(config);

      if (response.success && response.data) {
        setNodes(response.data.nodes);
        setEdges(response.data.edges);
        setHasGenerated(true);
        // Guardar el árbol conceptual
        if (response.tree) {
          setConceptTree(response.tree);
        }
      } else {
        setError(response.error || 'Error desconocido al generar el mapa');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Ocurrió un error inesperado. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Ampliar búsqueda - Expande los nodos del nivel más bajo
   * RECALCULA TODO EL LAYOUT desde el árbol actualizado
   */
  const handleExpand = useCallback(async () => {
    if (!currentConfig || !conceptTree || expansionCount >= MAX_EXPANSIONS) return;

    setIsExpanding(true);
    setError(null);

    try {
      // Función para encontrar nodos hoja (sin hijos) en el árbol
      const findLeafNodes = (node: TreeNode): TreeNode[] => {
        if (node.hijos.length === 0 && node.tipo !== 'main') {
          return [node];
        }
        return node.hijos.flatMap(child => findLeafNodes(child));
      };

      // Encontrar nodos expandibles (hojas que no sean del tipo 'example' o 'expanded')
      const allLeaves = findLeafNodes(conceptTree.raiz);
      const expandableLeaves = allLeaves.filter(
        leaf => leaf.tipo === 'concept' || leaf.tipo === 'subconcept'
      );

      if (expandableLeaves.length === 0) {
        setError('No hay más conceptos para expandir');
        setIsExpanding(false);
        return;
      }

      // Tomar máximo 4 nodos para expandir
      const nodosAExpandir = expandableLeaves.slice(0, 4).map(n => n.nombre);

      const response = await fetch('/api/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tema: currentConfig.tema,
          nivel: currentConfig.nivel,
          grado: currentConfig.grado,
          nodosAExpandir
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // Actualizar el árbol con las expansiones
      const updatedTree = addExpansionsToTree(conceptTree, result.expansiones);

      // RECALCULAR TODO EL LAYOUT desde el árbol actualizado
      const { nodes: newNodes, edges: newEdges } = layoutFromTree(updatedTree);

      // Actualizar estados
      setConceptTree(updatedTree);
      setNodes(newNodes);
      setEdges(newEdges);
      setExpansionCount(prev => prev + 1);

    } catch (err) {
      console.error('Error expandiendo:', err);
      setError('Error al ampliar la búsqueda');
    } finally {
      setIsExpanding(false);
    }
  }, [currentConfig, conceptTree, expansionCount]);

  const handleRegenerate = useCallback(() => {
    if (currentConfig) {
      handleGenerate(currentConfig);
    }
  }, [currentConfig, handleGenerate]);

  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setHasGenerated(false);
    setCurrentConfig(null);
    setError(null);
    setExpansionCount(0);
    setConceptTree(null);
  }, []);

  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * Descarga el mapa conceptual como PNG en alta calidad
   * Captura el contenido completo del mapa, no solo lo visible
   */
  const handleDownload = useCallback(async () => {
    const mapContainer = document.getElementById('concept-map-container');
    if (!mapContainer || !currentConfig) return;

    setIsDownloading(true);

    try {
      // Ocultar controles y minimapa antes de capturar
      const controls = mapContainer.querySelector('.react-flow__controls') as HTMLElement;
      const minimap = mapContainer.querySelector('.react-flow__minimap') as HTMLElement;
      const background = mapContainer.querySelector('.react-flow__background') as HTMLElement;

      if (controls) controls.style.display = 'none';
      if (minimap) minimap.style.display = 'none';
      if (background) background.style.display = 'none';

      // Calcular el bounding box de todos los nodos para determinar el tamaño real
      const nodeElements = mapContainer.querySelectorAll('.react-flow__node');
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      nodeElements.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const containerRect = mapContainer.getBoundingClientRect();
        const x = rect.left - containerRect.left;
        const y = rect.top - containerRect.top;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + rect.width);
        maxY = Math.max(maxY, y + rect.height);
      });

      // Calcular dimensiones con padding
      const padding = 60;
      const width = Math.max(maxX - minX + padding * 2, mapContainer.offsetWidth);
      const height = Math.max(maxY - minY + padding * 2, mapContainer.offsetHeight);

      // Capturar con muy alta resolución para nitidez al hacer zoom
      const dataUrl = await toPng(mapContainer, {
        backgroundColor: '#ffffff',
        pixelRatio: 6,  // Muy alta resolución (6x)
        quality: 1.0,   // Máxima calidad
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
        filter: (node) => {
          if (node instanceof Element) {
            const className = node.className?.toString() || '';
            if (className.includes('react-flow__controls') ||
              className.includes('react-flow__minimap') ||
              className.includes('react-flow__background')) {
              return false;
            }
          }
          return true;
        },
      });

      // Restaurar controles y minimapa
      if (controls) controls.style.display = '';
      if (minimap) minimap.style.display = '';
      if (background) background.style.display = '';

      // Descargar
      const link = document.createElement('a');
      link.download = `mapa-conceptual-${currentConfig.tema.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();

    } catch (error) {
      console.error('Error al generar imagen:', error);
      setError('Error al generar la imagen. Intenta de nuevo.');
    } finally {
      setIsDownloading(false);
    }
  }, [currentConfig]);

  const canExpand = hasGenerated && expansionCount < MAX_EXPANSIONS && !isLoading && !isExpanding;

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <MapIcon size={24} />
          </div>
          <div>
            <div className="logo-text">GENERA</div>
            <div className="logo-subtitle">Mapas Conceptuales para Docentes</div>
          </div>
        </div>

      </header>

      {/* Contenido principal */}
      <main className="app-main">
        {/* Panel de configuración */}
        <aside className="config-panel">
          <ConfigPanel
            onGenerate={handleGenerate}
            isLoading={isLoading}
          />

          {/* Mensaje de error */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </aside>

        {/* Panel del mapa */}
        <section className="map-panel">
          {/* Toolbar del mapa */}
          {hasGenerated && (
            <div className="map-toolbar animate-fade-in">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)'
              }}>
                <span style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)'
                }}>
                  <strong>{currentConfig?.tema}</strong> — {currentConfig?.grado} {currentConfig?.nivel}
                </span>
                {expansionCount > 0 && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-primary)',
                    background: 'var(--color-primary-alpha)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                  }}>
                    +{expansionCount} expansión{expansionCount > 1 ? 'es' : ''}
                  </span>
                )}
              </div>
              <div className="toolbar-actions">
                {/* Botón Ampliar Búsqueda */}
                <button
                  className="toolbar-btn toolbar-btn--primary"
                  onClick={handleExpand}
                  disabled={!canExpand}
                  title={expansionCount >= MAX_EXPANSIONS ? 'Límite alcanzado' : 'Ampliar búsqueda'}
                  style={{
                    background: canExpand ? 'var(--color-primary)' : undefined,
                    color: canExpand ? 'white' : undefined,
                  }}
                >
                  <ExpandIcon size={16} />
                  {isExpanding ? 'Ampliando...' : `Ampliar (${MAX_EXPANSIONS - expansionCount})`}
                </button>
                <button
                  className="toolbar-btn"
                  onClick={handleRegenerate}
                  disabled={isLoading || isExpanding}
                  title="Regenerar mapa"
                >
                  <RefreshIcon size={16} />
                  Regenerar
                </button>
                <button
                  className="toolbar-btn"
                  onClick={handleDownload}
                  disabled={isDownloading || isLoading || isExpanding}
                  title="Descargar mapa como PNG"
                >
                  <DownloadIcon size={16} />
                  {isDownloading ? 'Descargando...' : 'Descargar PNG'}
                </button>
                <button
                  className="toolbar-btn"
                  onClick={handleClear}
                  title="Limpiar mapa"
                >
                  Limpiar
                </button>
              </div>
            </div>
          )}

          {/* Visualizador del mapa */}
          <ConceptMapViewer
            initialNodes={nodes}
            initialEdges={edges}
            isLoading={isLoading || isExpanding}
            hasGenerated={hasGenerated}
          />
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: 'var(--spacing-md)',
        borderTop: '1px solid var(--color-border)',
        color: 'var(--color-text-muted)',
        fontSize: '0.75rem',
      }}>
        © 2024 Generador de Mapas Conceptuales — Herramienta Educativa para Docentes
      </footer>
    </div>
  );
}

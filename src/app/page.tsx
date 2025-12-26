'use client';

import { useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { ConfigPanel } from '@/components/config/ConfigPanel';
import { ConceptMapViewer } from '@/components/concept-map/ConceptMapViewer';
import { MapIcon, DownloadIcon, RefreshIcon, ExpandIcon } from '@/components/icons/Icons';
import { generateConceptMap } from '@/services/concept-map-generator';
import type { ConceptMapConfig, ConceptNodeData } from '@/types/concept-map';

// Límite máximo de expansiones
const MAX_EXPANSIONS = 3;

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<ConceptMapConfig | null>(null);
  const [expansionCount, setExpansionCount] = useState(0);

  const handleGenerate = useCallback(async (config: ConceptMapConfig) => {
    setIsLoading(true);
    setError(null);
    setCurrentConfig(config);
    setExpansionCount(0);

    try {
      const response = await generateConceptMap(config);

      if (response.success && response.data) {
        setNodes(response.data.nodes);
        setEdges(response.data.edges);
        setHasGenerated(true);
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
   */
  const handleExpand = useCallback(async () => {
    if (!currentConfig || expansionCount >= MAX_EXPANSIONS) return;

    setIsExpanding(true);
    setError(null);

    try {
      // Encontrar nodos del nivel más profundo que no sean ejemplos
      const expandableNodes = nodes.filter((node) => {
        const data = node.data as ConceptNodeData;
        // Solo expandir subconceptos o conceptos que no tengan hijos
        const hasChildren = edges.some(e => e.source === node.id);
        return (data.nodeType === 'subconcept' || data.nodeType === 'concept') && !hasChildren;
      });

      if (expandableNodes.length === 0) {
        setError('No hay más conceptos para expandir');
        setIsExpanding(false);
        return;
      }

      // Tomar máximo 4 nodos para expandir
      const nodosAExpandir = expandableNodes
        .slice(0, 4)
        .map(n => (n.data as ConceptNodeData).label);

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

      if (!result.success) {
        throw new Error(result.error);
      }

      // Agregar nuevos nodos y edges
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // Layout horizontal: expandir hacia la derecha
      const maxX = Math.max(...nodes.map(n => n.position.x));
      const newLevelX = maxX + 280;
      const VERTICAL_GAP = 50; // Espacio entre nodos del mismo grupo
      const GROUP_GAP = 30; // Espacio adicional entre grupos

      // Colores para las expansiones
      const expandColors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

      // Primero, preparar datos de expansión con nodos padres válidos
      const expansionData = result.expansiones
        .map((exp: { conceptoOriginal: string; subDetalles: Array<{ nombre: string; descripcion: string }> }, expIndex: number) => {
          const parentNode = nodes.find(n => (n.data as ConceptNodeData).label === exp.conceptoOriginal);
          return parentNode ? { exp, parentNode, expIndex } : null;
        })
        .filter((item: { exp: { conceptoOriginal: string; subDetalles: Array<{ nombre: string; descripcion: string }> }; parentNode: Node; expIndex: number } | null): item is { exp: { conceptoOriginal: string; subDetalles: Array<{ nombre: string; descripcion: string }> }; parentNode: Node; expIndex: number } => item !== null)
        // Ordenar por posición Y del nodo padre
        .sort((a: { parentNode: Node }, b: { parentNode: Node }) => a.parentNode.position.y - b.parentNode.position.y);

      // Calcular posiciones secuencialmente para evitar superposición
      let currentY = expansionData.length > 0
        ? Math.min(...expansionData.map((d: { parentNode: Node }) => d.parentNode.position.y)) - 50
        : 0;

      expansionData.forEach(({ exp, parentNode, expIndex }: { exp: { conceptoOriginal: string; subDetalles: Array<{ nombre: string; descripcion: string }> }; parentNode: Node; expIndex: number }) => {
        const color = expandColors[expIndex % expandColors.length];
        const subCount = exp.subDetalles.length;

        // Calcular el centro ideal basado en el nodo padre
        const idealCenterY = parentNode.position.y;
        const groupHeight = (subCount - 1) * VERTICAL_GAP;

        // Ajustar para que no se superpongan con el grupo anterior
        let startY = Math.max(currentY, idealCenterY - groupHeight / 2);

        exp.subDetalles.forEach((sub: { nombre: string; descripcion: string }, idx: number) => {
          const newId = `expanded-${parentNode.id}-${idx}-${Date.now()}-${expIndex}`;
          const yPos = startY + idx * VERTICAL_GAP;

          newNodes.push({
            id: newId,
            type: 'concept',
            position: { x: newLevelX, y: yPos },
            data: {
              label: sub.nombre,
              nodeType: 'example' as const,
              description: sub.descripcion
            },
          });

          newEdges.push({
            id: `edge-${parentNode.id}-${newId}`,
            source: parentNode.id,
            target: newId,
            type: 'smoothstep',
            style: { stroke: color, strokeWidth: 1.5 },
          });
        });

        // Actualizar currentY para el siguiente grupo
        currentY = startY + groupHeight + GROUP_GAP;
      });

      setNodes(prev => [...prev, ...newNodes]);
      setEdges(prev => [...prev, ...newEdges]);
      setExpansionCount(prev => prev + 1);

    } catch (err) {
      console.error('Error expandiendo:', err);
      setError('Error al ampliar la búsqueda');
    } finally {
      setIsExpanding(false);
    }
  }, [currentConfig, nodes, edges, expansionCount]);

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
  }, []);

  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * Descarga el mapa conceptual como PNG (solo el mapa, sin controles)
   * Usa html-to-image que captura correctamente los SVG de las líneas
   */
  const handleDownload = useCallback(async () => {
    const mapContainer = document.getElementById('concept-map-container');
    if (!mapContainer || !currentConfig) return;

    setIsDownloading(true);

    try {
      // Buscar el viewport de React Flow que contiene nodos y edges
      const viewport = mapContainer.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewport) {
        throw new Error('No se encontró el viewport del mapa');
      }

      // Ocultar controles y minimapa antes de capturar
      const controls = mapContainer.querySelector('.react-flow__controls') as HTMLElement;
      const minimap = mapContainer.querySelector('.react-flow__minimap') as HTMLElement;
      const background = mapContainer.querySelector('.react-flow__background') as HTMLElement;

      if (controls) controls.style.display = 'none';
      if (minimap) minimap.style.display = 'none';
      if (background) background.style.display = 'none';

      // Capturar usando html-to-image que maneja SVG correctamente
      const dataUrl = await toPng(mapContainer, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (node) => {
          // Excluir controles y minimapa del export
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <span style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            background: 'var(--color-bg-tertiary)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-full)',
          }}>
            🎓 Potenciado con IA
          </span>
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

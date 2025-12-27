'use client';

import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ConceptNode } from './ConceptNode';
import { BrainIcon } from '@/components/icons/Icons';
import type { ConceptNodeData } from '@/types/concept-map';

// Componente interno que hace fitView cuando cambian los nodos
function FitViewOnChange({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  const prevCount = useRef(nodeCount);

  useEffect(() => {
    if (nodeCount > prevCount.current) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.15, duration: 500 });
      }, 100);
      return () => clearTimeout(timer);
    }
    prevCount.current = nodeCount;
  }, [nodeCount, fitView]);

  return null;
}

// Panel de Navegación Lateral
function NavigationPanel({
  nodes,
  onNodeSelect,
  isOpen,
  onToggle
}: {
  nodes: Node[];
  onNodeSelect: (nodeId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  // Agrupar nodos por tipo
  const groupedNodes = useMemo(() => {
    const groups: Record<string, Node[]> = {
      main: [],
      concept: [],
      subconcept: [],
      example: [],
      expanded: [],
    };

    nodes.forEach(node => {
      const nodeType = (node.data as ConceptNodeData)?.nodeType || 'concept';
      if (groups[nodeType]) {
        groups[nodeType].push(node);
      }
    });

    return groups;
  }, [nodes]);

  const typeLabels: Record<string, string> = {
    main: '📌 Tema Principal',
    concept: '📗 Conceptos',
    subconcept: '📙 Subconceptos',
    example: '📘 Ejemplos',
    expanded: '📘 Ampliaciones',
  };

  const typeColors: Record<string, string> = {
    main: '#6366f1',
    concept: '#92400e',
    subconcept: '#991b1b',
    example: '#1e40af',
    expanded: '#1e40af',
  };

  return (
    <>
      {/* Botón toggle */}
      <button
        onClick={onToggle}
        className="nav-toggle-btn"
        title={isOpen ? 'Cerrar navegación' : 'Abrir navegación'}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Panel */}
      <div className={`nav-panel ${isOpen ? 'nav-panel--open' : ''}`}>
        <div className="nav-panel__header">
          <span>🗺️ Navegación</span>
          <button
            className="nav-panel__fit-btn"
            onClick={() => onNodeSelect('__fit_all__')}
            title="Ver todo el mapa"
          >
            🎯 Centrar todo
          </button>
        </div>

        <div className="nav-panel__content">
          {Object.entries(groupedNodes).map(([type, typeNodes]) => {
            if (typeNodes.length === 0) return null;

            return (
              <div key={type} className="nav-group">
                <div
                  className="nav-group__title"
                  style={{ color: typeColors[type] }}
                >
                  {typeLabels[type]} ({typeNodes.length})
                </div>
                <div className="nav-group__items">
                  {typeNodes.map(node => (
                    <button
                      key={node.id}
                      className="nav-item"
                      onClick={() => onNodeSelect(node.id)}
                      style={{ borderLeftColor: typeColors[type] }}
                    >
                      {(node.data as ConceptNodeData).label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .nav-toggle-btn {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 100;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: none;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .nav-toggle-btn:hover {
          background: #f3f4f6;
          transform: scale(1.05);
        }

        .nav-panel {
          position: absolute;
          top: 12px;
          left: 60px;
          z-index: 100;
          width: 280px;
          max-height: calc(100% - 24px);
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          transform: translateX(-320px);
          opacity: 0;
          transition: all 0.3s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .nav-panel--open {
          transform: translateX(0);
          opacity: 1;
        }

        .nav-panel__header {
          padding: 14px 16px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-panel__fit-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          color: white;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .nav-panel__fit-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .nav-panel__content {
          padding: 12px;
          overflow-y: auto;
          flex: 1;
        }

        .nav-group {
          margin-bottom: 16px;
        }

        .nav-group__title {
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .nav-group__items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          text-align: left;
          padding: 8px 12px;
          background: #f9fafb;
          border: none;
          border-left: 3px solid;
          border-radius: 6px;
          font-size: 0.85rem;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-item:hover {
          background: #f3f4f6;
          padding-left: 16px;
        }
      `}</style>
    </>
  );
}

// Componente interno para manejar la navegación
function MapWithNavigation({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  nodeTypes
}: {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  nodeTypes: Record<string, React.ComponentType<any>>;
}) {
  const { fitView, setCenter, getZoom } = useReactFlow();
  const [navOpen, setNavOpen] = useState(false);

  const handleNodeSelect = useCallback((nodeId: string) => {
    if (nodeId === '__fit_all__') {
      fitView({ padding: 0.15, duration: 500 });
      return;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const zoom = Math.max(getZoom(), 0.8);
      setCenter(node.position.x + 150, node.position.y + 50, { zoom, duration: 500 });
    }
  }, [nodes, fitView, setCenter, getZoom]);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.15,
          duration: 500,
          includeHiddenNodes: false,
        }}
        defaultEdgeOptions={{
          animated: false,
          style: {
            stroke: 'var(--color-primary)',
            strokeWidth: 2,
          },
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.02}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
      >
        <FitViewOnChange nodeCount={nodes.length} />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-text-muted)"
          style={{ opacity: 0.3 }}
        />
        <Controls
          style={{
            bottom: 20,
            left: 20,
          }}
        />
        <MiniMap
          style={{
            bottom: 20,
            right: 20,
            background: 'var(--color-bg-tertiary)',
          }}
          nodeColor={(node) => {
            const data = node.data as ConceptNodeData;
            switch (data?.nodeType) {
              case 'main': return '#6366f1';
              case 'concept': return '#fbbf24';
              case 'subconcept': return '#f87171';
              case 'example': return '#60a5fa';
              case 'expanded': return '#60a5fa';
              default: return '#94a3b8';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>

      <NavigationPanel
        nodes={nodes}
        onNodeSelect={handleNodeSelect}
        isOpen={navOpen}
        onToggle={() => setNavOpen(!navOpen)}
      />
    </>
  );
}

interface ConceptMapViewerProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  isLoading: boolean;
  hasGenerated: boolean;
}

/**
 * Visualizador de Mapa Conceptual con Panel de Navegación
 */
export function ConceptMapViewer({
  initialNodes,
  initialEdges,
  isLoading,
  hasGenerated
}: ConceptMapViewerProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  useEffect(() => {
    let needsUpdate = false;
    if (JSON.stringify(nodes) !== JSON.stringify(initialNodes)) {
      needsUpdate = true;
    }
    if (needsUpdate) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, initialEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const nodeTypes = useMemo(() => ({
    concept: ConceptNode,
  }), []);

  if (!hasGenerated && !isLoading) {
    return (
      <div className="map-container">
        <div className="map-empty-state">
          <div className="empty-icon">
            <BrainIcon size={60} />
          </div>
          <h3 className="empty-title">Tu mapa conceptual aparecerá aquí</h3>
          <p className="empty-description">
            Ingresa un tema y las opciones de configuración en el panel izquierdo,
            luego haz clic en <strong>&quot;Generar Mapa Conceptual&quot;</strong> para
            visualizar las relaciones entre conceptos.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="map-container">
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span className="loading-text">Generando tu mapa conceptual...</span>
          <span className="loading-subtext">
            La IA está analizando el tema y creando las relaciones
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container" id="concept-map-container">
      <ReactFlowProvider>
        <MapWithNavigation
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
        />
      </ReactFlowProvider>
    </div>
  );
}

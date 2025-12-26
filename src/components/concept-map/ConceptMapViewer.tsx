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
    // Solo hacer fitView si aumentó el número de nodos (expansión)
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

interface ConceptMapViewerProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  isLoading: boolean;
  hasGenerated: boolean;
}

/**
 * Visualizador de Mapa Conceptual
 * 
 * Utiliza React Flow para renderizar el mapa conceptual de manera
 * interactiva, con zoom, pan, minimap y controles.
 * Los nodos son MOVIBLES (draggable).
 */
export function ConceptMapViewer({
  initialNodes,
  initialEdges,
  isLoading,
  hasGenerated
}: ConceptMapViewerProps) {
  // Estados internos para manejar drag & drop
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // Sincronizar con props cuando cambian (nueva generación)
  // Usamos un efecto con un flag para evitar cascading renders
  useEffect(() => {
    // Solo sincronizar si los datos realmente cambiaron
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

  // Handlers para cambios en nodos y edges (permite drag & drop)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Tipos de nodos personalizados - memoizado para evitar re-renders
  const nodeTypes = useMemo(() => ({
    concept: ConceptNode,
  }), []);

  // Callback para cuando un nodo se hace clic
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
  }, []);

  // Estado vacío cuando no hay mapa generado
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

  // Estado de carga
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
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.15,           // Padding ajustado para vista más amplia
            duration: 500,
            includeHiddenNodes: false,
          }}
          defaultEdgeOptions={{
            animated: false,          // Sin animación para mejor captura PNG
            style: {
              stroke: 'var(--color-primary)',
              strokeWidth: 2,
            },
            type: 'smoothstep',
          }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.02}              // Zoom mínimo más bajo para mapas grandes
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
                case 'main': return 'var(--color-primary)';
                case 'concept': return 'var(--color-secondary)';
                case 'subconcept': return 'var(--color-text-muted)';
                case 'example': return 'var(--color-success)';
                default: return 'var(--color-text-muted)';
              }
            }}
            maskColor="rgba(0, 0, 0, 0.7)"
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

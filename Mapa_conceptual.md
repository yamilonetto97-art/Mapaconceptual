# Herramienta de Mapa Conceptual para Docentes

## Descripción General

Aplicación web que genera mapas conceptuales automáticamente usando IA (OpenAI GPT-4o-mini). Los docentes ingresan un tema y la herramienta genera un mapa visual con conceptos, subconceptos y sus definiciones.

## Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **UI de Grafos**: @xyflow/react (React Flow)
- **IA**: OpenAI GPT-4o-mini
- **Exportación**: html-to-image (PNG)
- **Estilos**: CSS Variables + styled-jsx

## Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx              # Página principal
│   ├── layout.tsx            # Layout raíz
│   ├── globals.css           # Estilos globales
│   └── api/
│       ├── generate/route.ts # API para generar mapa
│       └── expand/route.ts   # API para expandir nodos
├── components/
│   ├── concept-map/
│   │   ├── ConceptMapViewer.tsx  # Visualizador del mapa
│   │   └── ConceptNode.tsx       # Componente de nodo
│   ├── config/
│   │   └── ConfigPanel.tsx       # Panel de configuración
│   └── icons/
│       └── Icons.tsx             # Iconos SVG
├── services/
│   └── concept-map-generator.ts  # Lógica de generación y layout
└── types/
    └── concept-map.ts            # Tipos TypeScript
```

---

## Archivos Clave

### 1. Tipos (`src/types/concept-map.ts`)

```typescript
export interface ConceptMapConfig {
  tema: string;
  nivel: string;      // 'Preescolar' | 'Primaria' | 'Secundaria' | 'Preparatoria' | 'Universidad'
  grado: string;      // Ej: '1er grado', '2do grado', etc.
  profundidad: 'basico' | 'intermedio' | 'avanzado';
}

export interface ConceptNodeData {
  label: string;
  nodeType: 'main' | 'concept' | 'subconcept' | 'example' | 'expanded';
  description?: string;
  color?: string;
}

export interface ConceptMapResponse {
  success: boolean;
  data?: {
    nodes: Node[];
    edges: Edge[];
  };
  error?: string;
}
```

### 2. Servicio de Generación (`src/services/concept-map-generator.ts`)

```typescript
/**
 * Servicio de Generación de Mapas Conceptuales
 * Layout: Árbol horizontal estilo Mind Map - SIN SUPERPOSICIÓN
 */

import type { Node, Edge } from '@xyflow/react';
import type {
  ConceptMapConfig,
  ConceptNodeData,
  ConceptMapResponse
} from '@/types/concept-map';

// ============================================================================
// TIPOS PARA EL ÁRBOL CONCEPTUAL
// ============================================================================

export interface TreeNode {
  id: string;
  nombre: string;
  descripcion?: string;
  relacion?: string;
  tipo: 'main' | 'concept' | 'subconcept' | 'example' | 'expanded';
  hijos: TreeNode[];
  color?: string;
}

export interface ConceptTree {
  tema: string;
  profundidad: 'basico' | 'intermedio' | 'avanzado';
  raiz: TreeNode;
}

interface ApiConcepto {
  nombre: string;
  descripcion?: string;
  relacion?: string;
  subconceptos?: Array<{
    nombre: string;
    descripcion?: string;
    ejemplos?: string[];
  }>;
}

// ============================================================================
// CONSTANTES DE LAYOUT
// ============================================================================

const LEVEL_X_GAP = 320;       // Espacio horizontal entre niveles
const NODE_HEIGHT = 140;       // Altura para cajas con descripción completa
const NODE_VERTICAL_GAP = 45;  // Espacio vertical entre nodos
const BRANCH_GAP_MULTIPLIER = 2.5;
const START_X = 50;

const BRANCH_COLORS = [
  '#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400',
  '#16a085', '#c71585', '#00838f', '#558b2f', '#e65100',
];

// ============================================================================
// FUNCIÓN PRINCIPAL DE GENERACIÓN
// ============================================================================

export async function generateConceptMap(config: ConceptMapConfig): Promise<ConceptMapResponse & { tree?: ConceptTree }> {
  try {
    const { tema, profundidad = 'intermedio' } = config;

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al generar el mapa');
    }

    // Construir el árbol conceptual
    const tree = buildTreeFromApi(tema, profundidad, result.conceptos);

    // Generar layout desde el árbol
    const { nodes, edges } = layoutFromTree(tree);

    return {
      success: true,
      data: { nodes, edges },
      tree
    };
  } catch (error) {
    console.error('Error generando mapa conceptual:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al generar el mapa conceptual.'
    };
  }
}

// ============================================================================
// CONSTRUCCIÓN DEL ÁRBOL DESDE LA API
// ============================================================================

function buildTreeFromApi(
  tema: string,
  profundidad: 'basico' | 'intermedio' | 'avanzado',
  conceptos: ApiConcepto[]
): ConceptTree {
  const raiz: TreeNode = {
    id: 'main',
    nombre: tema,
    tipo: 'main',
    hijos: [],
    color: '#6366f1'
  };

  conceptos.forEach((concepto, conceptIndex) => {
    const color = BRANCH_COLORS[conceptIndex % BRANCH_COLORS.length];
    const conceptNode: TreeNode = {
      id: `concept-${conceptIndex}`,
      nombre: concepto.nombre,
      descripcion: concepto.descripcion,
      relacion: concepto.relacion || 'tiene',
      tipo: 'concept',
      hijos: [],
      color
    };

    // Agregar subconceptos si no es básico
    if (profundidad !== 'basico' && concepto.subconceptos) {
      concepto.subconceptos.forEach((sub, subIndex) => {
        const subNode: TreeNode = {
          id: `sub-${conceptIndex}-${subIndex}`,
          nombre: sub.nombre,
          descripcion: sub.descripcion,
          relacion: 'incluye',
          tipo: 'subconcept',
          hijos: [],
          color
        };

        // Agregar ejemplos si es avanzado
        if (profundidad === 'avanzado' && sub.ejemplos) {
          sub.ejemplos.forEach((ejemplo, ejIndex) => {
            subNode.hijos.push({
              id: `ex-${conceptIndex}-${subIndex}-${ejIndex}`,
              nombre: ejemplo,
              relacion: 'ejemplo',
              tipo: 'example',
              hijos: [],
              color
            });
          });
        }

        conceptNode.hijos.push(subNode);
      });
    }

    raiz.hijos.push(conceptNode);
  });

  return { tema, profundidad, raiz };
}

// ============================================================================
// FUNCIÓN DE LAYOUT DESDE EL ÁRBOL (EXPORTADA)
// ============================================================================

export function layoutFromTree(tree: ConceptTree): { nodes: Node<ConceptNodeData>[]; edges: Edge[] } {
  const nodes: Node<ConceptNodeData>[] = [];
  const edges: Edge[] = [];

  // Calcular altura de cada subárbol (bottom-up)
  function calcHeight(node: TreeNode): number {
    if (node.hijos.length === 0) {
      return NODE_HEIGHT;
    }
    const childrenHeight = node.hijos.reduce((sum, child) => sum + calcHeight(child), 0)
      + (node.hijos.length - 1) * NODE_VERTICAL_GAP;
    return Math.max(NODE_HEIGHT, childrenHeight);
  }

  // Calcular alturas de todas las ramas principales
  const branchHeights = tree.raiz.hijos.map(child => calcHeight(child));

  // Calcular posiciones Y de cada rama
  let currentY = 0;
  const branchYPositions: { startY: number; centerY: number; height: number }[] = [];

  branchHeights.forEach(height => {
    branchYPositions.push({
      startY: currentY,
      centerY: currentY + height / 2,
      height
    });
    currentY += height + NODE_VERTICAL_GAP * BRANCH_GAP_MULTIPLIER;
  });

  // Centro del mapa
  const totalHeight = currentY - NODE_VERTICAL_GAP * BRANCH_GAP_MULTIPLIER;
  const mapCenterY = totalHeight / 2;

  // Crear nodo principal (raíz)
  nodes.push({
    id: tree.raiz.id,
    type: 'concept',
    position: { x: START_X, y: mapCenterY },
    data: {
      label: tree.raiz.nombre,
      nodeType: 'main',
      color: tree.raiz.color || '#6366f1'
    }
  });

  // Función recursiva para crear nodos y edges
  function createNodesRecursive(
    node: TreeNode,
    parentId: string,
    level: number,
    startY: number,
    availableHeight: number
  ): void {
    const x = START_X + level * LEVEL_X_GAP;

    if (node.hijos.length === 0) return;

    const childHeights = node.hijos.map(child => calcHeight(child));
    const totalChildrenHeight = childHeights.reduce((sum, h) => sum + h, 0)
      + (node.hijos.length - 1) * NODE_VERTICAL_GAP;

    let childY = startY + (availableHeight - totalChildrenHeight) / 2;

    node.hijos.forEach((child, idx) => {
      const childHeight = childHeights[idx];
      const childCenterY = childY + childHeight / 2;

      nodes.push({
        id: child.id,
        type: 'concept',
        position: { x, y: childCenterY },
        data: {
          label: child.nombre,
          nodeType: child.tipo === 'expanded' ? 'example' : child.tipo,
          description: child.descripcion,
          color: child.color
        }
      });

      edges.push({
        id: `edge-${parentId}-${child.id}`,
        source: parentId,
        target: child.id,
        type: 'smoothstep',
        style: {
          stroke: '#94a3b8',
          strokeWidth: 2
        }
      });

      createNodesRecursive(child, child.id, level + 1, childY, childHeight);

      childY += childHeight + NODE_VERTICAL_GAP;
    });
  }

  // Procesar cada rama principal
  tree.raiz.hijos.forEach((conceptNode, idx) => {
    const branchPos = branchYPositions[idx];

    nodes.push({
      id: conceptNode.id,
      type: 'concept',
      position: { x: START_X + LEVEL_X_GAP, y: branchPos.centerY },
      data: {
        label: conceptNode.nombre,
        nodeType: 'concept',
        description: conceptNode.descripcion,
        color: conceptNode.color
      }
    });

    edges.push({
      id: `edge-main-${conceptNode.id}`,
      source: tree.raiz.id,
      target: conceptNode.id,
      type: 'smoothstep',
      style: { stroke: '#94a3b8', strokeWidth: 2.5 }
    });

    createNodesRecursive(
      conceptNode,
      conceptNode.id,
      2,
      branchPos.startY,
      branchPos.height
    );
  });

  return { nodes, edges };
}

// ============================================================================
// FUNCIÓN PARA AGREGAR EXPANSIONES AL ÁRBOL
// ============================================================================

export function addExpansionsToTree(
  tree: ConceptTree,
  expansions: Array<{
    conceptoOriginal: string;
    subDetalles: Array<{ nombre: string; descripcion: string }>;
  }>
): ConceptTree {
  const newTree: ConceptTree = JSON.parse(JSON.stringify(tree));

  function findNodeByName(node: TreeNode, nombre: string): TreeNode | null {
    if (node.nombre === nombre) return node;
    for (const child of node.hijos) {
      const found = findNodeByName(child, nombre);
      if (found) return found;
    }
    return null;
  }

  expansions.forEach((expansion, expIdx) => {
    const parentNode = findNodeByName(newTree.raiz, expansion.conceptoOriginal);
    if (parentNode) {
      expansion.subDetalles.forEach((detalle, idx) => {
        parentNode.hijos.push({
          id: `expanded-${parentNode.id}-${expIdx}-${idx}-${Date.now()}`,
          nombre: detalle.nombre,
          descripcion: detalle.descripcion,
          relacion: 'incluye',
          tipo: 'expanded',
          hijos: [],
          color: parentNode.color
        });
      });
    }
  });

  return newTree;
}
```

### 3. API de Generación (`src/app/api/generate/route.ts`)

```typescript
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { tema, nivel, grado, profundidad } = await request.json();

    if (!tema) {
      return NextResponse.json(
        { success: false, error: 'El tema es requerido' },
        { status: 400 }
      );
    }

    const numConceptos = profundidad === 'basico' ? 3 : profundidad === 'intermedio' ? 4 : 5;
    const numSubconceptos = profundidad === 'basico' ? 0 : profundidad === 'intermedio' ? 2 : 3;

    const prompt = `Genera un mapa conceptual sobre "${tema}" para estudiantes de ${grado} de ${nivel}.

Devuelve EXACTAMENTE ${numConceptos} conceptos principales relacionados con el tema.
${numSubconceptos > 0 ? `Cada concepto debe tener ${numSubconceptos} subconceptos.` : ''}

IMPORTANTE:
- Las descripciones deben ser breves (máximo 15 palabras) y apropiadas para el nivel educativo.
- Usa lenguaje simple y claro.

Responde SOLO con JSON válido en este formato:
{
  "conceptos": [
    {
      "nombre": "Concepto 1",
      "descripcion": "Breve descripción del concepto",
      "relacion": "verbo que conecta con el tema principal (ej: tiene, produce, incluye)"
      ${numSubconceptos > 0 ? `,"subconceptos": [
        {
          "nombre": "Subconcepto 1",
          "descripcion": "Breve descripción"
        }
      ]` : ''}
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en educación que crea mapas conceptuales claros y educativos. Responde SOLO con JSON válido, sin markdown ni explicaciones.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '';

    // Limpiar respuesta
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }

    const data = JSON.parse(cleanContent.trim());

    return NextResponse.json({
      success: true,
      conceptos: data.conceptos
    });

  } catch (error) {
    console.error('Error en /api/generate:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar el mapa conceptual' },
      { status: 500 }
    );
  }
}
```

### 4. API de Expansión (`src/app/api/expand/route.ts`)

```typescript
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { tema, nivel, grado, nodosAExpandir } = await request.json();

    if (!nodosAExpandir || nodosAExpandir.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay nodos para expandir' },
        { status: 400 }
      );
    }

    const prompt = `Para el tema "${tema}" (nivel ${nivel}, ${grado}), expande los siguientes conceptos con 2 sub-detalles cada uno:

Conceptos a expandir: ${nodosAExpandir.join(', ')}

IMPORTANTE: Las descripciones deben ser breves (máximo 12 palabras).

Responde SOLO con JSON válido:
{
  "expansiones": [
    {
      "conceptoOriginal": "nombre del concepto",
      "subDetalles": [
        { "nombre": "Detalle 1", "descripcion": "Breve descripción" },
        { "nombre": "Detalle 2", "descripcion": "Breve descripción" }
      ]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en educación. Responde SOLO con JSON válido.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content || '';

    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);

    const data = JSON.parse(cleanContent.trim());

    return NextResponse.json({
      success: true,
      expansiones: data.expansiones
    });

  } catch (error) {
    console.error('Error en /api/expand:', error);
    return NextResponse.json(
      { success: false, error: 'Error al expandir conceptos' },
      { status: 500 }
    );
  }
}
```

### 5. Componente de Nodo (`src/components/concept-map/ConceptNode.tsx`)

```typescript
'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ConceptNodeData } from '@/types/concept-map';

function ConceptNodeComponent({ data }: NodeProps<Node<ConceptNodeData>>) {
  const { label, nodeType, description, color } = data;

  // Colores de fondo por tipo de nodo
  const bgColors: Record<string, string> = {
    main: '#6366f1',      // Violeta para el principal
    concept: '#fef3c7',   // Amarillo claro para conceptos
    subconcept: '#fee2e2', // Rosa claro para subconceptos
    example: '#dbeafe',   // Azul claro para ejemplos
    expanded: '#dbeafe',  // Azul claro para expandidos
  };

  const textColors: Record<string, string> = {
    main: '#ffffff',
    concept: '#92400e',   // Marrón oscuro para amarillo
    subconcept: '#991b1b', // Rojo oscuro para rosa
    example: '#1e40af',   // Azul oscuro para azul claro
    expanded: '#1e40af',
  };

  const bgColor = bgColors[nodeType] || color || '#e5e7eb';
  const textColor = textColors[nodeType] || '#1f2937';

  return (
    <>
      {nodeType !== 'main' && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
        />
      )}

      <div
        className={`concept-box concept-box--${nodeType}`}
        style={{ backgroundColor: bgColor }}
      >
        <div className="concept-box__title" style={{ color: textColor }}>{label}</div>
        {description && (
          <div className="concept-box__description" style={{ color: '#1f2937' }}>{description}</div>
        )}
      </div>

      {nodeType !== 'example' && nodeType !== 'expanded' && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
        />
      )}

      <style jsx>{`
        .concept-box {
          padding: 14px 18px;
          border-radius: 10px;
          min-width: 200px;
          max-width: 300px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
          border: 2px solid rgba(0, 0, 0, 0.08);
        }

        .concept-box__title {
          font-weight: 700;
          font-size: 0.95rem;
          line-height: 1.3;
          margin-bottom: 4px;
        }

        .concept-box__description {
          font-size: 0.8rem;
          line-height: 1.4;
          opacity: 0.9;
        }

        .concept-box--main {
          min-width: 220px;
          max-width: 320px;
          text-align: center;
          padding: 16px 24px;
        }

        .concept-box--main .concept-box__title {
          font-size: 1.1rem;
          margin-bottom: 6px;
        }

        .concept-box--concept {
          min-width: 200px;
          max-width: 260px;
        }

        .concept-box--subconcept {
          min-width: 180px;
          max-width: 240px;
        }

        .concept-box--example,
        .concept-box--expanded {
          min-width: 160px;
          max-width: 220px;
        }
      `}</style>
    </>
  );
}

export const ConceptNode = memo(ConceptNodeComponent);
```

### 6. Visualizador del Mapa (`src/components/concept-map/ConceptMapViewer.tsx`)

```typescript
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

// Componente para fitView automático
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
      <button
        onClick={onToggle}
        className="nav-toggle-btn"
        title={isOpen ? 'Cerrar navegación' : 'Abrir navegación'}
      >
        {isOpen ? '✕' : '☰'}
      </button>

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
                <div className="nav-group__title" style={{ color: typeColors[type] }}>
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
        fitViewOptions={{ padding: 0.15, duration: 500 }}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: 'var(--color-primary)', strokeWidth: 2 },
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.02}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
      >
        <FitViewOnChange nodeCount={nodes.length} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} style={{ opacity: 0.3 }} />
        <Controls style={{ bottom: 20, left: 20 }} />
        <MiniMap
          style={{ bottom: 20, right: 20 }}
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

export function ConceptMapViewer({
  initialNodes,
  initialEdges,
  isLoading,
  hasGenerated
}: ConceptMapViewerProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  useEffect(() => {
    if (JSON.stringify(nodes) !== JSON.stringify(initialNodes)) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const nodeTypes = useMemo(() => ({ concept: ConceptNode }), []);

  if (!hasGenerated && !isLoading) {
    return (
      <div className="map-container">
        <div className="map-empty-state">
          <div className="empty-icon"><BrainIcon size={60} /></div>
          <h3>Tu mapa conceptual aparecerá aquí</h3>
          <p>Ingresa un tema y haz clic en "Generar Mapa Conceptual"</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="map-container">
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Generando tu mapa conceptual...</span>
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
```

### 7. Página Principal (`src/app/page.tsx`)

```typescript
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
        if (response.tree) {
          setConceptTree(response.tree);
        }
      } else {
        setError(response.error || 'Error desconocido');
      }
    } catch (err) {
      setError('Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleExpand = useCallback(async () => {
    if (!currentConfig || !conceptTree || expansionCount >= MAX_EXPANSIONS) return;

    setIsExpanding(true);
    setError(null);

    try {
      const findLeafNodes = (node: TreeNode): TreeNode[] => {
        if (node.hijos.length === 0 && node.tipo !== 'main') {
          return [node];
        }
        return node.hijos.flatMap(child => findLeafNodes(child));
      };

      const allLeaves = findLeafNodes(conceptTree.raiz);
      const expandableLeaves = allLeaves.filter(
        leaf => leaf.tipo === 'concept' || leaf.tipo === 'subconcept'
      );

      if (expandableLeaves.length === 0) {
        setError('No hay más conceptos para expandir');
        setIsExpanding(false);
        return;
      }

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

      // Actualizar árbol y recalcular layout completo
      const updatedTree = addExpansionsToTree(conceptTree, result.expansiones);
      const { nodes: newNodes, edges: newEdges } = layoutFromTree(updatedTree);

      setConceptTree(updatedTree);
      setNodes(newNodes);
      setEdges(newEdges);
      setExpansionCount(prev => prev + 1);

    } catch (err) {
      setError('Error al ampliar la búsqueda');
    } finally {
      setIsExpanding(false);
    }
  }, [currentConfig, conceptTree, expansionCount]);

  const handleDownload = useCallback(async () => {
    const mapContainer = document.getElementById('concept-map-container');
    if (!mapContainer || !currentConfig) return;

    try {
      // Ocultar controles
      const controls = mapContainer.querySelector('.react-flow__controls') as HTMLElement;
      const minimap = mapContainer.querySelector('.react-flow__minimap') as HTMLElement;
      const background = mapContainer.querySelector('.react-flow__background') as HTMLElement;

      if (controls) controls.style.display = 'none';
      if (minimap) minimap.style.display = 'none';
      if (background) background.style.display = 'none';

      const dataUrl = await toPng(mapContainer, {
        backgroundColor: '#ffffff',
        pixelRatio: 6,
        quality: 1.0,
        cacheBust: true,
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

      // Restaurar controles
      if (controls) controls.style.display = '';
      if (minimap) minimap.style.display = '';
      if (background) background.style.display = '';

      const link = document.createElement('a');
      link.download = `mapa-conceptual-${currentConfig.tema.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();

    } catch (error) {
      console.error('Error al generar imagen:', error);
    }
  }, [currentConfig]);

  // ... resto del componente (UI)
}
```

### 8. Panel de Configuración (`src/components/config/ConfigPanel.tsx`)

```typescript
'use client';

import { useState } from 'react';
import type { ConceptMapConfig } from '@/types/concept-map';

interface ConfigPanelProps {
  onGenerate: (config: ConceptMapConfig) => void;
  isLoading: boolean;
}

const NIVELES = ['Preescolar', 'Primaria', 'Secundaria', 'Preparatoria', 'Universidad'];

const GRADOS: Record<string, string[]> = {
  'Preescolar': ['1er grado', '2do grado', '3er grado'],
  'Primaria': ['1er grado', '2do grado', '3er grado', '4to grado', '5to grado', '6to grado'],
  'Secundaria': ['1er grado', '2do grado', '3er grado'],
  'Preparatoria': ['1er semestre', '2do semestre', '3er semestre', '4to semestre', '5to semestre', '6to semestre'],
  'Universidad': ['1er semestre', '2do semestre', '3er semestre', '4to semestre', '5to+ semestre'],
};

export function ConfigPanel({ onGenerate, isLoading }: ConfigPanelProps) {
  const [tema, setTema] = useState('');
  const [nivel, setNivel] = useState('Primaria');
  const [grado, setGrado] = useState('4to grado');
  const [profundidad, setProfundidad] = useState<'basico' | 'intermedio' | 'avanzado'>('intermedio');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tema.trim()) return;

    onGenerate({ tema: tema.trim(), nivel, grado, profundidad });
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-group">
        <label>Tema del Mapa Conceptual</label>
        <input
          type="text"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Ej: La célula, Revolución Industrial..."
          disabled={isLoading}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Nivel Educativo</label>
          <select value={nivel} onChange={(e) => {
            setNivel(e.target.value);
            setGrado(GRADOS[e.target.value][0]);
          }} disabled={isLoading}>
            {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Grado</label>
          <select value={grado} onChange={(e) => setGrado(e.target.value)} disabled={isLoading}>
            {GRADOS[nivel].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Profundidad</label>
        <div className="radio-group">
          {(['basico', 'intermedio', 'avanzado'] as const).map(p => (
            <label key={p} className="radio-label">
              <input
                type="radio"
                name="profundidad"
                value={p}
                checked={profundidad === p}
                onChange={() => setProfundidad(p)}
                disabled={isLoading}
              />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" disabled={isLoading || !tema.trim()} className="submit-btn">
        {isLoading ? 'Generando...' : 'Generar Mapa Conceptual'}
      </button>
    </form>
  );
}
```

---

## Dependencias (`package.json`)

```json
{
  "dependencies": {
    "@xyflow/react": "^12.0.0",
    "html-to-image": "^1.11.11",
    "next": "14.2.35",
    "openai": "^4.0.0",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "typescript": "^5"
  }
}
```

## Variables de Entorno (`.env.local`)

```
OPENAI_API_KEY=tu_api_key_aqui
```

---

## Características Principales

1. **Generación con IA**: Usa GPT-4o-mini para generar conceptos según nivel educativo
2. **Layout sin superposición**: Algoritmo bottom-up que calcula alturas de subárboles
3. **Expansión de nodos**: Permite ampliar el mapa 2 veces máximo
4. **Panel de navegación**: Navegación lateral para mapas grandes
5. **Exportación PNG**: Alta calidad (pixelRatio: 6)
6. **Colores por nivel**:
   - Principal: Violeta (#6366f1)
   - Conceptos: Amarillo claro (#fef3c7)
   - Subconceptos: Rosa claro (#fee2e2)
   - Ejemplos/Ampliaciones: Azul claro (#dbeafe)

## Flujo de Datos

```
Usuario ingresa tema
       ↓
ConfigPanel → handleGenerate()
       ↓
POST /api/generate → OpenAI GPT-4o-mini
       ↓
buildTreeFromApi() → ConceptTree
       ↓
layoutFromTree() → nodes[] + edges[]
       ↓
ConceptMapViewer → ReactFlow
       ↓
[Opcional] handleExpand() → POST /api/expand
       ↓
addExpansionsToTree() → layoutFromTree() → actualizar vista
```

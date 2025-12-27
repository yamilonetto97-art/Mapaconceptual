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
  relacion?: string;  // Texto de enlace (ej: "tiene", "produce", "incluye")
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
const NODE_VERTICAL_GAP = 45;  // Espacio vertical entre nodos (aumentado)
const BRANCH_GAP_MULTIPLIER = 2.5; // Separación extra entre ramas principales
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
      relacion: concepto.relacion || 'tiene',  // Guardar relación para el edge
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
          relacion: 'incluye',  // Relación por defecto para subconceptos
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
              relacion: 'ejemplo',  // Relación para ejemplos
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

    // Calcular posiciones Y para los hijos
    if (node.hijos.length === 0) return;

    const childHeights = node.hijos.map(child => calcHeight(child));
    const totalChildrenHeight = childHeights.reduce((sum, h) => sum + h, 0)
      + (node.hijos.length - 1) * NODE_VERTICAL_GAP;

    // Centrar los hijos en el espacio disponible
    let childY = startY + (availableHeight - totalChildrenHeight) / 2;

    node.hijos.forEach((child, idx) => {
      const childHeight = childHeights[idx];
      const childCenterY = childY + childHeight / 2;

      // Crear nodo hijo
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

      // Crear edge simple (sin label - la descripción va en el nodo)
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

      // Recursión para los hijos
      createNodesRecursive(child, child.id, level + 1, childY, childHeight);

      childY += childHeight + NODE_VERTICAL_GAP;
    });
  }

  // Procesar cada rama principal
  tree.raiz.hijos.forEach((conceptNode, idx) => {
    const branchPos = branchYPositions[idx];

    // Crear nodo concepto
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

    // Edge desde raíz simple
    edges.push({
      id: `edge-main-${conceptNode.id}`,
      source: tree.raiz.id,
      target: conceptNode.id,
      type: 'smoothstep',
      style: { stroke: '#94a3b8', strokeWidth: 2.5 }
    });

    // Crear subárbol
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
  // Clonar el árbol profundamente
  const newTree: ConceptTree = JSON.parse(JSON.stringify(tree));

  // Función para buscar un nodo por nombre en el árbol
  function findNodeByName(node: TreeNode, nombre: string): TreeNode | null {
    if (node.nombre === nombre) return node;
    for (const child of node.hijos) {
      const found = findNodeByName(child, nombre);
      if (found) return found;
    }
    return null;
  }

  // Agregar cada expansión
  expansions.forEach((expansion, expIdx) => {
    const parentNode = findNodeByName(newTree.raiz, expansion.conceptoOriginal);
    if (parentNode) {
      expansion.subDetalles.forEach((detalle, idx) => {
        parentNode.hijos.push({
          id: `expanded-${parentNode.id}-${expIdx}-${idx}-${Date.now()}`,
          nombre: detalle.nombre,
          descripcion: detalle.descripcion,
          relacion: 'incluye',  // Relación para nodos expandidos
          tipo: 'expanded',
          hijos: [],
          color: parentNode.color
        });
      });
    }
  });

  return newTree;
}

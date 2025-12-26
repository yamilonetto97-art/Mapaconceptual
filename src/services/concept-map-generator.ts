/**
 * Servicio de Generación de Mapas Conceptuales
 * Layout: Árbol horizontal estilo Mind Map
 */

import type { Node, Edge } from '@xyflow/react';
import type {
  ConceptMapConfig,
  ConceptNodeData,
  ConceptMapResponse
} from '@/types/concept-map';

interface Subconcepto {
  nombre: string;
  descripcion?: string;
  ejemplos?: string[];
}

interface Concepto {
  nombre: string;
  descripcion?: string;
  relacion?: string;
  subconceptos?: Subconcepto[];
}

export async function generateConceptMap(config: ConceptMapConfig): Promise<ConceptMapResponse> {
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

    const { nodes, edges } = createMindMapLayout(
      tema,
      profundidad,
      result.conceptos
    );

    return {
      success: true,
      data: { nodes, edges }
    };
  } catch (error) {
    console.error('Error generando mapa conceptual:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al generar el mapa conceptual.'
    };
  }
}

/**
 * Layout estilo Mind Map - horizontal con mucho espacio
 */
function createMindMapLayout(
  tema: string,
  profundidad: 'basico' | 'intermedio' | 'avanzado',
  conceptos: Concepto[]
): { nodes: Node<ConceptNodeData>[]; edges: Edge[] } {
  const nodes: Node<ConceptNodeData>[] = [];
  const edges: Edge[] = [];

  // =========================================================================
  // CONSTANTES DE ESPACIADO - Valores balanceados para layout compacto
  // =========================================================================
  const HORIZONTAL_GAP = 280;             // Espacio horizontal entre niveles
  const VERTICAL_GAP_CONCEPT = 100;       // Entre conceptos principales
  const VERTICAL_GAP_SUB = 60;            // Entre subconceptos
  const VERTICAL_GAP_EXAMPLE = 45;        // Entre ejemplos
  const START_X = 80;

  // Colores de las ramas
  const branchColors = [
    '#c0392b', // rojo oscuro
    '#2980b9', // azul
    '#27ae60', // verde
    '#8e44ad', // púrpura
    '#d35400', // naranja
    '#16a085', // turquesa
    '#c71585', // rosa
    '#00838f', // cyan oscuro
    '#558b2f', // verde oliva
    '#e65100', // naranja oscuro
  ];

  // Calcular posiciones Y para cada concepto
  const conceptPositions: { startY: number; endY: number }[] = [];
  let currentY = 50;

  conceptos.forEach((concepto, idx) => {
    const startY = currentY;
    let height = VERTICAL_GAP_CONCEPT;

    if (profundidad !== 'basico' && concepto.subconceptos) {
      const subCount = concepto.subconceptos.length;
      let subHeight = 0;

      concepto.subconceptos.forEach(sub => {
        if (profundidad === 'avanzado' && sub.ejemplos) {
          subHeight += sub.ejemplos.length * VERTICAL_GAP_EXAMPLE + VERTICAL_GAP_SUB;
        } else {
          subHeight += VERTICAL_GAP_SUB;
        }
      });

      height = Math.max(height, subHeight);
    }

    conceptPositions.push({ startY, endY: startY + height });
    currentY = startY + height + VERTICAL_GAP_CONCEPT * 0.5;
  });

  // Calcular Y central para el nodo principal
  const totalHeight = currentY;
  const mainY = totalHeight / 2;

  // NODO PRINCIPAL
  nodes.push({
    id: 'main',
    type: 'concept',
    position: { x: START_X, y: mainY },
    data: {
      label: tema,
      nodeType: 'main',
      color: '#6366f1'
    },
  });

  // CONCEPTOS Y SUS HIJOS
  conceptos.forEach((concepto, conceptIndex) => {
    const conceptId = `concept-${conceptIndex}`;
    const color = branchColors[conceptIndex % branchColors.length];
    const pos = conceptPositions[conceptIndex];
    const conceptY = (pos.startY + pos.endY) / 2;
    const level1X = START_X + HORIZONTAL_GAP;

    // Nodo concepto
    nodes.push({
      id: conceptId,
      type: 'concept',
      position: { x: level1X, y: conceptY },
      data: {
        label: concepto.nombre,
        nodeType: 'concept',
        color
      },
    });

    // Edge del main al concepto
    edges.push({
      id: `edge-main-${conceptId}`,
      source: 'main',
      target: conceptId,
      type: 'smoothstep',
      style: { stroke: color, strokeWidth: 3 },
    });

    // SUBCONCEPTOS
    if (profundidad !== 'basico' && concepto.subconceptos) {
      const level2X = level1X + HORIZONTAL_GAP;
      let subY = pos.startY;

      concepto.subconceptos.forEach((sub, subIndex) => {
        const subId = `sub-${conceptIndex}-${subIndex}`;

        // Calcular altura del subconcepto
        let subHeight = VERTICAL_GAP_SUB;
        if (profundidad === 'avanzado' && sub.ejemplos) {
          subHeight = sub.ejemplos.length * VERTICAL_GAP_EXAMPLE;
        }

        const subNodeY = subY + subHeight / 2;

        nodes.push({
          id: subId,
          type: 'concept',
          position: { x: level2X, y: subNodeY },
          data: {
            label: sub.nombre,
            nodeType: 'subconcept',
            color
          },
        });

        edges.push({
          id: `edge-${conceptId}-${subId}`,
          source: conceptId,
          target: subId,
          type: 'smoothstep',
          style: { stroke: color, strokeWidth: 2.5 },
        });

        // EJEMPLOS
        if (profundidad === 'avanzado' && sub.ejemplos) {
          const level3X = level2X + HORIZONTAL_GAP * 0.85;

          sub.ejemplos.forEach((ejemplo, ejIndex) => {
            const ejId = `ex-${conceptIndex}-${subIndex}-${ejIndex}`;
            const ejY = subY + ejIndex * VERTICAL_GAP_EXAMPLE;

            nodes.push({
              id: ejId,
              type: 'concept',
              position: { x: level3X, y: ejY },
              data: {
                label: ejemplo,
                nodeType: 'example',
                color
              },
            });

            edges.push({
              id: `edge-${subId}-${ejId}`,
              source: subId,
              target: ejId,
              type: 'smoothstep',
              style: { stroke: color, strokeWidth: 2 },
            });
          });
        }

        subY += subHeight + VERTICAL_GAP_SUB * 0.3;
      });
    }
  });

  return { nodes, edges };
}

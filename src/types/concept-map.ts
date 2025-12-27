/**
 * Tipos para el Generador de Mapas Conceptuales
 * 
 * Define las estructuras de datos utilizadas en toda la aplicación
 * para la generación y visualización de mapas conceptuales.
 */

import type { Node, Edge } from '@xyflow/react';

/**
 * Niveles educativos disponibles en Perú
 */
export type NivelEducativo = 'inicial' | 'primaria' | 'secundaria';

/**
 * Grados disponibles por nivel educativo
 */
export const GRADOS_POR_NIVEL: Record<NivelEducativo, string[]> = {
  inicial: ['3 años', '4 años', '5 años'],
  primaria: ['1°', '2°', '3°', '4°', '5°', '6°'],
  secundaria: ['1°', '2°', '3°', '4°', '5°'],
};

/**
 * Configuración de generación del mapa conceptual
 */
export interface ConceptMapConfig {
  /** Tema principal del mapa conceptual */
  tema: string;
  /** Nivel educativo */
  nivel: NivelEducativo;
  /** Grado específico */
  grado: string;
  /** Profundidad del mapa (niveles de subconceptos) */
  profundidad?: 'basico' | 'intermedio' | 'avanzado';
}

/**
 * Tipos de nodos en el mapa conceptual
 */
export type ConceptNodeType = 'main' | 'concept' | 'subconcept' | 'example' | 'expanded';

/**
 * Datos personalizados para cada nodo del mapa
 * Extiende Record<string, unknown> para compatibilidad con React Flow
 */
export interface ConceptNodeData extends Record<string, unknown> {
  /** Texto/etiqueta del nodo */
  label: string;
  /** Tipo de nodo para determinar estilos */
  nodeType: ConceptNodeType;
  /** Descripción adicional opcional */
  description?: string;
  /** Color de la rama (para el círculo) */
  color?: string;
}

/**
 * Respuesta de la API de generación
 */
export interface ConceptMapResponse {
  success: boolean;
  data?: {
    nodes: Node<ConceptNodeData>[];
    edges: Edge[];
  };
  error?: string;
}

/**
 * Estado global del generador
 */
export interface GeneratorState {
  config: ConceptMapConfig;
  nodes: Node<ConceptNodeData>[];
  edges: Edge[];
  isLoading: boolean;
  error: string | null;
  hasGenerated: boolean;
}

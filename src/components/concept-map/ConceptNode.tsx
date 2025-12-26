'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ConceptNodeData } from '@/types/concept-map';

/**
 * Nodo personalizado para el mapa conceptual - Estilo Mind Map
 * Diseño limpio con círculo de color + texto
 */
function ConceptNodeComponent({ data }: NodeProps<Node<ConceptNodeData>>) {
  const { label, nodeType, color } = data;

  // Color del círculo (usa el color de la rama o un default)
  const dotColor = color || '#6366f1';

  return (
    <>
      {/* Handle de entrada (izquierda) */}
      {nodeType !== 'main' && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: 'transparent',
            border: 'none',
            width: 1,
            height: 1,
          }}
        />
      )}

      {/* Contenido del nodo */}
      <div className={`concept-node concept-node--${nodeType}`}>
        <span
          className="concept-node__dot"
          style={{ backgroundColor: dotColor }}
        />
        <span className="concept-node__label">{label}</span>
      </div>

      {/* Handle de salida (derecha) */}
      {nodeType !== 'example' && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: 'transparent',
            border: 'none',
            width: 1,
            height: 1,
          }}
        />
      )}

      <style jsx>{`
        .concept-node__dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .concept-node__label {
          line-height: 1.3;
        }

        .concept-node--main .concept-node__dot {
          width: 14px;
          height: 14px;
        }

        .concept-node--subconcept .concept-node__dot {
          width: 8px;
          height: 8px;
        }

        .concept-node--example .concept-node__dot {
          width: 6px;
          height: 6px;
        }
      `}</style>
    </>
  );
}

export const ConceptNode = memo(ConceptNodeComponent);

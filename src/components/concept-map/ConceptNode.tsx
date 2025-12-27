'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ConceptNodeData } from '@/types/concept-map';

/**
 * Nodo personalizado para el mapa conceptual
 * Muestra nombre + descripción completa en cajas coloreadas
 */
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
    expanded: '#1e40af',  // Azul oscuro para azul claro
  };

  const bgColor = bgColors[nodeType] || color || '#e5e7eb';
  const textColor = textColors[nodeType] || '#1f2937';

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

      {/* Contenido del nodo - Caja con nombre y descripción */}
      <div
        className={`concept-box concept-box--${nodeType}`}
        style={{
          backgroundColor: bgColor,
        }}
      >
        <div className="concept-box__title" style={{ color: textColor }}>{label}</div>
        {description && (
          <div className="concept-box__description" style={{ color: '#1f2937' }}>{description}</div>
        )}
      </div>

      {/* Handle de salida (derecha) */}
      {nodeType !== 'example' && nodeType !== 'expanded' && (
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

        .concept-box--main .concept-box__description {
          font-size: 0.85rem;
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

        .concept-box--example .concept-box__title,
        .concept-box--expanded .concept-box__title {
          font-size: 0.85rem;
        }

        .concept-box--example .concept-box__description,
        .concept-box--expanded .concept-box__description {
          font-size: 0.75rem;
        }
      `}</style>
    </>
  );
}

export const ConceptNode = memo(ConceptNodeComponent);

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ConceptMapConfig } from '@/types/concept-map';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function POST(request: Request) {
  try {
    const config: ConceptMapConfig = await request.json();
    const { tema, nivel, grado, profundidad = 'intermedio' } = config;

    // Determinar cantidad de detalles según profundidad
    const detallesProfundidad = {
      basico: 'conceptos principales (3-4) con descripción, sin subconceptos',
      intermedio: 'conceptos principales (4-5) con descripción, cada uno con 2-3 subconceptos que también tengan descripción',
      avanzado: 'conceptos principales (4-5) con descripción detallada, cada uno con 2-3 subconceptos con descripción y 2 ejemplos concretos'
    };

    const prompt = `Eres un experto educador peruano. Genera un mapa conceptual COMPLETO y EDUCATIVO sobre "${tema}" para estudiantes de ${grado} de ${nivel}.

REQUISITOS IMPORTANTES:
- Nivel de detalle: ${detallesProfundidad[profundidad]}
- Cada concepto DEBE tener una descripción clara y educativa (definición)
- Cada subconcepto DEBE tener su propia descripción/definición
- Usa lenguaje apropiado para estudiantes de ${nivel} ${grado}
- Los conceptos deben ser educativamente precisos y completos
- Las relaciones deben usar verbos conectores como: "tiene", "produce", "requiere", "incluye", "se divide en", "se caracteriza por", etc.

Responde SOLO con un JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "conceptos": [
    {
      "nombre": "Concepto Principal",
      "descripcion": "Definición clara y educativa del concepto",
      "relacion": "verbo conector",
      "subconceptos": [
        {
          "nombre": "Subconcepto",
          "descripcion": "Definición clara del subconcepto",
          "ejemplos": ["Ejemplo concreto 1", "Ejemplo concreto 2"]
        }
      ]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente educativo experto en crear mapas conceptuales. Siempre respondes con JSON válido sin formato markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Limpiar el JSON (por si viene con markdown)
    const cleanJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanJson) as { conceptos: Concepto[] };

    return NextResponse.json({
      success: true,
      conceptos: parsed.conceptos
    });

  } catch (error) {
    console.error('Error en API generate:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al generar el mapa conceptual'
      },
      { status: 500 }
    );
  }
}

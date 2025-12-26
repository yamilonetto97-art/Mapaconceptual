import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExpandRequest {
  tema: string;
  nivel: string;
  grado: string;
  nodosAExpandir: string[]; // nombres de los nodos a expandir
}

interface SubDetalle {
  nombre: string;
  descripcion: string;
}

export async function POST(request: Request) {
  try {
    const { tema, nivel, grado, nodosAExpandir }: ExpandRequest = await request.json();

    const prompt = `Eres un experto educador peruano. Necesito que PROFUNDICES en los siguientes conceptos del tema "${tema}" para estudiantes de ${grado} de ${nivel}.

Conceptos a expandir:
${nodosAExpandir.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Para CADA concepto, genera 2-3 sub-detalles más específicos con sus definiciones.

Responde SOLO con un JSON válido (sin markdown) con esta estructura:
{
  "expansiones": [
    {
      "conceptoOriginal": "Nombre del concepto original",
      "subDetalles": [
        {
          "nombre": "Sub-detalle específico",
          "descripcion": "Definición clara y educativa"
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
          content: 'Eres un asistente educativo experto. Respondes solo con JSON válido sin formato markdown.'
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
    const cleanJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanJson) as {
      expansiones: Array<{
        conceptoOriginal: string;
        subDetalles: SubDetalle[];
      }>;
    };

    return NextResponse.json({
      success: true,
      expansiones: parsed.expansiones
    });

  } catch (error) {
    console.error('Error en API expand:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al expandir conceptos'
      },
      { status: 500 }
    );
  }
}

# Generador de Mapas Conceptuales para Docentes

Herramienta web que genera mapas conceptuales interactivos usando IA (OpenAI GPT-4o-mini), diseñada para docentes del sistema educativo peruano.

---

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Tecnologías Utilizadas](#tecnologías-utilizadas)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Arquitectura del Sistema](#arquitectura-del-sistema)
5. [Sistema de Layout (Crítico)](#sistema-de-layout-crítico)
6. [API Endpoints](#api-endpoints)
7. [Configuración e Instalación](#configuración-e-instalación)
8. [Despliegue](#despliegue)
9. [Problemas Comunes y Soluciones](#problemas-comunes-y-soluciones)

---

## Descripción General

### Funcionalidades

- **Generación de mapas conceptuales** a partir de un tema ingresado
- **Configuración por nivel educativo**: inicial, primaria, secundaria
- **Profundidad configurable**: básico, intermedio, avanzado
- **Expansión de nodos**: ampliar conceptos existentes sin regenerar todo
- **Exportación a PNG**: descargar el mapa como imagen
- **Interfaz interactiva**: zoom, pan, arrastrar nodos

### Flujo de Usuario

```
1. Usuario ingresa tema (ej: "La Primera Guerra Mundial")
2. Selecciona nivel (secundaria) y grado (5°)
3. Selecciona profundidad (intermedio)
4. Click en "Generar Mapa Conceptual"
5. La IA genera la estructura jerárquica
6. El sistema renderiza el mapa visual
7. Usuario puede expandir nodos (máx. 3 veces)
8. Usuario puede descargar como PNG
```

---

## Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Next.js | 14.2.x | Framework React con App Router |
| React | 18.3.x | UI Library |
| TypeScript | 5.x | Tipado estático |
| @xyflow/react | 12.x | Renderizado de grafos/mapas |
| OpenAI API | - | Generación de contenido con GPT-4o-mini |
| Tailwind CSS | 4.x | Estilos |
| html-to-image | 1.11.x | Exportación a PNG |

---

## Estructura del Proyecto

```
mapa-conceptual-docentes/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate/
│   │   │   │   └── route.ts      # Endpoint generación inicial
│   │   │   └── expand/
│   │   │       └── route.ts      # Endpoint expansión de nodos
│   │   ├── globals.css           # Estilos globales + nodos
│   │   ├── layout.tsx            # Layout principal
│   │   └── page.tsx              # Página principal (lógica)
│   ├── components/
│   │   ├── concept-map/
│   │   │   ├── ConceptMapViewer.tsx  # Visualizador React Flow
│   │   │   └── ConceptNode.tsx       # Componente de nodo
│   │   ├── config/
│   │   │   └── ConfigPanel.tsx       # Panel de configuración
│   │   └── icons/
│   │       └── Icons.tsx             # Iconos SVG
│   ├── services/
│   │   └── concept-map-generator.ts  # CRÍTICO: Layout y árbol
│   └── types/
│       └── concept-map.ts            # Tipos TypeScript
├── .env.local                        # Variables de entorno
├── package.json
└── tsconfig.json
```

---

## Arquitectura del Sistema

### Diagrama de Flujo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ConfigPanel   │────▶│    page.tsx     │────▶│  /api/generate  │
│  (tema, nivel)  │     │  handleGenerate │     │    (OpenAI)     │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  ConceptTree    │◀────│   JSON response │
                        │  (estructura)   │     │   (conceptos)   │
                        └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ layoutFromTree  │
                        │ (posicionamiento)│
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ ConceptMapViewer│
                        │  (React Flow)   │
                        └─────────────────┘
```

### Estructura de Datos Principal: ConceptTree

```typescript
interface TreeNode {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: 'main' | 'concept' | 'subconcept' | 'example' | 'expanded';
  hijos: TreeNode[];
  color?: string;
}

interface ConceptTree {
  tema: string;
  profundidad: 'basico' | 'intermedio' | 'avanzado';
  raiz: TreeNode;
}
```

**Ejemplo de árbol:**
```
ConceptTree
└── raiz: "La Primera Guerra Mundial" (main)
    ├── "Causas" (concept)
    │   ├── "Nacionalismo" (subconcept)
    │   │   ├── "Sentimiento nacional" (expanded)
    │   │   └── "Unificación de grupos" (expanded)
    │   └── "Militarismo" (subconcept)
    └── "Consecuencias" (concept)
        └── "Tratados de paz" (subconcept)
```

---

## Sistema de Layout (Crítico)

### El Problema Original

Cuando se expandían nodos, las líneas se cruzaban y los nodos se superponían. Esto ocurría porque:

1. Se agregaban nodos nuevos sin recalcular el layout completo
2. Se buscaban "huecos" en lugar de reorganizar todo
3. No se mantenía una estructura de datos del árbol

### La Solución Implementada

**Principio fundamental:** Cada vez que cambia el árbol, se recalcula TODO el layout desde cero.

#### Algoritmo de Layout (Bottom-Up)

```typescript
// 1. Calcular altura de cada subárbol
function calcHeight(node: TreeNode): number {
  if (node.hijos.length === 0) {
    return NODE_HEIGHT; // 60px
  }
  const childrenHeight = node.hijos.reduce((sum, child) =>
    sum + calcHeight(child), 0
  ) + (node.hijos.length - 1) * NODE_VERTICAL_GAP;

  return Math.max(NODE_HEIGHT, childrenHeight);
}

// 2. Posicionar nodos recursivamente
// - Cada nodo padre se centra verticalmente respecto a sus hijos
// - Los hijos se distribuyen verticalmente sin superposición
```

#### Constantes de Espaciado

```typescript
const LEVEL_X_GAP = 380;        // Espacio horizontal entre niveles
const NODE_HEIGHT = 60;          // Altura estimada de cada nodo
const NODE_VERTICAL_GAP = 30;    // Espacio vertical entre hermanos
const BRANCH_GAP_MULTIPLIER = 3; // Multiplicador para gap entre ramas
const START_X = 50;              // Posición X inicial
```

#### Flujo de Expansión

```
1. Usuario hace clic en "Ampliar"
2. Se identifican nodos hoja expandibles (concept/subconcept sin hijos)
3. Se llama a /api/expand con los nombres de esos nodos
4. La IA genera subdetalles para cada nodo
5. addExpansionsToTree() agrega los nuevos hijos al árbol
6. layoutFromTree() RECALCULA todo el layout desde el árbol
7. Se actualizan nodes y edges en React Flow
```

### CSS Crítico para Evitar Superposición

```css
.concept-node {
  white-space: normal;    /* Permite wrap de texto */
  max-width: 320px;       /* Fuerza wrap en textos largos */
}

.concept-node--concept {
  max-width: 300px;
}

.concept-node--subconcept {
  max-width: 280px;
}
```

---

## API Endpoints

### POST /api/generate

Genera la estructura inicial del mapa conceptual.

**Request:**
```json
{
  "tema": "La Primera Guerra Mundial",
  "nivel": "secundaria",
  "grado": "5°",
  "profundidad": "intermedio"
}
```

**Response:**
```json
{
  "success": true,
  "conceptos": [
    {
      "nombre": "Causas de la Primera Guerra Mundial",
      "descripcion": "Factores que llevaron al conflicto",
      "relacion": "tiene",
      "subconceptos": [
        {
          "nombre": "Nacionalismo",
          "descripcion": "Sentimiento de orgullo nacional",
          "ejemplos": ["Sentimiento nacional", "Unificación"]
        }
      ]
    }
  ]
}
```

### POST /api/expand

Expande nodos existentes con más detalles.

**Request:**
```json
{
  "tema": "La Primera Guerra Mundial",
  "nivel": "secundaria",
  "grado": "5°",
  "nodosAExpandir": ["Nacionalismo", "Militarismo"]
}
```

**Response:**
```json
{
  "success": true,
  "expansiones": [
    {
      "conceptoOriginal": "Nacionalismo",
      "subDetalles": [
        {
          "nombre": "Sentimiento nacional",
          "descripcion": "Orgullo por la identidad nacional"
        },
        {
          "nombre": "Unificación de grupos",
          "descripcion": "Movimientos de unificación territorial"
        }
      ]
    }
  ]
}
```

---

## Configuración e Instalación

### 1. Clonar/Copiar el Proyecto

```bash
# Si es un repo git
git clone <url> mapa-conceptual-docentes
cd mapa-conceptual-docentes

# O copiar la carpeta directamente
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crear archivo `.env.local`:

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Ejecutar en Desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000

### 5. Build de Producción

```bash
npm run build
npm start
```

---

## Despliegue

### Vercel (Recomendado para Next.js)

1. Conectar repositorio a Vercel
2. Agregar variable de entorno `OPENAI_API_KEY`
3. Deploy automático

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Variables de Entorno en Producción

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| OPENAI_API_KEY | Sí | API key de OpenAI |

---

## Problemas Comunes y Soluciones

### 1. Nodos se superponen al expandir

**Causa:** El layout no se recalcula completamente.

**Solución:** Asegurarse de que `handleExpand` use:
```typescript
const updatedTree = addExpansionsToTree(conceptTree, result.expansiones);
const { nodes, edges } = layoutFromTree(updatedTree);
setNodes(nodes);
setEdges(edges);
```

### 2. Líneas se cruzan

**Causa:** Los nodos no están siendo posicionados con el algoritmo bottom-up.

**Solución:** Verificar que `calcHeight()` se llama recursivamente y que los hijos se centran correctamente.

### 3. Textos largos se superponen horizontalmente

**Causa:** `white-space: nowrap` y falta de `max-width`.

**Solución:** En CSS:
```css
.concept-node {
  white-space: normal;
  max-width: 320px;
}
```

### 4. Error de API "rate limit"

**Causa:** Demasiadas solicitudes a OpenAI.

**Solución:** Implementar caché o rate limiting en el backend.

### 5. El mapa no hace fitView después de expandir

**Causa:** React Flow no detecta el cambio.

**Solución:** El componente `FitViewOnChange` ya maneja esto:
```typescript
useEffect(() => {
  if (nodeCount > prevCount.current) {
    fitView({ padding: 0.15, duration: 500 });
  }
}, [nodeCount]);
```

---

## Archivos Clave a No Modificar Sin Entender

1. **`concept-map-generator.ts`**: Contiene toda la lógica de layout. Modificar las constantes puede romper el posicionamiento.

2. **`page.tsx` (handleExpand)**: La función de expansión debe SIEMPRE recalcular todo el layout, nunca "parchar".

3. **`globals.css` (.concept-node)**: Los estilos de los nodos afectan directamente el cálculo de espaciado.

---

## Licencia

Proyecto educativo. Uso libre para fines no comerciales.

---

## Contacto

Para soporte técnico o consultas sobre la implementación, contactar al equipo de desarrollo.

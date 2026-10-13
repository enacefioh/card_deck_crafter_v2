import React, { useState } from "react";

interface DeveloperDocsProps {
  onBackToStore?: () => void;
  onBackToEditor?: () => void;
}

export const DeveloperDocs: React.FC<DeveloperDocsProps> = ({
  onBackToStore,
  onBackToEditor
}) => {
  const [activeCodeLang, setActiveCodeLang] = useState<"curl" | "python" | "node">("curl");
  const [activeProjectLang, setActiveProjectLang] = useState<"curl" | "python" | "node">("curl");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const curlProjectExample = `# 1. Crear proyecto nuevo clonando una plantilla base (requiere API Key)
curl -X POST "http://localhost:3000/api/v1/projects" \\
  -H "X-API-Key: cdc2_live_TU_API_KEY_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "templateId": "ce50cc07-7014-49c4-8026-ae7268491269",
    "name": "Expansión Fantasía - 5 Mazos",
    "description": "5 mazos temáticos balanceados por Agente de IA"
  }'

# 2. Añadir un documento adicional para estructurar el mazo (ej. Mazo Rojo)
curl -X POST "http://localhost:3000/api/v1/projects/ID_DEL_PROYECTO/documents" \\
  -H "X-API-Key: cdc2_live_TU_API_KEY_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nombre": "Mazo Rojo - Fuego y Dragones"
  }'

# 3. Añadir cartas con ilustraciones en Base64 o URLs externas
curl -X POST "http://localhost:3000/api/v1/projects/ID_DEL_PROYECTO/cards" \\
  -H "X-API-Key: cdc2_live_TU_API_KEY_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "documentId": "ID_DEL_DOCUMENTO",
    "cards": [
      {
        "cardTemplateId": "template_1791468472459_okugs",
        "name": "Dragón Carmesí Devorador",
        "count": 2,
        "fields": {
          "campo_2613": "**DRAGÓN CARMESÍ**\\n\\nVuelo. Prisa.\\nCuando entra al campo, inflige 3 puntos de daño."
        },
        "images": {
          "ilustracion": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
      }
    ]
  }'

# 4. Corregir erratas o ajustar estadísticas de una carta específica
curl -X PUT "http://localhost:3000/api/v1/projects/ID_DEL_PROYECTO/cards/ID_DE_LA_CARTA" \\
  -H "X-API-Key: cdc2_live_TU_API_KEY_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Dragón Carmesí Ancestral",
    "count": 3
  }'

# 5. Obtener previsualización en tiempo real de la carta renderizada a PNG (300 DPI)
curl "http://localhost:3000/api/v1/projects/ID_DEL_PROYECTO/cards/ID_DE_LA_CARTA/preview?dpi=300" \\
  -H "X-API-Key: cdc2_live_TU_API_KEY_AQUI" \\
  --output dragon_preview.png

# 6. Descargar el archivo binario completo .cdc2 empaquetado para abrir en el editor web
curl "http://localhost:3000/api/v1/projects/ID_DEL_PROYECTO/download" \\
  -H "X-API-Key: cdc2_live_TU_API_KEY_AQUI" \\
  --output expansion_fantasia.cdc2`;

  const pythonProjectExample = `import requests

API_KEY = "cdc2_live_TU_API_KEY_AQUI"
BASE_URL = "http://localhost:3000"
HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# 1. Crear un proyecto nuevo basado en una plantilla
resp_proj = requests.post(f"{BASE_URL}/api/v1/projects", headers=HEADERS, json={
    "templateId": "ce50cc07-7014-49c4-8026-ae7268491269",
    "name": "Expansión Fantasía - 5 Mazos",
    "description": "5 mazos generados por Agente de IA"
})
project = resp_proj.json()
project_id = project["id"]
print(f"Proyecto creado en la nube: {project_id}")

# 2. Crear documento para un mazo temático (ej. Mazo Rojo)
resp_doc = requests.post(f"{BASE_URL}/api/v1/projects/{project_id}/documents", headers=HEADERS, json={
    "nombre": "Mazo Rojo - Fuego"
})
doc_id = resp_doc.json()["id"]

# 3. Inyectar cartas con campos de texto e ilustraciones en Base64
dummy_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
cards_payload = {
    "documentId": doc_id,
    "cards": [
        {
            "cardTemplateId": "template_1791468472459_okugs",
            "name": "Dragón Carmesí",
            "count": 2,
            "fields": {
                "campo_2613": "**DRAGÓN CARMESÍ**\\nVuelo. Prisa."
            },
            "images": {
                "ilustracion": dummy_base64
            }
        }
    ]
}
resp_cards = requests.post(f"{BASE_URL}/api/v1/projects/{project_id}/cards", headers=HEADERS, json=cards_payload)
cards_data = resp_cards.json()
card_id = cards_data["cards"][0]["id"]
print(f"Cartas añadidas con éxito: {len(cards_data['cards'])}")

# 4. Modificar o balancear una carta existente
requests.put(f"{BASE_URL}/api/v1/projects/{project_id}/cards/{card_id}", headers=HEADERS, json={
    "name": "Dragón Carmesí Ancestral",
    "count": 3
})

# 5. Obtener previsualización PNG de la carta generada
resp_prev = requests.get(f"{BASE_URL}/api/v1/projects/{project_id}/cards/{card_id}/preview", headers={"X-API-Key": API_KEY})
if resp_prev.status_code == 200:
    with open("dragon.png", "wb") as f:
        f.write(resp_prev.content)
    print("¡Previsualización PNG de 300 DPI descargada exitosamente!")
`;

  const nodeProjectExample = `const BASE_URL = "http://localhost:3000";
const API_KEY = "cdc2_live_TU_API_KEY_AQUI";
const headers = {
  "X-API-Key": API_KEY,
  "Content-Type": "application/json"
};

// 1. Crear proyecto desde plantilla
const projRes = await fetch(\`\${BASE_URL}/api/v1/projects\`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    templateId: "ce50cc07-7014-49c4-8026-ae7268491269",
    name: "Expansión Fantasía - 5 Mazos",
    description: "5 mazos generados por IA"
  })
});
const project = await projRes.json();
const projectId = project.id;
console.log("Proyecto creado:", projectId);

// 2. Crear documento para un mazo específico
const docRes = await fetch(\`\${BASE_URL}/api/v1/projects/\${projectId}/documents\`, {
  method: "POST",
  headers,
  body: JSON.stringify({ nombre: "Mazo Rojo - Fuego" })
});
const { id: docId } = await docRes.json();

// 3. Añadir cartas con ilustraciones Base64 Data URL
const cardsRes = await fetch(\`\${BASE_URL}/api/v1/projects/\${projectId}/cards\`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    documentId: docId,
    cards: [
      {
        cardTemplateId: "template_1791468472459_okugs",
        name: "Dragón Carmesí",
        count: 2,
        fields: { campo_2613: "**DRAGÓN CARMESÍ**\nVuelo. Prisa." },
        images: { ilustracion: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }
      }
    ]
  })
});
const { cards } = await cardsRes.json();
const cardId = cards[0].id;

// 4. Corregir una carta
await fetch(\`\${BASE_URL}/api/v1/projects/\${projectId}/cards/\${cardId}\`, {
  method: "PUT",
  headers,
  body: JSON.stringify({ name: "Dragón Carmesí Ancestral", count: 3 })
});

// 5. Descargar previsualización PNG de la carta
const prevRes = await fetch(\`\${BASE_URL}/api/v1/projects/\${projectId}/cards/\${cardId}/preview?dpi=300\`, {
  headers: { "X-API-Key": API_KEY }
});
const pngBuffer = Buffer.from(await prevRes.arrayBuffer());
console.log("Bytes de imagen PNG recibidos:", pngBuffer.length);
`;

  const origin = typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "http://localhost:3000";

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const sampleTemplateId = "ce50cc07-7014-49c4-8026-ae7268491269";
  const sampleDesignId = "template_1791468472459_okugs";

  const sampleSchemaJson = `{
  "templateId": "${sampleTemplateId}",
  "templateName": "Quantum Realities",
  "templateDescription": "Plantilla temática de ciencia ficción con contadores y enemigos",
  "authorName": "DiseñadorComunitario",
  "designs": [
    {
      "id": "${sampleDesignId}",
      "nombre": "Contador_tiempo",
      "dimensiones": {
        "anchoMm": 63.5,
        "altoMm": 88.9
      },
      "totalCapas": 2,
      "campos": [
        {
          "clave": "campo_2613",
          "nombre": "Contador",
          "tipo": "string",
          "valorDefecto": "**CONTADOR DE TIEMPO**\\n\\nOOOOOOOOOO"
        }
      ]
    }
  ]
}`;

  const curlExample = `# 1. Inspeccionar esquema técnico de la plantilla
curl -X GET "${origin}/api/v1/templates/${sampleTemplateId}/schema"

# 2. Renderizar carta a PNG (300 DPI) usando URLs externas
curl -X POST "${origin}/api/v1/cards/render" \\
  -H "Content-Type: application/json" \\
  -d '{
    "templateId": "${sampleTemplateId}",
    "cardDesignId": "${sampleDesignId}",
    "fields": {
      "campo_2613": "**CRONOMETRADOR DEL TIEMPO**\\n\\nTurno 1: Activación"
    },
    "images": {
      "ilustracion": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600"
    }
  }' \\
  --output mi_carta.png

# 3. Renderizar carta usando una imagen en Base64 Data URL (hasta 50 MB)
curl -X POST "${origin}/api/v1/cards/render" \\
  -H "Content-Type: application/json" \\
  -d '{
    "templateId": "${sampleTemplateId}",
    "cardDesignId": "${sampleDesignId}",
    "fields": {
      "campo_2613": "Carta Generada con Imagen Base64"
    },
    "images": {
      "ilustracion": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
  }' \\
  --output mi_carta_base64.png`;

  const pythonExample = `import requests
import base64

BASE_URL = "${origin}"
TEMPLATE_ID = "${sampleTemplateId}"
DESIGN_ID = "${sampleDesignId}"

# 1. Obtener esquema de campos de la plantilla pública
resp_schema = requests.get(f"{BASE_URL}/api/v1/templates/{TEMPLATE_ID}/schema")
schema = resp_schema.json()
print("Diseños disponibles:", [d["nombre"] for d in schema["designs"]])

# 2. Preparar imagen en Base64 (o usar URL http/https)
with open("mi_arte_generado.png", "rb") as img_file:
    b64_data = base64.b64encode(img_file.read()).decode("utf-8")
    data_url = f"data:image/png;base64,{b64_data}"

# 3. Renderizar carta a PNG de alta resolución (300 DPI)
payload = {
    "templateId": TEMPLATE_ID,
    "cardDesignId": DESIGN_ID,
    "fields": {
        "campo_2613": "**ALERTA TEMPORAL**\\n\\nGenerado automáticamente por Agente de IA"
    },
    "images": {
        "ilustracion": data_url
    },
    "dpi": 300
}

resp_render = requests.post(f"{BASE_URL}/api/v1/cards/render", json=payload)
if resp_render.status_code == 200:
    with open("carta_renderizada.png", "wb") as f:
        f.write(resp_render.content)
    print("¡Carta generada y guardada con éxito a 300 DPI!")
else:
    print(f"Error {resp_render.status_code}:", resp_render.text)
`;

  const nodeExample = `import fs from "fs";

const BASE_URL = "${origin}";
const TEMPLATE_ID = "${sampleTemplateId}";
const DESIGN_ID = "${sampleDesignId}";

// 1. Obtener Esquema
const schemaResp = await fetch(\`\${BASE_URL}/api/v1/templates/\${TEMPLATE_ID}/schema\`);
const schema = await schemaResp.json();
console.log("Campos expuestos:", schema.designs[0].campos);

// 2. Preparar Imagen Base64 Data URL (o URL remota)
const imgBuffer = fs.readFileSync("mi_arte.png");
const b64DataUrl = \`data:image/png;base64,\${imgBuffer.toString("base64")}\`;

// 3. Renderizar Carta en PNG
const renderResp = await fetch(\`\${BASE_URL}/api/v1/cards/render\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    templateId: TEMPLATE_ID,
    cardDesignId: DESIGN_ID,
    fields: {
      campo_2613: "**GENERADO VÍA NODE.JS**\\n\\nIntegración fluida con IA"
    },
    images: {
      ilustracion: b64DataUrl
    },
    dpi: 300
  })
});

if (renderResp.ok) {
  const pngBuffer = Buffer.from(await renderResp.arrayBuffer());
  fs.writeFileSync("carta_final.png", pngBuffer);
  console.log("¡Carta PNG de 300 DPI guardada exitosamente!");
} else {
  console.error("Error al renderizar:", await renderResp.text());
}`;

  return (
    <div style={{ backgroundColor: "#0e0e14", minHeight: "100vh", color: "#e2e8f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Navbar */}
      <header
        style={{
          height: "60px",
          backgroundColor: "#16161f",
          borderBottom: "1px solid #282836",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🔌</span>
          <div>
            <span style={{ fontSize: "16px", fontWeight: "800", color: "#fff" }}>
              Card Deck Crafter
            </span>
            <span
              style={{
                marginLeft: "10px",
                fontSize: "11px",
                fontWeight: "700",
                backgroundColor: "rgba(99, 102, 241, 0.2)",
                color: "#a5b4fc",
                border: "1px solid rgba(99, 102, 241, 0.4)",
                padding: "2px 8px",
                borderRadius: "4px"
              }}
            >
              Documentación API REST para Desarrolladores & IA
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {onBackToStore && (
            <button
              type="button"
              onClick={onBackToStore}
              style={{
                backgroundColor: "#22222e",
                color: "#cbd5e1",
                border: "1px solid #38384b",
                borderRadius: "6px",
                padding: "7px 14px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>🏪</span> Tienda Comunitaria
            </button>
          )}
          {onBackToEditor && (
            <button
              type="button"
              onClick={onBackToEditor}
              style={{
                backgroundColor: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "7px 16px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>🎴</span> Ir al Editor
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "36px 24px" }}>
        {/* Hero Section */}
        <div
          style={{
            backgroundColor: "#161622",
            border: "1px solid #28283a",
            borderRadius: "14px",
            padding: "32px",
            marginBottom: "32px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#38bdf8", letterSpacing: "1px" }}>
              API v1 &bull; Puppeteer Headless Engine
            </span>
          </div>
          <h1 style={{ margin: "0 0 12px 0", fontSize: "28px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px" }}>
            Generación Programática de Cartas con Agentes de Inteligencia Artificial
          </h1>
          <p style={{ margin: "0 0 20px 0", fontSize: "15px", color: "#94a3b8", lineHeight: "1.7", maxWidth: "900px" }}>
            La API REST de Card Deck Crafter v2 (CDC2) permite a agentes autónomos (OpenAI, Claude, Gemini, AutoGPT) y scripts automatizados inspeccionar las plantillas públicas de la comunidad, descubrir sus campos editables y renderizar cartas individuales en <strong>imágenes PNG de alta resolución (300 DPI)</strong> listas para impresión física.
          </p>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", backgroundColor: "#20202e", color: "#a5b4fc", border: "1px solid #33334d", padding: "4px 10px", borderRadius: "6px" }}>
              🚀 Renderizado sin interfaz (Headless)
            </span>
            <span style={{ fontSize: "12px", backgroundColor: "#20202e", color: "#38bdf8", border: "1px solid #33334d", padding: "4px 10px", borderRadius: "6px" }}>
              🖼️ Soporte para Base64 Data URLs y HTTP/HTTPS
            </span>
            <span style={{ fontSize: "12px", backgroundColor: "#20202e", color: "#34d399", border: "1px solid #33334d", padding: "4px 10px", borderRadius: "6px" }}>
              📦 Límite de Payload JSON: 50 MB
            </span>
            <span style={{ fontSize: "12px", backgroundColor: "#20202e", color: "#fbbf24", border: "1px solid #33334d", padding: "4px 10px", borderRadius: "6px" }}>
              🖨️ Calidad de Impresión Fiel (300 DPI)
            </span>
          </div>
        </div>

        {/* Flujo de Integración en 2 Pasos */}
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "16px" }}>
            ⚡ Flujo de Trabajo para un Agente de IA (2 Pasos)
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
            <div style={{ backgroundColor: "#161622", border: "1px solid #28283a", borderRadius: "12px", padding: "24px" }}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>🔍</div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "700", color: "#38bdf8" }}>
                Paso 1: Descubrimiento de Esquema
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", lineHeight: "1.6" }}>
                El agente realiza una petición <code>GET</code> a la plantilla pública. El servidor devuelve las dimensiones milimétricas, el número de capas y la lista tipada de campos editables con sus claves, tipos (texto, números, imágenes, selecciones) y valores por defecto.
              </p>
            </div>
            <div style={{ backgroundColor: "#161622", border: "1px solid #28283a", borderRadius: "12px", padding: "24px" }}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>🎨</div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "700", color: "#34d399" }}>
                Paso 2: Generación y Renderizado
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", lineHeight: "1.6" }}>
                El agente redacta el contenido de la carta o genera una ilustración (vía DALL-E, Imagen o Stable Diffusion) y envía un <code>POST</code> con los campos e imágenes. El servidor compone el DOM, inyecta fuentes y símbolos, y responde directamente con el binario <code>image/png</code> a 300 DPI.
              </p>
            </div>
          </div>
        </div>

        {/* ==================== SECCIÓN DESTACADA: PROYECTOS EN LA NUBE Y MAZOS CON IA (SRS-079) ==================== */}
        <div style={{ backgroundColor: "#141420", border: "1px solid #3730a3", borderRadius: "14px", padding: "30px", marginBottom: "36px", boxShadow: "0 6px 20px rgba(99, 102, 241, 0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ fontSize: "22px" }}>🚀</span>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: 0 }}>
              Gestión de Proyectos en la Nube y Mazos con IA
            </h2>
          </div>
          <p style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: "1.7", margin: "0 0 20px 0" }}>
            Este módulo permite a la IA colaborar de forma híbrida con el usuario. La IA crea un proyecto a partir de una plantilla base, divide el proyecto en documentos (por ejemplo, <strong>5 documentos para 5 mazos monocolor estilo Magic</strong>), añade cartas completas con ilustraciones generadas en Base64 o URLs remotas, y realiza ajustes o correcciones puntuales sin perder nada del trabajo anterior.
          </p>

          {/* Autenticación por API Key */}
          <div style={{ backgroundColor: "#1c1c2b", border: "1px solid #2d2d44", borderRadius: "10px", padding: "18px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#a5b4fc", margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔑</span> Autenticación con API Key
            </h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.6", margin: "0 0 10px 0" }}>
              Para utilizar los endpoints de gestión de proyectos, incluye tu API Key en la cabecera HTTP <code>X-API-Key</code> o <code>Authorization: Bearer</code>:
            </p>
            <pre style={{ margin: 0, backgroundColor: "#0c0c12", padding: "10px 14px", borderRadius: "6px", color: "#38bdf8", fontSize: "13px", fontFamily: "monospace" }}>
              X-API-Key: cdc2_live_TU_API_KEY_AQUI
            </pre>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "8px 0 0 0" }}>
              💡 Puedes generar y administrar tus claves en cualquier momento desde el modal de <strong>Mis Proyectos en la Nube &gt; pestaña 🔑 Acceso API</strong>.
            </p>
          </div>

          {/* Resumen de Endpoints de Proyectos */}
          <div style={{ marginBottom: "26px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#fff", margin: "0 0 14px 0" }}>
              Endpoints del Módulo de Proyectos (<code>/api/v1/projects</code>)
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", color: "#cbd5e1", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #33334d", color: "#94a3b8" }}>
                    <th style={{ padding: "8px 10px" }}>Método</th>
                    <th style={{ padding: "8px 10px" }}>Ruta</th>
                    <th style={{ padding: "8px 10px" }}>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#1e3a8a", color: "#60a5fa", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>POST</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects</td>
                    <td style={{ padding: "8px 10px" }}>Crea un proyecto .cdc2 en la nube clonando una plantilla</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#065f46", color: "#34d399", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>GET</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects</td>
                    <td style={{ padding: "8px 10px" }}>Lista los proyectos en la nube del usuario</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#065f46", color: "#34d399", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>GET</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id</td>
                    <td style={{ padding: "8px 10px" }}>Obtiene detalle del proyecto, documentos y esquemas de plantillas</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#1e3a8a", color: "#60a5fa", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>POST</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/documents</td>
                    <td style={{ padding: "8px 10px" }}>Crea un nuevo documento dentro del proyecto (multidocumento)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#065f46", color: "#34d399", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>GET</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/documents</td>
                    <td style={{ padding: "8px 10px" }}>Lista los documentos de un proyecto</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#1e3a8a", color: "#60a5fa", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>POST</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/cards</td>
                    <td style={{ padding: "8px 10px" }}>Añade una o más cartas con textos e ilustraciones Base64</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#7c2d12", color: "#fb923c", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>PUT</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/cards/:cardId</td>
                    <td style={{ padding: "8px 10px" }}>Modifica o corrige una carta existente de forma granular</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#831843", color: "#f472b6", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>DELETE</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/cards/:cardId</td>
                    <td style={{ padding: "8px 10px" }}>Elimina una carta del proyecto</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#065f46", color: "#34d399", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>GET</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/cards/:cardId/preview</td>
                    <td style={{ padding: "8px 10px" }}>Previsualiza la carta en PNG a 300 DPI</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#065f46", color: "#34d399", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>GET</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/download</td>
                    <td style={{ padding: "8px 10px" }}>Descarga directa del archivo binario .cdc2 empaquetado</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Selector de Ejemplos de Código para Proyectos */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#fff", margin: 0 }}>
                💻 Ejemplos de Código para Agentes IA (Flujo Completo de Mazos)
              </h3>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["curl", "python", "node"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveProjectLang(lang)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: activeProjectLang === lang ? "none" : "1px solid #33334d",
                      backgroundColor: activeProjectLang === lang ? "#6366f1" : "#1c1c28",
                      color: activeProjectLang === lang ? "#fff" : "#94a3b8",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      textTransform: "uppercase"
                    }}
                  >
                    {lang === "curl" ? "cURL (Proyectos)" : lang === "python" ? "Python (Proyectos)" : "Node.js (Proyectos)"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <pre style={{ margin: 0, backgroundColor: "#0a0a10", border: "1px solid #232334", borderRadius: "10px", padding: "20px", color: "#38bdf8", fontSize: "12px", fontFamily: "monospace", overflowX: "auto", lineHeight: "1.6" }}>
                {activeProjectLang === "curl" ? curlProjectExample : activeProjectLang === "python" ? pythonProjectExample : nodeProjectExample}
              </pre>
              <button
                type="button"
                onClick={() => handleCopy(activeProjectLang === "curl" ? curlProjectExample : activeProjectLang === "python" ? pythonProjectExample : nodeProjectExample, "project-snippet")}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  backgroundColor: copiedKey === "project-snippet" ? "#10b981" : "#222230",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                }}
              >
                {copiedKey === "project-snippet" ? "✓ ¡Copiado!" : "📋 Copiar Código"}
              </button>
            </div>
          </div>
        </div>

        {/* Especificación de Endpoints */}
        <div style={{ marginBottom: "36px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "16px" }}>
            📚 Especificación de Endpoints REST
          </h2>

          {/* Endpoint 1: Schema */}
          <div style={{ backgroundColor: "#161622", border: "1px solid #28283a", borderRadius: "12px", padding: "26px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ backgroundColor: "#065f46", color: "#34d399", fontWeight: "800", fontSize: "12px", padding: "3px 8px", borderRadius: "4px" }}>
                GET
              </span>
              <code style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>
                /api/v1/templates/:id/schema
              </code>
            </div>
            <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#cbd5e1", lineHeight: "1.6" }}>
              Obtiene el manifiesto técnico y la definición tipada de todos los diseños de carta que contiene una plantilla comunitaria aprobada.
            </p>

            <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#a5b4fc", margin: "16px 0 8px 0", textTransform: "uppercase" }}>
              Parámetros de Ruta:
            </h4>
            <ul style={{ margin: "0 0 16px 0", paddingLeft: "20px", fontSize: "13px", color: "#94a3b8", lineHeight: "1.6" }}>
              <li><code>:id</code> (string, obligatorio): Identificador único de la plantilla pública (UUID de la plantilla).</li>
            </ul>

            <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#a5b4fc", margin: "16px 0 8px 0", textTransform: "uppercase" }}>
              Ejemplo de Respuesta JSON:
            </h4>
            <div style={{ position: "relative" }}>
              <pre style={{ margin: 0, backgroundColor: "#0d0d13", border: "1px solid #242434", borderRadius: "8px", padding: "16px", color: "#38bdf8", fontSize: "12px", fontFamily: "monospace", overflowX: "auto" }}>
                {sampleSchemaJson}
              </pre>
              <button
                type="button"
                onClick={() => handleCopy(sampleSchemaJson, "sample-schema")}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  backgroundColor: copiedKey === "sample-schema" ? "#10b981" : "#222230",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  cursor: "pointer"
                }}
              >
                {copiedKey === "sample-schema" ? "✓ Copiado" : "📋 Copiar"}
              </button>
            </div>
          </div>

          {/* Endpoint 2: Render */}
          <div style={{ backgroundColor: "#161622", border: "1px solid #28283a", borderRadius: "12px", padding: "26px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ backgroundColor: "#1e3a8a", color: "#60a5fa", fontWeight: "800", fontSize: "12px", padding: "3px 8px", borderRadius: "4px" }}>
                POST
              </span>
              <code style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>
                /api/v1/cards/render
              </code>
            </div>
            <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#cbd5e1", lineHeight: "1.6" }}>
              Renderiza una carta individual de alta fidelidad directamente en formato binario <code>image/png</code> (300 DPI).
            </p>

            <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#a5b4fc", margin: "16px 0 8px 0", textTransform: "uppercase" }}>
              Parámetros del Body (JSON):
            </h4>
            <div style={{ overflowX: "auto", marginBottom: "16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #2d2d3e", textAlign: "left", color: "#94a3b8" }}>
                    <th style={{ padding: "8px" }}>Campo</th>
                    <th style={{ padding: "8px" }}>Tipo</th>
                    <th style={{ padding: "8px" }}>Obligatorio</th>
                    <th style={{ padding: "8px" }}>Descripción</th>
                  </tr>
                </thead>
                <tbody style={{ color: "#cbd5e1" }}>
                  <tr style={{ borderBottom: "1px solid #222230" }}>
                    <td style={{ padding: "8px" }}><code>templateId</code></td>
                    <td style={{ padding: "8px" }}><code>string</code></td>
                    <td style={{ padding: "8px", color: "#f87171" }}>Sí</td>
                    <td style={{ padding: "8px" }}>ID de la plantilla pública aprobada.</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222230" }}>
                    <td style={{ padding: "8px" }}><code>cardDesignId</code></td>
                    <td style={{ padding: "8px" }}><code>string</code></td>
                    <td style={{ padding: "8px", color: "#f87171" }}>Sí</td>
                    <td style={{ padding: "8px" }}>ID del diseño de carta dentro de la plantilla.</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222230" }}>
                    <td style={{ padding: "8px" }}><code>fields</code></td>
                    <td style={{ padding: "8px" }}><code>Record&lt;string, string&gt;</code></td>
                    <td style={{ padding: "8px", color: "#94a3b8" }}>Opcional</td>
                    <td style={{ padding: "8px" }}>Mapa clave-valor con los textos, números o valores a inyectar en las capas editables.</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222230" }}>
                    <td style={{ padding: "8px" }}><code>images</code></td>
                    <td style={{ padding: "8px" }}><code>Record&lt;string, string&gt;</code></td>
                    <td style={{ padding: "8px", color: "#94a3b8" }}>Opcional</td>
                    <td style={{ padding: "8px" }}>Mapa clave-valor donde la clave es el nombre o ID de capa de imagen y el valor es una <strong>Data URL en Base64</strong> o una <strong>URL HTTP/HTTPS</strong>.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px" }}><code>dpi</code></td>
                    <td style={{ padding: "8px" }}><code>number</code></td>
                    <td style={{ padding: "8px", color: "#94a3b8" }}>Opcional</td>
                    <td style={{ padding: "8px" }}>Resolución de la imagen generada. Por defecto: <code>300</code> DPI.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ backgroundColor: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "8px", padding: "14px", marginTop: "12px" }}>
              <strong style={{ color: "#a5b4fc", display: "block", marginBottom: "4px" }}>
                💡 Envío de Ilustraciones e Imágenes en Base64:
              </strong>
              <span style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5" }}>
                Si tu agente genera ilustraciones con modelos de difusión o APIs de IA generativa (DALL-E, Imagen 3, Stability), puedes codificar directamente el búfer binario en Base64 con el prefijo estándar <code>data:image/png;base64,&lt;datos&gt;</code> o <code>data:image/jpeg;base64,&lt;datos&gt;</code> y enviarlo dentro del objeto <code>images</code>. El servidor procesa payloads de hasta <strong>50 MB</strong> sin requerir almacenamiento externo.
              </span>
            </div>
          </div>
        </div>

        {/* Ejemplos de Código Multilenguaje */}
        <div style={{ marginBottom: "36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#fff", margin: 0 }}>
              💻 Ejemplos de Código Listos para Ejecutar
            </h2>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["curl", "python", "node"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveCodeLang(lang)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: activeCodeLang === lang ? "none" : "1px solid #33334d",
                    backgroundColor: activeCodeLang === lang ? "#6366f1" : "#1c1c28",
                    color: activeCodeLang === lang ? "#fff" : "#94a3b8",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    textTransform: "uppercase"
                  }}
                >
                  {lang === "curl" ? "cURL" : lang === "python" ? "Python" : "Node.js (Fetch)"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <pre style={{ margin: 0, backgroundColor: "#0d0d13", border: "1px solid #242434", borderRadius: "10px", padding: "20px", color: "#38bdf8", fontSize: "12px", fontFamily: "monospace", overflowX: "auto", lineHeight: "1.6" }}>
              {activeCodeLang === "curl" ? curlExample : activeCodeLang === "python" ? pythonExample : nodeExample}
            </pre>
            <button
              type="button"
              onClick={() => handleCopy(activeCodeLang === "curl" ? curlExample : activeCodeLang === "python" ? pythonExample : nodeExample, "active-snippet")}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                backgroundColor: copiedKey === "active-snippet" ? "#10b981" : "#222230",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
              }}
            >
              {copiedKey === "active-snippet" ? "✓ ¡Copiado!" : "📋 Copiar Código"}
            </button>
          </div>
        </div>

        {/* Códigos de Estado y Errores */}
        <div style={{ backgroundColor: "#161622", border: "1px solid #28283a", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "17px", fontWeight: "700", color: "#fff", margin: "0 0 14px 0" }}>
            🚦 Códigos de Estado HTTP y Manejo de Errores
          </h2>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#94a3b8", lineHeight: "1.8" }}>
            <li><strong style={{ color: "#34d399" }}>200 OK</strong>: Petición exitosa. Devuelve el JSON con el esquema o el binario <code>image/png</code>.</li>
            <li><strong style={{ color: "#34d399" }}>201 Created</strong>: Recurso creado exitosamente (proyecto, documento o cartas añadidas).</li>
            <li><strong style={{ color: "#f87171" }}>400 Bad Request</strong>: Parámetros obligatorios faltantes o con formato inválido.</li>
            <li><strong style={{ color: "#f87171" }}>401 Unauthorized</strong>: Clave API ausente, inválida o revocada. Incluye <code>X-API-Key: cdc2_live_...</code>.</li>
            <li><strong style={{ color: "#f87171" }}>404 Not Found</strong>: La plantilla, proyecto, documento o carta solicitada no existe o no se tiene permiso de acceso.</li>
            <li><strong style={{ color: "#f87171" }}>413 Payload Too Large / QUOTA_EXCEEDED</strong>: Operación cancelada porque el archivo resultante excede la cuota de almacenamiento del usuario.</li>
            <li><strong style={{ color: "#f87171" }}>500 Internal Server Error</strong>: Error interno del motor Chromium o al procesar recursos corruptos. Se devuelve un objeto JSON <code>{"{ error: \"...\" }"}</code>.</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

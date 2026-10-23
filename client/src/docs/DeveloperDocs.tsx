import React, { useState } from "react";
import { AGENT_SKILL_MARKDOWN } from "shared";

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
  const [activeMcpTab, setActiveMcpTab] = useState<"cursor" | "claude" | "remote">("cursor");
  const [mcpApiKeyInput, setMcpApiKeyInput] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleDownloadSkill = () => {
    const blob = new Blob([AGENT_SKILL_MARKDOWN], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "card-deck-crafter-agent-skill.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const curlProjectExample = `# 1. Crear proyecto nuevo con reversos activados (modoTraseras: individual)
curl -X POST "http://localhost:3000/api/v1/projects" \\
  -H "X-API-Key: cdc2_live_TU_API_KEY_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "templateId": "ce50cc07-7014-49c4-8026-ae7268491269",
    "name": "Expansión Fantasía - 5 Mazos",
    "description": "5 mazos con anverso y reverso con plantilla generados por IA",
    "modoTraseras": "individual"
  }'

# 2. Añadir un documento adicional con reversos individuales (ej. Mazo Rojo)
curl -X POST "http://localhost:3000/api/v1/projects/ID_DEL_PROYECTO/documents" \\
  -H "X-API-Key: cdc2_live_TU_API_KEY_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nombre": "Mazo Rojo - Fuego y Dragones",
    "modoTraseras": "individual"
  }'

# 3. Añadir cartas combinando plantilla frontal y trasera con overrides independientes
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
        },
        "backCardTemplateId": "template_reverso_comun_o_faccion",
        "backFields": {
          "Lore": "Nacido en las forjas de obsidiana de Ignis.",
          "Nivel": "Rango Élite"
        }
      }
    ]
  }'

# 4. Corregir o balancear anverso y reverso de una carta específica
curl -X PUT "http://localhost:3000/api/v1/projects/ID_DEL_PROYECTO/cards/ID_DE_LA_CARTA" \\
  -H "X-API-Key: cdc2_live_TU_API_KEY_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Dragón Carmesí Ancestral",
    "count": 3,
    "backFields": {
      "Lore": "Ancestro venerable cuyo fuego no se extingue jamás."
    }
  }'

# 5. Obtener previsualización PNG a 300 DPI (anverso o reverso con side=back)
# Anverso:
curl "http://localhost:3000/api/v1/projects/ID_DEL_PROYECTO/cards/ID_DE_LA_CARTA/preview?side=front&dpi=300" \\
  -H "X-API-Key: cdc2_live_TU_API_KEY_AQUI" \\
  --output dragon_front.png

# Reverso:
curl "http://localhost:3000/api/v1/projects/ID_DEL_PROYECTO/cards/ID_DE_LA_CARTA/preview?side=back&dpi=300" \\
  -H "X-API-Key: cdc2_live_TU_API_KEY_AQUI" \\
  --output dragon_back.png

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

# 1. Crear un proyecto nuevo con soporte de reversos (modoTraseras: individual)
resp_proj = requests.post(f"{BASE_URL}/api/v1/projects", headers=HEADERS, json={
    "templateId": "ce50cc07-7014-49c4-8026-ae7268491269",
    "name": "Expansión Fantasía - 5 Mazos",
    "description": "5 mazos generados por Agente de IA con reversos temáticos",
    "modoTraseras": "individual"
})
project = resp_proj.json()
project_id = project["id"]
print(f"Proyecto creado en la nube: {project_id}")

# 2. Crear documento para un mazo temático (ej. Mazo Rojo)
resp_doc = requests.post(f"{BASE_URL}/api/v1/projects/{project_id}/documents", headers=HEADERS, json={
    "nombre": "Mazo Rojo - Fuego",
    "modoTraseras": "individual"
})
doc_id = resp_doc.json()["id"]

# 3. Inyectar cartas combinando plantilla anversa y reversa
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
            },
            "backCardTemplateId": "template_reverso_comun_o_faccion",
            "backFields": {
                "Lore": "Forjado en los fuegos eternos.",
                "Nivel": "Élite"
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
    "count": 3,
    "backFields": {
        "Lore": "Ancestro venerable del clan dragón."
    }
})

# 5. Obtener previsualizaciones PNG de anverso y reverso a 300 DPI
for side in ["front", "back"]:
    resp_prev = requests.get(f"{BASE_URL}/api/v1/projects/{project_id}/cards/{card_id}/preview?side={side}&dpi=300", headers={"X-API-Key": API_KEY})
    if resp_prev.status_code == 200:
        with open(f"dragon_{side}.png", "wb") as f:
            f.write(resp_prev.content)
        print(f"Previsualización {side} PNG guardada.")
`;

  const nodeProjectExample = `const BASE_URL = "http://localhost:3000";
const API_KEY = "cdc2_live_TU_API_KEY_AQUI";
const headers = {
  "X-API-Key": API_KEY,
  "Content-Type": "application/json"
};

// 1. Crear proyecto desde plantilla con reversos
const projRes = await fetch(\`\${BASE_URL}/api/v1/projects\`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    templateId: "ce50cc07-7014-49c4-8026-ae7268491269",
    name: "Expansión Fantasía - 5 Mazos",
    description: "5 mazos generados por IA",
    modoTraseras: "individual"
  })
});
const project = await projRes.json();
const projectId = project.id;
console.log("Proyecto creado:", projectId);

// 2. Crear documento para un mazo específico
const docRes = await fetch(\`\${BASE_URL}/api/v1/projects/\${projectId}/documents\`, {
  method: "POST",
  headers,
  body: JSON.stringify({ nombre: "Mazo Rojo - Fuego", modoTraseras: "individual" })
});
const { id: docId } = await docRes.json();

// 3. Añadir cartas con anverso y reverso con plantilla
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
        images: { ilustracion: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" },
        backCardTemplateId: "template_reverso_comun_o_faccion",
        backFields: { Lore: "Nacido en las forjas de obsidiana.", Nivel: "Élite" }
      }
    ]
  })
});
const { cards } = await cardsRes.json();
const cardId = cards[0].id;

// 4. Previsualizar anverso y reverso a 300 DPI
const prevFront = await fetch(\`\${BASE_URL}/api/v1/projects/\${projectId}/cards/\${cardId}/preview?side=front&dpi=300\`, { headers });
const prevBack = await fetch(\`\${BASE_URL}/api/v1/projects/\${projectId}/cards/\${cardId}/preview?side=back&dpi=300\`, { headers });
console.log("Anverso OK:", prevFront.ok, "Reverso OK:", prevBack.ok);
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

  const resolvedMcpKey = mcpApiKeyInput.trim() || "cdc2_live_TU_API_KEY_AQUI";

  const cursorMcpJson = JSON.stringify(
    {
      mcpServers: {
        "card-deck-crafter": {
          url: `${origin}/mcp/sse?apiKey=${resolvedMcpKey}`
        }
      }
    },
    null,
    2
  );

  const claudeDesktopMcpJson = JSON.stringify(
    {
      mcpServers: {
        "card-deck-crafter": {
          url: `${origin}/mcp/sse?apiKey=${resolvedMcpKey}`
        }
      }
    },
    null,
    2
  );

  const remoteSseMcpJson = JSON.stringify(
    {
      name: "card-deck-crafter",
      transport: "sse",
      url: `${origin}/mcp/sse`,
      headers: {
        Authorization: `Bearer ${resolvedMcpKey}`
      }
    },
    null,
    2
  );

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
      "exposedFields": [
        {
          "clave": "campo_2613",
          "nombre": "Contador",
          "tipo": "string",
          "descripcion": "Contador de Contador_Tiempo (Texto principal del contador, siempre en mayúsculas)",
          "valorDefecto": "**CONTADOR DE TIEMPO**\\n\\nOOOOOOOOOO"
        }
      ],
      "fullStructure": [
        {
          "id": "layer_bg",
          "nombre": "Fondo Tecnológico",
          "tipo": "image",
          "descripcion": "Marco metálico de fondo de ciencia ficción",
          "src": "asset://bg_quantum.png"
        },
        {
          "id": "campo_2613",
          "nombre": "Contador_Tiempo",
          "tipo": "text",
          "descripcion": "Texto principal del contador, siempre en mayúsculas",
          "contenidoRaw": "**CONTADOR DE TIEMPO**\\n\\nOOOOOOOOOO"
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

        {/* ==================== SECCIÓN DESTACADA: INTEGRACIÓN CON AGENTES DE IA (SKILL DESCARGABLE) (SRS-081) ==================== */}
        <div
          style={{
            background: "linear-gradient(135deg, #171530 0%, #1e1b4b 50%, #151d38 100%)",
            border: "1px solid #6366f1",
            borderRadius: "14px",
            padding: "30px",
            marginBottom: "36px",
            boxShadow: "0 8px 32px rgba(99, 102, 241, 0.2)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "30px" }}>🤖</span>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: "0 0 4px 0" }}>
                  Integración con Agentes de Inteligencia Artificial (Skill Descargable)
                </h2>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", backgroundColor: "rgba(99, 102, 241, 0.3)", color: "#c7d2fe", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                    YAML Frontmatter
                  </span>
                  <span style={{ fontSize: "11px", backgroundColor: "rgba(56, 189, 248, 0.2)", color: "#7dd3fc", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                    Antigravity & Cursor
                  </span>
                  <span style={{ fontSize: "11px", backgroundColor: "rgba(52, 211, 153, 0.2)", color: "#6ee7b7", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                    Claude Code & OpenAI
                  </span>
                  <span style={{ fontSize: "11px", backgroundColor: "rgba(251, 191, 36, 0.2)", color: "#fde68a", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                    Anverso & Reverso
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de Acción para el Skill */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleDownloadSkill}
                style={{
                  backgroundColor: "#4f46e5",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
                  transition: "background-color 0.15s ease"
                }}
              >
                <span>📥</span> Descargar SKILL.md
              </button>

              <button
                type="button"
                onClick={() => handleCopy(AGENT_SKILL_MARKDOWN, "agent-skill")}
                style={{
                  backgroundColor: copiedKey === "agent-skill" ? "#10b981" : "#282b3d",
                  color: "#fff",
                  border: "1px solid #474b68",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  transition: "background-color 0.15s ease"
                }}
              >
                <span>{copiedKey === "agent-skill" ? "✓" : "📋"}</span>
                {copiedKey === "agent-skill" ? "¡Skill Copiado!" : "Copiar Skill al Portapapeles"}
              </button>
            </div>
          </div>

          <p style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: "1.7", margin: "0 0 16px 0" }}>
            El archivo <code>SKILL.md</code> contiene el manual operativo completo y estandarizado para que cualquier agente de IA autónomo conectado a tu entorno sepa exactamente cómo interactuar con CDC2 sin requerir configuración manual. El agente aprende a comprobar conectividad, inspeccionar las plantillas distinguiendo entre <strong>campos expuestos recomendados</strong> (<code>exposedFields</code>) y la jerarquía técnica (<code>fullStructure</code>), configurar documentos con soporte de reverso (<code>modoTraseras: "individual"</code>), y validar visualmente cartas en PNG a 300 DPI tanto por delante como por detrás antes de entregar el archivo <code>.cdc2</code>.
          </p>

          <div style={{ backgroundColor: "rgba(10, 10, 16, 0.75)", border: "1px solid #2d2d48", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              💡 También puedes descargarlo directamente vía cURL desde tu terminal o scripts de inicialización:
            </span>
            <code style={{ fontSize: "12px", color: "#38bdf8", fontFamily: "monospace", backgroundColor: "#06060a", padding: "4px 8px", borderRadius: "4px" }}>
              curl -s {origin}/api/v1/docs/agent-skill &gt; .agents/skills/card-deck-crafter/SKILL.md
            </code>
          </div>
        </div>

        {/* ==================== SECCIÓN DESTACADA: MODEL CONTEXT PROTOCOL (MCP) (SRS-087) ==================== */}
        <div
          style={{
            background: "linear-gradient(135deg, #13172e 0%, #1a1e3b 50%, #152438 100%)",
            border: "1px solid #38bdf8",
            borderRadius: "14px",
            padding: "30px",
            marginBottom: "36px",
            boxShadow: "0 8px 32px rgba(56, 189, 248, 0.15)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "30px" }}>⚡</span>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: "0 0 4px 0" }}>
                  Model Context Protocol (MCP) - Conexión Nativa para IA
                </h2>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", backgroundColor: "rgba(56, 189, 248, 0.25)", color: "#7dd3fc", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                    Transporte Remoto SSE & Stdio
                  </span>
                  <span style={{ fontSize: "11px", backgroundColor: "rgba(168, 85, 247, 0.25)", color: "#d8b4fe", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                    Claude Desktop & Cursor
                  </span>
                  <span style={{ fontSize: "11px", backgroundColor: "rgba(52, 211, 153, 0.25)", color: "#6ee7b7", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                    10 Tools + Resources + Prompts
                  </span>
                  <span style={{ fontSize: "11px", backgroundColor: "rgba(251, 191, 36, 0.25)", color: "#fde68a", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                    Preview Multimodal PNG
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: "1.7", margin: "0 0 20px 0" }}>
            Card Deck Crafter v2 expone un <strong>Servidor MCP oficial</strong> según el estándar abierto de Anthropic. Al configurarlo en tu cliente de IA preferido (Claude Desktop, Cursor, Cline, Windsurf o agentes autónomos), el modelo gana acceso directo a herramientas para inspeccionar plantillas, maquetar cartas frontales y traseras con ilustraciones, y ver el resultado visual con renderizado PNG en alta resolución.
          </p>

          {/* Selector de API Key dinámico */}
          <div style={{ backgroundColor: "#0c101c", border: "1px solid #1e293b", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
              <label htmlFor="mcp-api-key-input" style={{ fontSize: "13px", fontWeight: "700", color: "#38bdf8", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🔑</span> Tu API Key de CDC2 (para autocompletar la configuración):
              </label>
              <input
                id="mcp-api-key-input"
                type="text"
                placeholder="Pega aquí tu clave cdc2_live_... (opcional)"
                value={mcpApiKeyInput}
                onChange={(e) => setMcpApiKeyInput(e.target.value)}
                style={{
                  flex: "1",
                  maxWidth: "420px",
                  backgroundColor: "#161e2e",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  padding: "7px 12px",
                  color: "#f8fafc",
                  fontSize: "13px",
                  fontFamily: "monospace"
                }}
              />
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              💡 El servidor MCP utiliza el mismo sistema unificado de API Keys de CDC2. Puedes generar tus claves en la pestaña <strong>Acceso API</strong> del panel de Proyectos.
            </p>
          </div>

          {/* Tabs de clientes MCP y Snippet */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["cursor", "claude", "remote"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveMcpTab(tab)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: activeMcpTab === tab ? "none" : "1px solid #334155",
                      backgroundColor: activeMcpTab === tab ? "#0284c7" : "#0f172a",
                      color: activeMcpTab === tab ? "#fff" : "#94a3b8",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      textTransform: "uppercase"
                    }}
                  >
                    {tab === "cursor" ? "Cursor" : tab === "claude" ? "Claude Desktop" : "SSE Remoto"}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const content = activeMcpTab === "cursor" ? cursorMcpJson : activeMcpTab === "claude" ? claudeDesktopMcpJson : remoteSseMcpJson;
                  handleCopy(content, `mcp-${activeMcpTab}`);
                }}
                style={{
                  backgroundColor: copiedKey === `mcp-${activeMcpTab}` ? "#10b981" : "#0284c7",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                }}
              >
                <span>{copiedKey === `mcp-${activeMcpTab}` ? "✓" : "📋"}</span>
                {copiedKey === `mcp-${activeMcpTab}` ? "¡Configuración Copiada!" : "Copiar Configuración MCP"}
              </button>
            </div>

            <pre style={{ margin: 0, backgroundColor: "#080c14", border: "1px solid #1e293b", borderRadius: "10px", padding: "18px", color: "#38bdf8", fontSize: "12px", fontFamily: "monospace", overflowX: "auto", lineHeight: "1.6" }}>
              {activeMcpTab === "cursor" ? cursorMcpJson : activeMcpTab === "claude" ? claudeDesktopMcpJson : remoteSseMcpJson}
            </pre>
          </div>

          {/* Catálogo de Herramientas MCP */}
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🛠️</span> Herramientas MCP Disponibles (10 Tools Nativas)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
              {[
                { name: "cdc2_list_projects", desc: "Lista proyectos en la nube con contador de cartas y tamaño" },
                { name: "cdc2_get_project", desc: "Obtiene la estructura completa de un proyecto .cdc2" },
                { name: "cdc2_create_project", desc: "Crea un nuevo proyecto clonando una plantilla base" },
                { name: "cdc2_list_documents", desc: "Lista documentos/mazos dentro de un proyecto" },
                { name: "cdc2_create_document", desc: "Crea un nuevo documento independiente (ej. mazo temático)" },
                { name: "cdc2_get_template_schema", desc: "Inspecciona campos editables y semántica de plantilla" },
                { name: "cdc2_add_cards", desc: "Añade cartas frontales y traseras con textos e ilustraciones" },
                { name: "cdc2_update_card", desc: "Modifica textos, imágenes o reverso de una carta" },
                { name: "cdc2_delete_card", desc: "Elimina una carta de un proyecto" },
                { name: "cdc2_render_card_preview", desc: "Renderiza imagen PNG de alta fidelidad para evaluación visual" },
              ].map((tool) => (
                <div key={tool.name} style={{ backgroundColor: "#0b101d", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 14px" }}>
                  <code style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "700" }}>{tool.name}</code>
                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#94a3b8", lineHeight: "1.4" }}>{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== SECCIÓN DESTACADA: PROYECTOS EN LA NUBE Y MAZOS CON IA (SRS-079 / SRS-081) ==================== */}
        <div style={{ backgroundColor: "#141420", border: "1px solid #3730a3", borderRadius: "14px", padding: "30px", marginBottom: "36px", boxShadow: "0 6px 20px rgba(99, 102, 241, 0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ fontSize: "22px" }}>🚀</span>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: 0 }}>
              Gestión de Proyectos en la Nube y Mazos con IA (Con Soporte Completo de Reversos)
            </h2>
          </div>
          <p style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: "1.7", margin: "0 0 20px 0" }}>
            Este módulo permite a la IA colaborar de forma híbrida con el usuario. La IA crea un proyecto a partir de una plantilla base, divide el proyecto en documentos (por ejemplo, <strong>5 documentos para 5 mazos monocolor estilo Magic</strong>), añade cartas completas con ilustraciones generadas en Base64 o URLs remotas, configura <strong>reversos con plantilla o imágenes dedicadas</strong> (<code>backCardTemplateId</code>, <code>backFields</code>, <code>backImages</code>), y previsualiza independientemente la cara frontal o trasera en PNG de alta fidelidad.
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

          {/* Bloque Explicativo de Reversos y Esquema Dual */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ backgroundColor: "#191928", border: "1px solid #2d2d46", borderRadius: "10px", padding: "18px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#38bdf8", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🎴</span> Reversos Ricos Basados en Plantillas
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", lineHeight: "1.6" }}>
                Configura <code>modoTraseras: "individual"</code> a nivel de proyecto o documento. Cada carta puede vincular una plantilla trasera distinta mediante <code>backCardTemplateId</code> y personalizarla con <code>backFields</code> y <code>backImages</code>. Si no se especifica plantilla trasera, también puedes usar una imagen individual directa (<code>backImage</code>) o una común para todo el documento (<code>imagenTraseraComun</code>).
              </p>
            </div>
            <div style={{ backgroundColor: "#191928", border: "1px solid #2d2d46", borderRadius: "10px", padding: "18px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#34d399", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🔍</span> Esquema Dual: exposedFields vs fullStructure
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", lineHeight: "1.6" }}>
                Al consultar las plantillas disponibles, el servidor separa la respuesta en <strong><code>exposedFields</code></strong> (los campos prioritarios configurados por el diseñador) y <strong><code>fullStructure</code></strong> (el árbol completo de capas). Esto permite al agente de IA concentrarse en los textos y gráficos relevantes sin sobrecargar su ventana de contexto.
              </p>
            </div>
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
                    <td style={{ padding: "8px 10px" }}>Crea proyecto .cdc2 en la nube (soporta <code>modoTraseras</code> e <code>imagenTraseraComun</code>)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#065f46", color: "#34d399", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>GET</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects</td>
                    <td style={{ padding: "8px 10px" }}>Lista los proyectos en la nube del usuario</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#065f46", color: "#34d399", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>GET</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id</td>
                    <td style={{ padding: "8px 10px" }}>Obtiene detalle del proyecto, documentos y esquemas de plantillas (con <code>exposedFields</code> y <code>fullStructure</code>)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#1e3a8a", color: "#60a5fa", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>POST</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/documents</td>
                    <td style={{ padding: "8px 10px" }}>Crea nuevo documento dentro del proyecto (soporta <code>modoTraseras</code> e <code>imagenTraseraComun</code>)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#065f46", color: "#34d399", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>GET</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/documents</td>
                    <td style={{ padding: "8px 10px" }}>Lista los documentos de un proyecto</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#1e3a8a", color: "#60a5fa", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>POST</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/cards</td>
                    <td style={{ padding: "8px 10px" }}>Añade cartas con soporte de anverso (<code>cardTemplateId</code>) y reverso (<code>backCardTemplateId</code>, <code>backFields</code>, <code>backImages</code>)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#7c2d12", color: "#fb923c", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>PUT</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/cards/:cardId</td>
                    <td style={{ padding: "8px 10px" }}>Modifica o corrige una carta existente (anverso y/o reverso)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#831843", color: "#f472b6", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>DELETE</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/cards/:cardId</td>
                    <td style={{ padding: "8px 10px" }}>Elimina una carta del proyecto</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#065f46", color: "#34d399", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>GET</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/projects/:id/cards/:cardId/preview</td>
                    <td style={{ padding: "8px 10px" }}>Previsualiza la carta en PNG a 300 DPI (soporta <code>?side=front</code> y <code>?side=back</code>)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #222233" }}>
                    <td style={{ padding: "8px 10px" }}><span style={{ backgroundColor: "#065f46", color: "#34d399", fontWeight: "700", padding: "2px 6px", borderRadius: "4px" }}>GET</span></td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#fff" }}>/api/v1/docs/agent-skill</td>
                    <td style={{ padding: "8px 10px" }}>Descarga el archivo <code>SKILL.md</code> en formato Markdown para agentes de IA</td>
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

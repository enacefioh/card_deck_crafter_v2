import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpContext } from "./types.js";
import { registerAllTools } from "./tools/index.js";

export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer(
    {
      name: "card-deck-crafter",
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // 1. Registrar todas las herramientas ejecutables (Tools)
  registerAllTools(server, ctx);

  // 2. Registrar Recursos declarativos (Resources)
  server.resource(
    "project-detail",
    new ResourceTemplate("cdc2://projects/{projectId}", { list: undefined }),
    async (uri, { projectId }) => {
      try {
        const detail = await ctx.projectArchiveService.getProjectDetail(ctx.userId, projectId as string);
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(detail, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({ error: err.message || err }),
            },
          ],
        };
      }
    }
  );

  // 3. Registrar Prompts preconfigurados (Prompts)
  server.prompt(
    "crear-mazo-tematico",
    "Guía paso a paso para diseñar y maquetar un mazo de cartas temático en Card Deck Crafter v2",
    {
      tema: z.string().describe("Tema del mazo (ej. 'Criaturas Mitológicas', 'Hechizos Arcanos', 'Objetos Cyberpunk')"),
      numeroCartas: z.string().optional().describe("Número de cartas estimadas a generar (ej. '10')"),
    },
    ({ tema, numeroCartas }) => {
      const cantidad = numeroCartas ? ` Alrededor de ${numeroCartas} cartas.` : "";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Actúa como diseñador experto de juegos de mesa y maquetador en Card Deck Crafter v2.
Vamos a crear un mazo temático centrado en: "${tema}".${cantidad}

Instrucciones recomendadas:
1. Usa 'cdc2_list_projects' o 'cdc2_create_project' para tener un proyecto .cdc2 donde trabajar.
2. Consulta el esquema de la plantilla con 'cdc2_get_template_schema' para conocer qué campos de texto, descripciones semánticas y opciones existen.
3. Genera cartas equilibradas y coherentes usando 'cdc2_add_cards'.
4. Usa 'cdc2_render_card_preview' para comprobar visualmente la calidad y el ajuste del texto en las cartas generadas.`,
            },
          },
        ],
      };
    }
  );

  return server;
}

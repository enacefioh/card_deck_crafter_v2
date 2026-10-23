import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../types.js";
import { getPublicTemplateSchema } from "../../engine/cardEngineService.js";

export function registerTemplateTools(server: McpServer, ctx: McpContext) {
  // cdc2_get_template_schema
  server.tool(
    "cdc2_get_template_schema",
    "Inspecciona el esquema detallado de una plantilla: dimensiones en mm, campos editables, propiedades expuestas, descripciones semánticas y opciones. Permite a la IA saber exactamente qué campos rellenar.",
    {
      templateId: z.string().describe("ID de la plantilla (ej. 'standard-poker', 'tarot', o ID de plantilla interna de un proyecto)"),
      projectId: z.string().optional().describe("ID del proyecto si la plantilla es interna de un proyecto específico"),
    },
    async ({ templateId, projectId }) => {
      try {
        if (projectId) {
          const detail = await ctx.projectArchiveService.getProjectDetail(ctx.userId, projectId);
          const found = detail.templates?.find((t) => t.id === templateId);
          if (found) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      source: "project",
                      projectId,
                      template: found,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }
        }

        // Si no se encuentra en el proyecto o no se pasa projectId, buscar en el servicio de plantillas públicas
        const schema = await getPublicTemplateSchema(templateId, ctx.publicTemplateService);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(schema, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error al obtener esquema de plantilla ${templateId}: ${err.message || err}` }],
        };
      }
    }
  );
}

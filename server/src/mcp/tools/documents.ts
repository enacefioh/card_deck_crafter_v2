import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../types.js";

export function registerDocumentTools(server: McpServer, ctx: McpContext) {
  // cdc2_list_documents
  server.tool(
    "cdc2_list_documents",
    "Lista los documentos (mazos o secciones de cartas) contenidos dentro de un proyecto .cdc2.",
    {
      projectId: z.string().describe("ID del proyecto .cdc2"),
    },
    async ({ projectId }) => {
      try {
        const documents = await ctx.projectArchiveService.listProjectDocuments(ctx.userId, projectId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ projectId, documents }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error al listar documentos de ${projectId}: ${err.message || err}` }],
        };
      }
    }
  );

  // cdc2_create_document
  server.tool(
    "cdc2_create_document",
    "Crea un nuevo documento independiente (ej. un mazo temático) dentro de un proyecto multidocumento.",
    {
      projectId: z.string().describe("ID del proyecto .cdc2"),
      nombre: z.string().describe("Nombre del nuevo documento (ej. 'Mazo Bestias', 'Mazo Hechizos')"),
    },
    async ({ projectId, nombre }) => {
      try {
        const quota = ctx.user.storageQuotaMb ?? 100;
        const result = await ctx.projectArchiveService.createDocument(ctx.userId, quota, projectId, {
          nombre,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: `Documento "${nombre}" creado exitosamente en el proyecto ${projectId}.`,
                  document: result,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error al crear documento en ${projectId}: ${err.message || err}` }],
        };
      }
    }
  );
}

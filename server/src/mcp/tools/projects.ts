import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../types.js";

export function registerProjectTools(server: McpServer, ctx: McpContext) {
  // 1. cdc2_list_projects
  server.tool(
    "cdc2_list_projects",
    "Lista los proyectos en la nube (.cdc2) del usuario autenticado con ID, nombre, número de cartas y fecha de modificación.",
    {
      limit: z.number().optional().describe("Límite máximo de proyectos a listar"),
    },
    async ({ limit }) => {
      try {
        const projects = ctx.storageService.listProjects(ctx.userId);
        const result = limit && limit > 0 ? projects.slice(0, limit) : projects;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  total: projects.length,
                  projects: result.map((p) => ({
                    id: p.id,
                    name: p.name,
                    cardCount: p.cardCount,
                    documentCount: p.documentCount,
                    fileSizeBytes: p.fileSizeBytes,
                    updatedAt: p.updatedAt,
                    createdAt: p.createdAt,
                  })),
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
          content: [{ type: "text", text: `Error al listar proyectos: ${err.message || err}` }],
        };
      }
    }
  );

  // 2. cdc2_get_project
  server.tool(
    "cdc2_get_project",
    "Obtiene los detalles completos, documentos, plantillas y cartas de un proyecto .cdc2 en la nube.",
    {
      projectId: z.string().describe("ID del proyecto .cdc2"),
    },
    async ({ projectId }) => {
      try {
        const detail = await ctx.projectArchiveService.getProjectDetail(ctx.userId, projectId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(detail, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error al obtener proyecto ${projectId}: ${err.message || err}` }],
        };
      }
    }
  );

  // 3. cdc2_create_project
  server.tool(
    "cdc2_create_project",
    "Crea un nuevo proyecto .cdc2 en la nube clonando una plantilla base (pública o del usuario).",
    {
      name: z.string().describe("Nombre del nuevo proyecto (ej. 'Mazo Fantasía - Fuego')"),
      templateId: z.string().describe("ID de la plantilla origen (ej. 'standard-poker', 'tarot', o ID de plantilla pública/usuario)"),
      description: z.string().optional().describe("Descripción opcional del proyecto"),
    },
    async ({ name, templateId, description }) => {
      try {
        const quota = ctx.user.storageQuotaMb ?? 100;
        const project = await ctx.projectArchiveService.createProjectFromTemplate(ctx.userId, quota, {
          name,
          templateId,
          description,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: `Proyecto "${name}" creado exitosamente.`,
                  project,
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
          content: [{ type: "text", text: `Error al crear proyecto: ${err.message || err}` }],
        };
      }
    }
  );
}

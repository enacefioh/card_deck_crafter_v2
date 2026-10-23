import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../types.js";

export function registerPreviewTools(server: McpServer, ctx: McpContext) {
  // cdc2_render_card_preview
  server.tool(
    "cdc2_render_card_preview",
    "Renderiza una carta de un proyecto .cdc2 a imagen PNG de alta fidelidad para que el modelo de IA pueda evaluarla visualmente.",
    {
      projectId: z.string().describe("ID del proyecto .cdc2"),
      cardId: z.string().describe("ID de la carta a previsualizar"),
      face: z.enum(["front", "back"]).optional().describe("Cara a renderizar: 'front' (frontal) o 'back' (trasera/reverso). Por defecto 'front'"),
      dpi: z.number().optional().describe("Resolución en DPI (por defecto 150 para rapidez)"),
    },
    async ({ projectId, cardId, face, dpi }) => {
      try {
        const side = face || "front";
        const resolution = dpi && dpi > 0 ? dpi : 150;
        const pngBuffer = await ctx.projectArchiveService.previewCardInProject(
          ctx.userId,
          projectId,
          cardId,
          resolution,
          side
        );

        const base64Image = pngBuffer.toString("base64");

        return {
          content: [
            {
              type: "text",
              text: `Previsualización PNG generada para la carta "${cardId}" (${side}) a ${resolution} DPI.`,
            },
            {
              type: "image",
              data: base64Image,
              mimeType: "image/png",
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error al renderizar previsualización de carta ${cardId}: ${err.message || err}` }],
        };
      }
    }
  );
}

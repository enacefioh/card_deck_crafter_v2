import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../types.js";
import type { ProjectCardInput } from "shared";

export function registerCardTools(server: McpServer, ctx: McpContext) {
  // 1. cdc2_add_cards
  server.tool(
    "cdc2_add_cards",
    "Añade una o varias cartas a un documento de un proyecto .cdc2 en la nube, asignando sus textos, imágenes (en base64 Data URL o URL remota) y reversos.",
    {
      projectId: z.string().describe("ID del proyecto .cdc2"),
      documentId: z
        .string()
        .optional()
        .describe("ID del documento de destino. Si se omite, se añaden al primer documento del proyecto"),
      cards: z
        .array(
          z.object({
            cardTemplateId: z
              .string()
              .optional()
              .describe("ID de la plantilla de diseño de la carta. Si se omite, se usará la primera plantilla del proyecto"),
            name: z.string().optional().describe("Nombre o título de la carta"),
            nombre: z.string().optional().describe("Alias en español para el nombre de la carta"),
            count: z.number().optional().describe("Número de copias (por defecto 1)"),
            cantidad: z.number().optional().describe("Alias en español para la cantidad"),
            fields: z
              .record(z.string(), z.any())
              .optional()
              .describe("Valores clave/valor para los campos expuestos de la plantilla (ej. { titulo: 'Mago', descripcion: 'Lanza fuego' })"),
            valoresCampos: z
              .record(z.string(), z.any())
              .optional()
              .describe("Alias en español para campos"),
            images: z
              .record(z.string(), z.string())
              .optional()
              .describe("Imágenes por clave de campo o ID de capa (Data URL Base64 o URL remota)"),
            backCardTemplateId: z
              .string()
              .optional()
              .describe("ID de plantilla de diseño para la cara trasera individual"),
            backFields: z
              .record(z.string(), z.any())
              .optional()
              .describe("Campos para la cara trasera individual"),
            backImages: z
              .record(z.string(), z.string())
              .optional()
              .describe("Imágenes para la cara trasera individual"),
            backImage: z
              .string()
              .optional()
              .describe("Imagen completa individual para la cara trasera (Data URL o URL)"),
          })
        )
        .describe("Array de cartas a maquetar e insertar en el documento"),
    },
    async ({ projectId, documentId, cards }) => {
      try {
        const quota = ctx.user.storageQuotaMb ?? 100;

        // Auto-resolver plantilla por defecto si alguna carta no la especifica
        let defaultTemplateId: string | undefined;
        const needsDefault = cards.some((c) => !c.cardTemplateId);
        if (needsDefault) {
          const detail = await ctx.projectArchiveService.getProjectDetail(ctx.userId, projectId);
          if (detail.templates && detail.templates.length > 0) {
            defaultTemplateId = detail.templates[0].id;
          }
        }

        const normalizedCards: ProjectCardInput[] = cards.map((c, index) => {
          const templateId = c.cardTemplateId || defaultTemplateId;
          if (!templateId) {
            throw new Error(`No se especificó cardTemplateId para la carta #${index + 1} y no se encontró una plantilla por defecto en el proyecto.`);
          }
          const cardName = (c.name || c.nombre || `Carta ${index + 1}`).trim();
          const cardCount = c.count ?? c.cantidad ?? 1;
          const cardFields = c.fields || c.valoresCampos;

          return {
            cardTemplateId: templateId,
            name: cardName,
            count: cardCount,
            fields: cardFields,
            images: c.images,
            backCardTemplateId: c.backCardTemplateId,
            backFields: c.backFields,
            backImages: c.backImages,
            backImage: c.backImage,
          };
        });

        const result = await ctx.projectArchiveService.addCardsToProject(ctx.userId, quota, projectId, {
          documentId,
          cards: normalizedCards,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: `Se añadieron ${result.cards.length} cartas al proyecto ${projectId}.`,
                  addedCardsCount: result.cards.length,
                  totalCards: result.totalCards,
                  cards: result.cards.map((c) => ({
                    id: c.id,
                    name: c.nombre,
                    count: c.cantidad,
                    templateId: c.plantillaId,
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
          content: [{ type: "text", text: `Error al añadir cartas a ${projectId}: ${err.message || err}` }],
        };
      }
    }
  );

  // 2. cdc2_update_card
  server.tool(
    "cdc2_update_card",
    "Modifica los valores textuales, imágenes o reverso de una carta concreta ya existente dentro de un proyecto .cdc2.",
    {
      projectId: z.string().describe("ID del proyecto .cdc2"),
      cardId: z.string().describe("ID de la carta a modificar"),
      name: z.string().optional().describe("Nuevo nombre de la carta"),
      nombre: z.string().optional().describe("Alias en español para el nombre"),
      count: z.number().optional().describe("Nueva cantidad de copias"),
      cantidad: z.number().optional().describe("Alias en español para la cantidad"),
      fields: z.record(z.string(), z.any()).optional().describe("Campos a actualizar"),
      valoresCampos: z.record(z.string(), z.any()).optional().describe("Alias en español para campos"),
      images: z.record(z.string(), z.string()).optional().describe("Imágenes a actualizar"),
      backCardTemplateId: z.string().optional().describe("Plantilla para el reverso"),
      backFields: z.record(z.string(), z.any()).optional().describe("Campos para el reverso"),
      backImages: z.record(z.string(), z.string()).optional().describe("Imágenes para el reverso"),
      backImage: z.string().optional().describe("Imagen completa de reverso"),
    },
    async ({
      projectId,
      cardId,
      name,
      nombre,
      count,
      cantidad,
      fields,
      valoresCampos,
      images,
      backCardTemplateId,
      backFields,
      backImages,
      backImage,
    }) => {
      try {
        const quota = ctx.user.storageQuotaMb ?? 100;
        const result = await ctx.projectArchiveService.updateCardInProject(ctx.userId, quota, projectId, cardId, {
          name: name || nombre,
          count: count ?? cantidad,
          fields: fields || valoresCampos,
          images,
          backCardTemplateId,
          backFields,
          backImages,
          backImage,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: `Carta ${cardId} actualizada exitosamente.`,
                  card: result.card,
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
          content: [{ type: "text", text: `Error al actualizar carta ${cardId} en ${projectId}: ${err.message || err}` }],
        };
      }
    }
  );

  // 3. cdc2_delete_card
  server.tool(
    "cdc2_delete_card",
    "Elimina una carta específica de un proyecto .cdc2.",
    {
      projectId: z.string().describe("ID del proyecto .cdc2"),
      cardId: z.string().describe("ID de la carta a eliminar"),
    },
    async ({ projectId, cardId }) => {
      try {
        const quota = ctx.user.storageQuotaMb ?? 100;
        const result = await ctx.projectArchiveService.deleteCardFromProject(ctx.userId, quota, projectId, cardId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: result.message || `Carta ${cardId} eliminada correctamente.`,
                  cardCount: result.cardCount,
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
          content: [{ type: "text", text: `Error al eliminar carta ${cardId} de ${projectId}: ${err.message || err}` }],
        };
      }
    }
  );
}

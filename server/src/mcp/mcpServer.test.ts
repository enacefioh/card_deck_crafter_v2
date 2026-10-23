import { describe, it, expect, vi, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "./server.js";
import type { McpContext } from "./types.js";
import { McpSseHandler } from "./transport/sse.js";
import { McpStreamableHttpHandler } from "./transport/streamableHttp.js";

describe("SRS-087: Servidor MCP Integrado (Tools, Resources, Prompts y SSE)", () => {
  let mockContext: McpContext;
  let client: Client;
  let server: ReturnType<typeof createMcpServer>;

  beforeEach(async () => {
    mockContext = {
      userId: "user-123",
      user: {
        id: "user-123",
        email: "test@example.com",
        username: "card_crafter",
        role: "user",
        storageQuotaMb: 100,
      },
      storageService: {
        listProjects: vi.fn().mockReturnValue([
          {
            id: "proj_abc",
            userId: "user-123",
            filename: "proj_abc.cdc2",
            name: "Mazo Arcano",
            description: "Mazo de prueba",
            cardCount: 12,
            documentCount: 1,
            fileSizeBytes: 2048,
            createdAt: "2026-10-23T10:00:00Z",
            updatedAt: "2026-10-23T11:00:00Z",
          },
        ]),
      } as any,
      projectArchiveService: {
        getProjectDetail: vi.fn().mockResolvedValue({
          project: {
            id: "proj_abc",
            name: "Mazo Arcano",
            description: "Mazo de prueba",
            cardCount: 12,
            documentCount: 1,
            fileSizeBytes: 2048,
            createdAt: "2026-10-23T10:00:00Z",
            updatedAt: "2026-10-23T11:00:00Z",
          },
          documents: [
            {
              id: "doc_1",
              name: "Principal",
              cardCount: 12,
              cards: [{ id: "card_1", nombre: "Fuego", cantidad: 3, plantillaId: "tmpl_standard" }],
            },
          ],
          templates: [
            {
              id: "tmpl_standard",
              nombre: "Plantilla Clásica",
              dimensiones: { anchoMm: 63, altoMm: 88 },
              totalCapas: 3,
              exposedFields: [
                {
                  key: "titulo",
                  label: "Título",
                  type: "text",
                  semanticType: "title",
                  description: "Nombre de la carta",
                },
              ],
              fullStructure: [],
              campos: [],
            },
          ],
        }),
        createProjectFromTemplate: vi.fn().mockResolvedValue({
          id: "proj_new",
          nombre: "Nuevo Mazo Fantasía",
        }),
        listProjectDocuments: vi.fn().mockResolvedValue([
          { id: "doc_1", name: "Mazo 1", cardCount: 10 },
        ]),
        createDocument: vi.fn().mockResolvedValue({
          id: "doc_2",
          nombre: "Mazo 2",
        }),
        addCardsToProject: vi.fn().mockResolvedValue({
          message: "Se añadieron 2 cartas",
          cards: [
            { id: "c_1", nombre: "Dragón", cantidad: 1, plantillaId: "tmpl_standard" },
            { id: "c_2", nombre: "Fénix", cantidad: 1, plantillaId: "tmpl_standard" },
          ],
          totalCards: 14,
          storage: { usedBytes: 5000, totalBytes: 100000 },
        }),
        updateCardInProject: vi.fn().mockResolvedValue({
          message: "Carta actualizada",
          card: { id: "c_1", nombre: "Dragón Ancestral", cantidad: 2 },
        }),
        deleteCardFromProject: vi.fn().mockResolvedValue({
          message: "Carta eliminada",
          cardCount: 13,
        }),
        previewCardInProject: vi.fn().mockResolvedValue(Buffer.from("FAKE_PNG_BINARY")),
      } as any,
      publicTemplateService: {
        getTemplateById: vi.fn().mockResolvedValue({
          id: "tmpl_pub_1",
          title: "Poker Standard",
          exposed_properties: JSON.stringify([
            { id: "title", label: "Título", semanticType: "title" },
          ]),
        }),
      } as any,
      apiKeyService: {
        validateApiKey: vi.fn(),
      } as any,
    };

    server = createMcpServer(mockContext);
    client = new Client(
      {
        name: "test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  it("RF-3: Expone el catálogo completo de herramientas (Tools)", async () => {
    const toolsResult = await client.listTools();
    const toolNames = toolsResult.tools.map((t) => t.name);

    expect(toolNames).toContain("cdc2_list_projects");
    expect(toolNames).toContain("cdc2_get_project");
    expect(toolNames).toContain("cdc2_create_project");
    expect(toolNames).toContain("cdc2_list_documents");
    expect(toolNames).toContain("cdc2_create_document");
    expect(toolNames).toContain("cdc2_get_template_schema");
    expect(toolNames).toContain("cdc2_add_cards");
    expect(toolNames).toContain("cdc2_update_card");
    expect(toolNames).toContain("cdc2_delete_card");
    expect(toolNames).toContain("cdc2_render_card_preview");
  });

  it("cdc2_list_projects ejecuta y devuelve proyectos del usuario", async () => {
    const result = await client.callTool({
      name: "cdc2_list_projects",
      arguments: {},
    });

    expect(mockContext.storageService.listProjects).toHaveBeenCalledWith("user-123");
    const content = (result.content as any)[0];
    expect(content.type).toBe("text");
    const parsed = JSON.parse(content.text);
    expect(parsed.total).toBe(1);
    expect(parsed.projects[0].name).toBe("Mazo Arcano");
  });

  it("cdc2_get_template_schema devuelve esquema interno del proyecto", async () => {
    const result = await client.callTool({
      name: "cdc2_get_template_schema",
      arguments: {
        templateId: "tmpl_standard",
        projectId: "proj_abc",
      },
    });

    expect(mockContext.projectArchiveService.getProjectDetail).toHaveBeenCalledWith("user-123", "proj_abc");
    const content = (result.content as any)[0];
    const parsed = JSON.parse(content.text);
    expect(parsed.source).toBe("project");
    expect(parsed.template.id).toBe("tmpl_standard");
    expect(parsed.template.exposedFields[0].semanticType).toBe("title");
  });

  it("cdc2_add_cards normaliza alias y auto-resuelve plantilla por defecto", async () => {
    const result = await client.callTool({
      name: "cdc2_add_cards",
      arguments: {
        projectId: "proj_abc",
        cards: [
          {
            nombre: "Dragón",
            cantidad: 1,
            valoresCampos: { titulo: "Dragón de Fuego" },
          },
          {
            name: "Fénix",
            count: 1,
            fields: { titulo: "Fénix Dorado" },
          },
        ],
      },
    });

    expect(mockContext.projectArchiveService.addCardsToProject).toHaveBeenCalled();
    const callArgs = (mockContext.projectArchiveService.addCardsToProject as any).mock.calls[0];
    expect(callArgs[0]).toBe("user-123");
    expect(callArgs[2]).toBe("proj_abc");
    expect(callArgs[3].cards[0].cardTemplateId).toBe("tmpl_standard"); // auto-resolved from project detail
    expect(callArgs[3].cards[0].name).toBe("Dragón");
    expect(callArgs[3].cards[1].name).toBe("Fénix");

    const content = (result.content as any)[0];
    const parsed = JSON.parse(content.text);
    expect(parsed.addedCardsCount).toBe(2);
    expect(parsed.totalCards).toBe(14);
  });

  it("cdc2_update_card modifica carta existente", async () => {
    const result = await client.callTool({
      name: "cdc2_update_card",
      arguments: {
        projectId: "proj_abc",
        cardId: "c_1",
        nombre: "Dragón Ancestral",
        cantidad: 2,
      },
    });

    expect(mockContext.projectArchiveService.updateCardInProject).toHaveBeenCalledWith(
      "user-123",
      100,
      "proj_abc",
      "c_1",
      expect.objectContaining({
        name: "Dragón Ancestral",
        count: 2,
      })
    );

    const content = (result.content as any)[0];
    const parsed = JSON.parse(content.text);
    expect(parsed.card.nombre).toBe("Dragón Ancestral");
  });

  it("cdc2_delete_card elimina carta", async () => {
    const result = await client.callTool({
      name: "cdc2_delete_card",
      arguments: {
        projectId: "proj_abc",
        cardId: "c_1",
      },
    });

    expect(mockContext.projectArchiveService.deleteCardFromProject).toHaveBeenCalledWith(
      "user-123",
      100,
      "proj_abc",
      "c_1"
    );
    const content = (result.content as any)[0];
    const parsed = JSON.parse(content.text);
    expect(parsed.cardCount).toBe(13);
  });

  it("cdc2_render_card_preview devuelve contenido multimodal base64 PNG", async () => {
    const result = await client.callTool({
      name: "cdc2_render_card_preview",
      arguments: {
        projectId: "proj_abc",
        cardId: "c_1",
        face: "front",
        dpi: 150,
      },
    });

    expect(mockContext.projectArchiveService.previewCardInProject).toHaveBeenCalledWith(
      "user-123",
      "proj_abc",
      "c_1",
      150,
      "front"
    );

    const contents = result.content as any[];
    expect(contents.length).toBe(2);
    expect(contents[0].type).toBe("text");
    expect(contents[1].type).toBe("image");
    expect(contents[1].mimeType).toBe("image/png");
    expect(contents[1].data).toBe(Buffer.from("FAKE_PNG_BINARY").toString("base64"));
  });

  it("RF-4: Recursos declarativos (Resources) devuelven detalle del proyecto", async () => {
    const res = await client.readResource({
      uri: "cdc2://projects/proj_abc",
    });

    expect(mockContext.projectArchiveService.getProjectDetail).toHaveBeenCalledWith("user-123", "proj_abc");
    expect(res.contents.length).toBe(1);
    expect(res.contents[0].uri).toBe("cdc2://projects/proj_abc");
    const textContent = res.contents[0] as { uri: string; text: string };
    const parsed = JSON.parse(textContent.text);
    expect(parsed.project.name).toBe("Mazo Arcano");
  });

  it("Prompts preconfigurados expone 'crear-mazo-tematico'", async () => {
    const promptsResult = await client.listPrompts();
    const promptNames = promptsResult.prompts.map((p) => p.name);
    expect(promptNames).toContain("crear-mazo-tematico");

    const prompt = await client.getPrompt({
      name: "crear-mazo-tematico",
      arguments: {
        tema: "Cyberpunk",
        numeroCartas: "8",
      },
    });

    expect(prompt.messages.length).toBe(1);
    expect((prompt.messages[0].content as any).text).toContain("Cyberpunk");
  });

  describe("McpSseHandler - Autenticación y Endpoints", () => {
    it("Rechaza conexiones sin autenticación con código 401", async () => {
      const handler = new McpSseHandler({
        getApiKeyService: () => mockContext.apiKeyService,
        getAuthService: () => ({ getSessionUser: vi.fn().mockResolvedValue(null) } as any),
        getProjectArchiveService: () => mockContext.projectArchiveService,
        getStorageService: () => mockContext.storageService,
        getPublicTemplateService: () => mockContext.publicTemplateService,
      });

      const mockReq: any = {
        headers: {},
        query: {},
        cookies: {},
      };
      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await handler.handleSseConnection(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("No autorizado") }));
    });
  });

  describe("McpStreamableHttpHandler - Streamable HTTP (MCP 2025-03-26)", () => {
    it("Rechaza peticiones no autenticadas con código 401", async () => {
      const handler = new McpStreamableHttpHandler({
        getApiKeyService: () => mockContext.apiKeyService,
        getAuthService: () => ({ getSessionUser: vi.fn().mockResolvedValue(null) } as any),
        getProjectArchiveService: () => mockContext.projectArchiveService,
        getStorageService: () => mockContext.storageService,
        getPublicTemplateService: () => mockContext.publicTemplateService,
      });

      const mockReq: any = {
        headers: {},
        query: {},
        cookies: {},
      };
      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await handler.handleRequest(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining("No autorizado"),
          }),
        })
      );
    });
  });
});

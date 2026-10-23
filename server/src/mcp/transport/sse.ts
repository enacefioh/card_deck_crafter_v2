import type { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpServer } from "../server.js";
import type { McpContext } from "../types.js";
import type { ApiKeyService } from "../../auth/apiKeyService.js";
import type { AuthService } from "../../auth/authService.js";
import type { ProjectArchiveService } from "../../engine/projectArchiveService.js";
import type { UserStorageService } from "../../storage/userStorageService.js";
import type { PublicTemplateService } from "../../storage/publicTemplateService.js";

interface ActiveMcpSession {
  transport: SSEServerTransport;
  server: McpServer;
  userId: string;
  createdAt: number;
}

export class McpSseHandler {
  private activeSessions = new Map<string, ActiveMcpSession>();
  private getApiKeyService: () => ApiKeyService;
  private getAuthService: () => AuthService;
  private getProjectArchiveService: () => ProjectArchiveService;
  private getStorageService: () => UserStorageService;
  private getPublicTemplateService: () => PublicTemplateService;

  constructor(dependencies: {
    getApiKeyService: () => ApiKeyService;
    getAuthService: () => AuthService;
    getProjectArchiveService: () => ProjectArchiveService;
    getStorageService: () => UserStorageService;
    getPublicTemplateService: () => PublicTemplateService;
  }) {
    this.getApiKeyService = dependencies.getApiKeyService;
    this.getAuthService = dependencies.getAuthService;
    this.getProjectArchiveService = dependencies.getProjectArchiveService;
    this.getStorageService = dependencies.getStorageService;
    this.getPublicTemplateService = dependencies.getPublicTemplateService;
  }

  /**
   * Autentica la petición buscando API Key en headers, query o cookie de sesión
   */
  private async authenticateRequest(req: Request): Promise<{ user: any; userId: string } | null> {
    const authHeader = req.headers.authorization;
    const xApiKey = req.headers["x-api-key"] as string | undefined;
    const queryApiKey = (req.query.apiKey || req.query.api_key) as string | undefined;

    let rawApiKey: string | undefined = xApiKey || queryApiKey;
    if (!rawApiKey && authHeader && authHeader.startsWith("Bearer ")) {
      rawApiKey = authHeader.slice(7).trim();
    }

    if (rawApiKey && rawApiKey.startsWith("cdc2_live_")) {
      const apiKeyService = this.getApiKeyService();
      const validation = await apiKeyService.validateApiKey(rawApiKey);
      if (validation) {
        return { user: validation.user, userId: validation.user.id };
      }
      return null;
    }

    // Fallback a cookie de sesión cdc2_session si se conecta desde navegador
    const sessionCookie = req.cookies?.cdc2_session;
    if (sessionCookie) {
      const authService = this.getAuthService();
      const user = await authService.getSessionUser(sessionCookie);
      if (user) {
        return { user, userId: user.id };
      }
    }

    return null;
  }

  /**
   * GET /mcp/sse: Establece el canal de eventos SSE
   */
  public handleSseConnection = async (req: Request, res: Response) => {
    try {
      const auth = await this.authenticateRequest(req);
      if (!auth) {
        res.status(401).json({
          error: "No autorizado. Proporciona una API Key válida (Authorization: Bearer cdc2_live_... o ?apiKey=...).",
        });
        return;
      }

      // Inicializar el transporte SSE indicando el endpoint POST para mensajes
      const messagesEndpoint = req.originalUrl?.includes("/api/") ? "/api/mcp/messages" : "/mcp/messages";
      const transport = new SSEServerTransport(messagesEndpoint, res);

      const mcpContext: McpContext = {
        userId: auth.userId,
        user: auth.user,
        projectArchiveService: this.getProjectArchiveService(),
        storageService: this.getStorageService(),
        publicTemplateService: this.getPublicTemplateService(),
        apiKeyService: this.getApiKeyService(),
      };

      const server = createMcpServer(mcpContext);

      const session: ActiveMcpSession = {
        transport,
        server,
        userId: auth.userId,
        createdAt: Date.now(),
      };

      this.activeSessions.set(transport.sessionId, session);

      transport.onclose = () => {
        this.activeSessions.delete(transport.sessionId);
      };

      await server.connect(transport);
    } catch (err: any) {
      console.error("[McpSseHandler] Error estableciendo conexión SSE:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "Error al inicializar transporte SSE de MCP." });
      }
    }
  };

  /**
   * POST /mcp/messages: Recibe mensajes JSON-RPC del cliente
   */
  public handlePostMessage = async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.sessionId as string;
      if (!sessionId) {
        res.status(400).json({ error: "Falta el parámetro 'sessionId' en la consulta." });
        return;
      }

      const session = this.activeSessions.get(sessionId);
      if (!session) {
        res.status(404).json({ error: "Sesión MCP no encontrada o cerrada." });
        return;
      }

      await session.transport.handlePostMessage(req, res);
    } catch (err: any) {
      console.error("[McpSseHandler] Error procesando mensaje POST:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "Error al procesar mensaje MCP." });
      }
    }
  };

  /**
   * Número de sesiones activas (para métricas o depuración)
   */
  public getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }
}

import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpServer } from "../server.js";
import type { McpContext } from "../types.js";
import type { ApiKeyService } from "../../auth/apiKeyService.js";
import type { AuthService } from "../../auth/authService.js";
import type { ProjectArchiveService } from "../../engine/projectArchiveService.js";
import type { UserStorageService } from "../../storage/userStorageService.js";
import type { PublicTemplateService } from "../../storage/publicTemplateService.js";

interface ActiveStreamableSession {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  userId: string;
  createdAt: number;
}

export class McpStreamableHttpHandler {
  private activeSessions = new Map<string, ActiveStreamableSession>();
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
   * Autentica la petición buscando API Key en headers (Authorization o x-api-key), query o cookie
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
   * Manejador universal para Streamable HTTP (GET, POST, DELETE) en /mcp
   */
  public handleRequest = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.headers["mcp-session-id"] || req.query.sessionId) as string | undefined;

      // 1. Si viene con ID de sesión existente, buscar la sesión activa
      if (sessionId && this.activeSessions.has(sessionId)) {
        const session = this.activeSessions.get(sessionId)!;
        await session.transport.handleRequest(req, res, req.body);
        return;
      }

      // 2. Si es una nueva conexión o inicialización, requiere autenticación
      const auth = await this.authenticateRequest(req);
      if (!auth) {
        res.status(401).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "No autorizado. Proporciona una API Key válida (Authorization: Bearer cdc2_live_... o ?apiKey=...).",
          },
        });
        return;
      }

      // 3. Crear nuevo transporte y servidor MCP para esta sesión Streamable HTTP
      const newSessionId = randomUUID();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
        enableJsonResponse: true,
      });

      const mcpContext: McpContext = {
        userId: auth.userId,
        user: auth.user,
        projectArchiveService: this.getProjectArchiveService(),
        storageService: this.getStorageService(),
        publicTemplateService: this.getPublicTemplateService(),
        apiKeyService: this.getApiKeyService(),
      };

      const server = createMcpServer(mcpContext);

      const session: ActiveStreamableSession = {
        transport,
        server,
        userId: auth.userId,
        createdAt: Date.now(),
      };

      this.activeSessions.set(newSessionId, session);

      transport.onclose = () => {
        this.activeSessions.delete(newSessionId);
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err: any) {
      console.error("[McpStreamableHttpHandler] Error procesando petición:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: err.message || "Error interno en el transporte Streamable HTTP.",
          },
        });
      }
    }
  };

  public getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }
}

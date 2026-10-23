#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";
import type { McpContext } from "./types.js";
import { AuthService } from "../auth/authService.js";
import { ApiKeyService } from "../auth/apiKeyService.js";
import { UserStorageService } from "../storage/userStorageService.js";
import { PublicTemplateService } from "../storage/publicTemplateService.js";
import { ProjectArchiveService } from "../engine/projectArchiveService.js";

async function main() {
  const args = process.argv.slice(2);
  let apiKey = process.env.CDC2_API_KEY;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--key" || args[i] === "-k") {
      apiKey = args[i + 1];
      i++;
    }
  }

  if (!apiKey) {
    console.error("Error: Se requiere una API Key mediante --key <API_KEY> o variable CDC2_API_KEY.");
    process.exit(1);
  }

  const authService = new AuthService();
  const db = authService.getRepository().getDatabase();
  const apiKeyService = new ApiKeyService(db);
  const storageService = new UserStorageService(db);
  const publicTemplateService = new PublicTemplateService(db);
  const projectArchiveService = new ProjectArchiveService(storageService, publicTemplateService);

  const validation = await apiKeyService.validateApiKey(apiKey);
  if (!validation) {
    console.error("Error: La API Key proporcionada no es válida o está revocada.");
    process.exit(1);
  }

  const mcpContext: McpContext = {
    userId: validation.user.id,
    user: validation.user,
    projectArchiveService,
    storageService,
    publicTemplateService,
    apiKeyService,
  };

  const server = createMcpServer(mcpContext);
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch((err) => {
  console.error("Error fatal en cdc2-mcp:", err);
  process.exit(1);
});

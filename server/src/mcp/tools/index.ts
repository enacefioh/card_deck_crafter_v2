import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../types.js";
import { registerProjectTools } from "./projects.js";
import { registerDocumentTools } from "./documents.js";
import { registerTemplateTools } from "./templates.js";
import { registerCardTools } from "./cards.js";
import { registerPreviewTools } from "./preview.js";

export function registerAllTools(server: McpServer, ctx: McpContext) {
  registerProjectTools(server, ctx);
  registerDocumentTools(server, ctx);
  registerTemplateTools(server, ctx);
  registerCardTools(server, ctx);
  registerPreviewTools(server, ctx);
}

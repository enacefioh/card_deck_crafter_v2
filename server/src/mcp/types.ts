import type { ProjectArchiveService } from "../engine/projectArchiveService.js";
import type { UserStorageService } from "../storage/userStorageService.js";
import type { PublicTemplateService } from "../storage/publicTemplateService.js";
import type { ApiKeyService } from "../auth/apiKeyService.js";
import type { User } from "shared";

export interface McpContext {
  userId: string;
  user: User | {
    id: string;
    email: string;
    username?: string;
    role: string;
    storageQuotaMb?: number;
  };
  projectArchiveService: ProjectArchiveService;
  storageService: UserStorageService;
  publicTemplateService: PublicTemplateService;
  apiKeyService: ApiKeyService;
}

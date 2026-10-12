export type TemplateFieldType = "string" | "multiline" | "number" | "image" | "select" | "boolean";

export interface TemplateFieldSchema {
  clave: string;
  nombre: string;
  tipo: TemplateFieldType;
  descripcion?: string;
  valorDefecto?: any;
  opciones?: string[]; // Para selects o image-switch
}

export interface TemplateDesignSchema {
  id: string;
  nombre: string;
  dimensiones: {
    anchoMm: number;
    altoMm: number;
  };
  totalCapas: number;
  campos: TemplateFieldSchema[];
  miniatura?: string;
}

export interface TemplateManifestResponse {
  templateId: string;
  templateName: string;
  templateDescription: string;
  authorName: string;
  designs: TemplateDesignSchema[];
}

export interface CardRenderRequest {
  templateId: string;
  cardDesignId: string;
  fields?: Record<string, string>;
  images?: Record<string, string>; // clave de campo o id de capa -> URL externa o Data URL
  dpi?: number;
}

export interface CreateProjectFromTemplateRequest {
  templateId: string;
  name: string;
  description?: string;
}

export interface CreateProjectResponse {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  documentCount: number;
  fileSizeBytes: number;
  createdAt: string;
}

export interface CreateDocumentRequest {
  nombre: string;
  canvasConfig?: Record<string, any>;
  cardConfig?: Record<string, any>;
}

export interface CreateDocumentResponse {
  id: string;
  nombre: string;
  cardCount: number;
}

export interface ProjectDocumentItem {
  id: string;
  nombre: string;
  cardCount: number;
  canvasConfig?: Record<string, any>;
  cardConfig?: Record<string, any>;
}

export interface ProjectCardInput {
  cardTemplateId: string;
  name: string;
  count?: number;
  fields?: Record<string, any>;
  images?: Record<string, string>; // clave de campo o ID de capa -> Data URL Base64 o URL remota
}

export interface AddCardsToProjectRequest {
  documentId?: string;
  cards: ProjectCardInput[];
}

export interface AddCardsToProjectResponse {
  message: string;
  cards: Array<{
    id: string;
    nombre: string;
    cantidad: number;
    plantillaId?: string;
    valoresCampos?: Record<string, string>;
    capasOverrides?: Record<string, any>;
  }>;
  totalCards: number;
  storage: {
    usedMb: number;
    quotaMb: number;
    percentUsed: number;
  };
}

export interface UpdateProjectCardRequest {
  name?: string;
  count?: number;
  fields?: Record<string, any>;
  images?: Record<string, string>;
}

export interface UpdateProjectCardResponse {
  message: string;
  card: {
    id: string;
    nombre: string;
    cantidad: number;
    plantillaId?: string;
    valoresCampos?: Record<string, string>;
    capasOverrides?: Record<string, any>;
  };
}

export interface DeleteCardResponse {
  message: string;
  cardCount: number;
}

export interface ProjectDetailResponse {
  project: {
    id: string;
    name: string;
    description: string;
    cardCount: number;
    documentCount: number;
    fileSizeBytes: number;
    createdAt: string;
    updatedAt: string;
  };
  documents: ProjectDocumentItem[];
  templates: TemplateDesignSchema[];
}


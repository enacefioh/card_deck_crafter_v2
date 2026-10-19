export type TemplateFieldType = "string" | "multiline" | "number" | "image" | "select" | "boolean";

export interface TemplateFieldSchema {
  clave: string;
  nombre: string;
  tipo: TemplateFieldType;
  descripcion?: string;
  valorDefecto?: any;
  opciones?: string[]; // Para selects o image-switch
}

export interface TemplateLayerSummary {
  id: string;
  nombre: string;
  tipo: string;
  descripcion?: string;
  parentCapaId?: string | null;
  contenidoRaw?: string;
  src?: string;
  visibilidad?: string;
}

export interface TemplateDesignSchema {
  id: string;
  nombre: string;
  dimensiones: {
    anchoMm: number;
    altoMm: number;
  };
  totalCapas: number;
  miniatura?: string;
  // Campos oficialmente expuestos para edición recomendada
  exposedFields: TemplateFieldSchema[];
  // Estructura técnica completa de todas las capas
  fullStructure: TemplateLayerSummary[];
  // Alias retrocompatible
  campos: TemplateFieldSchema[];
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
  side?: "front" | "back";
}

export interface CreateProjectFromTemplateRequest {
  templateId: string;
  name: string;
  description?: string;
  modoTraseras?: "individual" | "comun" | "ninguno";
  imagenTraseraComun?: string;
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
  modoTraseras?: "individual" | "comun" | "ninguno";
  imagenTraseraComun?: string;
}

export interface CreateDocumentResponse {
  id: string;
  nombre: string;
  cardCount: number;
  modoTraseras?: "individual" | "comun" | "ninguno";
}

export interface ProjectDocumentItem {
  id: string;
  nombre: string;
  cardCount: number;
  canvasConfig?: Record<string, any>;
  cardConfig?: Record<string, any>;
  modoTraseras?: "individual" | "comun" | "ninguno";
  imagenTraseraComun?: string | null;
}

export interface ProjectCardInput {
  // Cara Frontal
  cardTemplateId: string;
  name: string;
  count?: number;
  fields?: Record<string, any>;
  images?: Record<string, string>; // clave de campo o ID de capa -> Data URL Base64 o URL remota

  // Cara Trasera (Reverso)
  backCardTemplateId?: string;
  backFields?: Record<string, any>;
  backImages?: Record<string, string>; // clave de campo o ID de capa trasera -> Data URL Base64 o URL remota
  backImage?: string; // Imagen directa de reverso individual
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
    plantillaTraseraId?: string;
    valoresCamposTrasera?: Record<string, string>;
    capasOverridesTrasera?: Record<string, any>;
    imagenTrasera?: string | null;
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
  backCardTemplateId?: string;
  backFields?: Record<string, any>;
  backImages?: Record<string, string>;
  backImage?: string;
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
    plantillaTraseraId?: string;
    valoresCamposTrasera?: Record<string, string>;
    capasOverridesTrasera?: Record<string, any>;
    imagenTrasera?: string | null;
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


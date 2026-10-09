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

export interface StorePreviewCard {
  id?: string;
  nombre: string;
  anchoMm: number;
  altoMm: number;
  miniatura?: string;
}

export interface StoreTemplateCard {
  id: string;
  name: string;
  description: string;
  authorName: string;
  documentCount: number;
  templateCount: number;
  fileSizeBytes: number;
  updatedAt: string;
  createdAt: string;
  thumbnail?: string; // Miniatura del primer diseño
  dimensions?: {
    anchoMm: number;
    altoMm: number;
  };
  previewCards?: StorePreviewCard[];
}

export interface StoreTemplateDetail extends StoreTemplateCard {
  originalTemplateId: string;
  authorId: string;
  downloadUrl: string;
}

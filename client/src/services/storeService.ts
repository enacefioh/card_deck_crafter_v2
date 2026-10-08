import type { StoreTemplateCard, StoreTemplateDetail } from "shared";

/**
 * Consulta el catálogo de plantillas públicas aprobadas con filtrado opcional por texto.
 */
export async function fetchStoreTemplates(query?: string): Promise<StoreTemplateCard[]> {
  const url = query && query.trim()
    ? `/api/store/templates?q=${encodeURIComponent(query.trim())}`
    : "/api/store/templates";
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error al cargar las plantillas de la tienda.");
  }
  const data = await res.json();
  return data.templates || [];
}

/**
 * Consulta la ficha detallada de una plantilla aprobada para la tienda.
 */
export async function fetchStoreTemplateDetail(id: string): Promise<StoreTemplateDetail> {
  const res = await fetch(`/api/store/templates/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error al cargar el detalle de la plantilla.");
  }
  const data = await res.json();
  return data.template;
}

/**
 * Devuelve la URL de descarga del archivo de plantilla.
 */
export function getStoreTemplateDownloadUrl(id: string): string {
  return `/api/store/templates/${encodeURIComponent(id)}/download`;
}

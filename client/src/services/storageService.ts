import type { CloudProjectMetadata, CloudTemplateMetadata, UserStorageInfo } from "shared";

export async function fetchUserStorage(): Promise<UserStorageInfo> {
  const res = await fetch("/api/user/storage");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al obtener información de almacenamiento.");
  }
  return res.json();
}

export async function fetchCloudProjects(): Promise<CloudProjectMetadata[]> {
  const res = await fetch("/api/user/projects");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al listar proyectos de la nube.");
  }
  const data = await res.json();
  return data.projects || [];
}

export async function uploadCloudProject(
  fileBlob: Blob,
  params: {
    id?: string;
    name: string;
    description?: string;
    cardCount: number;
    documentCount: number;
  }
): Promise<{ project: CloudProjectMetadata; storage: UserStorageInfo }> {
  const formData = new FormData();
  formData.append("file", fileBlob, `${params.name.replace(/[^a-zA-Z0-9_\-\.]/g, "_")}.cdc2`);
  formData.append("name", params.name);
  if (params.description) formData.append("description", params.description);
  formData.append("cardCount", String(params.cardCount));
  formData.append("documentCount", String(params.documentCount));
  if (params.id) formData.append("id", params.id);

  const res = await fetch("/api/user/projects", {
    method: "POST",
    body: formData
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(data.error || "Error al guardar el proyecto en la nube.");
    error.code = data.code;
    error.details = data.details;
    throw error;
  }

  return data;
}

export async function downloadCloudProjectBlob(projectId: string): Promise<Blob> {
  const res = await fetch(`/api/user/projects/${projectId}/download`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al descargar el proyecto de la nube.");
  }
  return res.blob();
}

export async function deleteCloudProject(projectId: string): Promise<UserStorageInfo> {
  const res = await fetch(`/api/user/projects/${projectId}`, {
    method: "DELETE"
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Error al eliminar el proyecto de la nube.");
  }
  return data.storage;
}

// --- Servicios de Plantillas en la Nube (SRS-068) ---

export async function fetchCloudTemplates(): Promise<CloudTemplateMetadata[]> {
  const res = await fetch("/api/user/templates");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al listar plantillas de la nube.");
  }
  const data = await res.json();
  return data.templates || [];
}

export async function uploadCloudTemplate(
  fileBlob: Blob,
  params: {
    id?: string;
    name: string;
    description?: string;
    documentCount: number;
    templateCount: number;
  }
): Promise<{ template: CloudTemplateMetadata; storage: UserStorageInfo }> {
  const formData = new FormData();
  formData.append("file", fileBlob, `${params.name.replace(/[^a-zA-Z0-9_\-\.]/g, "_")}.cdc2`);
  formData.append("name", params.name);
  if (params.description) formData.append("description", params.description);
  formData.append("documentCount", String(params.documentCount));
  formData.append("templateCount", String(params.templateCount));
  if (params.id) formData.append("id", params.id);

  const res = await fetch("/api/user/templates", {
    method: "POST",
    body: formData
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(data.error || "Error al guardar la plantilla en la nube.");
    error.code = data.code;
    error.details = data.details;
    throw error;
  }

  return data;
}

export async function downloadCloudTemplateBlob(templateId: string): Promise<Blob> {
  const res = await fetch(`/api/user/templates/${templateId}/download`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al descargar la plantilla de la nube.");
  }
  return res.blob();
}

export async function deleteCloudTemplate(templateId: string): Promise<UserStorageInfo> {
  const res = await fetch(`/api/user/templates/${templateId}`, {
    method: "DELETE"
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Error al eliminar la plantilla de la nube.");
  }
  return data.storage;
}

import type { UserApiKeyMetadata, CreateApiKeyResponse } from "shared";

export async function fetchApiKeys(): Promise<UserApiKeyMetadata[]> {
  const res = await fetch("/api/auth/api-keys", {
    credentials: "include"
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "No se pudieron obtener las API Keys.");
  }
  const json = await res.json();
  return json.keys || [];
}

export async function createApiKey(name: string): Promise<CreateApiKeyResponse> {
  const res = await fetch("/api/auth/api-keys", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name }),
    credentials: "include"
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error al generar la API Key.");
  }
  return res.json();
}

export async function deleteApiKey(id: string): Promise<void> {
  const res = await fetch(`/api/auth/api-keys/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error al revocar la API Key.");
  }
}

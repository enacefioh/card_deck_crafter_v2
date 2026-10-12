import React, { useState, useEffect } from "react";
import type {
  CloudProjectMetadata,
  CloudTemplateMetadata,
  PublicTemplateMetadata,
  UserStorageInfo,
  UserApiKeyMetadata,
  CreateApiKeyResponse
} from "shared";
import { useSafeBackdrop } from "../utils/modalUtils";
import {
  fetchCloudProjects,
  deleteCloudProject,
  fetchCloudTemplates,
  deleteCloudTemplate,
  publishCloudTemplate,
  fetchMyTemplatePublications
} from "../services/storageService";
import { fetchApiKeys, createApiKey, deleteApiKey } from "../services/apiKeyService";
import { PublishTemplateModal } from "./PublishTemplateModal";

interface CloudProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageInfo: UserStorageInfo | null;
  initialTab?: "projects" | "templates" | "api";
  authorUsername?: string;
  onOpenProject: (project: CloudProjectMetadata) => Promise<void>;
  onExportProject: (project: CloudProjectMetadata) => Promise<void>;
  onUseTemplate?: (template: CloudTemplateMetadata) => Promise<void>;
  onExportTemplate?: (template: CloudTemplateMetadata) => Promise<void>;
  onStorageUpdated: () => void;
}

export const CloudProjectsModal: React.FC<CloudProjectsModalProps> = ({
  isOpen,
  onClose,
  storageInfo,
  initialTab = "projects",
  authorUsername,
  onOpenProject,
  onExportProject,
  onUseTemplate,
  onExportTemplate,
  onStorageUpdated
}) => {
  const [activeTab, setActiveTab] = useState<"projects" | "templates" | "api">(initialTab);
  const [projects, setProjects] = useState<CloudProjectMetadata[]>([]);
  const [templates, setTemplates] = useState<CloudTemplateMetadata[]>([]);
  const [publications, setPublications] = useState<Record<string, PublicTemplateMetadata>>({});
  const [templateToPublish, setTemplateToPublish] = useState<CloudTemplateMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Estados de API Keys (SRS-078)
  const [apiKeys, setApiKeys] = useState<UserApiKeyMetadata[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [createdKeyData, setCreatedKeyData] = useState<CreateApiKeyResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<UserApiKeyMetadata | null>(null);
  const [isDeletingKey, setIsDeletingKey] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const [projectToDelete, setProjectToDelete] = useState<CloudProjectMetadata | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<CloudTemplateMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isOpeningId, setIsOpeningId] = useState<string | null>(null);
  const [isExportingId, setIsExportingId] = useState<string | null>(null);
  const [isUsingTemplateId, setIsUsingTemplateId] = useState<string | null>(null);

  const loadApiKeysData = async () => {
    try {
      setIsLoadingKeys(true);
      const keys = await fetchApiKeys();
      setApiKeys(keys);
    } catch (err: any) {
      console.warn("Error cargando API keys:", err);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setActionError(null);
      const [projList, tmplList, pubMap] = await Promise.all([
        fetchCloudProjects(),
        fetchCloudTemplates().catch(() => []),
        fetchMyTemplatePublications().catch(() => ({}))
      ]);
      setProjects(projList);
      setTemplates(tmplList);
      setPublications(pubMap);
    } catch (err: any) {
      setActionError(err.message || "Error al cargar la lista desde la nube.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadData();
      loadApiKeysData();
      setSearchQuery("");
      setProjectToDelete(null);
      setTemplateToDelete(null);
      setKeyToDelete(null);
      setCreatedKeyData(null);
    }
  }, [isOpen, initialTab]);

  const backdropProps = useSafeBackdrop(onClose);

  if (!isOpen) return null;

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleDeleteProjectConfirm = async () => {
    if (!projectToDelete) return;
    try {
      setIsDeleting(true);
      await deleteCloudProject(projectToDelete.id);
      setProjectToDelete(null);
      await loadData();
      onStorageUpdated();
    } catch (err: any) {
      setActionError(err.message || "Error al eliminar el proyecto.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteTemplateConfirm = async () => {
    if (!templateToDelete) return;
    try {
      setIsDeleting(true);
      await deleteCloudTemplate(templateToDelete.id);
      setTemplateToDelete(null);
      await loadData();
      onStorageUpdated();
    } catch (err: any) {
      setActionError(err.message || "Error al eliminar la plantilla.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenProject = async (proj: CloudProjectMetadata) => {
    try {
      setIsOpeningId(proj.id);
      await onOpenProject(proj);
      onClose();
    } catch (err: any) {
      setActionError(err.message || "Error al abrir el proyecto.");
    } finally {
      setIsOpeningId(null);
    }
  };

  const handleExportProject = async (proj: CloudProjectMetadata) => {
    try {
      setIsExportingId(proj.id);
      await onExportProject(proj);
    } catch (err: any) {
      setActionError(err.message || "Error al exportar el proyecto.");
    } finally {
      setIsExportingId(null);
    }
  };

  const handleUseTemplate = async (tmpl: CloudTemplateMetadata) => {
    if (!onUseTemplate) return;
    try {
      setIsUsingTemplateId(tmpl.id);
      await onUseTemplate(tmpl);
      onClose();
    } catch (err: any) {
      setActionError(err.message || "Error al instanciar la plantilla.");
    } finally {
      setIsUsingTemplateId(null);
    }
  };

  const handleExportTemplate = async (tmpl: CloudTemplateMetadata) => {
    if (!onExportTemplate) return;
    try {
      setIsExportingId(tmpl.id);
      await onExportTemplate(tmpl);
    } catch (err: any) {
      setActionError(err.message || "Error al exportar la plantilla.");
    } finally {
      setIsExportingId(null);
    }
  };

  const handlePublishConfirm = async (templateId: string, payload: { publicName: string; publicDescription: string }) => {
    try {
      await publishCloudTemplate(templateId, payload);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Error al publicar la plantilla.");
      throw err;
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      setIsCreatingKey(true);
      setActionError(null);
      const created = await createApiKey(newKeyName.trim());
      setCreatedKeyData(created);
      setNewKeyName("");
      const newMeta: UserApiKeyMetadata = {
        id: created.id,
        userId: "",
        name: created.name,
        prefix: created.prefix,
        createdAt: created.createdAt,
        lastUsedAt: null
      };
      setApiKeys((prev) => [newMeta, ...prev]);
    } catch (err: any) {
      setActionError(err.message || "Error al crear la API Key.");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleDeleteKeyConfirm = async () => {
    if (!keyToDelete) return;
    try {
      setIsDeletingKey(true);
      setActionError(null);
      await deleteApiKey(keyToDelete.id);
      setApiKeys((prev) => prev.filter((k) => k.id !== keyToDelete.id));
      setKeyToDelete(null);
    } catch (err: any) {
      setActionError(err.message || "Error al revocar la API Key.");
    } finally {
      setIsDeletingKey(false);
    }
  };

  const handleCopySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyEndpoint = async (ep: string) => {
    try {
      await navigator.clipboard.writeText(ep);
      setCopiedEndpoint(ep);
      setTimeout(() => setCopiedEndpoint(null), 2000);
    } catch {
      // Fallback
    }
  };

  const percent = storageInfo ? storageInfo.percentUsed : 0;
  const barColor = percent >= 95 ? "#ef4444" : percent >= 80 ? "#f59e0b" : "#38bdf8";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999
      }}
      {...backdropProps}
    >
      <div
        style={{
          backgroundColor: "#1e1e24",
          border: "1px solid #333340",
          borderRadius: "12px",
          padding: "24px 28px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          color: "#e2e8f0",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>☁️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#fff" }}>Almacenamiento en la Nube</h3>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Gestiona tus proyectos y plantillas privadas en tu servidor
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "20px",
              cursor: "pointer",
              padding: "4px 8px"
            }}
          >
            ✕
          </button>
        </div>

        {/* Barra de Cuota de Almacenamiento */}
        {storageInfo && (
          <div
            style={{
              backgroundColor: "#17171d",
              border: "1px solid #2a2a35",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
              <span style={{ color: "#cbd5e1", fontWeight: "500" }}>Almacenamiento en uso</span>
              <span style={{ fontWeight: "600", color: "#fff" }}>
                {storageInfo.usedMb} MB de {storageInfo.quotaMb} MB ({storageInfo.percentUsed}%)
              </span>
            </div>
            <div style={{ height: "6px", backgroundColor: "#2b2b38", borderRadius: "3px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, storageInfo.percentUsed)}%`,
                  backgroundColor: barColor,
                  transition: "width 0.3s ease"
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
              <span>{projects.length} proyectos · {templates.length} plantillas</span>
              <span>{storageInfo.availableMb} MB libres disponibles</span>
            </div>
          </div>
        )}

        {/* Selector de Pestañas (SRS-068) */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px", borderBottom: "1px solid #333340", paddingBottom: "10px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            style={{
              padding: "7px 14px",
              borderRadius: "6px",
              border: activeTab === "projects" ? "1px solid #6366f1" : "1px solid transparent",
              backgroundColor: activeTab === "projects" ? "rgba(99, 102, 241, 0.2)" : "transparent",
              color: activeTab === "projects" ? "#fff" : "#94a3b8",
              fontSize: "13px",
              fontWeight: activeTab === "projects" ? "600" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>📁</span>
            <span>Mis Proyectos ({projects.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            style={{
              padding: "7px 14px",
              borderRadius: "6px",
              border: activeTab === "templates" ? "1px solid #6366f1" : "1px solid transparent",
              backgroundColor: activeTab === "templates" ? "rgba(99, 102, 241, 0.2)" : "transparent",
              color: activeTab === "templates" ? "#fff" : "#94a3b8",
              fontSize: "13px",
              fontWeight: activeTab === "templates" ? "600" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>📐</span>
            <span>Mis Plantillas ({templates.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("api")}
            style={{
              padding: "7px 14px",
              borderRadius: "6px",
              border: activeTab === "api" ? "1px solid #6366f1" : "1px solid transparent",
              backgroundColor: activeTab === "api" ? "rgba(99, 102, 241, 0.2)" : "transparent",
              color: activeTab === "api" ? "#fff" : "#94a3b8",
              fontSize: "13px",
              fontWeight: activeTab === "api" ? "600" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>🔑</span>
            <span>Acceso API ({apiKeys.length})</span>
          </button>
        </div>

        {/* Notificación de error */}
        {actionError && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "6px",
              color: "#f87171",
              fontSize: "13px",
              marginBottom: "14px"
            }}
          >
            {actionError}
          </div>
        )}

        {/* Barra de búsqueda */}
        {activeTab !== "api" && (
          <div style={{ marginBottom: "14px" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "projects" ? "🔍 Buscar proyecto por nombre o descripción..." : "🔍 Buscar plantilla por nombre o descripción..."}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "6px",
                border: "1px solid #3f3f4e",
                backgroundColor: "#141418",
                color: "#fff",
                fontSize: "13px",
                boxSizing: "border-box"
              }}
            />
          </div>
        )}

        {/* Lista de Contenido */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: "220px", maxHeight: "400px" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "14px" }}>
              Cargando elementos desde la nube...
            </div>
          ) : activeTab === "projects" ? (
            /* TAB PROYECTOS */
            filteredProjects.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>📭</span>
                <p style={{ margin: "0 0 6px 0", fontSize: "14px", color: "#cbd5e1" }}>
                  {searchQuery ? "No se encontraron proyectos con ese criterio." : "No tienes proyectos en la nube todavía."}
                </p>
                {!searchQuery && (
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Para guardar una baraja aquí, accede a <strong>Archivo ➜ Guardar Proyecto ➜ Guardar Proyecto en la Nube ☁️</strong>.
                  </span>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredProjects.map((p) => {
                  const sizeMb = (p.fileSizeBytes / (1024 * 1024)).toFixed(2);
                  const isOpening = isOpeningId === p.id;
                  const isExporting = isExportingId === p.id;

                  return (
                    <div
                      key={p.id}
                      style={{
                        backgroundColor: "#17171d",
                        border: "1px solid #2a2a35",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px"
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontWeight: "600", fontSize: "14px", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name}
                          </span>
                        </div>

                        {p.description && (
                          <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.description}
                          </p>
                        )}

                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "11px" }}>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#272733", color: "#cbd5e1" }}>
                            🃏 {p.cardCount} cartas
                          </span>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#272733", color: "#cbd5e1" }}>
                            📄 {p.documentCount} págs
                          </span>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#272733", color: "#38bdf8" }}>
                            💾 {sizeMb} MB
                          </span>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#272733", color: "#94a3b8" }}>
                            📅 {new Date(p.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Acciones Proyecto */}
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenProject(p)}
                          disabled={isOpening || isExporting}
                          title="Cargar proyecto en el editor"
                          style={{
                            padding: "6px 10px",
                            borderRadius: "4px",
                            border: "none",
                            backgroundColor: "#6366f1",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: isOpening ? "wait" : "pointer"
                          }}
                        >
                          {isOpening ? "Cargando..." : "📂 Abrir"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExportProject(p)}
                          disabled={isOpening || isExporting}
                          title="Descargar archivo .cdc2 a mi ordenador"
                          style={{
                            padding: "6px 9px",
                            borderRadius: "4px",
                            border: "1px solid #3f3f4e",
                            backgroundColor: "#2b2b36",
                            color: "#cbd5e1",
                            fontSize: "12px",
                            cursor: isExporting ? "wait" : "pointer"
                          }}
                        >
                          {isExporting ? "⏳" : "⬇️"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setProjectToDelete(p)}
                          disabled={isOpening || isExporting}
                          title="Eliminar de la nube y liberar espacio"
                          style={{
                            padding: "6px 8px",
                            borderRadius: "4px",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === "templates" ? (
            /* TAB PLANTILLAS (SRS-068) */
            filteredTemplates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>📐</span>
                <p style={{ margin: "0 0 6px 0", fontSize: "14px", color: "#cbd5e1" }}>
                  {searchQuery ? "No se encontraron plantillas con ese criterio." : "No tienes plantillas guardadas en la nube todavía."}
                </p>
                {!searchQuery && (
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Para guardar tu diseño como plantilla, accede a <strong>Archivo ➜ Guardar Proyecto ➜ Guardar Plantilla en la Nube 📐☁️</strong>.
                  </span>
                )}
              </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredTemplates.map((t) => {
                  const sizeMb = (t.fileSizeBytes / (1024 * 1024)).toFixed(2);
                  const isUsing = isUsingTemplateId === t.id;
                  const isExporting = isExportingId === t.id;
                  const pub = publications[t.id];

                  return (
                    <div
                      key={t.id}
                      style={{
                        backgroundColor: "#17171d",
                        border: "1px solid #2a2a35",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px"
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontWeight: "600", fontSize: "14px", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.name}
                          </span>
                          {pub && pub.status === "pending" && (
                            <span style={{ padding: "1px 6px", borderRadius: "4px", backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)", fontSize: "11px", fontWeight: "600" }}>
                              ⏳ En revisión
                            </span>
                          )}
                          {pub && pub.status === "approved" && (
                            <span style={{ padding: "1px 6px", borderRadius: "4px", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)", fontSize: "11px", fontWeight: "600" }}>
                              🌐 Publicada
                            </span>
                          )}
                        </div>

                        {t.description && (
                          <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.description}
                          </p>
                        )}

                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "11px" }}>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#272733", color: "#a7f3d0" }}>
                            📐 {t.templateCount} diseños
                          </span>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#272733", color: "#cbd5e1" }}>
                            📄 {t.documentCount} docs
                          </span>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#272733", color: "#94a3b8" }}>
                            🧼 0 cartas
                          </span>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#272733", color: "#38bdf8" }}>
                            💾 {sizeMb} MB
                          </span>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#272733", color: "#94a3b8" }}>
                            📅 {new Date(t.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Acciones Plantilla */}
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setTemplateToPublish(t)}
                          disabled={isUsing || isExporting}
                          title={pub ? "Actualizar plantilla en la tienda comunitaria" : "Publicar plantilla en la tienda comunitaria"}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "4px",
                            border: "1px solid #3f3f4e",
                            backgroundColor: pub ? "#27273a" : "rgba(244, 63, 94, 0.15)",
                            borderColor: pub ? "#4b5563" : "rgba(244, 63, 94, 0.4)",
                            color: pub ? "#cbd5e1" : "#fda4af",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          {pub ? "🔄 Actualizar" : "📢 Publicar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUseTemplate(t)}
                          disabled={isUsing || isExporting}
                          title="Instanciar como nuevo proyecto de cartas limpio"
                          style={{
                            padding: "6px 12px",
                            borderRadius: "4px",
                            border: "none",
                            backgroundColor: "#10b981",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: isUsing ? "wait" : "pointer"
                          }}
                        >
                          {isUsing ? "Creando..." : "✨ Usar Plantilla"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExportTemplate(t)}
                          disabled={isUsing || isExporting}
                          title="Descargar archivo de plantilla (.cdc2) a mi ordenador"
                          style={{
                            padding: "6px 9px",
                            borderRadius: "4px",
                            border: "1px solid #3f3f4e",
                            backgroundColor: "#2b2b36",
                            color: "#cbd5e1",
                            fontSize: "12px",
                            cursor: isExporting ? "wait" : "pointer"
                          }}
                        >
                          {isExporting ? "⏳" : "⬇️"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setTemplateToDelete(t)}
                          disabled={isUsing || isExporting}
                          title="Eliminar plantilla de la nube y liberar espacio"
                          style={{
                            padding: "6px 8px",
                            borderRadius: "4px",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* TAB ACCESO API (SRS-078) */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Encabezado y Explicación */}
              <div
                style={{
                  backgroundColor: "#17171d",
                  border: "1px solid #2a2a35",
                  borderRadius: "8px",
                  padding: "14px 16px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "18px" }}>🤖</span>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#fff" }}>
                    Conexión para Agentes de IA y Automatización
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", lineHeight: "1.5" }}>
                  Genera claves de acceso API (tokens <code style={{ backgroundColor: "#20202a", padding: "1px 5px", borderRadius: "4px", color: "#a5b4fc" }}>cdc2_live_...</code>) para que agentes como Claude, Cursor o scripts externos puedan crear cartas y proyectos en tu cuenta.
                </p>
              </div>

              {/* Formulario de creación de clave */}
              <form
                onSubmit={handleCreateApiKey}
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center"
                }}
              >
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Nombre de la clave (ej. Agente Cursor, Bot Discord)..."
                  disabled={isCreatingKey}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid #3f3f4e",
                    backgroundColor: "#141418",
                    color: "#fff",
                    fontSize: "13px"
                  }}
                />
                <button
                  type="submit"
                  disabled={isCreatingKey || !newKeyName.trim()}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#6366f1",
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: (isCreatingKey || !newKeyName.trim()) ? "not-allowed" : "pointer",
                    opacity: (isCreatingKey || !newKeyName.trim()) ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap"
                  }}
                >
                  <span>{isCreatingKey ? "⏳" : "🔑"}</span>
                  <span>{isCreatingKey ? "Generando..." : "Crear API Key"}</span>
                </button>
              </form>

              {/* Banner de clave recién creada con secreto de un solo uso */}
              {createdKeyData && (
                <div
                  style={{
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    borderRadius: "8px",
                    padding: "14px 16px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fbbf24", fontWeight: "600", fontSize: "13px" }}>
                      <span>⚠️</span>
                      <span>API Key creada: "{createdKeyData.name}"</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreatedKeyData(null)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        fontSize: "14px",
                        padding: "2px 6px"
                      }}
                      title="Cerrar aviso"
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#fef3c7", lineHeight: "1.4" }}>
                    Copia tu token ahora. Por tu seguridad, <strong>no volverá a mostrarse en texto plano</strong>.
                  </p>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="text"
                      readOnly
                      value={createdKeyData.apiKey}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        backgroundColor: "#0d0d12",
                        border: "1px solid #3b3b4f",
                        borderRadius: "6px",
                        color: "#34d399",
                        fontFamily: "monospace",
                        fontSize: "13px"
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      type="button"
                      onClick={() => handleCopySecret(createdKeyData.apiKey)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "6px",
                        border: "1px solid #10b981",
                        backgroundColor: copiedKey ? "#10b981" : "rgba(16, 185, 129, 0.15)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <span>{copiedKey ? "✓" : "📋"}</span>
                      <span>{copiedKey ? "¡Copiada!" : "Copiar"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de claves */}
              <div>
                <h5 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "600", color: "#cbd5e1" }}>
                  Tus Claves Activas ({apiKeys.length})
                </h5>
                {isLoadingKeys ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    Cargando API Keys...
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div
                    style={{
                      padding: "24px",
                      textAlign: "center",
                      backgroundColor: "#17171d",
                      borderRadius: "8px",
                      border: "1px dashed #2a2a35",
                      color: "#94a3b8",
                      fontSize: "13px"
                    }}
                  >
                    No tienes ninguna API Key activa. Escribe un nombre arriba y pulsa "Crear API Key".
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        style={{
                          backgroundColor: "#191920",
                          border: "1px solid #2a2a35",
                          borderRadius: "8px",
                          padding: "12px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px"
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "14px" }}>🔑</span>
                            <span style={{ fontWeight: "600", color: "#fff", fontSize: "13px" }}>{key.name}</span>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "11px",
                                backgroundColor: "#20202a",
                                color: "#a5b4fc",
                                padding: "2px 6px",
                                borderRadius: "4px"
                              }}
                            >
                              {key.prefix}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", display: "flex", gap: "12px" }}>
                            <span>Creada: {new Date(key.createdAt).toLocaleDateString()}</span>
                            <span>
                              Último uso: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Nunca"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setKeyToDelete(key)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            color: "#f87171",
                            fontSize: "12px",
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          Revocar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rutas y endpoints principales */}
              <div
                style={{
                  backgroundColor: "#15151c",
                  border: "1px solid #2a2a38",
                  borderRadius: "8px",
                  padding: "14px 16px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px" }}>📡</span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>Rutas y Endpoints Clave del API</span>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      backgroundColor: "rgba(99, 102, 241, 0.15)",
                      color: "#a5b4fc",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      border: "1px solid rgba(99, 102, 241, 0.3)"
                    }}
                  >
                    Cabecera: X-API-Key: cdc2_live_...
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", marginBottom: "12px" }}>
                  {[
                    { method: "GET", path: "/api/v1/templates/:id/schema", desc: "Descubrimiento de campos y diseños de plantilla" },
                    { method: "POST", path: "/api/v1/cards/render", desc: "Renderizado directo a PNG (Headless)" },
                    { method: "POST", path: "/api/v1/projects", desc: "Crear proyecto en la nube desde plantilla" },
                    { method: "POST", path: "/api/v1/projects/:id/cards", desc: "Añadir cartas a proyecto con overrides y Base64" },
                    { method: "GET", path: "/api/v1/projects/:id/cards/:cardId/preview", desc: "Previsualizar carta en PNG" }
                  ].map((ep) => (
                    <div
                      key={ep.path}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        backgroundColor: "#1c1c24",
                        borderRadius: "6px",
                        gap: "8px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: "700",
                            fontSize: "10px",
                            padding: "2px 5px",
                            borderRadius: "3px",
                            backgroundColor: ep.method === "GET" ? "rgba(34, 197, 94, 0.2)" : "rgba(59, 130, 246, 0.2)",
                            color: ep.method === "GET" ? "#4ade80" : "#60a5fa"
                          }}
                        >
                          {ep.method}
                        </span>
                        <code style={{ color: "#f8fafc", fontFamily: "monospace", fontSize: "11px" }}>{ep.path}</code>
                        <span style={{ color: "#64748b", fontSize: "11px" }}>- {ep.desc}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyEndpoint(ep.path)}
                        style={{
                          background: "none",
                          border: "1px solid #333342",
                          borderRadius: "4px",
                          color: copiedEndpoint === ep.path ? "#34d399" : "#94a3b8",
                          fontSize: "11px",
                          padding: "2px 6px",
                          cursor: "pointer"
                        }}
                      >
                        {copiedEndpoint === ep.path ? "✓" : "Copiar"}
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.history.pushState({}, "", "/developers");
                    window.dispatchEvent(new Event("popstate"));
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    backgroundColor: "rgba(99, 102, 241, 0.15)",
                    color: "#c7d2fe",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  📖 Ver Guía Completa de la API, Ejemplos cURL / Python & Límites (/developers)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal de confirmación de eliminación de Proyecto */}
        {projectToDelete && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.8)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 10
            }}
          >
            <div
              style={{
                backgroundColor: "#1e1e24",
                border: "1px solid #ef4444",
                borderRadius: "10px",
                padding: "20px",
                maxWidth: "380px",
                textAlign: "center"
              }}
            >
              <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>🗑️</span>
              <h4 style={{ margin: "0 0 8px 0", color: "#ef4444", fontSize: "16px" }}>¿Eliminar Proyecto de la Nube?</h4>
              <p style={{ fontSize: "13px", color: "#cbd5e1", margin: "0 0 16px 0", lineHeight: "1.4" }}>
                ¿Estás seguro de eliminar <strong>"{projectToDelete.name}"</strong>? Se liberarán {(projectToDelete.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB de tu cuota de almacenamiento.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setProjectToDelete(null)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    border: "1px solid #3f3f4e",
                    backgroundColor: "transparent",
                    color: "#cbd5e1",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteProjectConfirm}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: "12px",
                    cursor: isDeleting ? "wait" : "pointer"
                  }}
                >
                  {isDeleting ? "Eliminando..." : "Sí, Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación de Plantilla (SRS-068) */}
        {templateToDelete && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.8)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 10
            }}
          >
            <div
              style={{
                backgroundColor: "#1e1e24",
                border: "1px solid #ef4444",
                borderRadius: "10px",
                padding: "20px",
                maxWidth: "380px",
                textAlign: "center"
              }}
            >
              <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>🗑️</span>
              <h4 style={{ margin: "0 0 8px 0", color: "#ef4444", fontSize: "16px" }}>¿Eliminar Plantilla de la Nube?</h4>
              <p style={{ fontSize: "13px", color: "#cbd5e1", margin: "0 0 16px 0", lineHeight: "1.4" }}>
                ¿Estás seguro de eliminar <strong>"{templateToDelete.name}"</strong>? Se liberarán {(templateToDelete.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB de tu cuota de almacenamiento.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setTemplateToDelete(null)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    border: "1px solid #3f3f4e",
                    backgroundColor: "transparent",
                    color: "#cbd5e1",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteTemplateConfirm}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: "12px",
                    cursor: isDeleting ? "wait" : "pointer"
                  }}
                >
                  {isDeleting ? "Eliminando..." : "Sí, Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para eliminar API Key (SRS-078) */}
        {keyToDelete && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.8)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 10
            }}
          >
            <div
              style={{
                backgroundColor: "#1e1e24",
                border: "1px solid #ef4444",
                borderRadius: "10px",
                padding: "20px",
                maxWidth: "380px",
                textAlign: "center"
              }}
            >
              <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>🔑</span>
              <h4 style={{ margin: "0 0 8px 0", color: "#ef4444", fontSize: "16px" }}>¿Revocar API Key?</h4>
              <p style={{ fontSize: "13px", color: "#cbd5e1", margin: "0 0 16px 0", lineHeight: "1.4" }}>
                ¿Estás seguro de revocar la clave <strong>"{keyToDelete.name}"</strong> ({keyToDelete.prefix})? Cualquier agente o script que la utilice dejará de tener acceso inmediatamente.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  type="button"
                  disabled={isDeletingKey}
                  onClick={() => setKeyToDelete(null)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    border: "1px solid #3f3f4e",
                    backgroundColor: "transparent",
                    color: "#cbd5e1",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeletingKey}
                  onClick={handleDeleteKeyConfirm}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: "12px",
                    cursor: isDeletingKey ? "wait" : "pointer"
                  }}
                >
                  {isDeletingKey ? "Revocando..." : "Sí, Revocar Clave"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Publicar / Actualizar Plantilla en la Tienda (SRS-075) */}
        <PublishTemplateModal
          isOpen={Boolean(templateToPublish)}
          onClose={() => setTemplateToPublish(null)}
          template={templateToPublish}
          existingPublication={templateToPublish ? publications[templateToPublish.id] : undefined}
          authorUsername={authorUsername}
          onPublish={handlePublishConfirm}
        />
      </div>
    </div>
  );
};

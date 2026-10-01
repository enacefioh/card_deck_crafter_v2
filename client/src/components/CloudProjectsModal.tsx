import React, { useState, useEffect } from "react";
import type { CloudProjectMetadata, UserStorageInfo } from "shared";
import { fetchCloudProjects, deleteCloudProject } from "../services/storageService";

interface CloudProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageInfo: UserStorageInfo | null;
  onOpenProject: (project: CloudProjectMetadata) => Promise<void>;
  onExportProject: (project: CloudProjectMetadata) => Promise<void>;
  onStorageUpdated: () => void;
}

export const CloudProjectsModal: React.FC<CloudProjectsModalProps> = ({
  isOpen,
  onClose,
  storageInfo,
  onOpenProject,
  onExportProject,
  onStorageUpdated
}) => {
  const [projects, setProjects] = useState<CloudProjectMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<CloudProjectMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpeningId, setIsOpeningId] = useState<string | null>(null);
  const [isExportingId, setIsExportingId] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setActionError(null);
      const list = await fetchCloudProjects();
      setProjects(list);
    } catch (err: any) {
      setActionError(err.message || "Error al cargar la lista de proyectos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      setSearchQuery("");
      setProjectToDelete(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    try {
      setIsDeleting(true);
      await deleteCloudProject(projectToDelete.id);
      setProjectToDelete(null);
      await loadProjects();
      onStorageUpdated();
    } catch (err: any) {
      setActionError(err.message || "Error al eliminar el proyecto.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpen = async (proj: CloudProjectMetadata) => {
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

  const handleExport = async (proj: CloudProjectMetadata) => {
    try {
      setIsExportingId(proj.id);
      await onExportProject(proj);
    } catch (err: any) {
      setActionError(err.message || "Error al exportar el proyecto.");
    } finally {
      setIsExportingId(null);
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
      onClick={onClose}
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
          color: "#e2e8f0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>☁️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#fff" }}>Mis Proyectos en la Nube</h3>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Gestiona tus barajas almacenadas en tu cuenta privada
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
              <span>{projects.length} {projects.length === 1 ? "proyecto guardado" : "proyectos guardados"}</span>
              <span>{storageInfo.availableMb} MB libres disponibles</span>
            </div>
          </div>
        )}

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
        <div style={{ marginBottom: "14px" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Buscar por nombre o descripción..."
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

        {/* Lista de Proyectos */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: "220px", maxHeight: "400px" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "14px" }}>
              Cargando proyectos desde la nube...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
              <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>📭</span>
              <p style={{ margin: "0 0 6px 0", fontSize: "14px", color: "#cbd5e1" }}>
                {searchQuery ? "No se encontraron proyectos con ese criterio." : "No tienes proyectos en la nube todavía."}
              </p>
              {!searchQuery && (
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Para guardar una baraja aquí, accede a <strong>Archivo ➜ Guardar Proyecto ➜ Guardar en la Nube ☁️</strong>.
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

                    {/* Acciones */}
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleOpen(p)}
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
                        onClick={() => handleExport(p)}
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
          )}
        </div>

        {/* Modal de confirmación de eliminación */}
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
                  onClick={handleDeleteConfirm}
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
      </div>
    </div>
  );
};

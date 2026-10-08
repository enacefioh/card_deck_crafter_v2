import React, { useState, useEffect } from "react";
import type { CloudTemplateMetadata, PublicTemplateMetadata } from "shared";
import { useSafeBackdrop } from "../utils/modalUtils";

interface PublishTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: CloudTemplateMetadata | null;
  existingPublication?: PublicTemplateMetadata | null;
  authorUsername?: string;
  onPublish: (templateId: string, payload: { publicName: string; publicDescription: string }) => Promise<void>;
}

export const PublishTemplateModal: React.FC<PublishTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
  existingPublication,
  authorUsername,
  onPublish
}) => {
  const [publicName, setPublicName] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && template) {
      setPublicName(existingPublication?.name || template.name || "");
      setPublicDescription(existingPublication?.description || template.description || "");
      setErrorMessage(null);
    }
  }, [isOpen, template, existingPublication]);

  const backdropProps = useSafeBackdrop(onClose);

  if (!isOpen || !template) return null;

  const isUpdating = Boolean(existingPublication);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicName.trim()) {
      setErrorMessage("El título público de la plantilla es obligatorio.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onPublish(template.id, {
        publicName: publicName.trim(),
        publicDescription: publicDescription.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar la publicación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      {...backdropProps}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "20px"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#18181b",
          border: "1px solid #27272a",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "540px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#202024"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>{isUpdating ? "🔄" : "📢"}</span>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#f43f5e", fontWeight: "700" }}>
              {isUpdating ? "Actualizar Plantilla en la Tienda Pública" : "Publicar Plantilla en la Tienda Pública"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: "none",
              border: "none",
              color: "#a1a1aa",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {errorMessage && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid #ef4444",
                borderRadius: "6px",
                padding: "10px 12px",
                color: "#fca5a5",
                fontSize: "13px"
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          <div
            style={{
              backgroundColor: "#27272a",
              padding: "10px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#d4d4d8",
              lineHeight: "1.4"
            }}
          >
            ℹ️ Tu plantilla se enviará al repositorio público en estado <strong>Pendiente de Aprobación</strong>. Un administrador la revisará antes de que aparezca visible para todos los creadores en la tienda comunitaria.
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#a1a1aa", marginBottom: "6px" }}>
              Título Público de la Plantilla <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={publicName}
              onChange={(e) => setPublicName(e.target.value)}
              placeholder="Ej. Baraja de Fantasía Medieval - Marco Completo"
              required
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "8px 12px",
                backgroundColor: "#09090b",
                border: "1px solid #3f3f46",
                borderRadius: "6px",
                color: "#f4f4f5",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#a1a1aa", marginBottom: "6px" }}>
              Descripción Pública Extendida
            </label>
            <textarea
              value={publicDescription}
              onChange={(e) => setPublicDescription(e.target.value)}
              rows={4}
              placeholder="Explica qué contiene la plantilla, cómo usarla, las dimensiones recomendadas, consejos de impresión o cualquier nota de autor..."
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "8px 12px",
                backgroundColor: "#09090b",
                border: "1px solid #3f3f46",
                borderRadius: "6px",
                color: "#f4f4f5",
                fontSize: "13px",
                resize: "vertical",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#a1a1aa" }}>
            <div>
              <span style={{ display: "block", color: "#71717a" }}>Autor Visible:</span>
              <strong style={{ color: "#38bdf8" }}>@{authorUsername || "usuario"}</strong>
            </div>
            <div>
              <span style={{ display: "block", color: "#71717a" }}>Diseños de Carta:</span>
              <strong style={{ color: "#e4e4e7" }}>{template.templateCount}</strong>
            </div>
            <div>
              <span style={{ display: "block", color: "#71717a" }}>Documentos:</span>
              <strong style={{ color: "#e4e4e7" }}>{template.documentCount}</strong>
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #3f3f46",
                backgroundColor: "#27272a",
                color: "#e4e4e7",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !publicName.trim()}
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: isUpdating ? "#6366f1" : "#f43f5e",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "600",
                cursor: isSubmitting ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {isSubmitting ? "Procesando..." : isUpdating ? "🔄 Actualizar y Enviar a Revisión" : "🚀 Enviar a Revisión Pública"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

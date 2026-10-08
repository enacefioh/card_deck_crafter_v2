// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PublishTemplateModal } from "./components/PublishTemplateModal";
import type { CloudTemplateMetadata, PublicTemplateMetadata } from "shared";

describe("SRS-075 - Publicación de Plantillas y Almacenamiento Público", () => {
  afterEach(() => {
    cleanup();
  });
  const dummyTemplate: CloudTemplateMetadata = {
    id: "tmpl-123",
    userId: "user-1",
    filename: "cyberpunk_deck.cdc2t",
    name: "Cyberpunk Deck",
    description: "Plantilla básica cyberpunk para cartas",
    documentCount: 1,
    templateCount: 2,
    fileSizeBytes: 1024 * 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  it("debe renderizar PublishTemplateModal prellenando el título y la descripción existentes", () => {
    const handleClose = vi.fn();
    const handlePublish = vi.fn();

    render(
      <PublishTemplateModal
        isOpen={true}
        template={dummyTemplate}
        authorUsername="cyber_designer"
        onClose={handleClose}
        onPublish={handlePublish}
      />
    );

    expect(screen.getByDisplayValue("Cyberpunk Deck")).toBeDefined();
    expect(screen.getByDisplayValue("Plantilla básica cyberpunk para cartas")).toBeDefined();
    expect(screen.getByText("@cyber_designer")).toBeDefined();
    expect(screen.getByText("🚀 Enviar a Revisión Pública")).toBeDefined();
  });

  it("debe permitir editar el título y la descripción y enviar el payload modificado", () => {
    const handleClose = vi.fn();
    const handlePublish = vi.fn();

    render(
      <PublishTemplateModal
        isOpen={true}
        template={dummyTemplate}
        authorUsername="cyber_designer"
        onClose={handleClose}
        onPublish={handlePublish}
      />
    );

    const titleInput = screen.getByDisplayValue("Cyberpunk Deck");
    const descInput = screen.getByDisplayValue("Plantilla básica cyberpunk para cartas");

    fireEvent.change(titleInput, { target: { value: "Cyberpunk Pro Deck v2" } });
    fireEvent.change(descInput, { target: { value: "Edición comunitaria extendida con más capas" } });

    const submitBtn = screen.getByText("🚀 Enviar a Revisión Pública");
    fireEvent.click(submitBtn);

    expect(handlePublish).toHaveBeenCalledWith("tmpl-123", {
      publicName: "Cyberpunk Pro Deck v2",
      publicDescription: "Edición comunitaria extendida con más capas"
    });
  });

  it("debe mostrar 'Actualizar y Enviar a Revisión' cuando ya existe publicación previa", () => {
    const handleClose = vi.fn();
    const handlePublish = vi.fn();

    const existingPub: PublicTemplateMetadata = {
      id: "pub-1",
      originalTemplateId: "tmpl-123",
      authorId: "user-1",
      authorName: "cyber_designer",
      name: "Cyberpunk Deck Aprobada",
      description: "Descripción previa",
      filename: "pub_tmpl-123.cdc2t",
      status: "approved",
      documentCount: 1,
      templateCount: 2,
      fileSizeBytes: 50000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    render(
      <PublishTemplateModal
        isOpen={true}
        template={dummyTemplate}
        existingPublication={existingPub}
        authorUsername="cyber_designer"
        onClose={handleClose}
        onPublish={handlePublish}
      />
    );

    expect(screen.getByDisplayValue("Cyberpunk Deck Aprobada")).toBeDefined();
    expect(screen.getByDisplayValue("Descripción previa")).toBeDefined();
    expect(screen.getByText("🔄 Actualizar y Enviar a Revisión")).toBeDefined();
  });
});

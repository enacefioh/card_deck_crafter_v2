// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StoreTemplateDetail } from "./store/StoreTemplateDetail";
import type { StoreTemplateDetail as StoreTemplateDetailType } from "shared";

describe("SRS-077: Panel de Integración con Agentes de IA en Tienda", () => {
  afterEach(() => {
    cleanup();
  });

  const mockTemplate: StoreTemplateDetailType = {
    id: "pub_tmpl_777",
    originalTemplateId: "orig_tmpl_777",
    authorId: "user_tactico",
    name: "Baraja Táctica",
    description: "Una plantilla versátil para juegos tácticos de cartas.",
    authorName: "MaestroTáctico",
    documentCount: 1,
    templateCount: 2,
    fileSizeBytes: 2048500,
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-05T12:00:00Z",
    downloadUrl: "/api/store/templates/pub_tmpl_777/download",
    previewCards: [
      {
        id: "design_soldier",
        nombre: "Soldado de Infantería",
        anchoMm: 63.5,
        altoMm: 88.9,
        miniatura: "data:image/svg+xml;utf8,<svg>soldier</svg>"
      }
    ]
  };

  it("debe renderizar el panel de integración con badges y endpoints de la plantilla", () => {
    render(
      <StoreTemplateDetail
        template={mockTemplate}
        onBack={vi.fn()}
        onOpenInEditor={vi.fn()}
        onPreviewCard={vi.fn()}
      />
    );

    const section = screen.getByTestId("api-integration-section");
    expect(section).toBeDefined();

    expect(screen.getByText("Integración con Agentes de IA / API REST")).toBeDefined();
    expect(screen.getByText("API v1")).toBeDefined();

    // Comprobar pestañas
    expect(screen.getByTestId("tab-schema")).toBeDefined();
    expect(screen.getByTestId("tab-render")).toBeDefined();

    // Por defecto, la pestaña de esquema está activa
    expect(screen.getByTestId("schema-panel")).toBeDefined();
    expect(screen.getAllByText(/api\/v1\/templates\/pub_tmpl_777\/schema/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("copy-schema-url-btn")).toBeDefined();
    expect(screen.getByTestId("copy-schema-curl-btn")).toBeDefined();
  });

  it("debe alternar a la pestaña de renderizado POST y mostrar payload JSON con diseño de carta", () => {
    render(
      <StoreTemplateDetail
        template={mockTemplate}
        onBack={vi.fn()}
        onOpenInEditor={vi.fn()}
        onPreviewCard={vi.fn()}
      />
    );

    // Hacer clic en la pestaña de renderizado
    fireEvent.click(screen.getByTestId("tab-render"));

    expect(screen.getByTestId("render-panel")).toBeDefined();
    expect(screen.getAllByText(/api\/v1\/cards\/render/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("copy-render-url-btn")).toBeDefined();
    expect(screen.getByTestId("copy-render-curl-btn")).toBeDefined();

    // Debe contener el id del diseño de carta en el comando
    expect(screen.getByText(/design_soldier/)).toBeDefined();
  });

  it("debe actualizar el texto del botón al copiar al portapapeles", () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock
      },
      configurable: true,
      writable: true
    });

    render(
      <StoreTemplateDetail
        template={mockTemplate}
        onBack={vi.fn()}
        onOpenInEditor={vi.fn()}
        onPreviewCard={vi.fn()}
      />
    );

    const copyBtn = screen.getByTestId("copy-schema-url-btn");
    expect(copyBtn.textContent).toContain("Copiar URL");

    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/templates/pub_tmpl_777/schema")
    );
    expect(copyBtn.textContent).toContain("¡Copiado!");
  });
});

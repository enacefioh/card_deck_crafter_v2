// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DeveloperDocs } from "./docs/DeveloperDocs";
import { AGENT_SKILL_MARKDOWN } from "shared";

describe("SRS-081: DeveloperDocs & Agent Skill UI Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("debe renderizar la sección de Integración con Agentes de IA y botones de descarga y copia", () => {
    render(<DeveloperDocs />);

    // Verificar título del Skill
    expect(
      screen.getByText(/Integración con Agentes de Inteligencia Artificial/i)
    ).toBeDefined();

    // Botones de acción
    const downloadBtn = screen.getByRole("button", { name: /Descargar SKILL\.md/i });
    expect(downloadBtn).toBeDefined();

    const copyBtn = screen.getByRole("button", { name: /Copiar Skill al Portapapeles/i });
    expect(copyBtn).toBeDefined();
  });

  it("debe copiar el skill al portapapeles al pulsar el botón de copia", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock
      },
      configurable: true
    });

    render(<DeveloperDocs />);

    const copyBtn = screen.getByRole("button", { name: /Copiar Skill al Portapapeles/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(AGENT_SKILL_MARKDOWN);
    expect(screen.getByText(/¡Skill Copiado!/i)).toBeDefined();
  });

  it("debe incluir documentación sobre modoTraseras, backCardTemplateId, exposedFields y fullStructure", () => {
    render(<DeveloperDocs />);

    // Texto descriptivo de modoTraseras y plantillas traseras
    expect(screen.getAllByText(/modoTraseras/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/backCardTemplateId/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/exposedFields/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/fullStructure/i).length).toBeGreaterThan(0);
    expect(AGENT_SKILL_MARKDOWN).toContain("https://cdc2.enacefio.com");
  });
});

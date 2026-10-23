// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DeveloperDocs } from "./docs/DeveloperDocs";

describe("SRS-087: Documentación de Servidor MCP en DeveloperDocs", () => {
  afterEach(() => {
    cleanup();
  });

  it("RF-6: debe renderizar la sección de Model Context Protocol (MCP) y sus 10 herramientas nativas", () => {
    render(<DeveloperDocs onBackToStore={vi.fn()} onBackToEditor={vi.fn()} />);

    // Verificar título principal
    expect(screen.getByText(/Model Context Protocol \(MCP\) - Conexión Nativa para IA/i)).toBeDefined();

    // Verificar herramientas principales en el catálogo
    expect(screen.getByText("cdc2_list_projects")).toBeDefined();
    expect(screen.getByText("cdc2_get_project")).toBeDefined();
    expect(screen.getByText("cdc2_create_project")).toBeDefined();
    expect(screen.getByText("cdc2_list_documents")).toBeDefined();
    expect(screen.getByText("cdc2_create_document")).toBeDefined();
    expect(screen.getByText("cdc2_get_template_schema")).toBeDefined();
    expect(screen.getByText("cdc2_add_cards")).toBeDefined();
    expect(screen.getByText("cdc2_update_card")).toBeDefined();
    expect(screen.getByText("cdc2_delete_card")).toBeDefined();
    expect(screen.getByText("cdc2_render_card_preview")).toBeDefined();
  });

  it("RF-6: debe permitir alternar entre las pestañas de configuración MCP y autocompletar la API Key", () => {
    render(<DeveloperDocs onBackToStore={vi.fn()} onBackToEditor={vi.fn()} />);

    // Por defecto pestaña Antigravity (Streamable HTTP)
    expect(screen.getByText(/\/api\/mcp\?apiKey=cdc2_live_TU_API_KEY_AQUI/i)).toBeDefined();

    // Escribir una API Key en el input
    const input = screen.getByLabelText(/Tu API Key de CDC2/i);
    fireEvent.change(input, { target: { value: "cdc2_live_secret_token_123" } });

    // Comprobar que el bloque JSON se actualiza en tiempo real
    expect(screen.getByText(/\/api\/mcp\?apiKey=cdc2_live_secret_token_123/i)).toBeDefined();

    // Cambiar a pestaña Cursor
    const cursorBtn = screen.getByRole("button", { name: /Cursor/i });
    fireEvent.click(cursorBtn);

    expect(screen.getByText(/\/api\/mcp\/sse\?apiKey=cdc2_live_secret_token_123/i)).toBeDefined();

    // Cambiar a pestaña SSE Remoto
    const remoteBtn = screen.getByRole("button", { name: /SSE Remoto/i });
    fireEvent.click(remoteBtn);

    expect(screen.getByText(/Bearer cdc2_live_secret_token_123/i)).toBeDefined();

    // Cambiar a pestaña Claude Desktop
    const claudeBtn = screen.getByRole("button", { name: /Claude Desktop/i });
    fireEvent.click(claudeBtn);

    expect(screen.getByText(/\/api\/mcp\/sse\?apiKey=cdc2_live_secret_token_123/i)).toBeDefined();
  });

  it("RF-6: botón de copiar configuración MCP copia al portapapeles y da feedback", () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });

    render(<DeveloperDocs onBackToStore={vi.fn()} onBackToEditor={vi.fn()} />);

    const copyBtn = screen.getByRole("button", { name: /Copiar Configuración MCP/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    expect(screen.getByText(/¡Configuración Copiada!/i)).toBeDefined();
  });
});

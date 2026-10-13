// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DeveloperDocs } from "./docs/DeveloperDocs";

describe("SRS-079: Documentación para Desarrolladores y Agentes IA en /developers", () => {
  afterEach(() => {
    cleanup();
  });

  it("RF-8: debe renderizar la sección de Gestión de Proyectos en la Nube y Mazos con IA", () => {
    render(<DeveloperDocs onBackToStore={vi.fn()} onBackToEditor={vi.fn()} />);

    // Verificar título principal de la sección
    expect(screen.getByText(/Gestión de Proyectos en la Nube y Mazos con IA/i)).toBeDefined();

    // Verificar explicación de autenticación por API Key
    expect(screen.getByRole("heading", { name: /Autenticación con API Key/i })).toBeDefined();
    expect(screen.getAllByText(/X-API-Key: cdc2_live_TU_API_KEY_AQUI/i).length).toBeGreaterThanOrEqual(1);

    // Verificar tabla de endpoints de proyectos
    expect(screen.getAllByText(/\/api\/v1\/projects/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\/api\/v1\/projects\/:id\/documents/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\/api\/v1\/projects\/:id\/cards/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\/api\/v1\/projects\/:id\/cards\/:cardId\/preview/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\/api\/v1\/projects\/:id\/download/i).length).toBeGreaterThanOrEqual(1);
  });

  it("RF-8: debe alternar entre los ejemplos de cURL, Python y Node.js para proyectos", () => {
    render(<DeveloperDocs onBackToStore={vi.fn()} onBackToEditor={vi.fn()} />);

    // Por defecto se muestra cURL en la sección de proyectos
    expect(screen.getByText(/curl -X POST.*\/api\/v1\/projects/s)).toBeDefined();

    // Cambiar a Python
    const pythonBtn = screen.getByRole("button", { name: /Python \(Proyectos\)/i });
    fireEvent.click(pythonBtn);

    expect(screen.getByText(/import requests/i)).toBeDefined();
    expect(screen.getByText(/resp_proj = requests\.post/i)).toBeDefined();

    // Cambiar a Node.js
    const nodeBtn = screen.getByRole("button", { name: /Node\.js \(Proyectos\)/i });
    fireEvent.click(nodeBtn);

    expect(screen.getByText(/const projRes = await fetch/i)).toBeDefined();
    expect(screen.getByText(/const docRes = await fetch/i)).toBeDefined();
  });

  it("RF-8: debe listar el código de estado 413 QUOTA_EXCEEDED en la tabla de errores", () => {
    render(<DeveloperDocs />);

    expect(screen.getByText(/413 Payload Too Large \/ QUOTA_EXCEEDED/i)).toBeDefined();
    expect(screen.getByText(/401 Unauthorized/i)).toBeDefined();
  });
});

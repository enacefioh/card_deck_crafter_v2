// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DeveloperDocs } from "./docs/DeveloperDocs";

describe("DeveloperDocs: Documentación de la API para Desarrolladores y Agentes de IA", () => {
  afterEach(() => {
    cleanup();
  });

  it("debe renderizar el título, badges de API y descripción general", () => {
    render(<DeveloperDocs />);

    expect(screen.getByText(/Documentación API REST para Desarrolladores & IA/)).toBeDefined();
    expect(screen.getByText(/Generación Programática de Cartas con Agentes de Inteligencia Artificial/)).toBeDefined();
    expect(screen.getByText(/Límite de Payload JSON: 50 MB/)).toBeDefined();
    expect(screen.getAllByText(/300 DPI/).length).toBeGreaterThan(0);
  });

  it("debe documentar los endpoints GET schema y POST render", () => {
    render(<DeveloperDocs />);

    expect(screen.getByText("/api/v1/templates/:id/schema")).toBeDefined();
    expect(screen.getByText("/api/v1/cards/render")).toBeDefined();
    expect(screen.getByText(/Envío de Ilustraciones e Imágenes en Base64/)).toBeDefined();
  });

  it("debe permitir alternar entre ejemplos cURL, Python y Node.js", () => {
    render(<DeveloperDocs />);

    // Por defecto está activo cURL
    expect(screen.getByText(/curl -X GET/)).toBeDefined();

    // Cambiar a Python
    fireEvent.click(screen.getByRole("button", { name: "Python" }));
    expect(screen.getByText(/import requests/)).toBeDefined();

    // Cambiar a Node.js
    fireEvent.click(screen.getByRole("button", { name: "Node.js (Fetch)" }));
    expect(screen.getByText(/import fs from "fs"/)).toBeDefined();
  });

  it("debe disparar los callbacks de navegación de retorno", () => {
    const backStoreMock = vi.fn();
    const backEditorMock = vi.fn();

    render(
      <DeveloperDocs
        onBackToStore={backStoreMock}
        onBackToEditor={backEditorMock}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Tienda Comunitaria/ }));
    expect(backStoreMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Ir al Editor/ }));
    expect(backEditorMock).toHaveBeenCalledTimes(1);
  });
});

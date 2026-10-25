// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "./App";

describe("SRS-088: Historial de Deshacer y Rehacer (Undo / Redo) en el Lienzo", () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    // Mock fetch para evitar fallos de analytics o sesión
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/auth/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ initialized: true, usersCount: 1 })
        });
      }
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: "test", email: "test@example.com", role: "admin" } })
        });
      }
      if (url.includes("/api/config")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ gaMeasurementId: null })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  it("renderiza los botones de deshacer (↺) y rehacer (↻) deshabilitados por defecto en el lienzo", async () => {
    render(<App />);

    const btnUndo = await screen.findByTitle("Deshacer (Ctrl+Z)");
    const btnRedo = await screen.findByTitle("Rehacer (Ctrl+Y)");

    expect(btnUndo).toBeDefined();
    expect(btnRedo).toBeDefined();
    expect(btnUndo.hasAttribute("disabled")).toBe(true);
    expect(btnRedo.hasAttribute("disabled")).toBe(true);
  });

  it("habilita el botón de deshacer tras duplicar una carta y permite revertir la acción", async () => {
    render(<App />);

    // Localizar input de importación de imágenes
    const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const dummyFile = new File(["dummy content"], "carta1.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    // Esperar a que la carta se añada
    await waitFor(() => {
      expect(screen.queryByTitle("Duplicar cartas seleccionadas")).not.toBeNull();
    });

    const btnUndo = screen.getByTitle("Deshacer (Ctrl+Z)");
    const btnRedo = screen.getByTitle("Rehacer (Ctrl+Y)");
    expect(btnUndo.hasAttribute("disabled")).toBe(false);

    // Tras importar la carta, el historial de cambios registra el añadido
    expect(btnUndo.hasAttribute("disabled")).toBe(false);
    expect(btnRedo.hasAttribute("disabled")).toBe(true);

    // Seleccionar la carta para duplicarla
    const btnSelectAll = screen.getByTitle("Seleccionar todas las cartas");
    fireEvent.click(btnSelectAll);

    const btnDuplicar = screen.getByTitle("Duplicar cartas seleccionadas");
    fireEvent.click(btnDuplicar);

    // Ahora deberíamos tener dos cartas y canUndo sigue true
    expect(btnUndo.hasAttribute("disabled")).toBe(false);

    // Pulsar Deshacer (↺)
    fireEvent.click(btnUndo);

    // Tras deshacer la duplicación, Redo debe habilitarse
    expect(btnRedo.hasAttribute("disabled")).toBe(false);

    // Pulsar Rehacer (↻)
    fireEvent.click(btnRedo);

    // Tras rehacer, Redo vuelve a quedar deshabilitado
    expect(btnRedo.hasAttribute("disabled")).toBe(true);
  });

  it("permite deshacer y rehacer mediante atajos de teclado Ctrl+Z y Ctrl+Y", async () => {
    render(<App />);

    const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
    const dummyFile = new File(["dummy"], "carta_test.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    await waitFor(() => {
      expect(screen.getByTitle("Deshacer (Ctrl+Z)").hasAttribute("disabled")).toBe(false);
    });

    const btnUndo = screen.getByTitle("Deshacer (Ctrl+Z)");
    const btnRedo = screen.getByTitle("Rehacer (Ctrl+Y)");
    expect(btnUndo.hasAttribute("disabled")).toBe(false);

    // Disparar Ctrl+Z
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    // Se deshace el añadido de la carta
    await waitFor(() => {
      expect(btnRedo.hasAttribute("disabled")).toBe(false);
    });

    // Disparar Ctrl+Y
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });

    // Se rehace el añadido de la carta
    await waitFor(() => {
      expect(btnRedo.hasAttribute("disabled")).toBe(true);
    });
  });

  it("no intercepta Ctrl+Z si el usuario está escribiendo dentro de un input nativo", async () => {
    render(<App />);

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, cancelable: true });
    const prevented = !input.dispatchEvent(event);

    expect(prevented).toBe(false);
    document.body.removeChild(input);
  });
});

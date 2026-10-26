// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen, waitFor } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TKT-063: Consolidación de Historial por Foco/Blur en Campos de Texto del Inspector del Lienzo", () => {
  const mockModuleJson = {
    plantillas: [
      { id: "template_tkt63", archivo: "template_tkt63.json" },
    ],
  };

  const mockTemplateJson = {
    id: "template_tkt63",
    nombre: "Plantilla TKT63",
    capas: [
      {
        id: "layer_title_tkt63",
        tipo: "text",
        nombre: "Título de Carta",
        contenidoRaw: "Texto Inicial Capa",
        parentCapaId: null,
      },
    ],
    exposedProperties: [
      { layerId: "layer_title_tkt63", property: "contenidoRaw", label: "Título de Carta > Contenido Texto" },
    ],
    camposConfig: [
      { clave: "Título de Carta", tipo: "text" },
    ],
  };

  const setupAppWithCard = async () => {
    vi.spyOn(global, "fetch").mockImplementation((url) => {
      if (typeof url === "string" && url.endsWith("module.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModuleJson),
        } as Response);
      }
      if (typeof url === "string" && url.endsWith("template_tkt63.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplateJson),
        } as Response);
      }
      return Promise.reject(new Error("URL no mockeada"));
    });

    const { container } = render(<App />);

    // Crear Proyecto desde Welcome Hub
    const openCreateBtn = screen.getByText("Crear Nuevo Proyecto");
    fireEvent.click(openCreateBtn);

    const createProjectBtn = screen.getByText("✨ Crear Proyecto");
    fireEvent.click(createProjectBtn);

    // Esperar botón Añadir Carta desde Plantilla
    await waitFor(() => {
      expect(screen.getByText("Añadir Carta desde Plantilla")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Añadir Carta desde Plantilla"));

    await waitFor(() => {
      expect(screen.getByText("Plantilla TKT63")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Plantilla TKT63"));

    await waitFor(() => {
      expect(container.querySelector(".card-slot")).toBeTruthy();
    });

    // Seleccionar carta haciendo clic en su slot
    const slot = container.querySelector(".card-slot")!;
    fireEvent.click(slot);

    return { container };
  };

  it("consolida múltiples pulsaciones de tecla en el Nombre de la Carta en un único paso de historial al perder el foco", async () => {
    const { container } = await setupAppWithCard();

    // Obtener input del nombre de la carta
    const nameInput = container.querySelector(".input-field input[type='text']") as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    const initialName = nameInput.value;

    // Buscar botones de Deshacer y Rehacer del lienzo principal
    const undoBtn = screen.getByTitle("Deshacer (Ctrl+Z)") as HTMLButtonElement;
    const redoBtn = screen.getByTitle("Rehacer (Ctrl+Y)") as HTMLButtonElement;
    expect(undoBtn).toBeTruthy();
    expect(redoBtn).toBeTruthy();

    // Enfocar y realizar múltiples pulsaciones continuas en la misma sesión
    fireEvent.focus(nameInput);
    fireEvent.change(nameInput, { target: { value: "H" } });
    fireEvent.change(nameInput, { target: { value: "He" } });
    fireEvent.change(nameInput, { target: { value: "Heroe Nuevo" } });
    fireEvent.blur(nameInput);

    expect(nameInput.value).toBe("Heroe Nuevo");
    expect(undoBtn.disabled).toBe(false);

    // Un único clic en Deshacer debe devolver el texto a su valor inicial
    fireEvent.click(undoBtn);
    expect(nameInput.value).toBe(initialName);
    expect(redoBtn.disabled).toBe(false);

    // Rehacer restaura el nombre completo escrito
    fireEvent.click(redoBtn);
    expect(nameInput.value).toBe("Heroe Nuevo");
  });

  it("consolida múltiples pulsaciones de tecla en un textarea expuesto del inspector en un único paso de historial", async () => {
    const { container } = await setupAppWithCard();

    // Buscar el textarea del inspector lateral
    await waitFor(() => {
      expect(container.querySelector(".inspector-textarea")).toBeTruthy();
    });

    const textarea = container.querySelector(".inspector-textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    const initialText = textarea.value;

    const undoBtn = screen.getByTitle("Deshacer (Ctrl+Z)") as HTMLButtonElement;
    const redoBtn = screen.getByTitle("Rehacer (Ctrl+Y)") as HTMLButtonElement;

    // Escribir varias palabras consecutivas en la misma sesión
    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: "Espada" } });
    fireEvent.change(textarea, { target: { value: "Espada de" } });
    fireEvent.change(textarea, { target: { value: "Espada de Fuego Sagrado" } });
    fireEvent.blur(textarea);

    expect(textarea.value).toBe("Espada de Fuego Sagrado");
    expect(undoBtn.disabled).toBe(false);

    // Un único paso de deshacer debe restaurar el texto original
    fireEvent.click(undoBtn);
    expect(textarea.value).toBe(initialText);

    // Rehacer restaura el texto final completo
    fireEvent.click(redoBtn);
    expect(textarea.value).toBe("Espada de Fuego Sagrado");
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen, waitFor } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("App Component - No Black Screen On Exposed Field Render After Save", () => {
  it("debe renderizar el inspector lateral con propiedades expuestas sin ReferenceError ni crashes tras guardar la edición", async () => {
    // 1. Mock de fetch para simular la carga de plantillas por defecto
    const mockModuleJson = {
      plantillas: [
        { id: "template_1", archivo: "template_1.json" }
      ]
    };

    const mockTemplateJson = {
      id: "template_1",
      nombre: "Template 1",
      capas: [
        { id: "layer_1", tipo: "text", nombre: "Texto A", parentCapaId: null }
      ],
      exposedProperties: [
        { layerId: "layer_1", property: "contenidoRaw", label: "Texto A" }
      ],
      camposConfig: [
        { clave: "Texto A", tipo: "text" }
      ]
    };

    vi.spyOn(global, "fetch").mockImplementation((url) => {
      if (typeof url === "string" && url.endsWith("module.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModuleJson)
        } as Response);
      }
      if (typeof url === "string" && url.endsWith("template_1.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplateJson)
        } as Response);
      }
      return Promise.reject(new Error("URL no mockeada"));
    });

    const { container } = render(<App />);

    // 2. Crear proyecto en el wizard inicial
    const createProjectBtn = screen.getByText("✨ Crear Nuevo Proyecto");
    expect(createProjectBtn).toBeTruthy();
    fireEvent.click(createProjectBtn);

    // Esperar a que se procese la carga asíncrona de plantillas
    await waitFor(() => {
      const addCardBtn = screen.getByText("Añadir Carta desde Plantilla");
      expect(addCardBtn).toBeTruthy();
    });

    // 3. Añadir carta desde la plantilla mockeada
    const addCardBtn = screen.getByText("Añadir Carta desde Plantilla");
    fireEvent.click(addCardBtn);

    // Esperar a que abra el modal de plantillas y seleccionar la plantilla 1
    await waitFor(() => {
      const templateItem = screen.getByText("Template 1");
      expect(templateItem).toBeTruthy();
    });

    const templateItem = screen.getByText("Template 1");
    fireEvent.click(templateItem);

    // 4. Seleccionar la carta creada haciendo clic en su slot para abrir el inspector
    await waitFor(() => {
      const slot = container.querySelector(".card-slot");
      expect(slot).toBeTruthy();
    });

    const slot = container.querySelector(".card-slot")!;
    fireEvent.click(slot);

    // 5. Abrir el modal de edición de carta por doble clic
    fireEvent.doubleClick(slot);

    // Esperar a que abra el modal de edición
    await waitFor(() => {
      const addLayerBtn = screen.getByText("Añadir Elemento");
      expect(addLayerBtn).toBeTruthy();
    });

    // Añadir una nueva capa (ej. Bloque Vacío)
    const addLayerBtn = screen.getByText("Añadir Elemento");
    fireEvent.click(addLayerBtn);

    const blockOption = screen.getByText("Bloque Vacío");
    fireEvent.click(blockOption);

    const confirmBtn = screen.getByRole("button", { name: "Añadir" });
    fireEvent.click(confirmBtn);

    // Guardar cambios
    const saveBtn = screen.getByText("Guardar Cambios");
    fireEvent.click(saveBtn);

    // 6. Verificar que la pantalla sigue renderizada correctamente y no tiene errores
    await waitFor(() => {
      const rightSidebar = container.querySelector(".sidebar-right");
      expect(rightSidebar).toBeTruthy();
    });
  });
});

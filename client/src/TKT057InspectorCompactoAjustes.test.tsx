// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import fs from "fs";
import path from "path";
import EditCardModal from "./EditCardModal";

const mockPlantilla = {
  id: "tpl_tkt057",
  nombre: "Plantilla TKT-057",
  anchoMm: 63.5,
  altoMm: 88.9,
  camposConfig: [],
  exposedProperties: [],
  capas: [
    {
      id: "layer_txt_1",
      tipo: "text" as const,
      nombre: "Titulo",
      xMm: 5,
      yMm: 5,
      anchoMm: 50,
      altoMm: 10,
      contenidoRaw: "Test",
      fontSizePt: 16,
      color: "#ffffff",
      textOutlineWidth: 1,
      textOutlineColor: "#000000",
    },
    {
      id: "layer_list_1",
      tipo: "list" as const,
      nombre: "Lista de Ataques",
      xMm: 5,
      yMm: 20,
      anchoMm: 50,
      altoMm: 40,
      childTemplates: [],
    },
    {
      id: "layer_child_item",
      parentCapaId: "layer_list_1",
      tipo: "text" as const,
      nombre: "Item Ataque",
      xMm: 0,
      yMm: 0,
      anchoMm: 45,
      altoMm: 8,
      contenidoRaw: "Espadazo",
    },
  ],
};

const mockCarta = {
  id: "card_tkt057",
  plantillaId: "tpl_tkt057",
  plantilla: mockPlantilla,
  valoresCampos: {},
  capasOverrides: {},
};

describe("TKT-057: Ajustes de Espacio y Solapamientos en Inspector Compacto", () => {
  it("verifica que EditCardModal.css tenga la columna ampliada a 480px", () => {
    const cssPath = path.resolve(__dirname, "EditCardModal.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    expect(cssContent).toContain("--edit-inspector-width: 480px;");
    expect(cssContent).toContain("grid-template-columns: 300px 1fr var(--edit-inspector-width, 480px);");
  });

  it("renderiza correctamente los controles de texto con Color y Contorno balanceados", () => {
    const { container } = render(
      <EditCardModal
        onClose={vi.fn()}
        carta={mockCarta as any}
        cardConfig={{ anchoMm: 63.5, altoMm: 88.9, sangradoMm: 3, radioEsquinaMm: 2.5, separacionMm: 0 } as any}
        templatesMap={{ tpl_tkt057: mockPlantilla as any }}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={vi.fn()}
        projectColors={[]}
      />
    );

    // Seleccionar la capa de texto
    const textLayerItem = container.querySelectorAll(".hierarchy-item")[0];
    fireEvent.click(textLayerItem);

    // Comprobar que existe la etiqueta "Color" y "Contorno" en la fila
    const labels = Array.from(container.querySelectorAll(".inspector-label")).map((el) => el.textContent);
    expect(labels).toContain("Color");
    expect(labels).toContain("Contorno");

    // Comprobar que el botón 'Editar en Lienzo' existe y no está solapado
    const editCanvasBtn = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes("Editar en Lienzo"));
    expect(editCanvasBtn).toBeDefined();
  });

  it("muestra el botón 'Registrar' compacto al seleccionar un hijo para subplantilla de lista", () => {
    const { container } = render(
      <EditCardModal
        onClose={vi.fn()}
        carta={mockCarta as any}
        cardConfig={{ anchoMm: 63.5, altoMm: 88.9, sangradoMm: 3, radioEsquinaMm: 2.5, separacionMm: 0 } as any}
        templatesMap={{ tpl_tkt057: mockPlantilla as any }}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={vi.fn()}
        projectColors={[]}
      />
    );

    // Seleccionar la capa de lista
    const listLayerItem = container.querySelectorAll(".hierarchy-item")[1];
    fireEvent.click(listLayerItem);

    // Seleccionar el hijo para subplantilla en el dropdown
    const selectChild = Array.from(container.querySelectorAll("select")).find((s) =>
      s.innerHTML.includes("-- Seleccionar elemento hijo --")
    );
    expect(selectChild).toBeDefined();
    if (selectChild) {
      fireEvent.change(selectChild, { target: { value: "layer_child_item" } });
    }

    // El botón debe decir exactamente "Registrar"
    const registerBtn = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Registrar");
    expect(registerBtn).toBeDefined();
  });
});

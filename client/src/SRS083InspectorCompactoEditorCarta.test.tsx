// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import fs from "fs";
import path from "path";
import EditCardModal from "./EditCardModal";

const mockPlantilla = {
  id: "tpl_083",
  nombre: "Plantilla SRS-083",
  anchoMm: 63.5,
  altoMm: 88.9,
  camposConfig: [
    { clave: "Titulo", nombreLegible: "Titulo", tipo: "text" as const, valorDefecto: "Dragón" },
  ],
  exposedProperties: [
    {
      layerId: "layer_txt_1",
      property: "fontSizePt",
      label: "Titulo > Tamaño Fuente",
    },
  ],
  capas: [
    {
      id: "layer_bg",
      tipo: "background" as const,
      nombre: "Fondo",
      colorFill: "#1e293b",
    },
    {
      id: "layer_txt_1",
      tipo: "text" as const,
      nombre: "Titulo",
      xMm: 5,
      yMm: 5,
      anchoMm: 50,
      altoMm: 10,
      contenidoRaw: "Dragón",
      fontSizePt: 16,
      color: "#ffffff",
    },
  ],
};

const mockCarta = {
  id: "card_083",
  plantillaId: "tpl_083",
  plantilla: mockPlantilla,
  valoresCampos: { layer_txt_1: "Dragón" },
  capasOverrides: {},
};

describe("SRS-083: Densidad Visual e Inspector Compacto en Modal de Edición de Carta", () => {
  it("RF-1 y RF-2: define la columna derecha del inspector con ancho ampliado (480px) y estilos compactos en EditCardModal.css", () => {
    const cssPath = path.resolve(__dirname, "EditCardModal.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    expect(cssContent).toContain("--edit-inspector-width: 480px;");
    expect(cssContent).toContain("grid-template-columns: 300px 1fr var(--edit-inspector-width, 480px);");
    expect(cssContent).toContain(".inspector-table");
    expect(cssContent).toContain(".inspector-cell");
    expect(cssContent).toContain(".inspector-field-row");
    expect(cssContent).toContain(".inspector-field-label");
    expect(cssContent).toContain(".inspector-field-control");
    expect(cssContent).toContain("--edit-inspector-input-height: 22px;");
  });

  it("RF-3 y RF-4: renderiza las propiedades del inspector en tablas densas multi-celda (.inspector-table / .inspector-cell) y conserva toda la funcionalidad interactiva", () => {
    const onSave = vi.fn();
    const { container } = render(
      <EditCardModal
        onClose={vi.fn()}
        carta={mockCarta as any}
        cardConfig={{ anchoMm: 63.5, altoMm: 88.9, sangradoMm: 3, radioEsquinaMm: 2.5, separacionMm: 0 } as any}
        templatesMap={{ tpl_083: mockPlantilla as any }}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={onSave}
        projectColors={[
          { id: "col_1", nombre: "Oro", valor: "#ffd700" },
        ]}
      />
    );

    // Seleccionar la capa "Titulo" en la jerarquía
    const hierarchyItems = container.querySelectorAll(".hierarchy-item");
    const tituloItem = Array.from(hierarchyItems).find((el) =>
      el.textContent?.includes("Titulo")
    );
    expect(tituloItem).toBeTruthy();
    fireEvent.click(tituloItem!);

    // Verificar que existen tablas (.inspector-table), celdas en paralelo (.inspector-cell) y filas (.inspector-field-row)
    const tables = container.querySelectorAll(".inspector-table");
    expect(tables.length).toBeGreaterThanOrEqual(4);

    const cells = container.querySelectorAll(".inspector-cell");
    expect(cells.length).toBeGreaterThanOrEqual(10);

    const fieldRows = container.querySelectorAll(".inspector-field-row");
    expect(fieldRows.length).toBeGreaterThanOrEqual(8);

    const firstRow = fieldRows[0];
    expect(firstRow.querySelector(".inspector-field-label")).toBeTruthy();
    expect(firstRow.querySelector(".inspector-field-control")).toBeTruthy();

    // Verificar que los selectores de color tienen swatch compacto (20x20px) y hex input compacto (22px)
    const colorPickerInput = container.querySelector(".color-picker-input") as HTMLInputElement;
    expect(colorPickerInput).toBeTruthy();
    expect(colorPickerInput.style.width).toBe("20px");
    expect(colorPickerInput.style.height).toBe("20px");

    // Verificar que el icono de exponer y de aclaración semántica (SRS-082) siguen funcionando dentro de las filas tabuladas
    const descTriggerBtn = container.querySelector(".exposed-desc-trigger-btn") as HTMLButtonElement;
    expect(descTriggerBtn).toBeTruthy();
    fireEvent.click(descTriggerBtn);
    expect(container.querySelector(".exposed-desc-popover")).toBeTruthy();
  });
});

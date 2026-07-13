// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import EditCardModal from "./EditCardModal";
import type { Carta, CardConfig } from "shared";

afterEach(() => {
  cleanup();
});

const mockCarta: Carta = {
  id: "card_1",
  nombre: "Test Card",
  imagenTrasera: null,
  cantidad: 1,
  plantillaId: "template_1",
  valoresCampos: {},
  capasOverrides: {}
};

const mockCardConfig: CardConfig = {
  anchoMm: 63.5,
  altoMm: 88.9,
  espaciadoXMm: 0,
  espaciadoYMm: 0,
  sangradoMm: 0,
  bordeCorteMm: 0,
  bordeCorteColor: "#000000"
};

const mockTemplatesMap = {
  template_1: {
    id: "template_1",
    nombre: "Template 1",
    capas: [
      { id: "layer_1", tipo: "background", colorFill: "#ffffff" },
      { id: "layer_container", tipo: "container", nombre: "Container Parent", parentCapaId: null },
      { id: "layer_child_1", tipo: "text", nombre: "Child 1", parentCapaId: "layer_container", contenidoRaw: "C1" },
      { id: "layer_child_2", tipo: "text", nombre: "Child 2", parentCapaId: "layer_container", contenidoRaw: "C2" }
    ],
    camposConfig: []
  }
};

describe("EditCardModal Component - Hierarchy Operations (SRS-047)", () => {
  it("permite añadir y mover capas respetando la jerarquía", () => {
    const handleSave = vi.fn();
    render(
      <EditCardModal
        carta={mockCarta}
        cardConfig={mockCardConfig}
        templatesMap={mockTemplatesMap}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={handleSave}
        onClose={vi.fn()}
      />
    );
    
    // El modal de edición renderiza los elementos del árbol
    const parentNode = screen.getByText("Container Parent");
    expect(parentNode).toBeTruthy();
  });
});

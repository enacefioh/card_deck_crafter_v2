// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
      { id: "layer_1", tipo: "background", colorFill: "#ffffff" }
    ],
    camposConfig: []
  }
};

describe("EditCardModal Component - Zoom Tests", () => {
  it("inicializa el zoom con la escala por defecto (3.5x) si no se provee initialZoom", () => {
    render(
      <EditCardModal
        carta={mockCarta}
        cardConfig={mockCardConfig}
        templatesMap={mockTemplatesMap}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const zoomText = screen.getByText("3.5x");
    expect(zoomText).toBeTruthy();
  });

  it("inicializa la escala con el valor de initialZoom cuando se proporciona", () => {
    render(
      <EditCardModal
        carta={mockCarta}
        cardConfig={mockCardConfig}
        templatesMap={mockTemplatesMap}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
        initialZoom={2.5}
      />
    );
    const zoomText = screen.getByText("2.5x");
    expect(zoomText).toBeTruthy();
  });

  it("actualiza dinámicamente el valor de la escala cuando se mueve el slider", () => {
    const { container } = render(
      <EditCardModal
        carta={mockCarta}
        cardConfig={mockCardConfig}
        templatesMap={mockTemplatesMap}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
        initialZoom={3.5}
      />
    );
    
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).toBeTruthy();
    fireEvent.change(slider, { target: { value: "4.8" } });
    
    const zoomText = screen.getByText("4.8x");
    expect(zoomText).toBeTruthy();
  });
});

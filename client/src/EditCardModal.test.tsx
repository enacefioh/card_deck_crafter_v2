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

  it("permite añadir una capa de tipo Bloque Vacío en la plantilla", () => {
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
    
    const addBtn = screen.getByText("Añadir Elemento");
    fireEvent.click(addBtn);
    
    const blockOption = screen.getByText("Bloque Vacío");
    fireEvent.click(blockOption);
    
    const confirmBtn = screen.getByRole("button", { name: "Añadir" });
    fireEvent.click(confirmBtn);
    
    const saveBtn = screen.getByText("Guardar Cambios");
    fireEvent.click(saveBtn);
    
    expect(handleSave).toHaveBeenCalled();
    const savedTemplate = handleSave.mock.calls[0][4];
    const blockLayer = savedTemplate.capas.find((c: any) => c.tipo === "block");
    expect(blockLayer).toBeDefined();
    expect(blockLayer.nombre).toContain("bloque_");
    expect(blockLayer.backgroundColor).toBe("");
  });

  it("muestra el ayudante de símbolos si se provee projectSymbols y permite insertar un símbolo en los campos de texto editables", () => {
    const mockTemplatesWithExposed = {
      template_1: {
        id: "template_1",
        nombre: "Template 1",
        capas: [
          { id: "layer_1", tipo: "text", nombre: "CapaTexto", contenidoRaw: "Hola" }
        ],
        camposConfig: [],
        exposedProperties: [
          { layerId: "layer_1", property: "contenidoRaw", label: "TextoCapa" }
        ]
      }
    };

    const mockSymbols = [
      { id: "sym_1", tag: "fuego", src: "data:image/svg+xml;utf8,<svg></svg>" }
    ];

    render(
      <EditCardModal
        carta={{
          ...mockCarta,
          valoresCampos: {
            "layer_1": "Hola"
          }
        }}
        cardConfig={mockCardConfig}
        templatesMap={mockTemplatesWithExposed}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
        projectSymbols={mockSymbols}
      />
    );

    // Muestra el trigger de insertar símbolos (el emoji 🖼️)
    // Primero, debemos seleccionar la capa "CapaTexto" en el árbol para abrir el inspector
    const layerItem = screen.getByText("CapaTexto");
    expect(layerItem).toBeTruthy();
    fireEvent.click(layerItem);

    // Ahora el inspector debe estar visible para esa capa.
    // Buscamos el trigger de insertar símbolos (el emoji 🖼️)
    const triggers = screen.getAllByTitle("Insertar símbolo");
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    const trigger = triggers[0];

    // Al hacer click, abre el popover y muestra el tag
    fireEvent.click(trigger);
    const tagText = screen.getByText("{fuego}");
    expect(tagText).toBeTruthy();

    // Al hacer click en el botón del símbolo, debe insertar el tag en el texto
    fireEvent.click(tagText);

    // El input o textarea del valor editable de la carta debe actualizarse
    const textInput = screen.getByDisplayValue("Hola{fuego}") as HTMLInputElement;
    expect(textInput).toBeTruthy();
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import EditCardModal from "./EditCardModal";
import type { Carta, CardConfig } from "shared";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockCardConfig: CardConfig = {
  anchoMm: 63.5,
  altoMm: 88.9,
  espaciadoXMm: 0,
  espaciadoYMm: 0,
  sangradoMm: 0,
  bordeCorteMm: 0,
  bordeCorteColor: "#000000",
};

const mockPlantilla = {
  id: "tpl_tkt053",
  nombre: "Plantilla TKT053",
  anchoMm: 63.5,
  altoMm: 88.9,
  capas: [
    { id: "bg_1", tipo: "background", nombre: "Fondo", colorFill: "#0f172a" },
    {
      id: "cont_none",
      tipo: "container",
      nombre: "Contenedor Libre",
      layout: "none",
      xMm: 5,
      yMm: 5,
      anchoMm: 40,
      altoMm: 30,
    },
    {
      id: "bloque_1",
      tipo: "block",
      nombre: "Bloque Solido",
      xMm: 10,
      yMm: 10,
      anchoMm: 20,
      altoMm: 20,
    },
    {
      id: "lista_1",
      tipo: "list",
      nombre: "Lista Vacia",
      layout: "vertical",
      xMm: 5,
      yMm: 40,
      anchoMm: 50,
      altoMm: 50,
      childTemplates: []
    }
  ],
  camposConfig: [],
  assets: [],
  customFonts: [],
};

const mockTemplatesMap: Record<string, any> = {
  [mockPlantilla.id]: mockPlantilla
};

const mockCarta: Carta = {
  id: "card_1",
  nombre: "Carta Test TKT053",
  imagenFrontal: undefined,
  imagenTrasera: null,
  cantidad: 1,
  plantillaId: "tpl_tkt053",
};

describe("TKT-053: Integración de Dimensiones Automáticas y Listas en EditCardModal", () => {
  it("muestra Ancho Auto y Alto Auto para contenedor con layout 'none'", () => {
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

    // Seleccionar Contenedor Libre (layout 'none') en el panel de jerarquía
    const containerItem = screen.getByText("Contenedor Libre", { selector: ".hierarchy-label" });
    fireEvent.click(containerItem);

    // Debe mostrar ambos controles aunque el layout sea 'none'
    expect(screen.getByText(/Ancho auto/i)).toBeTruthy();
    expect(screen.getByText(/Alto auto/i)).toBeTruthy();
  });

  it("muestra Ancho Auto y Alto Auto para bloques (tipo 'block')", () => {
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

    const blockItem = screen.getByText("Bloque Solido", { selector: ".hierarchy-label" });
    fireEvent.click(blockItem);

    expect(screen.getByText(/Ancho auto/i)).toBeTruthy();
    expect(screen.getByText(/Alto auto/i)).toBeTruthy();
  });

  it("muestra Ancho Auto y Alto Auto para listas (tipo 'list')", () => {
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

    const listItem = screen.getByText("Lista Vacia", { selector: ".hierarchy-label" });
    fireEvent.click(listItem);

    expect(screen.getByText(/Ancho auto/i)).toBeTruthy();
    expect(screen.getByText(/Alto auto/i)).toBeTruthy();
  });

  it("NO muestra Ancho Auto ni Alto Auto para la capa de fondo", () => {
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

    const bgItem = screen.getByText("Fondo", { selector: ".hierarchy-label" });
    fireEvent.click(bgItem);

    expect(screen.queryByText(/Ancho auto/i)).toBeNull();
    expect(screen.queryByText(/Alto auto/i)).toBeNull();
  });

  it("calcula y aplica en el DOM el ancho y alto automático para contenedor libre basándose en sus hijos", () => {
    const templateConHijos = {
      id: "tpl_free_auto",
      nombre: "Plantilla Contenedor Auto",
      anchoMm: 63.5,
      altoMm: 88.9,
      capas: [
        {
          id: "cont_auto",
          tipo: "container",
          nombre: "Contenedor Auto",
          layout: "none",
          xMm: 0,
          yMm: 0,
          anchoMm: "auto",
          altoMm: "auto",
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderTopWidth: 1,
          borderBottomWidth: 1,
        },
        {
          id: "hijo_1",
          tipo: "block",
          nombre: "Hijo 1",
          parentCapaId: "cont_auto",
          xMm: 10,
          yMm: 5,
          anchoMm: 20, // 10 + 20 = 30
          altoMm: 15, // 5 + 15 = 20
        },
        {
          id: "hijo_2",
          tipo: "block",
          nombre: "Hijo 2",
          parentCapaId: "cont_auto",
          xMm: 15,
          yMm: 25,
          anchoMm: 25, // 15 + 25 = 40 (max X)
          altoMm: 10, // 25 + 10 = 35 (max Y)
        }
      ],
      camposConfig: [],
      assets: [],
      customFonts: [],
    };

    const carta: Carta = {
      id: "c_auto",
      nombre: "Carta Auto",
      imagenFrontal: undefined,
      imagenTrasera: null,
      cantidad: 1,
      plantillaId: templateConHijos.id,
    };

    render(
      <EditCardModal
        carta={carta}
        cardConfig={mockCardConfig}
        templatesMap={{ [templateConHijos.id]: templateConHijos }}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Seleccionar Contenedor Auto
    const contItem = screen.getByText("Contenedor Auto", { selector: ".hierarchy-label" });
    fireEvent.click(contItem);

    // Escala por defecto en EditCardModal: 3.5
    // Ancho esperado: maxX (40) + borderLeft(1) + borderRight(1) = 42 mm * 3.5 = 147px
    // Alto esperado: maxY (35) + borderTop(1) + borderBottom(1) = 37 mm * 3.5 = 129.5px
    // Buscamos el elemento contenedor en el preview
    const previewElements = document.querySelectorAll(".edit-card-preview-frame div");
    const containerDiv = Array.from(previewElements).find(
      (el) => (el as HTMLElement).style.width === "147px" && (el as HTMLElement).style.height === "129.5px"
    );

    expect(containerDiv).toBeDefined();
    expect((containerDiv as HTMLElement).style.width).toBe("147px");
    expect((containerDiv as HTMLElement).style.height).toBe("129.5px");
  });

  it("calcula y aplica en el DOM el alto automático para contenedor libre con hijo texto en alto 'auto'", () => {
    const templateConTexto = {
      id: "tpl_free_auto_text",
      nombre: "Plantilla Contenedor con Texto Auto",
      anchoMm: 63.5,
      altoMm: 88.9,
      capas: [
        {
          id: "cont_auto_text",
          tipo: "container",
          nombre: "Contenedor Texto Auto",
          layout: "none",
          xMm: 0,
          yMm: 0,
          anchoMm: 60,
          altoMm: "auto",
        },
        {
          id: "texto_hijo",
          tipo: "text",
          nombre: "Texto Hijo",
          parentCapaId: "cont_auto_text",
          xMm: 5,
          yMm: 10,
          anchoMm: 50,
          altoMm: "auto",
          fontSizePt: 12,
          contenidoRaw: "Texto descriptivo",
        }
      ],
      camposConfig: [],
      assets: [],
      customFonts: [],
    };

    const carta: Carta = {
      id: "c_auto_text",
      nombre: "Carta Texto Auto",
      imagenFrontal: undefined,
      imagenTrasera: null,
      cantidad: 1,
      plantillaId: templateConTexto.id,
    };

    render(
      <EditCardModal
        carta={carta}
        cardConfig={mockCardConfig}
        templatesMap={{ [templateConTexto.id]: templateConTexto }}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Escala: 3.5. yMm es 10mm, textHeight >= 8.46mm, alto total >= 18.46mm -> en px: >= 64.61px
    // El contenedor NO debe tener altura <= 35px (que sería solo yMm * scale = 10 * 3.5 = 35px)
    const previewElements = document.querySelectorAll(".edit-card-preview-frame div");
    const containerDiv = Array.from(previewElements).find(
      (el) => (el as HTMLElement).style.width === `${60 * 3.5}px` && parseFloat((el as HTMLElement).style.height || "0") > 35
    );

    expect(containerDiv).toBeDefined();
    const heightPx = parseFloat((containerDiv as HTMLElement).style.height);
    // Debe ser al menos (10 + 8.46) * 3.5 = 64.61px
    expect(heightPx).toBeGreaterThanOrEqual(64.6);
  });
});


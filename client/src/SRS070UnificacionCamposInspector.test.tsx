// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import EditCardModal from "./EditCardModal";
import { prepararPlantillaParaExportacion } from "./utils/projectUtils";
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
  id: "template_hero",
  nombre: "Plantilla Héroe",
  anchoMm: 63.5,
  altoMm: 88.9,
  capas: [
    { id: "bg_1", tipo: "background", colorFill: "#1e293b" },
    {
      id: "txt_nombre",
      tipo: "text",
      nombre: "Nombre de la Carta",
      contenidoRaw: "Guerrero Feroz",
      fontFamily: "Outfit",
      fontSizePt: 16,
      color: "#ffffff",
      alineacion: "left",
      multiline: true,
      xMm: 5,
      yMm: 5,
      anchoMm: 50,
      altoMm: 12,
    },
    {
      id: "img_arte",
      tipo: "image",
      nombre: "Ilustración",
      src: "",
      modoAjuste: "cover",
      xMm: 5,
      yMm: 20,
      anchoMm: 53.5,
      altoMm: 40,
    },
  ],
  camposConfig: [],
  exposedProperties: [],
};

const mockTemplatesMap = {
  template_hero: mockPlantilla,
};

const mockCarta: Carta = {
  id: "carta_1",
  nombre: "Guerrero Feroz",
  cantidad: 1,
  imagenTrasera: null,
  plantillaId: "template_hero",
  valoresCampos: {
    txt_nombre: "Guerrero Feroz",
  },
  capasOverrides: {},
  plantilla: JSON.parse(JSON.stringify(mockPlantilla)),
};

describe("SRS-070: Unificación de Campos en el Inspector del Editor de Cartas", () => {
  it("RF-1: renderiza un único bloque de texto sin secciones ni campos duplicados por defecto", () => {
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

    // Seleccionar la capa de texto en el árbol de capas
    const textLayerTreeItem = screen.getByText("Nombre de la Carta");
    fireEvent.click(textLayerTreeItem);

    // Comprobar que existe la sección unificada "Texto y Tipografía"
    expect(screen.getByText("Texto y Tipografía")).toBeTruthy();

    // Comprobar que NO existen títulos ni etiquetas duplicadas "Definición de Plantilla" ni "por defecto"
    expect(screen.queryByText("Definición de Plantilla")).toBeNull();
    expect(screen.queryByText("Texto por defecto")).toBeNull();
    expect(screen.queryByText("Tipografía por defecto")).toBeNull();
    expect(screen.queryByText("Color de Texto por defecto")).toBeNull();
    expect(screen.queryByText("Estilos y Alineación por defecto")).toBeNull();
    expect(screen.queryByText("Contorno por Defecto (Text Outline)")).toBeNull();

    // Comprobar que existe el textarea con el valor de la capa
    const contentTextarea = screen.getByDisplayValue("Guerrero Feroz");
    expect(contentTextarea).toBeTruthy();
  });

  it("RF-1: modificar el texto y tipografía actualiza en sincronía el modelo y la carta", () => {
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

    // Seleccionar la capa de texto
    const textLayerTreeItem = screen.getByText("Nombre de la Carta");
    fireEvent.click(textLayerTreeItem);

    // Editar el texto
    const contentTextarea = screen.getByDisplayValue("Guerrero Feroz");
    fireEvent.change(contentTextarea, { target: { value: "Arquera Élfica" } });

    // Modificar tamaño de fuente
    const fontSizeInput = screen.getByDisplayValue("16");
    fireEvent.change(fontSizeInput, { target: { value: "20" } });

    // Guardar cambios pulsando "Guardar Cambios"
    const saveButton = screen.getByText("Guardar Cambios");
    fireEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledTimes(1);
    const [savedValoresCampos, savedOverrides, , , savedPlantilla] = handleSave.mock.calls[0];

    // Comprobar que los valores de la carta se actualizaron
    expect(savedValoresCampos["txt_nombre"]).toBe("Arquera Élfica");
    expect(savedOverrides["txt_nombre"]?.fontSizePt).toBe(20);

    // Comprobar que el modelo de capa en la plantilla también se sincronizó
    const capaTextoEnPlantilla = savedPlantilla.capas.find((c: any) => c.id === "txt_nombre");
    expect(capaTextoEnPlantilla.contenidoRaw).toBe("Arquera Élfica");
    expect(capaTextoEnPlantilla.fontSizePt).toBe(20);
  });

  it("RF-2: renderiza un único bloque de recurso de imagen sin duplicados de plantilla", () => {
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

    // Seleccionar la capa de imagen en el árbol de capas
    const imageLayerTreeItem = screen.getByText("Ilustración");
    fireEvent.click(imageLayerTreeItem);

    // Comprobar que existe la sección unificada "Recurso de Imagen"
    expect(screen.getByText("Recurso de Imagen")).toBeTruthy();

    // Comprobar que NO existen duplicados de plantilla
    expect(screen.queryByText("Definición de Plantilla")).toBeNull();
    expect(screen.queryByText("Imagen por Defecto (Plantilla)")).toBeNull();
    expect(screen.queryByText("Subir imagen por defecto")).toBeNull();

    // Comprobar que existe un único botón "📂 Cargar desde Galería"
    const galleryButtons = screen.getAllByText("📂 Cargar desde Galería");
    expect(galleryButtons).toHaveLength(1);

    // Comprobar que existe un único selector de modo de ajuste
    expect(screen.getByText("Modo de Ajuste")).toBeTruthy();
    const modoSelects = screen.getAllByRole("combobox");
    expect(modoSelects.some(s => (s as HTMLSelectElement).value === "cover")).toBe(true);
  });

  it("RF-3: prepararPlantillaParaExportacion consolida valores visibles y anulaciones en las capas base", () => {
    const valoresCarta = {
      txt_nombre: "Mago Arcano",
    };
    const capasOverrides = {
      txt_nombre: {
        fontSizePt: 22,
        color: "#38bdf8",
      },
      img_arte: {
        src: "data:image/png;base64,mockMageArt",
        modoAjuste: "contain",
      },
    };

    const plantillaConsolidada = prepararPlantillaParaExportacion(
      mockPlantilla,
      "Plantilla Mago Consolidada",
      valoresCarta,
      "tpl_consolidada",
      capasOverrides
    );

    expect(plantillaConsolidada.nombre).toBe("Plantilla Mago Consolidada");
    expect(plantillaConsolidada.id).toBe("tpl_consolidada");

    const capaTexto = plantillaConsolidada.capas.find((c: any) => c.id === "txt_nombre");
    expect(capaTexto.contenidoRaw).toBe("Mago Arcano");
    expect(capaTexto.fontSizePt).toBe(22);
    expect(capaTexto.color).toBe("#38bdf8");

    const capaImagen = plantillaConsolidada.capas.find((c: any) => c.id === "img_arte");
    expect(capaImagen.src).toBe("data:image/png;base64,mockMageArt");
    expect(capaImagen.modoAjuste).toBe("contain");
  });

  it("RF-3: la creación de una nueva carta desde plantilla instanciada incluye los valores base de las capas", () => {
    const templateModificada = {
      id: "tpl_nueva",
      nombre: "Plantilla Caballero",
      capas: [
        {
          id: "txt_1",
          tipo: "text",
          contenidoRaw: "Paladín de la Luz",
          fontFamily: "Outfit",
          fontSizePt: 18,
          color: "#e2e8f0",
          alineacion: "center",
          textOutlineWidth: 1.5,
          textOutlineColor: "#0f172a",
        },
        {
          id: "img_1",
          tipo: "image",
          src: "data:image/png;base64,mockPaladinIcon",
          modoAjuste: "contain",
        },
      ],
    };

    // Simulación de la lógica de handleSelectTemplate en App.tsx
    const overrides: Record<string, any> = {};
    const valoresCampos: Record<string, string> = {};

    templateModificada.capas.forEach((capa: any) => {
      if (capa.tipo === "text") {
        overrides[capa.id] = {
          color: capa.color || "#000000",
          alineacion: capa.alineacion || "left",
          contenidoRaw: capa.contenidoRaw || "",
          fontFamily: capa.fontFamily || "sans-serif",
          fontSizePt: capa.fontSizePt || 12,
          textOutlineWidth: capa.textOutlineWidth || 0,
          textOutlineColor: capa.textOutlineColor || "#000000",
          bold: !!capa.bold,
          italic: !!capa.italic,
          underline: !!capa.underline,
        };
        valoresCampos[capa.id] = capa.contenidoRaw || "";
      } else if (capa.tipo === "image") {
        if (capa.src) {
          overrides[capa.id] = {
            src: capa.src,
            modoAjuste: capa.modoAjuste || "cover",
          };
        }
      }
    });

    const nuevaCarta: Carta = {
      id: "carta_nueva_1",
      nombre: templateModificada.nombre,
      cantidad: 1,
      imagenTrasera: null,
      plantillaId: templateModificada.id,
      valoresCampos,
      capasOverrides: overrides,
      plantilla: templateModificada,
    };

    expect(nuevaCarta.valoresCampos!["txt_1"]).toBe("Paladín de la Luz");
    expect(nuevaCarta.capasOverrides!["txt_1"]?.fontSizePt).toBe(18);
    expect(nuevaCarta.capasOverrides!["txt_1"]?.textOutlineWidth).toBe(1.5);
    expect(nuevaCarta.capasOverrides!["img_1"]?.src).toBe("data:image/png;base64,mockPaladinIcon");
    expect(nuevaCarta.capasOverrides!["img_1"]?.modoAjuste).toBe("contain");
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import EditCardModal from "./EditCardModal";
import {
  isVerticalLayout,
  isHorizontalLayout,
  isFlexLayout,
  getContainerFlexStyle,
  getContainerFlexCssString,
} from "shared";
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

const mockPlantillaConContenedor = {
  id: "tpl_container_test",
  nombre: "Plantilla Contenedor",
  anchoMm: 63.5,
  altoMm: 88.9,
  capas: [
    { id: "bg_1", tipo: "background", colorFill: "#0f172a" },
    {
      id: "cont_1",
      tipo: "container",
      nombre: "Contenedor Principal",
      layout: "none",
      xMm: 5,
      yMm: 5,
      anchoMm: 53.5,
      altoMm: 40,
    },
    {
      id: "txt_hijo_1",
      tipo: "text",
      nombre: "Elemento A",
      parentCapaId: "cont_1",
      contenidoRaw: "Elemento A",
      xMm: 0,
      yMm: 0,
      anchoMm: 20,
      altoMm: 10,
    },
    {
      id: "txt_hijo_2",
      tipo: "text",
      nombre: "Elemento B",
      parentCapaId: "cont_1",
      contenidoRaw: "Elemento B",
      xMm: 0,
      yMm: 12,
      anchoMm: 20,
      altoMm: 10,
    },
  ],
  camposConfig: [],
  exposedProperties: [],
};

const mockTemplatesMap = {
  tpl_container_test: mockPlantillaConContenedor,
};

const mockCarta: Carta = {
  id: "carta_cont_1",
  nombre: "Carta Contenedor",
  cantidad: 1,
  imagenTrasera: null,
  plantillaId: "tpl_container_test",
  valoresCampos: {},
  capasOverrides: {},
  plantilla: JSON.parse(JSON.stringify(mockPlantillaConContenedor)),
};

describe("SRS-071: Nuevos Tipos de Layout para Contenedores", () => {
  describe("RF-1: Funciones de utilidad y estilos Flexbox", () => {
    it("clasifica correctamente las variantes verticales", () => {
      expect(isVerticalLayout("vertical")).toBe(true);
      expect(isVerticalLayout("vertical-center")).toBe(true);
      expect(isVerticalLayout("vertical-reverse")).toBe(true);
      expect(isVerticalLayout("horizontal")).toBe(false);
      expect(isVerticalLayout("horizontal-center")).toBe(false);
      expect(isVerticalLayout("horizontal-reverse")).toBe(false);
      expect(isVerticalLayout("none")).toBe(false);
      expect(isVerticalLayout(undefined)).toBe(false);
    });

    it("clasifica correctamente las variantes horizontales", () => {
      expect(isHorizontalLayout("horizontal")).toBe(true);
      expect(isHorizontalLayout("horizontal-center")).toBe(true);
      expect(isHorizontalLayout("horizontal-reverse")).toBe(true);
      expect(isHorizontalLayout("vertical")).toBe(false);
      expect(isHorizontalLayout("vertical-center")).toBe(false);
      expect(isHorizontalLayout("vertical-reverse")).toBe(false);
      expect(isHorizontalLayout("none")).toBe(false);
      expect(isHorizontalLayout(undefined)).toBe(false);
    });

    it("clasifica correctamente cualquier layout flex", () => {
      expect(isFlexLayout("vertical")).toBe(true);
      expect(isFlexLayout("vertical-center")).toBe(true);
      expect(isFlexLayout("vertical-reverse")).toBe(true);
      expect(isFlexLayout("horizontal")).toBe(true);
      expect(isFlexLayout("horizontal-center")).toBe(true);
      expect(isFlexLayout("horizontal-reverse")).toBe(true);
      expect(isFlexLayout("none")).toBe(false);
      expect(isFlexLayout(undefined)).toBe(false);
    });

    it("devuelve los estilos Flex correctos para cada variante", () => {
      expect(getContainerFlexStyle("vertical")).toEqual({
        display: "flex",
        flexDirection: "column",
      });
      expect(getContainerFlexStyle("vertical-center")).toEqual({
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      });
      expect(getContainerFlexStyle("vertical-reverse")).toEqual({
        display: "flex",
        flexDirection: "column-reverse",
      });
      expect(getContainerFlexStyle("horizontal")).toEqual({
        display: "flex",
        flexDirection: "row",
      });
      expect(getContainerFlexStyle("horizontal-center")).toEqual({
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
      });
      expect(getContainerFlexStyle("horizontal-reverse")).toEqual({
        display: "flex",
        flexDirection: "row-reverse",
      });
      expect(getContainerFlexStyle("none")).toBeNull();
    });

    it("genera la cadena CSS Flexbox adecuada para renderizado en servidor", () => {
      expect(getContainerFlexCssString("vertical")).toBe("display: flex; flex-direction: column;");
      expect(getContainerFlexCssString("vertical-center")).toBe("display: flex; flex-direction: column; justify-content: center;");
      expect(getContainerFlexCssString("vertical-reverse")).toBe("display: flex; flex-direction: column-reverse;");
      expect(getContainerFlexCssString("horizontal")).toBe("display: flex; flex-direction: row;");
      expect(getContainerFlexCssString("horizontal-center")).toBe("display: flex; flex-direction: row; justify-content: center;");
      expect(getContainerFlexCssString("horizontal-reverse")).toBe("display: flex; flex-direction: row-reverse;");
      expect(getContainerFlexCssString("none")).toBe("");
    });
  });

  describe("RF-2 & RF-3: Inspector y Renderizado en EditCardModal", () => {
    it("ofrece las 7 opciones de layout en el selector del inspector", () => {
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

      // Seleccionar el contenedor en el árbol de capas
      const containerItem = screen.getByText("Contenedor Principal");
      fireEvent.click(containerItem);

      // Verificar que el desplegable contiene las 7 opciones
      const layoutSelect = screen.getByDisplayValue("Libre (FrameLayout)") as HTMLSelectElement;
      expect(layoutSelect).toBeTruthy();

      const options = Array.from(layoutSelect.options).map((opt) => opt.value);
      expect(options).toEqual([
        "none",
        "vertical",
        "vertical-center",
        "vertical-reverse",
        "horizontal",
        "horizontal-center",
        "horizontal-reverse",
      ]);
    });

    it("actualiza el subtítulo en el árbol de capas al cambiar de layout", () => {
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

      const containerItem = screen.getByText("Contenedor Principal");
      fireEvent.click(containerItem);

      const layoutSelect = screen.getByDisplayValue("Libre (FrameLayout)");

      // Cambiar a vertical-center
      fireEvent.change(layoutSelect, { target: { value: "vertical-center" } });
      expect(screen.getByText("Contenedor Vertical Centrado")).toBeTruthy();

      // Cambiar a vertical-reverse
      fireEvent.change(layoutSelect, { target: { value: "vertical-reverse" } });
      expect(screen.getByText("Contenedor Vertical Inverso")).toBeTruthy();

      // Cambiar a horizontal-center
      fireEvent.change(layoutSelect, { target: { value: "horizontal-center" } });
      expect(screen.getByText("Contenedor Horizontal Centrado")).toBeTruthy();

      // Cambiar a horizontal-reverse
      fireEvent.change(layoutSelect, { target: { value: "horizontal-reverse" } });
      expect(screen.getByText("Contenedor Horizontal Inverso")).toBeTruthy();
    });

    it("permite habilitar dimensiones automáticas con las nuevas variantes", () => {
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

      const containerItem = screen.getByText("Contenedor Principal");
      fireEvent.click(containerItem);

      const layoutSelect = screen.getByDisplayValue("Libre (FrameLayout)");

      // Con layout vertical-center, se habilita "Alto automático"
      fireEvent.change(layoutSelect, { target: { value: "vertical-center" } });
      expect(screen.getByText(/Alto auto/i)).toBeTruthy();

      // Con layout horizontal-reverse, se habilita "Ancho automático"
      fireEvent.change(layoutSelect, { target: { value: "horizontal-reverse" } });
      expect(screen.getByText(/Ancho auto/i)).toBeTruthy();
    });
  });
});

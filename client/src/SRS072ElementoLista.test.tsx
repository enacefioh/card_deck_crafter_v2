// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import EditCardModal from "./EditCardModal";
import {
  cloneLayerTreeWithNewIds,
  isVerticalLayout,
  isHorizontalLayout,
  getContainerFlexStyle,
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

const mockPlantillaConLista = {
  id: "tpl_list_test",
  nombre: "Plantilla con Lista",
  anchoMm: 63.5,
  altoMm: 88.9,
  capas: [
    { id: "bg_1", tipo: "background", colorFill: "#1e293b" },
    {
      id: "list_1",
      tipo: "list",
      nombre: "Lista de Ataques",
      layout: "vertical",
      xMm: 5,
      yMm: 10,
      anchoMm: 50,
      altoMm: "auto",
      childTemplates: [
        {
          id: "tmpl_mele",
          tag: "mele",
          name: "Ataque Melé",
          rootCapa: {
            id: "root_blueprint_1",
            nombre: "Ataque Melé",
            tipo: "text",
            contenidoRaw: "Golpe 10",
            xMm: 0,
            yMm: 0,
            anchoMm: 50,
            altoMm: 10,
          },
          descendantCapas: [],
          exposedProperties: [
            { layerId: "root_blueprint_1", property: "contenidoRaw", label: "Texto Ataque" },
          ],
        },
      ],
    },
    {
      id: "item_inst_1",
      tipo: "text",
      nombre: "Instancia Ataque 1",
      parentCapaId: "list_1",
      contenidoRaw: "Golpe Inicial 5",
      xMm: 0,
      yMm: 0,
      anchoMm: 50,
      altoMm: 10,
    },
  ],
  camposConfig: [],
  exposedProperties: [
    { layerId: "list_1", property: "items", label: "Lista de Ataques > Elementos Lista" },
    { layerId: "item_inst_1", property: "contenidoRaw", label: "Instancia 1 > Contenido" },
  ],
};

const mockTemplatesMap = {
  tpl_list_test: mockPlantillaConLista,
};

const mockCarta: Carta = {
  id: "carta_lista_1",
  nombre: "Guerrero",
  cantidad: 1,
  imagenTrasera: null,
  plantillaId: "tpl_list_test",
  valoresCampos: {},
  capasOverrides: {},
  plantilla: JSON.parse(JSON.stringify(mockPlantillaConLista)),
};

describe("SRS-072: Elemento Lista con Subplantillas Hijas y Gestión Dinámica", () => {
  describe("RF-1 y RF-3: Utilidad cloneLayerTreeWithNewIds y blueprints", () => {
    it("debe clonar una capa raíz simple y asignarle un nuevo ID y el parentCapaId destino", () => {
      const rootCapa = {
        id: "texto_orig",
        nombre: "Texto Habilidad",
        tipo: "text",
        parentCapaId: null,
      };

      const { newRoot, newDescendants, idMap } = cloneLayerTreeWithNewIds(rootCapa, [], "lista_destino");

      expect(newRoot.id).not.toBe("texto_orig");
      expect(newRoot.id).toBeTruthy();
      expect(newRoot.parentCapaId).toBe("lista_destino");
      expect(newDescendants.length).toBe(0);
      expect(idMap.get("texto_orig")).toBe(newRoot.id);
    });

    it("debe clonar un sub-contenedor con descendientes recursivos manteniendo jerarquía", () => {
      const rootContainer = {
        id: "container_root",
        nombre: "Item Card",
        tipo: "container",
        parentCapaId: null,
      };
      const descendants = [
        { id: "child_icon", nombre: "Icono", tipo: "image", parentCapaId: "container_root" },
        { id: "child_label", nombre: "Nombre", tipo: "text", parentCapaId: "container_root" },
      ];

      const { newRoot, newDescendants, idMap } = cloneLayerTreeWithNewIds(
        rootContainer,
        descendants,
        "list_100"
      );

      expect(newRoot.id).not.toBe("container_root");
      expect(newRoot.parentCapaId).toBe("list_100");
      expect(newDescendants.length).toBe(2);

      const clonedIcon = newDescendants.find((c) => c.nombre === "Icono");
      const clonedLabel = newDescendants.find((c) => c.nombre === "Nombre");

      expect(clonedIcon.id).not.toBe("child_icon");
      expect(clonedIcon.parentCapaId).toBe(newRoot.id);
      expect(clonedLabel.id).not.toBe("child_label");
      expect(clonedLabel.parentCapaId).toBe(newRoot.id);
      expect(idMap.get("child_icon")).toBe(clonedIcon.id);
    });
  });

  describe("RF-2: Inspector de Lista en EditCardModal", () => {
    it("debe mostrar el icono 📋 y la sección de lista cuando se selecciona la capa lista", () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <EditCardModal
          carta={mockCarta}
          cardConfig={mockCardConfig}
          templatesMap={mockTemplatesMap}
          generarReversos={false}
          imagenTraseraComun={null}
          onSave={onSave}
          onClose={onClose}
        />
      );

      // En el árbol de capas, debe mostrarse la lista con el icono 📋
      const labelEl = screen.getByText("Lista de Ataques");
      expect(labelEl).toBeDefined();

      // Clicar directamente en el elemento de jerarquía para seleccionarlo
      const hierarchyItem = labelEl.closest(".hierarchy-item") || labelEl;
      fireEvent.click(hierarchyItem);

      // Verificar que el inspector muestra la definición de la lista
      expect(screen.getByText("Definición de Lista")).toBeDefined();
      expect(screen.getByText(/Subplantillas Disponibles/i)).toBeDefined();
      expect(screen.getByDisplayValue("Ataque Melé")).toBeDefined();
    });

    it("permite añadir instancias de la subplantilla a la plantilla", () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <EditCardModal
          carta={mockCarta}
          cardConfig={mockCardConfig}
          templatesMap={mockTemplatesMap}
          generarReversos={false}
          imagenTraseraComun={null}
          onSave={onSave}
          onClose={onClose}
        />
      );

      const labelEl = screen.getByText("Lista de Ataques");
      const hierarchyItem = labelEl.closest(".hierarchy-item") || labelEl;
      fireEvent.click(hierarchyItem);

      // Debe haber un botón para insertar la subplantilla
      const addInstanceBtn = screen.getByRole("button", { name: /➕ Ataque Melé/i });
      expect(addInstanceBtn).toBeDefined();

      fireEvent.click(addInstanceBtn);

      // Tras pulsar el botón, la nueva capa instanciada se selecciona automáticamente
      // y al re-seleccionar la lista, se muestran los elementos en la lista
      fireEvent.click(hierarchyItem);
      expect(screen.getByText(/Elementos en esta lista/i)).toBeDefined();
    });

    it("permite reordenar, duplicar y eliminar elementos de la lista en el inspector", () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <EditCardModal
          carta={mockCarta}
          cardConfig={mockCardConfig}
          templatesMap={mockTemplatesMap}
          generarReversos={false}
          imagenTraseraComun={null}
          onSave={onSave}
          onClose={onClose}
        />
      );

      const labelEl = screen.getByText("Lista de Ataques");
      const hierarchyItem = labelEl.closest(".hierarchy-item") || labelEl;
      fireEvent.click(hierarchyItem);

      // Debe haber botones de duplicar y eliminar en la lista de elementos
      const duplicateButtons = screen.getAllByTitle("Duplicar elemento");
      expect(duplicateButtons.length).toBeGreaterThan(0);

      const deleteButtons = screen.getAllByTitle("Eliminar elemento");
      expect(deleteButtons.length).toBeGreaterThan(0);

      // Duplicar el elemento existente
      fireEvent.click(duplicateButtons[0]);

      // Al duplicar se auto-selecciona la capa creada; re-seleccionamos la lista
      fireEvent.click(hierarchyItem);

      // Comprobar que tras duplicar, hay más botones de duplicar
      const updatedDuplicateButtons = screen.getAllByTitle("Duplicar elemento");
      expect(updatedDuplicateButtons.length).toBe(duplicateButtons.length + 1);

      // Eliminar un elemento
      const updatedDeleteButtons = screen.getAllByTitle("Eliminar elemento");
      fireEvent.click(updatedDeleteButtons[0]);

      const finalDeleteButtons = screen.getAllByTitle("Eliminar elemento");
      expect(finalDeleteButtons.length).toBe(updatedDeleteButtons.length - 1);
    });
  });

  describe("RF-6: Motor de Layout Flexbox en Listas", () => {
    it("aplica estilos Flexbox de columna y fila idénticamente a contenedores y listas", () => {
      expect(isVerticalLayout("vertical")).toBe(true);
      expect(isHorizontalLayout("horizontal")).toBe(true);

      const verticalStyle = getContainerFlexStyle("vertical");
      expect(verticalStyle).toEqual({ display: "flex", flexDirection: "column" });

      const horizontalCenterStyle = getContainerFlexStyle("horizontal-center");
      expect(horizontalCenterStyle).toEqual({
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
      });
    });
  });
});

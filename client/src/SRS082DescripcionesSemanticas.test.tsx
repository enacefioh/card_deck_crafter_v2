// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import EditCardModal from "./EditCardModal";

describe("SRS-082: Descripciones Semánticas en EditCardModal", () => {
  afterEach(() => {
    cleanup();
  });

  const baseCardConfig = {
    anchoMm: 63.5,
    altoMm: 88.9,
    espaciadoXMm: 0,
    espaciadoYMm: 0,
    sangradoMm: 0,
    bordeCorteMm: 0,
    bordeCorteColor: "#000000"
  };

  const mockTemplate = {
    id: "tpl_test_082",
    nombre: "Plantilla Test 082",
    anchoMm: 63.5,
    altoMm: 88.9,
    capas: [
      {
        id: "capa_nombre",
        nombre: "Nombre_Monstruo",
        tipo: "text",
        visible: true,
        xMm: 5,
        yMm: 5,
        anchoMm: 50,
        altoMm: 10,
        contenidoRaw: "DRAGÓN",
        fontSizePt: 14
      }
    ],
    exposedProperties: [
      {
        layerId: "capa_nombre",
        property: "fontSizePt",
        label: "Nombre_Monstruo > Tamaño Fuente"
      }
    ]
  };

  const mockCarta: any = {
    id: "carta_1",
    nombre: "Carta 1",
    imagenTrasera: null,
    cantidad: 1,
    plantillaId: "tpl_test_082",
    plantilla: mockTemplate,
    valoresCampos: {},
    capasOverrides: {}
  };

  it("RF-2 & RF-3: Permite editar la descripción de la capa y añadir una aclaración específica en una propiedad expuesta", () => {
    const onSaveMock = vi.fn();

    render(
      <EditCardModal
        carta={mockCarta}
        cardConfig={baseCardConfig}
        templatesMap={{ tpl_test_082: mockTemplate }}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={onSaveMock}
        onClose={() => {}}
      />
    );

    // 1. Seleccionar la capa "Nombre_Monstruo" en la lista de capas
    const layerItem = screen.getByText("Nombre_Monstruo");
    fireEvent.click(layerItem);

    // 2. Comprobar que aparece el textarea de descripción del elemento (RF-2)
    const layerDescTextarea = screen.getByPlaceholderText(
      /Directrices e indicaciones de este elemento para IA y maquetadores/i
    ) as HTMLTextAreaElement;
    expect(layerDescTextarea).toBeDefined();

    fireEvent.change(layerDescTextarea, {
      target: { value: "Nombre del monstruo, siempre debe ir en mayúsculas" }
    });
    expect(layerDescTextarea.value).toBe("Nombre del monstruo, siempre debe ir en mayúsculas");

    // 3. Comprobar que junto al ojo de la propiedad expuesta aparece el icono 📝 (RF-3)
    const descButtons = document.querySelectorAll(".exposed-desc-trigger-btn");
    expect(descButtons.length).toBeGreaterThan(0);

    // Abrir el popover de aclaración específica
    fireEvent.click(descButtons[0]);

    const popoverTextarea = document.querySelector(".exposed-desc-popover-textarea") as HTMLTextAreaElement;
    expect(popoverTextarea).not.toBeNull();

    fireEvent.change(popoverTextarea, {
      target: { value: "Ajustar entre 12 y 18 pt" }
    });

    const acceptBtn = screen.getByText("Aceptar");
    fireEvent.click(acceptBtn);

    // 4. Guardar cambios en el modal y verificar que tanto la descripción de la capa como la de la propiedad expuesta se guardan
    const saveModalBtn = screen.getByText(/Guardar Cambios/i);
    fireEvent.click(saveModalBtn);

    expect(onSaveMock).toHaveBeenCalledTimes(1);
    const savedPlantilla = onSaveMock.mock.calls[0][4];
    const savedCapa = savedPlantilla.capas.find((c: any) => c.id === "capa_nombre");
    expect(savedCapa.descripcion).toBe("Nombre del monstruo, siempre debe ir en mayúsculas");

    const savedExposed = savedPlantilla.exposedProperties.find(
      (p: any) => p.layerId === "capa_nombre" && p.property === "fontSizePt"
    );
    expect(savedExposed.description).toBe("Ajustar entre 12 y 18 pt");
  });
});

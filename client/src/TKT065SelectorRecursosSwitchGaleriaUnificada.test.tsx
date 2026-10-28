// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import EditCardModal from "./EditCardModal";
import type { Carta, CardConfig } from "shared";

afterEach(() => {
  cleanup();
});

describe("TKT-065: Selector de Recursos Switch y Galería Unificada por Secciones", () => {
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
    template_tkt65: {
      id: "template_tkt65",
      nombre: "Plantilla Test TKT-065",
      capas: [
        {
          id: "layer_switch_1",
          nombre: "Icono Switch",
          tipo: "image-switch",
          src: "",
          options: []
        },
        {
          id: "layer_img_1",
          nombre: "Ilustración Principal",
          tipo: "image",
          src: ""
        }
      ],
      camposConfig: []
    }
  };

  const mockCarta: Carta = {
    id: "card_tkt65",
    nombre: "Carta de Prueba TKT-065",
    imagenTrasera: null,
    cantidad: 1,
    plantillaId: "template_tkt65",
    valoresCampos: {},
    capasOverrides: {}
  };

  const mockAssetFolders = ["Por Defecto", "Personajes", "Objetos"];
  const mockProjectAssets = [
    { id: "p1", nombre: "Espada Común", src: "data:img_espada", folder: "Por Defecto" },
    { id: "p2", nombre: "Mago Elfo", src: "data:img_mago", folder: "Personajes" }
  ];
  const mockTemplateAssets = [
    { id: "t1", nombre: "Marco Dorado", src: "data:img_marco" }
  ];
  const mockUserAssets = [
    { id: "u1", nombre: "Foto Personal", src: "data:img_personal" }
  ];

  it("abre el modal de recursos switch con diseño ancho y todas las pestañas unificadas", () => {
    const { container } = render(
      <EditCardModal
        carta={mockCarta}
        cardConfig={mockCardConfig}
        templatesMap={mockTemplatesMap}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
        assetFolders={mockAssetFolders}
        projectAssets={mockProjectAssets}
        templateAssets={mockTemplateAssets}
        userAssets={mockUserAssets}
      />
    );

    // Seleccionar la capa switch en el árbol de capas
    const switchLayerItem = screen.getByText("Icono Switch");
    fireEvent.click(switchLayerItem);

    // Pulsar el botón para abrir el modal de recursos switch
    const openSwitchBtn = screen.getByText(/Seleccionar recursos/i);
    expect(openSwitchBtn).toBeTruthy();
    fireEvent.click(openSwitchBtn);

    // Verificar que el modal emergente está abierto
    expect(screen.getByText("Seleccionar recursos para el Switch")).toBeTruthy();

    // Comprobar que tiene la clase multimedia-gallery-wide
    const popupContainer = container.querySelector(".gallery-popup-container.multimedia-gallery-wide");
    expect(popupContainer).toBeTruthy();

    // Comprobar la existencia de todas las pestañas con sus contadores
    expect(screen.getByText(/Galería de la Plantilla/i)).toBeTruthy();
    expect(screen.getByText(/Por Defecto/i)).toBeTruthy();
    expect(screen.getByText(/Personajes/i)).toBeTruthy();
    expect(screen.getByText(/Objetos/i)).toBeTruthy();
    expect(screen.getByText(/Galería de Usuario/i)).toBeTruthy();
  });

  it("permite seleccionar recursos de distintas carpetas y guardarlos en las opciones del switch", () => {
    const onSaveMock = vi.fn();

    render(
      <EditCardModal
        carta={mockCarta}
        cardConfig={mockCardConfig}
        templatesMap={mockTemplatesMap}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={onSaveMock}
        onClose={vi.fn()}
        assetFolders={mockAssetFolders}
        projectAssets={mockProjectAssets}
        templateAssets={mockTemplateAssets}
        userAssets={mockUserAssets}
      />
    );

    // Seleccionar capa switch y abrir modal
    fireEvent.click(screen.getByText("Icono Switch"));
    fireEvent.click(screen.getByText(/Seleccionar recursos/i));

    // Por defecto estamos en "Por Defecto", debe verse "Espada Común"
    const espadaItem = screen.getByText("Espada Común");
    expect(espadaItem).toBeTruthy();
    fireEvent.click(espadaItem); // Marcar espada

    // Cambiar a la pestaña "Personajes"
    const tabPersonajes = screen.getByRole("button", { name: /Personajes/i });
    fireEvent.click(tabPersonajes);

    // Debe mostrarse "Mago Elfo"
    const magoItem = screen.getByText("Mago Elfo");
    expect(magoItem).toBeTruthy();
    fireEvent.click(magoItem); // Marcar mago

    // Cambiar a la pestaña "Galería de la Plantilla"
    const tabPlantilla = screen.getByRole("button", { name: /Galería de la Plantilla/i });
    fireEvent.click(tabPlantilla);

    // Debe mostrarse "Marco Dorado"
    const marcoItem = screen.getByText("Marco Dorado");
    expect(marcoItem).toBeTruthy();
    fireEvent.click(marcoItem); // Marcar marco

    // Pulsar Guardar en el modal de recursos switch
    const guardarBtn = screen.getByRole("button", { name: "Guardar" });
    fireEvent.click(guardarBtn);

    // El modal de recursos switch debe cerrarse
    expect(screen.queryByText("Seleccionar recursos para el Switch")).toBeNull();

    // Ahora en el carrusel de opciones del inspector deben aparecer los recursos asignados
    expect(screen.getByText("Espada Común")).toBeTruthy();
    expect(screen.getByText("Mago Elfo")).toBeTruthy();
    expect(screen.getByText("Marco Dorado")).toBeTruthy();
  });

  it("muestra la barra de pestañas unificada en el selector individual de imagen de capa", () => {
    const { container } = render(
      <EditCardModal
        carta={mockCarta}
        cardConfig={mockCardConfig}
        templatesMap={mockTemplatesMap}
        generarReversos={false}
        imagenTraseraComun={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
        assetFolders={mockAssetFolders}
        projectAssets={mockProjectAssets}
        templateAssets={mockTemplateAssets}
        userAssets={mockUserAssets}
      />
    );

    // Seleccionar la capa de imagen normal
    fireEvent.click(screen.getByText("Ilustración Principal"));

    // Pulsar Cargar desde Galería
    const openGalleryBtn = screen.getByText(/Cargar desde Galería/i);
    expect(openGalleryBtn).toBeTruthy();
    fireEvent.click(openGalleryBtn);

    // Verificar que el modal emergente de imagen individual está abierto y es wide
    expect(screen.getByText("Seleccionar de la Galería Multimedia")).toBeTruthy();
    const popupContainer = container.querySelector(".gallery-popup-container.multimedia-gallery-wide");
    expect(popupContainer).toBeTruthy();

    // Comprobar las pestañas
    expect(screen.getByText(/Galería de la Plantilla/i)).toBeTruthy();
    expect(screen.getByText(/Por Defecto/i)).toBeTruthy();
    expect(screen.getByText(/Personajes/i)).toBeTruthy();
    expect(screen.getByText(/Galería de Usuario/i)).toBeTruthy();
  });
});

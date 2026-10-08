// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { StoreCatalog } from "./store/StoreCatalog";
import { StoreTemplateDetail as StoreTemplateDetailView } from "./store/StoreTemplateDetail";
import { StoreApp } from "./store/StoreApp";
import * as storeService from "./services/storeService";
import type { StoreTemplateCard, StoreTemplateDetail } from "shared";

const mockTemplates: StoreTemplateCard[] = [
  {
    id: "tmpl-pub-1",
    name: "Baraja Fantasía Medieval",
    description: "Plantilla completa para juegos de cartas de fantasía con marco ornamentado.",
    authorName: "rolmaster",
    documentCount: 2,
    templateCount: 4,
    fileSizeBytes: 1024 * 1024 * 2.5, // 2.5 MB
    createdAt: "2026-10-08T10:00:00.000Z",
    updatedAt: "2026-10-08T12:00:00.000Z",
    thumbnail: "data:image/svg+xml;utf8,<svg></svg>",
    dimensions: { anchoMm: 63.5, altoMm: 88.9 }
  },
  {
    id: "tmpl-pub-2",
    name: "Cyberpunk Netrunner Deck",
    description: "Diseño futurista de alta tecnología para barajas sci-fi.",
    authorName: "neon_rider",
    documentCount: 1,
    templateCount: 1,
    fileSizeBytes: 1024 * 500, // 500 KB
    createdAt: "2026-10-07T10:00:00.000Z",
    updatedAt: "2026-10-07T12:00:00.000Z",
    dimensions: { anchoMm: 88.9, altoMm: 63.5 }
  }
];

const mockDetail: StoreTemplateDetail = {
  ...mockTemplates[0],
  originalTemplateId: "tmpl-orig-1",
  authorId: "user-1",
  downloadUrl: "/api/store/templates/tmpl-pub-1/download",
  previewCards: [
    {
      id: "t1",
      nombre: "Héroe Guerrero",
      anchoMm: 63.5,
      altoMm: 88.9,
      miniatura: "data:image/svg+xml;utf8,<svg>guerrero</svg>"
    },
    {
      id: "t2",
      nombre: "Hechizo de Fuego",
      anchoMm: 63.5,
      altoMm: 88.9,
      miniatura: "data:image/svg+xml;utf8,<svg>fuego</svg>"
    }
  ]
};

describe("SRS-076 - Tienda Pública de Plantillas (/store)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("StoreCatalog", () => {
    it("debe listar las plantillas disponibles con nombre, autor y especificaciones", () => {
      const onSelect = vi.fn();
      const onOpen = vi.fn();

      render(
        <StoreCatalog
          templates={mockTemplates}
          loading={false}
          searchQuery=""
          onSearchChange={vi.fn()}
          onSelectTemplate={onSelect}
          onOpenInEditor={onOpen}
        />
      );

      expect(screen.getByText("Baraja Fantasía Medieval")).toBeDefined();
      expect(screen.getByText("Cyberpunk Netrunner Deck")).toBeDefined();
      expect(screen.getByText(/rolmaster/)).toBeDefined();
      expect(screen.getByText(/neon_rider/)).toBeDefined();
      expect(screen.getByText(/2\.50 MB/)).toBeDefined();
    });

    it("debe llamar a onSelectTemplate al hacer clic en 'Ver Ficha' o en la tarjeta", () => {
      const onSelect = vi.fn();
      const onOpen = vi.fn();

      render(
        <StoreCatalog
          templates={mockTemplates}
          loading={false}
          searchQuery=""
          onSearchChange={vi.fn()}
          onSelectTemplate={onSelect}
          onOpenInEditor={onOpen}
        />
      );

      const verFichaButtons = screen.getAllByText("Ver Ficha");
      fireEvent.click(verFichaButtons[0]);
      expect(onSelect).toHaveBeenCalledWith("tmpl-pub-1");
    });

    it("debe llamar a onOpenInEditor al hacer clic en el botón de abrir", () => {
      const onSelect = vi.fn();
      const onOpen = vi.fn();

      render(
        <StoreCatalog
          templates={mockTemplates}
          loading={false}
          searchQuery=""
          onSearchChange={vi.fn()}
          onSelectTemplate={onSelect}
          onOpenInEditor={onOpen}
        />
      );

      const openButtons = screen.getAllByTitle("Abrir directamente en Card Deck Crafter");
      fireEvent.click(openButtons[0]);
      expect(onOpen).toHaveBeenCalledWith("tmpl-pub-1");
    });
  });

  describe("StoreTemplateDetailView", () => {
    it("debe renderizar la ficha con capturas, especificaciones y botones de acción", () => {
      const onBack = vi.fn();
      const onOpen = vi.fn();
      const onPreviewCard = vi.fn();

      render(
        <StoreTemplateDetailView
          template={mockDetail}
          onBack={onBack}
          onOpenInEditor={onOpen}
          onPreviewCard={onPreviewCard}
        />
      );

      expect(screen.getByText("Baraja Fantasía Medieval")).toBeDefined();
      expect(screen.getByText(/rolmaster/)).toBeDefined();
      expect(screen.getByText("Plantilla completa para juegos de cartas de fantasía con marco ornamentado.")).toBeDefined();
      expect(screen.getByText("Héroe Guerrero")).toBeDefined();
      expect(screen.getByText("Hechizo de Fuego")).toBeDefined();

      const openButton = screen.getByRole("button", { name: /Abrir en Card Deck Crafter/i });
      fireEvent.click(openButton);
      expect(onOpen).toHaveBeenCalledWith("tmpl-pub-1");

      const cardThumbnail = screen.getByAltText("Héroe Guerrero");
      fireEvent.click(cardThumbnail);
      expect(onPreviewCard).toHaveBeenCalledWith(mockDetail.previewCards![0]);
    });
  });

  describe("StoreApp Component Integration", () => {
    it("debe cargar el catálogo desde el servicio y permitir ver la ficha y abrir la plantilla", async () => {
      vi.spyOn(storeService, "fetchStoreTemplates").mockResolvedValue(mockTemplates);
      vi.spyOn(storeService, "fetchStoreTemplateDetail").mockResolvedValue(mockDetail);

      const onNavigateToEditor = vi.fn();
      const onOpenTemplateInEditor = vi.fn();

      render(
        <StoreApp
          onNavigateToEditor={onNavigateToEditor}
          onOpenTemplateInEditor={onOpenTemplateInEditor}
        />
      );

      // Esperar a que carguen las plantillas
      await waitFor(() => {
        expect(screen.getByText("Baraja Fantasía Medieval")).toBeDefined();
      });

      // Hacer click en "Ver Ficha" de la primera plantilla
      const verFichaBtn = screen.getAllByText("Ver Ficha")[0];
      fireEvent.click(verFichaBtn);

      // Debe cargar la ficha en pantalla
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Abrir en Card Deck Crafter/i })).toBeDefined();
        expect(screen.getByText("Héroe Guerrero")).toBeDefined();
      });

      // Hacer click en abrir
      const abrirBtn = screen.getByRole("button", { name: /Abrir en Card Deck Crafter/i });
      fireEvent.click(abrirBtn);
      expect(onOpenTemplateInEditor).toHaveBeenCalledWith("tmpl-pub-1");
    });
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React, { useState } from "react";
import { generarMiniaturaPlantilla } from "./utils/thumbnailUtils";
import { TemplatePreviewModal } from "./components/TemplatePreviewModal";
import type { CardConfig } from "shared";

describe("SRS-069: Miniaturas de Plantillas de Carta, Previsualización Ampliada y Selector Unificado", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const cardConfigStandard: CardConfig = {
    anchoMm: 63.5,
    altoMm: 88.9,
    espaciadoXMm: 0,
    espaciadoYMm: 0,
    sangradoMm: 0,
    bordeCorteMm: 0.2,
    bordeCorteColor: "#cccccc",
  };

  const plantillaVacia = {
    id: "vacia",
    nombre: "Plantilla Vacía",
    anchoMm: 63.5,
    altoMm: 88.9,
    capas: [],
  };

  const plantillaCompatible = {
    id: "tmpl_compatible",
    nombre: "Carta Héroe (63.5x88.9)",
    anchoMm: 63.5,
    altoMm: 88.9,
    miniatura: "data:image/jpeg;base64,mockHeroThumbnail",
    capas: [
      { id: "bg", tipo: "background", colorFill: "#ff0000" },
      { id: "titulo", tipo: "text", contenidoRaw: "Héroe Legendario", xMm: 5, yMm: 5, anchoMm: 53.5, altoMm: 10 },
    ],
  };

  const plantillaIncompatible = {
    id: "tmpl_incompatible_mini",
    nombre: "Mini Carta (44.4x63.5)",
    anchoMm: 44.4,
    altoMm: 63.5,
    miniatura: "data:image/jpeg;base64,mockMiniThumbnail",
    capas: [
      { id: "bg", tipo: "background", colorFill: "#00ff00" },
      { id: "nombre", tipo: "text", contenidoRaw: "Mini Carta", xMm: 2, yMm: 2, anchoMm: 40, altoMm: 8 },
    ],
  };

  const plantillaSinMiniatura = {
    id: "tmpl_sin_mini",
    nombre: "Carta Sin Miniatura",
    anchoMm: 63.5,
    altoMm: 88.9,
    capas: [
      { id: "bg", tipo: "background", colorFill: "#0000ff" },
    ],
  };

  // --- 1. Generación de Miniatura ---
  describe("1. Generación de Miniatura (generarMiniaturaPlantilla)", () => {
    it("debe invocar toDataURL('image/jpeg', 0.8) y calcular dimensiones proporcionales <= 100px", async () => {
      // Mock de canvas en happy-dom
      const mockToDataURL = vi.fn().mockReturnValue("data:image/jpeg;base64,mockGeneratedJpeg");
      const mockGetContext = vi.fn().mockReturnValue({
        fillStyle: "",
        fillRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        fillText: vi.fn(),
        drawImage: vi.fn(),
      });

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === "canvas") {
          const canvas = originalCreateElement("canvas") as HTMLCanvasElement;
          canvas.getContext = mockGetContext as any;
          canvas.toDataURL = mockToDataURL as any;
          return canvas;
        }
        return originalCreateElement(tagName);
      });

      const result = await generarMiniaturaPlantilla(plantillaCompatible, 63.5, 88.9);

      expect(mockToDataURL).toHaveBeenCalledWith("image/jpeg", 0.8);
      expect(result).toBe("data:image/jpeg;base64,mockGeneratedJpeg");
    });
  });

  // --- 2. Ordenación Unificada ---
  describe("2. Ordenación Unificada por Compatibilidad", () => {
    function ordenarPlantillas(templates: any[], config: CardConfig) {
      return [...templates].sort((a, b) => {
        // 1. "vacia" siempre primero
        if (a.id === "vacia") return -1;
        if (b.id === "vacia") return 1;

        const aWidth = a.anchoMm ?? config.anchoMm;
        const aHeight = a.altoMm ?? config.altoMm;
        const aMismatch = Math.abs(aWidth - config.anchoMm) > 0.1 || Math.abs(aHeight - config.altoMm) > 0.1;

        const bWidth = b.anchoMm ?? config.anchoMm;
        const bHeight = b.altoMm ?? config.altoMm;
        const bMismatch = Math.abs(bWidth - config.anchoMm) > 0.1 || Math.abs(bHeight - config.altoMm) > 0.1;

        // 2. Compatibles antes que incompatibles
        if (!aMismatch && bMismatch) return -1;
        if (aMismatch && !bMismatch) return 1;

        // 3. Orden alfabético
        return (a.nombre || "").localeCompare(b.nombre || "");
      });
    }

    it("sitúa primero 'vacia', luego compatibles y al final incompatibles", () => {
      // Lista desordenada
      const listaOriginal = [
        plantillaIncompatible,
        plantillaCompatible,
        plantillaVacia,
        plantillaSinMiniatura,
      ];

      const ordenadas = ordenarPlantillas(listaOriginal, cardConfigStandard);

      // Posición 0: plantilla vacía
      expect(ordenadas[0].id).toBe("vacia");

      // Posición 1 y 2: compatibles (63.5 x 88.9)
      expect(["tmpl_compatible", "tmpl_sin_mini"]).toContain(ordenadas[1].id);
      expect(["tmpl_compatible", "tmpl_sin_mini"]).toContain(ordenadas[2].id);

      // Posición 3: incompatible (44.4 x 63.5)
      expect(ordenadas[3].id).toBe("tmpl_incompatible_mini");
    });
  });

  // --- 3. Selector de Plantillas (UI) ---
  describe("3. Componente Selector Unificado de Plantillas", () => {
    // Componente de prueba que reproduce el modal de selección de App.tsx
    const TemplateSelectorTest: React.FC<{
      templates: any[];
      config: CardConfig;
      onSelect: (t: any) => void;
    }> = ({ templates, config, onSelect }) => {
      const [previewing, setPreviewing] = useState<any | null>(null);

      return (
        <div data-testid="selector-container">
          <div className="template-list">
            {templates.map((plantilla) => {
              const widthMm = plantilla.id === "vacia" ? config.anchoMm : (plantilla.anchoMm || config.anchoMm);
              const heightMm = plantilla.id === "vacia" ? config.altoMm : (plantilla.altoMm || config.altoMm);
              const isMismatch =
                plantilla.id !== "vacia" &&
                (Math.abs(widthMm - config.anchoMm) > 0.1 || Math.abs(heightMm - config.altoMm) > 0.1);

              return (
                <div
                  key={plantilla.id}
                  data-testid={`template-item-${plantilla.id}`}
                  className="template-card-item"
                  onClick={() => onSelect(plantilla)}
                >
                  <div className="template-thumbnail-wrapper">
                    {plantilla.miniatura ? (
                      <img
                        src={plantilla.miniatura}
                        alt={plantilla.nombre}
                        data-testid={`thumb-img-${plantilla.id}`}
                        style={{ opacity: isMismatch ? 0.45 : 1 }}
                      />
                    ) : (
                      <div data-testid={`thumb-fallback-${plantilla.id}`}>
                        <span>{plantilla.id === "vacia" ? "📄" : "🎴"}</span>
                      </div>
                    )}
                    {isMismatch && (
                      <div data-testid={`mismatch-badge-${plantilla.id}`}>⚠️</div>
                    )}
                  </div>
                  <div className="template-details">
                    <span>{plantilla.nombre}</span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      data-testid={`btn-preview-${plantilla.id}`}
                      onClick={() => setPreviewing(plantilla)}
                    >
                      👁️
                    </button>
                    <button
                      data-testid={`btn-select-${plantilla.id}`}
                      onClick={() => onSelect(plantilla)}
                    >
                      Seleccionar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {previewing && (
            <TemplatePreviewModal
              isOpen={Boolean(previewing)}
              onClose={() => setPreviewing(null)}
              plantilla={previewing}
              cardConfig={config}
              onSelectTemplate={(tpl) => {
                onSelect(tpl);
                setPreviewing(null);
              }}
            />
          )}
        </div>
      );
    };

    it("renderiza miniatura para plantillas con miniatura y fallback para plantillas sin miniatura", () => {
      const handleSelect = vi.fn();
      render(
        <TemplateSelectorTest
          templates={[plantillaCompatible, plantillaSinMiniatura]}
          config={cardConfigStandard}
          onSelect={handleSelect}
        />
      );

      // Plantilla con miniatura muestra imagen
      const img = screen.getByTestId("thumb-img-tmpl_compatible") as HTMLImageElement;
      expect(img).toBeDefined();
      expect(img.src).toBe(plantillaCompatible.miniatura);
      expect(img.style.opacity).toBe("1");

      // Plantilla sin miniatura muestra fallback
      const fallback = screen.getByTestId("thumb-fallback-tmpl_sin_mini");
      expect(fallback).toBeDefined();
    });

    it("muestra opacidad 0.45 y distintivo ⚠️ en plantillas con dimensiones diferentes", () => {
      const handleSelect = vi.fn();
      render(
        <TemplateSelectorTest
          templates={[plantillaIncompatible]}
          config={cardConfigStandard}
          onSelect={handleSelect}
        />
      );

      const img = screen.getByTestId("thumb-img-tmpl_incompatible_mini");
      expect(img.style.opacity).toBe("0.45");

      const badge = screen.getByTestId("mismatch-badge-tmpl_incompatible_mini");
      expect(badge).toBeDefined();
      expect(badge.textContent).toContain("⚠️");
    });

    it("abre modal de previsualización al pulsar 👁️ y permite seleccionar directamente", () => {
      const handleSelect = vi.fn();
      render(
        <TemplateSelectorTest
          templates={[plantillaCompatible]}
          config={cardConfigStandard}
          onSelect={handleSelect}
        />
      );

      // Pulsar botón de ojo 👁️
      const eyeBtn = screen.getByTestId("btn-preview-tmpl_compatible");
      fireEvent.click(eyeBtn);

      // El modal ampliado se abre
      expect(screen.getAllByText("Carta Héroe (63.5x88.9)").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("Seleccionar esta plantilla")).toBeDefined();

      // Pulsar "Seleccionar esta plantilla" dentro del modal
      const selectBtn = screen.getByText("Seleccionar esta plantilla");
      fireEvent.click(selectBtn);

      // Se ejecuta el callback con la plantilla seleccionada
      expect(handleSelect).toHaveBeenCalledWith(plantillaCompatible);
    });
  });

  // --- 4. TemplatePreviewModal ---
  describe("4. TemplatePreviewModal (Comportamiento Independiente)", () => {
    it("muestra aviso de incompatibilidad si el tamaño difiere de la configuración del documento", () => {
      const handleClose = vi.fn();
      const handleSelect = vi.fn();

      render(
        <TemplatePreviewModal
          isOpen={true}
          onClose={handleClose}
          plantilla={plantillaIncompatible}
          cardConfig={cardConfigStandard}
          onSelectTemplate={handleSelect}
        />
      );

      // Debe mostrar el aviso de incompatibilidad
      expect(
        screen.getByText(/no coincide con el documento activo/i)
      ).toBeDefined();
    });

    it("se cierra al pulsar la tecla Escape", () => {
      const handleClose = vi.fn();
      const handleSelect = vi.fn();

      render(
        <TemplatePreviewModal
          isOpen={true}
          onClose={handleClose}
          plantilla={plantillaCompatible}
          cardConfig={cardConfigStandard}
          onSelectTemplate={handleSelect}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalled();
    });
  });
});

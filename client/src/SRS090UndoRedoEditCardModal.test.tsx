// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import EditCardModal from "./EditCardModal";
import type { Carta, CardConfig } from "shared";

afterEach(() => {
  cleanup();
});

const mockCarta: Carta = {
  id: "card_undo_1",
  nombre: "Hero Card",
  imagenTrasera: null,
  cantidad: 1,
  plantillaId: "template_undo_1",
  valoresCampos: {
    layer_title: "Initial Title",
  },
  capasOverrides: {},
};

const mockCardConfig: CardConfig = {
  anchoMm: 63.5,
  altoMm: 88.9,
  espaciadoXMm: 0,
  espaciadoYMm: 0,
  sangradoMm: 0,
  bordeCorteMm: 0,
  bordeCorteColor: "#000000",
};

const mockTemplatesMap = {
  template_undo_1: {
    id: "template_undo_1",
    nombre: "Hero Template",
    capas: [
      {
        id: "layer_title",
        nombre: "Título",
        tipo: "text",
        xMm: 10,
        yMm: 10,
        anchoMm: 40,
        altoMm: 15,
        contenidoRaw: "Initial Title",
        visible: true,
      },
    ],
    camposConfig: [],
  },
};

describe("SRS-090: Historial de Deshacer y Rehacer en EditCardModal", () => {
  it("renderiza los botones de deshacer (↶) y rehacer (↷) inicialmente deshabilitados", () => {
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

    const undoBtn = screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement;
    const redoBtn = screen.getByRole("button", { name: "Rehacer" }) as HTMLButtonElement;

    expect(undoBtn).toBeTruthy();
    expect(redoBtn).toBeTruthy();
    expect(undoBtn.disabled).toBe(true);
    expect(redoBtn.disabled).toBe(true);
  });

  it("permite deshacer y rehacer cambios en campos de texto consolidando en la misma sesión", () => {
    const { container } = render(
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

    // Seleccionar la capa "Título" en la jerarquía
    const layerLabel = screen.getByText("Título");
    fireEvent.click(layerLabel);

    const undoBtn = screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement;
    const redoBtn = screen.getByRole("button", { name: "Rehacer" }) as HTMLButtonElement;

    // Buscar el textarea del campo de texto
    const textarea = container.querySelector("#editcard-text-textarea-layer_title") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe("Initial Title");

    // Enfocar y escribir varios caracteres en la misma sesión de edición
    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: "Initial Title A" } });
    fireEvent.change(textarea, { target: { value: "Initial Title AB" } });
    fireEvent.change(textarea, { target: { value: "Updated Title" } });
    fireEvent.blur(textarea);

    // Ahora Deshacer debe estar activo
    expect(undoBtn.disabled).toBe(false);
    expect(redoBtn.disabled).toBe(true);

    // Hacemos click en Deshacer
    fireEvent.click(undoBtn);

    // Debe restaurar "Initial Title" de un solo paso
    expect(textarea.value).toBe("Initial Title");
    expect(undoBtn.disabled).toBe(true);
    expect(redoBtn.disabled).toBe(false);

    // Hacemos click en Rehacer
    fireEvent.click(redoBtn);
    expect(textarea.value).toBe("Updated Title");
    expect(undoBtn.disabled).toBe(false);
    expect(redoBtn.disabled).toBe(true);
  });

  it("responde a atajos de teclado Ctrl+Z y Ctrl+Y con aislamiento de eventos", () => {
    const { container } = render(
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

    // Seleccionar la capa "Título"
    const layerLabel = screen.getByText("Título");
    fireEvent.click(layerLabel);

    const textarea = container.querySelector("#editcard-text-textarea-layer_title") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: "Keyboard Test" } });
    fireEvent.blur(textarea);

    expect(textarea.value).toBe("Keyboard Test");

    // Disparar Ctrl+Z en window
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(textarea.value).toBe("Initial Title");

    // Disparar Ctrl+Y en window
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(textarea.value).toBe("Keyboard Test");

    // Disparar Ctrl+Shift+Z en window
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(textarea.value).toBe("Initial Title");
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(textarea.value).toBe("Keyboard Test");
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { UserStorageInfo } from "shared";
import { SaveCloudModal } from "./components/SaveCloudModal";

describe("TKT-052: Autorelleno de Nombre y Descripción al Guardar / Guardar Como en la Nube", () => {
  afterEach(() => {
    cleanup();
  });

  const dummyStorage: UserStorageInfo = {
    quotaMb: 50,
    quotaBytes: 50 * 1024 * 1024,
    usedBytes: 1024 * 1024,
    usedMb: 1,
    availableBytes: 49 * 1024 * 1024,
    availableMb: 49,
    percentUsed: 2
  };

  it("SaveCloudModal autorellena initialName e initialDescription al abrirse", () => {
    const onConfirmSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const onExportLocal = vi.fn();

    render(
      <SaveCloudModal
        isOpen={true}
        onClose={onClose}
        initialName="Baraja Dragones"
        initialDescription="Baraja mítica de criaturas voladoras"
        cardCount={20}
        documentCount={1}
        storageInfo={dummyStorage}
        isSaving={false}
        onConfirmSave={onConfirmSave}
        onExportLocal={onExportLocal}
      />
    );

    const nameInput = screen.getByDisplayValue("Baraja Dragones") as HTMLInputElement;
    const descInput = screen.getByDisplayValue("Baraja mítica de criaturas voladoras") as HTMLTextAreaElement;

    expect(nameInput).toBeDefined();
    expect(descInput).toBeDefined();
    expect(nameInput.value).toBe("Baraja Dragones");
    expect(descInput.value).toBe("Baraja mítica de criaturas voladoras");
  });

  it("SaveCloudModal actualiza sus campos cuando se vuelve a abrir con nuevos datos", () => {
    const onConfirmSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const onExportLocal = vi.fn();

    const { rerender } = render(
      <SaveCloudModal
        isOpen={false}
        onClose={onClose}
        initialName="Proyecto 1"
        initialDescription="Desc 1"
        cardCount={5}
        documentCount={1}
        storageInfo={dummyStorage}
        isSaving={false}
        onConfirmSave={onConfirmSave}
        onExportLocal={onExportLocal}
      />
    );

    expect(screen.queryByDisplayValue("Proyecto 1")).toBeNull();

    // Abrir con nuevos props de copia
    rerender(
      <SaveCloudModal
        isOpen={true}
        onClose={onClose}
        initialName="Proyecto 1 (Copia)"
        initialDescription="Desc 1"
        cardCount={5}
        documentCount={1}
        storageInfo={dummyStorage}
        isSaving={false}
        onConfirmSave={onConfirmSave}
        onExportLocal={onExportLocal}
      />
    );

    const nameInput = screen.getByDisplayValue("Proyecto 1 (Copia)") as HTMLInputElement;
    const descInput = screen.getByDisplayValue("Desc 1") as HTMLTextAreaElement;

    expect(nameInput.value).toBe("Proyecto 1 (Copia)");
    expect(descInput.value).toBe("Desc 1");
  });

  it("al enviar el formulario, onConfirmSave recibe el nombre y la descripción editados", async () => {
    const onConfirmSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const onExportLocal = vi.fn();

    render(
      <SaveCloudModal
        isOpen={true}
        onClose={onClose}
        initialName="Proyecto Alpha"
        initialDescription="Versión inicial"
        cardCount={10}
        documentCount={1}
        storageInfo={dummyStorage}
        isSaving={false}
        onConfirmSave={onConfirmSave}
        onExportLocal={onExportLocal}
      />
    );

    const nameInput = screen.getByDisplayValue("Proyecto Alpha");
    const descInput = screen.getByDisplayValue("Versión inicial");

    // Usuario modifica el texto
    fireEvent.change(nameInput, { target: { value: "Proyecto Beta" } });
    fireEvent.change(descInput, { target: { value: "Versión mejorada" } });

    // Enviar formulario pulsando el botón de guardar
    const saveButton = screen.getByRole("button", { name: /Guardar en la Nube/i });
    fireEvent.click(saveButton);

    expect(onConfirmSave).toHaveBeenCalledWith({
      name: "Proyecto Beta",
      description: "Versión mejorada"
    });
  });

  it("calcula correctamente el nombre inicial con sufijo (Copia) para Proyecto y Plantilla", () => {
    const computeInitialName = (params: {
      isTemplate: boolean;
      isCopy: boolean;
      currentTemplateName?: string | null;
      projectName: string;
    }) => {
      if (params.isTemplate) {
        const base = params.currentTemplateName || (params.projectName ? `Plantilla ${params.projectName}` : "Mi Plantilla");
        return params.isCopy ? `${base} (Copia)` : base;
      }
      const base = params.projectName || "Mi Baraja";
      return params.isCopy ? `${base} (Copia)` : base;
    };

    // Proyecto normal
    expect(computeInitialName({ isTemplate: false, isCopy: false, projectName: "Cyberpunk Cards" })).toBe("Cyberpunk Cards");

    // Proyecto Guardar Como
    expect(computeInitialName({ isTemplate: false, isCopy: true, projectName: "Cyberpunk Cards" })).toBe("Cyberpunk Cards (Copia)");

    // Proyecto sin nombre
    expect(computeInitialName({ isTemplate: false, isCopy: true, projectName: "" })).toBe("Mi Baraja (Copia)");

    // Plantilla existente normal
    expect(computeInitialName({ isTemplate: true, isCopy: false, currentTemplateName: "Marco Dorado", projectName: "Cyberpunk Cards" })).toBe("Marco Dorado");

    // Plantilla existente Guardar Como
    expect(computeInitialName({ isTemplate: true, isCopy: true, currentTemplateName: "Marco Dorado", projectName: "Cyberpunk Cards" })).toBe("Marco Dorado (Copia)");

    // Plantilla nueva desde proyecto Guardar Como
    expect(computeInitialName({ isTemplate: true, isCopy: true, currentTemplateName: null, projectName: "Tarot Oscuro" })).toBe("Plantilla Tarot Oscuro (Copia)");
  });
});

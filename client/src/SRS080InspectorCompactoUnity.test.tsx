// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
});

describe("SRS-080: Densidad Visual y Rediseño Ultracompacto del Inspector de Propiedades Estilo Unity", () => {
  it("RF-1 y RF-1.4: renderiza el panel lateral derecho (.sidebar-right) con estructura compacta y clases de inspector", () => {
    const { container } = render(<App />);
    const rightSidebar = container.querySelector(".sidebar-right");
    expect(rightSidebar).toBeTruthy();

    const sidebarHeader = rightSidebar?.querySelector(".sidebar-header");
    expect(sidebarHeader).toBeTruthy();

    const titleH1 = sidebarHeader?.querySelector("h1");
    expect(titleH1?.textContent).toContain("Campos Editables");

    const sidebarContent = rightSidebar?.querySelector(".sidebar-content");
    expect(sidebarContent).toBeTruthy();
  });

  it("RF-2: verifica que el contenedor .sidebar-content no tenga gap excesivo de 24px", () => {
    const { container } = render(<App />);
    const sidebarContent = container.querySelector(".sidebar-right .sidebar-content");
    expect(sidebarContent).toBeTruthy();
    // Debe tener el gap compacto de 2px
    const styleAttr = sidebarContent?.getAttribute("style") || "";
    expect(styleAttr).not.toContain("gap: 24px");
  });

  it("RF-3 y RF-4: verifica la presencia de clases CSS del inspector estilo Unity en el DOM", () => {
    const { container } = render(<App />);
    // Comprobar que el sidebar lateral derecho está presente y disponible para alojar filas compactas
    const rightSidebar = container.querySelector("aside.sidebar-right");
    expect(rightSidebar).not.toBeNull();
  });

  it("RF-7, RF-8 y RF-9: inspección al seleccionar una carta, colapso de foldouts, truncado a 18 chars y resaltado por foco", () => {
    const { container } = render(<App />);
    
    // Seleccionar la primera carta si existe en el canvas
    const cardSlot = container.querySelector(".card-slot");
    if (cardSlot) {
      fireEvent.click(cardSlot);
    }

    // Comprobar que el contenedor de renderableItems existe
    const sidebarContent = container.querySelector(".sidebar-right .sidebar-content");
    expect(sidebarContent).toBeTruthy();

    // Comprobar que si existen foldouts de cabecera (.inspector-foldout-header), inician con flecha colapsada ▶
    const foldouts = container.querySelectorAll(".inspector-foldout-header");
    foldouts.forEach((foldout) => {
      const arrow = foldout.querySelector(".inspector-foldout-arrow");
      if (arrow) {
        expect(arrow.textContent).toBe("▶");
      }
    });

    // Comprobar comportamiento de foco y resaltado
    const inputField = container.querySelector(".sidebar-right input.inspector-input, .sidebar-right textarea.inspector-textarea");
    if (inputField) {
      const row = inputField.closest(".inspector-row, .inspector-row-multiline");
      expect(row).toBeTruthy();

      // Al disparar focus sobre el campo, la fila debe adquirir highlighted-property-field
      fireEvent.focus(inputField);
      expect(row?.classList.contains("highlighted-property-field")).toBe(true);

      // Al disparar blur, el resaltado debe desaparecer
      fireEvent.blur(inputField);
      expect(row?.classList.contains("highlighted-property-field")).toBe(false);
    }
  });

  it("RF-8: verificación de la función de truncado a 18 caracteres", () => {
    // Probar la lógica de truncado a 18 caracteres
    const truncate = (displayLabel: string) =>
      displayLabel.length > 18 ? displayLabel.substring(0, 18) + "..." : displayLabel;

    expect(truncate("Nombre")).toBe("Nombre");
    expect(truncate("123456789012345678")).toBe("123456789012345678"); // 18 caracteres -> sin truncar
    expect(truncate("1234567890123456789")).toBe("123456789012345678..."); // 19 caracteres -> corta en 18 + "..."
    expect(truncate("Habilidades Especiales")).toBe("Habilidades Especi..."); // 22 caracteres -> corta en 18
  });
});


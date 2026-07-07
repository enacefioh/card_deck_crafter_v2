// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
});

describe("App Component - Template Card Addition (SRS-041)", () => {
  it("restablece templateModalMode a addCard al hacer clic en Añadir Carta desde Plantilla en el panel lateral", async () => {
    const { container } = render(<App />);
    
    // El botón para añadir carta desde plantilla está en el panel lateral, lo buscamos por clase
    const addBtn = container.querySelector(".btn-secondary") as HTMLButtonElement;
    expect(addBtn).toBeTruthy();
    
    // Simulamos el clic para abrir el modal
    fireEvent.click(addBtn);
    
    // Verificamos que el modal se renderiza buscando por su clase de contenedor
    const modal = container.querySelector(".template-modal-container");
    expect(modal).toBeTruthy();
    
    // Verificamos que el título h2 sea correcto
    const h2 = container.querySelector(".template-modal-header h2");
    expect(h2?.textContent).toBe("Añadir Carta desde Plantilla");
  });
});

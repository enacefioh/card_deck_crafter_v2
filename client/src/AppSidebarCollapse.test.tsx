// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
});

describe("App Component - Sidebar Collapse (SRS-042)", () => {
  it("permite colapsar y expandir la barra lateral izquierda y derecha", () => {
    const { container } = render(<App />);

    // Buscamos el botón de colapso izquierdo
    const leftCollapseBtn = container.querySelector('button[title="Colapsar panel lateral izquierdo"]') as HTMLButtonElement;
    expect(leftCollapseBtn).toBeTruthy();

    // Colapsamos la barra izquierda
    fireEvent.click(leftCollapseBtn);

    // Verificamos que la barra izquierda tiene la clase collapsed
    const leftSidebar = container.querySelector(".sidebar");
    expect(leftSidebar?.classList.contains("collapsed")).toBe(true);

    // Buscamos el botón de colapso derecho
    const rightCollapseBtn = container.querySelector('button[title="Colapsar panel lateral derecho"]') as HTMLButtonElement;
    expect(rightCollapseBtn).toBeTruthy();

    // Colapsamos la barra derecha
    fireEvent.click(rightCollapseBtn);

    // Verificamos que la barra derecha tiene la clase collapsed
    const rightSidebar = container.querySelector(".sidebar-right");
    expect(rightSidebar?.classList.contains("collapsed")).toBe(true);

    // Ahora expandimos ambas
    const leftExpandBtn = container.querySelector('button[title="Expandir panel lateral izquierdo"]') as HTMLButtonElement;
    expect(leftExpandBtn).toBeTruthy();
    fireEvent.click(leftExpandBtn);
    expect(leftSidebar?.classList.contains("collapsed")).toBe(false);

    const rightExpandBtn = container.querySelector('button[title="Expandir panel lateral derecho"]') as HTMLButtonElement;
    expect(rightExpandBtn).toBeTruthy();
    fireEvent.click(rightExpandBtn);
    expect(rightSidebar?.classList.contains("collapsed")).toBe(false);
  });
});

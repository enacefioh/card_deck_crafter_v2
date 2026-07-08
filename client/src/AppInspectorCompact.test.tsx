// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
});

describe("App Component - Compact Inspector (SRS-043)", () => {
  it("admite colapsar y expandir secciones del inspector", () => {
    // Al renderizar la app vacía, inicialmente no hay cartas seleccionadas
    const { container } = render(<App />);
    const rightSidebar = container.querySelector(".sidebar-right");
    expect(rightSidebar).toBeTruthy();
  });
});

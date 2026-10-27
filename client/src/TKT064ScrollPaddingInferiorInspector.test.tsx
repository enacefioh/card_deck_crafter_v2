// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import App from "./App";
import fs from "node:fs";
import path from "node:path";

afterEach(() => {
  cleanup();
});

describe("TKT-064: Scroll completo y padding inferior de 100px en el inspector lateral derecho del lienzo", () => {
  it("RF-1: verifica que .sidebar-right y .sidebar-content posean min-height: 0 en el DOM para evitar desbordamientos flexbox", () => {
    const { container } = render(<App />);
    const rightSidebar = container.querySelector(".sidebar-right");
    expect(rightSidebar).toBeTruthy();

    const sidebarContent = rightSidebar?.querySelector(".sidebar-content");
    expect(sidebarContent).toBeTruthy();

    // Comprobar que en style inline o clases aplicadas se previene la altura minima auto
    const contentStyle = sidebarContent?.getAttribute("style") || "";
    expect(contentStyle).toContain("min-height: 0");
  });

  it("RF-2: verifica que el archivo App.css contenga las reglas de min-height: 0, overflow: hidden y padding-bottom de 100px para el inspector", () => {
    const cssPath = path.resolve(__dirname, "App.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Verificar padding inferior de 100px en el inspector derecho
    expect(cssContent).toMatch(/\.sidebar-right\s+\.sidebar-content\s*\{[^}]*padding:\s*6px\s+10px\s+100px/s);

    // Verificar min-height: 0 en .sidebar-right .sidebar-content
    expect(cssContent).toMatch(/\.sidebar-right\s+\.sidebar-content\s*\{[^}]*min-height:\s*0/s);

    // Verificar overflow: hidden y min-height: 0 en .sidebar-right
    expect(cssContent).toMatch(/\.sidebar-right\s*\{[^}]*overflow:\s*hidden/s);
    expect(cssContent).toMatch(/\.sidebar-right\s*\{[^}]*min-height:\s*0/s);

    // Verificar flex-shrink: 0 en las cabeceras fijas del panel
    expect(cssContent).toMatch(/\.sidebar-right\s+\.sidebar-header\s*\{[^}]*flex-shrink:\s*0/s);
    expect(cssContent).toMatch(/\.inspector-tabs-container\s*\{[^}]*flex-shrink:\s*0/s);
  });
});

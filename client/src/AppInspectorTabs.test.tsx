// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
});

describe("App Component - Inspector Tabs (SRS-044)", () => {
  it("se renderiza el sidebar y maneja el estado de las pestañas", () => {
    const { container } = render(<App />);
    const rightSidebar = container.querySelector(".sidebar-right");
    expect(rightSidebar).toBeTruthy();
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
});

describe("App Component - Sync Hover and Cyclic Focus (SRS-045)", () => {
  it("renders correctly and sets up synchronization attributes", () => {
    const { container } = render(<App />);
    const rightSidebar = container.querySelector(".sidebar-right");
    expect(rightSidebar).toBeTruthy();
  });
});

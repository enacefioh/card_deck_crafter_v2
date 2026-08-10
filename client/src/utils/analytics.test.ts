// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initAnalytics, trackEvent, isAnalyticsActive, resetAnalyticsStateForTesting } from "./analytics";

describe("analytics - Integración de Google Analytics 4 (SRS-060)", () => {
  beforeEach(() => {
    resetAnalyticsStateForTesting();
    if (typeof document !== "undefined") {
      const existingScript = document.getElementById("ga-gtag-script");
      if (existingScript) existingScript.remove();
    }
    if (typeof window !== "undefined") {
      delete (window as any).gtag;
      delete (window as any).dataLayer;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("debe permanecer inactivo si /api/config responde con un ID vacío o no configurado", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ googleAnalyticsId: "" })
      } as Response)
    );

    await initAnalytics();

    expect(isAnalyticsActive()).toBe(false);
    expect(document.getElementById("ga-gtag-script")).toBeNull();
  });

  it("debe inicializar GA4 e inyectar el script si /api/config responde con un ID válido (G-XXXXXXXXXX)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ googleAnalyticsId: "G-TEST123456" })
      } as Response)
    );

    await initAnalytics();

    expect(isAnalyticsActive()).toBe(true);
    const script = document.getElementById("ga-gtag-script") as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.src).toContain("https://www.googletagmanager.com/gtag/js?id=G-TEST123456");
  });

  it("no debe fallar al llamar a trackEvent cuando la analítica está inactiva (no-op seguro)", () => {
    expect(() => {
      trackEvent("export_pdf", { num_cartas: 5 });
    }).not.toThrow();
  });
});

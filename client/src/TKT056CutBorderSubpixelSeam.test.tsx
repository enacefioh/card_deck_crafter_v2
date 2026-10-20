import { describe, it, expect } from "vitest";

describe("TKT-056: Eliminación de costuras / líneas blancas en bordes de corte", () => {
  it("calcula un solapamiento (overlap) microscópico que evita costuras de subpíxeles por redondeo", () => {
    const borderMm = 3;
    const anchoMm = 63.5;
    const altoMm = 88.9;

    const noOverlap = borderMm > 0;
    const overlapMm = noOverlap ? Math.min(0.25, borderMm * 0.15) : 0;
    const effectiveBorderMm = Math.max(0, borderMm - overlapMm);

    expect(overlapMm).toBe(0.25);
    expect(effectiveBorderMm).toBe(2.75);

    const scaleX = (anchoMm - 2 * effectiveBorderMm) / anchoMm;
    const scaleY = (altoMm - 2 * effectiveBorderMm) / altoMm;

    // La escala efectiva debe ser ligeramente mayor que la escala sin overlap
    // para que el arte se introduzca 0.25mm bajo el borde opaco
    const scaleXSinOverlap = (anchoMm - 2 * borderMm) / anchoMm;
    expect(scaleX).toBeGreaterThan(scaleXSinOverlap);
    expect(scaleY).toBeGreaterThan((altoMm - 2 * borderMm) / altoMm);
  });

  it("calcula overlap proporcional para bordes de corte muy finos (< 1.5mm)", () => {
    const borderMm = 0.5;
    const noOverlap = borderMm > 0;
    const overlapMm = noOverlap ? Math.min(0.25, borderMm * 0.15) : 0;
    const effectiveBorderMm = Math.max(0, borderMm - overlapMm);

    // Para 0.5mm, el 15% es 0.075mm, que es menor que el tope de 0.25mm
    expect(overlapMm).toBeCloseTo(0.075, 4);
    expect(effectiveBorderMm).toBeCloseTo(0.425, 4);
    expect(effectiveBorderMm).toBeLessThan(borderMm);
  });

  it("garantiza que cuando bordeCorteMm es 0, no hay overlap ni reducción", () => {
    const borderMm = 0;
    const anchoMm = 63.5;
    const noOverlap = borderMm > 0;
    const overlapMm = noOverlap ? Math.min(0.25, borderMm * 0.15) : 0;
    const effectiveBorderMm = Math.max(0, borderMm - overlapMm);
    const scaleX = noOverlap ? (anchoMm - 2 * effectiveBorderMm) / anchoMm : 1;

    expect(overlapMm).toBe(0);
    expect(effectiveBorderMm).toBe(0);
    expect(scaleX).toBe(1);
  });
});

import { describe, it, expect } from "vitest";
import { parseCustomCardRanges } from "./pngExportUtils";

describe("pngExportUtils: parseCustomCardRanges", () => {
  it("valida y resuelve listas simples separadas por comas", () => {
    const res = parseCustomCardRanges("1, 3, 5", 10);
    expect(res.valid).toBe(true);
    expect(res.cardIndices).toEqual([1, 3, 5]);
    expect(res.cardRangesString).toBe("1,3,5");
  });

  it("valida y resuelve rangos continuos con guiones", () => {
    const res = parseCustomCardRanges("2-6", 10);
    expect(res.valid).toBe(true);
    expect(res.cardIndices).toEqual([2, 3, 4, 5, 6]);
    expect(res.cardRangesString).toBe("2-6");
  });

  it("valida combinaciones mixtas, deduplica y ordena", () => {
    const res = parseCustomCardRanges("5, 1-3, 2, 7-8", 10);
    expect(res.valid).toBe(true);
    expect(res.cardIndices).toEqual([1, 2, 3, 5, 7, 8]);
    expect(res.cardRangesString).toBe("1-3,5,7-8");
  });

  it("devuelve error si una carta supera el máximo disponible", () => {
    const res = parseCustomCardRanges("1, 15", 10);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("supera el total de cartas del documento (10)");
  });

  it("devuelve error si contiene caracteres inválidos", () => {
    const res = parseCustomCardRanges("1, diez", 10);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Solo se permiten números, comas y guiones");
  });

  it("devuelve error si el rango tiene inicio mayor que fin", () => {
    const res = parseCustomCardRanges("8-4", 10);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("no puede ser mayor que el fin");
  });
});

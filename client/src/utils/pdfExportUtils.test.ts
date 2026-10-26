import { describe, it, expect } from "vitest";
import { parseCustomPageRanges, getAnversosPageRanges, getReversosPageRanges } from "./pdfExportUtils";

describe("pdfExportUtils: parseCustomPageRanges", () => {
  it("valida y resuelve listas simples separadas por comas", () => {
    const res = parseCustomPageRanges("1, 3, 5", 6);
    expect(res.valid).toBe(true);
    expect(res.pages).toEqual([1, 3, 5]);
    expect(res.pageRangesString).toBe("1,3,5");
    expect(res.error).toBeUndefined();
  });

  it("valida y resuelve rangos continuos con guiones", () => {
    const res = parseCustomPageRanges("2-4", 6);
    expect(res.valid).toBe(true);
    expect(res.pages).toEqual([2, 3, 4]);
    expect(res.pageRangesString).toBe("2-4");
  });

  it("valida y resuelve combinaciones mixtas de números y rangos ordenándolos y deduplicándolos", () => {
    const res = parseCustomPageRanges("5, 1, 2-4, 3", 10);
    expect(res.valid).toBe(true);
    expect(res.pages).toEqual([1, 2, 3, 4, 5]);
    expect(res.pageRangesString).toBe("1-5");
  });

  it("devuelve error si se introduce una cadena vacía o con solo espacios", () => {
    const res = parseCustomPageRanges("   ", 10);
    expect(res.valid).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("devuelve error si contiene caracteres no numéricos ni separadores válidos", () => {
    const res = parseCustomPageRanges("1, dos, 3", 10);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Solo se permiten números, comas y guiones");
  });

  it("devuelve error si una página supera el máximo disponible", () => {
    const res = parseCustomPageRanges("1, 2, 8", 6);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("supera el máximo de páginas del documento (6)");
  });

  it("devuelve error si el rango tiene inicio mayor que fin", () => {
    const res = parseCustomPageRanges("5-2", 10);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("no puede ser mayor que el fin");
  });

  it("genera rangos para anversos (páginas impares)", () => {
    const res = getAnversosPageRanges(6);
    expect(res.pages).toEqual([1, 3, 5]);
    expect(res.pageRangesString).toBe("1,3,5");
  });

  it("genera rangos para reversos (páginas pares)", () => {
    const res = getReversosPageRanges(6);
    expect(res.pages).toEqual([2, 4, 6]);
    expect(res.pageRangesString).toBe("2,4,6");
  });
});

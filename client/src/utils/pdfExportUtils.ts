export interface RangoPaginasResult {
  valid: boolean;
  pages: number[];
  pageRangesString: string;
  error?: string;
}

/**
 * Parsea y valida una cadena de rango de páginas escrita por el usuario (ej. "1, 3, 5-8").
 * Retorna las páginas resueltas, la cadena optimizada para Puppeteer (pageRanges) y el estado de validación.
 */
export function parseCustomPageRanges(input: string, maxPages: number): RangoPaginasResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, pages: [], pageRangesString: "", error: "Introduce al menos un número o rango de páginas." };
  }

  if (maxPages <= 0) {
    return { valid: false, pages: [], pageRangesString: "", error: "El documento no contiene páginas válidas." };
  }

  // Comprobar que solo contiene dígitos, comas, guiones y espacios
  if (!/^[\d\s,-]+$/.test(trimmed)) {
    return { valid: false, pages: [], pageRangesString: "", error: "Solo se permiten números, comas y guiones (ej. 1, 3, 5-8)." };
  }

  const parts = trimmed.split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { valid: false, pages: [], pageRangesString: "", error: "Formato de rango no válido." };
  }

  const pageSet = new Set<number>();

  for (const part of parts) {
    if (part.includes("-")) {
      const subParts = part.split("-").map(s => s.trim());
      if (subParts.length !== 2 || !subParts[0] || !subParts[1]) {
        return { valid: false, pages: [], pageRangesString: "", error: `Rango inválido: "${part}". Usa el formato inicio-fin (ej. 1-4).` };
      }
      const start = parseInt(subParts[0], 10);
      const end = parseInt(subParts[1], 10);
      if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0) {
        return { valid: false, pages: [], pageRangesString: "", error: `Rango con números no válidos: "${part}".` };
      }
      if (start > end) {
        return { valid: false, pages: [], pageRangesString: "", error: `El inicio (${start}) no puede ser mayor que el fin (${end}) en "${part}".` };
      }
      if (start > maxPages) {
        return { valid: false, pages: [], pageRangesString: "", error: `La página ${start} supera el máximo de páginas del documento (${maxPages}).` };
      }
      if (end > maxPages) {
        return { valid: false, pages: [], pageRangesString: "", error: `La página ${end} supera el máximo de páginas del documento (${maxPages}).` };
      }
      for (let p = start; p <= end; p++) {
        pageSet.add(p);
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (isNaN(pageNum) || pageNum <= 0) {
        return { valid: false, pages: [], pageRangesString: "", error: `Número de página inválido: "${part}".` };
      }
      if (pageNum > maxPages) {
        return { valid: false, pages: [], pageRangesString: "", error: `La página ${pageNum} supera el máximo de páginas del documento (${maxPages}).` };
      }
      pageSet.add(pageNum);
    }
  }

  if (pageSet.size === 0) {
    return { valid: false, pages: [], pageRangesString: "", error: "No se seleccionó ninguna página válida." };
  }

  const sortedPages = Array.from(pageSet).sort((a, b) => a - b);

  // Construir cadena compacta para Puppeteer (ej. 1,2,3 -> "1-3", 1,3,4 -> "1,3-4")
  const ranges: string[] = [];
  let rangeStart = sortedPages[0];
  let rangeEnd = sortedPages[0];

  for (let i = 1; i < sortedPages.length; i++) {
    const current = sortedPages[i];
    if (current === rangeEnd + 1) {
      rangeEnd = current;
    } else {
      ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
      rangeStart = current;
      rangeEnd = current;
    }
  }
  ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);

  return {
    valid: true,
    pages: sortedPages,
    pageRangesString: ranges.join(",")
  };
}

/**
 * Calcula las páginas impares (anversos) para un documento con total de páginas dadas.
 */
export function getAnversosPageRanges(totalPaginas: number): { pages: number[]; pageRangesString: string } {
  const pages: number[] = [];
  for (let i = 1; i <= totalPaginas; i += 2) {
    pages.push(i);
  }
  return {
    pages,
    pageRangesString: pages.join(",")
  };
}

/**
 * Calcula las páginas pares (reversos) para un documento con total de páginas dadas.
 */
export function getReversosPageRanges(totalPaginas: number): { pages: number[]; pageRangesString: string } {
  const pages: number[] = [];
  for (let i = 2; i <= totalPaginas; i += 2) {
    pages.push(i);
  }
  return {
    pages,
    pageRangesString: pages.join(",")
  };
}

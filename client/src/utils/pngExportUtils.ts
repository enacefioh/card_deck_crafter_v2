export interface RangoCartasResult {
  valid: boolean;
  cardIndices: number[];
  cardRangesString: string;
  error?: string;
}

/**
 * Parsea y valida una cadena de rango de cartas (ej. "1-5, 8, 10-12") contra el total de cartas.
 */
export function parseCustomCardRanges(input: string, maxCards: number): RangoCartasResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, cardIndices: [], cardRangesString: "", error: "Introduce al menos un número o rango de cartas." };
  }

  if (maxCards <= 0) {
    return { valid: false, cardIndices: [], cardRangesString: "", error: "El documento no contiene cartas." };
  }

  if (!/^[\d\s,-]+$/.test(trimmed)) {
    return { valid: false, cardIndices: [], cardRangesString: "", error: "Solo se permiten números, comas y guiones (ej. 1-5, 8, 10)." };
  }

  const parts = trimmed.split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { valid: false, cardIndices: [], cardRangesString: "", error: "Formato no válido." };
  }

  const cardSet = new Set<number>();

  for (const part of parts) {
    if (part.includes("-")) {
      const subParts = part.split("-").map(s => s.trim());
      if (subParts.length !== 2 || !subParts[0] || !subParts[1]) {
        return { valid: false, cardIndices: [], cardRangesString: "", error: `Rango inválido: "${part}". Usa el formato inicio-fin (ej. 1-5).` };
      }
      const start = parseInt(subParts[0], 10);
      const end = parseInt(subParts[1], 10);
      if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0) {
        return { valid: false, cardIndices: [], cardRangesString: "", error: `Rango con números no válidos: "${part}".` };
      }
      if (start > end) {
        return { valid: false, cardIndices: [], cardRangesString: "", error: `El inicio (${start}) no puede ser mayor que el fin (${end}) en "${part}".` };
      }
      if (start > maxCards) {
        return { valid: false, cardIndices: [], cardRangesString: "", error: `La carta ${start} supera el total de cartas del documento (${maxCards}).` };
      }
      if (end > maxCards) {
        return { valid: false, cardIndices: [], cardRangesString: "", error: `La carta ${end} supera el total de cartas del documento (${maxCards}).` };
      }
      for (let c = start; c <= end; c++) {
        cardSet.add(c);
      }
    } else {
      const cardNum = parseInt(part, 10);
      if (isNaN(cardNum) || cardNum <= 0) {
        return { valid: false, cardIndices: [], cardRangesString: "", error: `Número de carta no válido: "${part}".` };
      }
      if (cardNum > maxCards) {
        return { valid: false, cardIndices: [], cardRangesString: "", error: `La carta ${cardNum} supera el total de cartas del documento (${maxCards}).` };
      }
      cardSet.add(cardNum);
    }
  }

  if (cardSet.size === 0) {
    return { valid: false, cardIndices: [], cardRangesString: "", error: "No se seleccionó ninguna carta válida." };
  }

  const sorted = Array.from(cardSet).sort((a, b) => a - b);

  // Construir cadena compacta
  const ranges: string[] = [];
  let rStart = sorted[0];
  let rEnd = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    if (cur === rEnd + 1) {
      rEnd = cur;
    } else {
      ranges.push(rStart === rEnd ? `${rStart}` : `${rStart}-${rEnd}`);
      rStart = cur;
      rEnd = cur;
    }
  }
  ranges.push(rStart === rEnd ? `${rStart}` : `${rStart}-${rEnd}`);

  return {
    valid: true,
    cardIndices: sorted,
    cardRangesString: ranges.join(",")
  };
}

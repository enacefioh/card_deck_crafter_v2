/**
 * Utilidades para generación de avatar estilo Gmail determinista a partir del email
 */

export function getAvatarInitials(email: string): string {
  const clean = (email || "").trim().toLowerCase();
  const namePart = clean.split("@")[0] || "";
  if (namePart.length >= 2) {
    return namePart.substring(0, 2).toUpperCase();
  }
  if (namePart.length === 1) {
    const domainPart = clean.split("@")[1] || "";
    return (namePart[0] + (domainPart[0] || "")).toUpperCase();
  }
  return "??";
}

export function getAvatarColor(email: string): { bg: string; text: string } {
  const clean = (email || "").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generamos un matiz HSL con saturación al 70% y luminosidad controlada (40%) para garantizar contraste con blanco
  const h = Math.abs(hash) % 360;
  const s = 65;
  const l = 42;

  const bg = `hsl(${h}, ${s}%, ${l}%)`;
  const text = "#FFFFFF";

  return { bg, text };
}

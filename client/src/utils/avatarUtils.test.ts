import { describe, it, expect } from "vitest";
import { getAvatarInitials, getAvatarColor } from "./avatarUtils";

describe("avatarUtils - Iniciales y colores estilo Gmail", () => {
  it("debe extraer correctamente las 2 primeras letras del email en mayúsculas", () => {
    expect(getAvatarInitials("admin@admin.com")).toBe("AD");
    expect(getAvatarInitials("victor@gmail.com")).toBe("VI");
    expect(getAvatarInitials("carlos.santana@cdc.org")).toBe("CA");
    expect(getAvatarInitials("x@domain.com")).toBe("XD");
  });

  it("debe generar un color determinista y consistente para el mismo email", () => {
    const color1 = getAvatarColor("admin@admin.com");
    const color2 = getAvatarColor("admin@admin.com");
    expect(color1.bg).toBe(color2.bg);
    expect(color1.text).toBe("#FFFFFF");
  });

  it("debe generar colores distintos para emails diferentes", () => {
    const colorA = getAvatarColor("admin@admin.com");
    const colorB = getAvatarColor("usuario_nuevo@gmail.com");
    expect(colorA.bg).not.toBe(colorB.bg);
  });
});

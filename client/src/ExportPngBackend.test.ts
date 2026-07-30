import { describe, it, expect } from "vitest";

describe("Exportación PNG Backend - SRS-054", () => {
  it("debe verificar que el backend responda con 400 si se envía petición sin archivo de proyecto", async () => {
    const formData = new FormData();
    const response = await fetch("http://localhost:3000/api/exportar/png", {
      method: "POST",
      body: formData,
    });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});

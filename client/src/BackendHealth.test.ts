import { describe, it, expect } from "vitest";

describe("Backend Server Health", () => {
  it("debe responder positivamente a la petición de comprobación en /api/health", async () => {
    try {
      const response = await fetch("http://localhost:3000/api/health");
      expect(response.ok).toBe(true);
      const body = await response.json();
      expect(body).toHaveProperty("status", "ok");
    } catch (error: any) {
      throw new Error(
        `FALLO DE CONEXIÓN AL BACKEND: El servidor backend no responde en http://localhost:3000/api/health. Asegúrate de reiniciar el proceso del servidor. Detalle: ${error.message}`
      );
    }
  });
});

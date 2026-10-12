// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { CloudProjectsModal } from "./components/CloudProjectsModal";
import * as apiKeyService from "./services/apiKeyService";
import * as storageService from "./services/storageService";

describe("SRS-078: Gestión de API Keys en CloudProjectsModal", () => {
  const mockStorageInfo = {
    quotaMb: 100,
    quotaBytes: 104857600,
    usedBytes: 10485760,
    usedMb: 10,
    availableBytes: 94371840,
    availableMb: 90,
    percentUsed: 10
  };

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(storageService, "fetchCloudProjects").mockResolvedValue([]);
    vi.spyOn(storageService, "fetchCloudTemplates").mockResolvedValue([]);
    vi.spyOn(storageService, "fetchMyTemplatePublications").mockResolvedValue({});
  });

  it("RF-4: debe renderizar la pestaña de Acceso API y mostrar el formulario y lista de claves", async () => {
    const mockKeys = [
      {
        id: "key-1",
        userId: "user-1",
        name: "Agente Cursor",
        prefix: "cdc2_live_abc123...",
        lastUsedAt: null,
        createdAt: "2026-10-12T10:00:00.000Z"
      }
    ];

    vi.spyOn(apiKeyService, "fetchApiKeys").mockResolvedValue(mockKeys);

    render(
      <CloudProjectsModal
        isOpen={true}
        onClose={vi.fn()}
        storageInfo={mockStorageInfo}
        initialTab="api"
        onOpenProject={vi.fn()}
        onExportProject={vi.fn()}
        onStorageUpdated={vi.fn()}
      />
    );

    // Comprobar que la pestaña está presente y seleccionada
    const apiTabBtn = screen.getByRole("button", { name: /Acceso API/i });
    expect(apiTabBtn).toBeDefined();

    // Esperar a que se listen las claves
    await waitFor(() => {
      expect(screen.getByText("Agente Cursor")).toBeDefined();
      expect(screen.getByText("cdc2_live_abc123...")).toBeDefined();
    });

    // Comprobar que se muestra el aviso de rutas de la API
    expect(screen.getByText(/Rutas y Endpoints Clave del API/i)).toBeDefined();
    expect(screen.getByText(/\/api\/v1\/templates\/:id\/schema/i)).toBeDefined();
  });

  it("RF-4: debe permitir crear una nueva API Key y mostrar el secreto en texto plano", async () => {
    vi.spyOn(apiKeyService, "fetchApiKeys").mockResolvedValue([]);
    const createSpy = vi.spyOn(apiKeyService, "createApiKey").mockResolvedValue({
      id: "key-new-99",
      name: "Agente Claude",
      prefix: "cdc2_live_999999...",
      createdAt: "2026-10-12T12:00:00.000Z",
      apiKey: "cdc2_live_9999998888887777776666665555554444443333332222221111110000000000"
    });

    render(
      <CloudProjectsModal
        isOpen={true}
        onClose={vi.fn()}
        storageInfo={mockStorageInfo}
        initialTab="api"
        onOpenProject={vi.fn()}
        onExportProject={vi.fn()}
        onStorageUpdated={vi.fn()}
      />
    );

    // Esperar a que cargue la vista y escribir nombre en el input
    const input = await waitFor(() => screen.getByPlaceholderText(/Nombre de la clave/i));
    fireEvent.change(input, { target: { value: "Agente Claude" } });

    // Enviar formulario
    const submitBtn = screen.getByRole("button", { name: /Crear API Key/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith("Agente Claude");
    });

    // Verificar que el banner de alerta con el secreto se muestre
    await waitFor(() => {
      expect(screen.getByText(/API Key creada: "Agente Claude"/i)).toBeDefined();
      expect(screen.getByDisplayValue("cdc2_live_9999998888887777776666665555554444443333332222221111110000000000")).toBeDefined();
      expect(screen.getByText(/no volverá a mostrarse en texto plano/i)).toBeDefined();
    });
  });

  it("RF-4: debe abrir el diálogo de confirmación y revocar la clave al confirmar", async () => {
    const mockKeys = [
      {
        id: "key-del-1",
        userId: "user-1",
        name: "Bot a Borrar",
        prefix: "cdc2_live_del000...",
        lastUsedAt: null,
        createdAt: "2026-10-12T10:00:00.000Z"
      }
    ];

    vi.spyOn(apiKeyService, "fetchApiKeys").mockResolvedValue(mockKeys);
    const deleteSpy = vi.spyOn(apiKeyService, "deleteApiKey").mockResolvedValue();

    render(
      <CloudProjectsModal
        isOpen={true}
        onClose={vi.fn()}
        storageInfo={mockStorageInfo}
        initialTab="api"
        onOpenProject={vi.fn()}
        onExportProject={vi.fn()}
        onStorageUpdated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Bot a Borrar")).toBeDefined();
    });

    // Pulsar botón de revocar
    const revokeBtn = screen.getByRole("button", { name: /^Revocar$/i });
    fireEvent.click(revokeBtn);

    // Debe abrirse el diálogo de confirmación
    expect(screen.getByText(/¿Revocar API Key\?/i)).toBeDefined();
    expect(screen.getByText(/¿Estás seguro de revocar la clave/i)).toBeDefined();

    // Confirmar eliminación
    const confirmDeleteBtn = screen.getByRole("button", { name: /Sí, Revocar Clave/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("key-del-1");
    });
  });
});

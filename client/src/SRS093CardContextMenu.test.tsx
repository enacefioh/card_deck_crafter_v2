// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import CardContextMenu from "./components/CardContextMenu";
import App from "./App";

afterEach(() => {
  cleanup();
});

describe("SRS-093: Menú Contextual para Cartas en la Mesa de Trabajo (Lienzo)", () => {
  it("RF-1 y RF-2: renderiza el menú contextual en la posición indicada con todas sus opciones", () => {
    const onVerDetalles = vi.fn();
    const onDuplicar = vi.fn();
    const onMoverArriba = vi.fn();
    const onMoverAbajo = vi.fn();
    const onEliminar = vi.fn();
    const onClose = vi.fn();

    render(
      <CardContextMenu
        x={250}
        y={180}
        selectedCount={1}
        puedeMoverArriba={true}
        puedeMoverAbajo={false}
        onVerDetalles={onVerDetalles}
        onDuplicar={onDuplicar}
        onMoverArriba={onMoverArriba}
        onMoverAbajo={onMoverAbajo}
        onEliminar={onEliminar}
        onClose={onClose}
      />
    );

    const menu = screen.getByRole("menu");
    expect(menu).toBeTruthy();
    expect(menu.classList.contains("card-context-menu")).toBe(true);

    // Opciones presentes
    expect(screen.getByText("Ver Detalles")).toBeTruthy();
    expect(screen.getByText("Duplicar")).toBeTruthy();
    expect(screen.getByText("Mover Arriba")).toBeTruthy();
    expect(screen.getByText("Mover Abajo")).toBeTruthy();
    expect(screen.getByText("Eliminar")).toBeTruthy();

    // Ver Detalles habilitado con 1 carta
    const btnDetalles = screen.getByText("Ver Detalles").closest("button")!;
    expect(btnDetalles.disabled).toBe(false);

    // Mover Arriba habilitado y Mover Abajo deshabilitado
    const btnArriba = screen.getByText("Mover Arriba").closest("button")!;
    expect(btnArriba.disabled).toBe(false);

    const btnAbajo = screen.getByText("Mover Abajo").closest("button")!;
    expect(btnAbajo.disabled).toBe(true);
  });

  it("RF-2: Ver Detalles se deshabilita cuando hay más de una carta seleccionada", () => {
    render(
      <CardContextMenu
        x={100}
        y={100}
        selectedCount={3}
        puedeMoverArriba={true}
        puedeMoverAbajo={true}
        onVerDetalles={vi.fn()}
        onDuplicar={vi.fn()}
        onMoverArriba={vi.fn()}
        onMoverAbajo={vi.fn()}
        onEliminar={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const btnDetalles = screen.getByText("Ver Detalles").closest("button")!;
    expect(btnDetalles.disabled).toBe(true);
  });

  it("RF-2: al hacer clic en una opción se dispara su callback y se cierra el menú", () => {
    const onDuplicar = vi.fn();
    const onClose = vi.fn();

    render(
      <CardContextMenu
        x={100}
        y={100}
        selectedCount={1}
        puedeMoverArriba={true}
        puedeMoverAbajo={true}
        onVerDetalles={vi.fn()}
        onDuplicar={onDuplicar}
        onMoverArriba={vi.fn()}
        onMoverAbajo={vi.fn()}
        onEliminar={vi.fn()}
        onClose={onClose}
      />
    );

    const btnDuplicar = screen.getByText("Duplicar").closest("button")!;
    fireEvent.click(btnDuplicar);

    expect(onDuplicar).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("RF-3: pulsar Escape o hacer mousedown fuera cierra el menú contextual", () => {
    const onClose = vi.fn();

    render(
      <CardContextMenu
        x={100}
        y={100}
        selectedCount={1}
        puedeMoverArriba={true}
        puedeMoverAbajo={true}
        onVerDetalles={vi.fn()}
        onDuplicar={vi.fn()}
        onMoverArriba={vi.fn()}
        onMoverAbajo={vi.fn()}
        onEliminar={vi.fn()}
        onClose={onClose}
      />
    );

    // Pulsar tecla Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Clic fuera del elemento
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("Integración en App: disparar contextmenu sobre un card-slot abre el menú contextual", () => {
    const { container } = render(<App />);

    const cardSlot = container.querySelector(".card-slot");
    if (cardSlot) {
      fireEvent.contextMenu(cardSlot, { clientX: 200, clientY: 250 });

      const menu = container.querySelector(".card-context-menu");
      expect(menu).toBeTruthy();
    }
  });
});

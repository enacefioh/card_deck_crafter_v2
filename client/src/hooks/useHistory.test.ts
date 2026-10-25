// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistory } from "./useHistory";

describe("useHistory hook (SRS-088)", () => {
  it("inicializa con el estado presente y sin capacidad de deshacer/rehacer", () => {
    const { result } = renderHook(() => useHistory<number>(10));

    expect(result.current.state).toBe(10);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength.past).toBe(0);
    expect(result.current.historyLength.future).toBe(0);
  });

  it("permite actualizar el estado y habilita deshacer", () => {
    const { result } = renderHook(() => useHistory<number>(1));

    act(() => {
      result.current.set(2);
    });

    expect(result.current.state).toBe(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength.past).toBe(1);

    act(() => {
      result.current.set(3);
    });

    expect(result.current.state).toBe(3);
    expect(result.current.historyLength.past).toBe(2);
  });

  it("permite deshacer (undo) y restaurar el valor anterior", () => {
    const { result } = renderHook(() => useHistory<string>("a"));

    act(() => {
      result.current.set("b");
    });
    act(() => {
      result.current.set("c");
    });

    expect(result.current.state).toBe("c");

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe("b");
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe("a");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it("permite rehacer (redo) tras deshacer", () => {
    const { result } = renderHook(() => useHistory<number>(100));

    act(() => {
      result.current.set(200);
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe(100);

    act(() => {
      result.current.redo();
    });

    expect(result.current.state).toBe(200);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("limpia la pila 'future' si se introduce un cambio nuevo tras un undo", () => {
    const { result } = renderHook(() => useHistory<string>("inicio"));

    act(() => {
      result.current.set("paso 1");
    });
    act(() => {
      result.current.set("paso 2");
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe("paso 1");
    expect(result.current.canRedo).toBe(true);

    // Nuevo cambio bifurcado
    act(() => {
      result.current.set("paso 2 alternativo");
    });

    expect(result.current.state).toBe("paso 2 alternativo");
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength.future).toBe(0);
  });

  it("respeta la opción skipHistory para no apilar movimientos intermedios (ej. drag)", () => {
    const { result } = renderHook(() => useHistory<number>(0));

    act(() => {
      result.current.set(10, { skipHistory: true });
    });

    expect(result.current.state).toBe(10);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.historyLength.past).toBe(0);

    act(() => {
      result.current.set(20, { skipHistory: true });
    });

    expect(result.current.state).toBe(20);
    expect(result.current.canUndo).toBe(false);

    // Commit final
    act(() => {
      result.current.set(30);
    });

    expect(result.current.state).toBe(30);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.historyLength.past).toBe(1);

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe(20);
  });

  it("limita la pila al número máximo especificado (maxHistory)", () => {
    const { result } = renderHook(() => useHistory<number>(0, { maxHistory: 3 }));

    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.set(3));
    act(() => result.current.set(4));

    expect(result.current.state).toBe(4);
    expect(result.current.historyLength.past).toBe(3);

    // Deshacer 3 veces debe llegar al valor más antiguo conservado (1)
    act(() => result.current.undo());
    expect(result.current.state).toBe(3);
    act(() => result.current.undo());
    expect(result.current.state).toBe(2);
    act(() => result.current.undo());
    expect(result.current.state).toBe(1);
    expect(result.current.canUndo).toBe(false);
  });

  it("permite resetear el historial completamente con un nuevo valor presente", () => {
    const { result } = renderHook(() => useHistory<string>("antiguo"));

    act(() => result.current.set("modificado"));
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.reset("nuevo-proyecto"));

    expect(result.current.state).toBe("nuevo-proyecto");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength.past).toBe(0);
    expect(result.current.historyLength.future).toBe(0);
  });
});

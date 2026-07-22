import React, { useState, useRef } from "react";

interface SymbolItem {
  id: string;
  tag: string;
  src: string;
}

interface SymbolsGalleryModalProps {
  symbols: SymbolItem[];
  onSaveSymbols: (symbols: SymbolItem[]) => void;
  onClose: () => void;
}

export default function SymbolsGalleryModal({
  symbols,
  onSaveSymbols,
  onClose
}: SymbolsGalleryModalProps) {
  const [tagInput, setTagInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImageToMax100 = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > 100) {
              height = Math.round((height * 100) / width);
              width = 100;
            }
          } else {
            if (height > 100) {
              width = Math.round((width * 100) / height);
              height = 100;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Error al convertir canvas a blob"));
            }, "image/png");
          } else {
            reject(new Error("No se pudo obtener el contexto 2d del canvas"));
          }
        };
        img.onerror = () => reject(new Error("Error al cargar la imagen"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsDataURL(file);
    });
  };

  const handleUploadClick = () => {
    setErrorMsg("");
    const cleanTag = tagInput.trim().replace(/\s+/g, "");
    if (!cleanTag) {
      setErrorMsg("Por favor, introduce un tag antes de seleccionar la imagen.");
      return;
    }
    // Validar tag sin caracteres extraños que puedan romper expresiones regulares
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanTag)) {
      setErrorMsg("El tag solo puede contener letras, números, guiones y guiones bajos.");
      return;
    }
    // Comprobar duplicado
    if (symbols.some(s => s.tag.toLowerCase() === cleanTag.toLowerCase())) {
      setErrorMsg(`El tag "${cleanTag}" ya está en uso.`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const cleanTag = tagInput.trim().replace(/\s+/g, "");

    try {
      // 1. Redimensionar en cliente
      const resizedBlob = await resizeImageToMax100(file);
      const id = `symbol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const localUrl = URL.createObjectURL(resizedBlob);

      const newSymbol: SymbolItem = {
        id,
        tag: cleanTag,
        src: localUrl
      };

      // 2. Subir al servidor backend en segundo plano (si está activo)
      try {
        const formData = new FormData();
        formData.append("image", resizedBlob, `${id}.png`);
        formData.append("tag", cleanTag);

        const response = await fetch("/api/symbols", {
          method: "POST",
          body: formData
        });
        if (response.ok) {
          const serverData = await response.json();
          // Si el servidor asignó un src formal, podemos usarlo
          if (serverData.src) {
            newSymbol.src = serverData.src;
          }
        }
      } catch (err) {
        console.warn("Backend no disponible. Guardando únicamente local/ZIP:", err);
      }

      onSaveSymbols([...symbols, newSymbol]);
      setTagInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Error al procesar la imagen.");
    }
  };

  const handleStartEdit = (sym: SymbolItem) => {
    setEditingId(sym.id);
    setEditingTag(sym.tag);
    setErrorMsg("");
  };

  const handleSaveEdit = async (id: string) => {
    const cleanTag = editingTag.trim().replace(/\s+/g, "");
    if (!cleanTag) {
      setErrorMsg("El tag no puede estar vacío.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanTag)) {
      setErrorMsg("El tag solo puede contener letras, números, guiones y guiones bajos.");
      return;
    }
    // Comprobar duplicado
    if (symbols.some(s => s.id !== id && s.tag.toLowerCase() === cleanTag.toLowerCase())) {
      setErrorMsg(`El tag "${cleanTag}" ya está en uso.`);
      return;
    }

    // Actualizar backend
    try {
      await fetch(`/api/symbols/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: cleanTag })
      });
    } catch (err) {
      console.warn("Backend no disponible para actualización de tag:", err);
    }

    const updated = symbols.map(s => s.id === id ? { ...s, tag: cleanTag } : s);
    onSaveSymbols(updated);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    // Eliminar del backend
    try {
      await fetch(`/api/symbols/${id}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.warn("Backend no disponible para eliminación de símbolo:", err);
    }

    const updated = symbols.filter(s => s.id !== id);
    onSaveSymbols(updated);
  };

  return (
    <div className="template-modal-backdrop" style={{ zIndex: 4000 }}>
      <div className="template-modal-container" style={{ maxWidth: "650px", width: "90%", padding: "24px" }} onClick={(e) => e.stopPropagation()}>
        <header className="template-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            🧸 Galería de Símbolos
          </h2>
          <button className="close-btn" onClick={onClose} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "var(--text-secondary)" }}>
            &times;
          </button>
        </header>

        <div className="template-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Subir Símbolo */}
          <div style={{ backgroundColor: "rgba(255, 255, 255, 0.03)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
              <div style={{ flex: "2 1 0%" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  Tag de acceso (ej. fuego, tap, oro)
                </label>
                <input
                  type="text"
                  placeholder="Introduce el tag sin espacios..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value.replace(/\s+/g, ""))}
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", boxSizing: "border-box", backgroundColor: "rgba(0, 0, 0, 0.2)", color: "var(--text-primary)", height: "40px" }}
                />
              </div>
              <div style={{ flex: "1.5 1 0%" }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleUploadClick}
                  style={{ width: "100%", height: "40px", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  📥 Seleccionar Imagen
                </button>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />
          </div>

          {errorMsg && (
            <div style={{ color: "#ef4444", fontSize: "13px", padding: "8px 12px", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "6px" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Listado de Símbolos */}
          <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            {symbols.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
                No hay símbolos registrados en este proyecto. Utiliza el panel superior para añadir tu primer símbolo.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {symbols.map((sym, index) => (
                  <div
                    key={sym.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderBottom: index < symbols.length - 1 ? "1px solid var(--border-color)" : "none",
                      backgroundColor: "rgba(255, 255, 255, 0.01)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
                      <img
                        src={sym.src}
                        alt={sym.tag}
                        style={{
                          width: "32px",
                          height: "32px",
                          objectFit: "contain",
                          backgroundColor: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "4px",
                          padding: "2px"
                        }}
                      />
                      {editingId === sym.id ? (
                        <input
                          type="text"
                          value={editingTag}
                          onChange={(e) => setEditingTag(e.target.value.replace(/\s+/g, ""))}
                          style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border-color)", width: "150px" }}
                        />
                      ) : (
                        <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "600" }}>
                          {`{${sym.tag}}`}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {editingId === sym.id ? (
                        <>
                          <button
                            className="btn-primary"
                            onClick={() => handleSaveEdit(sym.id)}
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                          >
                            Guardar
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => setEditingId(null)}
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-secondary"
                            onClick={() => handleStartEdit(sym)}
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                          >
                            ✏️ Editar Tag
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => handleDelete(sym.id)}
                            style={{ padding: "4px 10px", fontSize: "12px", color: "#ef4444" }}
                          >
                            🗑️ Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn-primary" onClick={onClose}>
            Aceptar
          </button>
        </footer>
      </div>
    </div>
  );
}

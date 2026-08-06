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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
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

  const generateUniqueTag = (fileName: string, existingSymbols: SymbolItem[]): string => {
    // 1. Quitar extensión del archivo
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    // 2. Limpiar espacios y caracteres no válidos para tags
    let cleanName = baseName.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanName) cleanName = "simbolo";

    // 3. Resolver duplicados secuencialmente (icono, icono2, icono3...)
    let targetTag = cleanName;
    let counter = 2;
    while (existingSymbols.some(s => s.tag.toLowerCase() === targetTag.toLowerCase())) {
      targetTag = `${cleanName}${counter}`;
      counter++;
    }
    return targetTag;
  };

  const processFiles = async (fileList: FileList | File[]) => {
    setErrorMsg("");
    const filesArray = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    if (filesArray.length === 0) {
      setErrorMsg("Por favor, selecciona archivos de imagen válidos.");
      return;
    }

    const currentSymbolsList = [...symbols];
    const addedSymbols: SymbolItem[] = [];

    for (const file of filesArray) {
      try {
        const cleanTag = generateUniqueTag(file.name, currentSymbolsList);
        const resizedBlob = await resizeImageToMax100(file);
        const id = `symbol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const localUrl = URL.createObjectURL(resizedBlob);

        const newSymbol: SymbolItem = {
          id,
          tag: cleanTag,
          src: localUrl
        };

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
            if (serverData.src) {
              newSymbol.src = serverData.src;
            }
          }
        } catch (err) {
          console.warn("Backend no disponible. Guardando únicamente local/ZIP:", err);
        }

        currentSymbolsList.push(newSymbol);
        addedSymbols.push(newSymbol);
      } catch (err) {
        console.error(`Error al procesar la imagen ${file.name}:`, err);
      }
    }

    if (addedSymbols.length > 0) {
      onSaveSymbols(currentSymbolsList);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
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
          {/* Area Dropzone Múltiple (SRS-059) */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: dragActive ? "2px dashed var(--accent-primary)" : "2px dashed var(--border-color)",
              backgroundColor: dragActive ? "rgba(139, 92, 246, 0.12)" : "rgba(255, 255, 255, 0.02)",
              padding: "24px 16px",
              borderRadius: "10px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>📥</span>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
              Arrastra o haz clic para añadir imágenes de símbolos
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
              Permite selección múltiple. El tag se asignará automáticamente desde el nombre del archivo.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
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
                No hay símbolos registrados en este proyecto. Utiliza la zona superior para añadir imágenes de símbolos.
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

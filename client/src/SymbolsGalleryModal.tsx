import React, { useState, useRef, useEffect } from "react";

export interface SymbolItem {
  id: string;
  tag: string;
  src: string;
  folder?: string;
}

interface SymbolsGalleryModalProps {
  symbols: SymbolItem[];
  symbolFolders?: string[];
  onSaveSymbols: (symbols: SymbolItem[]) => void;
  onSaveFolders?: (folders: string[]) => void;
  onClose: () => void;
}

export default function SymbolsGalleryModal({
  symbols,
  symbolFolders = ["Por Defecto"],
  onSaveSymbols,
  onSaveFolders,
  onClose,
}: SymbolsGalleryModalProps) {
  const [folders, setFolders] = useState<string[]>(
    symbolFolders && symbolFolders.length > 0 ? symbolFolders : ["Por Defecto"]
  );
  const [activeTab, setActiveTab] = useState<string>("Por Defecto");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (symbolFolders && symbolFolders.length > 0) {
      setFolders(symbolFolders);
      if (!symbolFolders.includes(activeTab)) {
        setActiveTab(symbolFolders[0] || "Por Defecto");
      }
    }
  }, [symbolFolders]);

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

  const generateUniqueTag = (fileNameOrTag: string, existingSymbols: SymbolItem[]): string => {
    const baseName = fileNameOrTag.replace(/\.[^/.]+$/, "");
    let cleanName = baseName.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanName) cleanName = "simbolo";

    let targetTag = cleanName;
    let counter = 2;
    while (existingSymbols.some((s) => s.tag.toLowerCase() === targetTag.toLowerCase())) {
      targetTag = `${cleanName}_${counter}`;
      counter++;
    }
    return targetTag;
  };

  const processFiles = async (fileList: FileList | File[]) => {
    setErrorMsg("");
    const filesArray = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
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
          src: localUrl,
          folder: activeTab || "Por Defecto",
        };

        try {
          const formData = new FormData();
          formData.append("image", resizedBlob, `${id}.png`);
          formData.append("tag", cleanTag);

          const response = await fetch("/api/symbols", {
            method: "POST",
            body: formData,
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

  const handleCreateNewFolder = () => {
    const name = window.prompt("Introduce el nombre de la nueva galería de símbolos:");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === "por defecto") {
      alert("El nombre 'Por Defecto' está reservado.");
      return;
    }
    if (folders.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Ya existe una galería llamada "${trimmed}".`);
      return;
    }
    const nextFolders = [...folders, trimmed];
    setFolders(nextFolders);
    if (onSaveFolders) onSaveFolders(nextFolders);
    setActiveTab(trimmed);
  };

  const handleRenameFolder = (oldName: string) => {
    if (oldName === "Por Defecto") return;
    const name = window.prompt(`Renombrar galería "${oldName}" a:`, oldName);
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === oldName) return;
    if (trimmed.toLowerCase() === "por defecto") {
      alert("El nombre 'Por Defecto' está reservado.");
      return;
    }
    if (folders.some((f) => f.toLowerCase() === trimmed.toLowerCase() && f !== oldName)) {
      alert(`Ya existe una galería llamada "${trimmed}".`);
      return;
    }
    const nextFolders = folders.map((f) => (f === oldName ? trimmed : f));
    setFolders(nextFolders);
    if (onSaveFolders) onSaveFolders(nextFolders);

    const updatedSymbols = symbols.map((s) =>
      (s.folder || "Por Defecto") === oldName ? { ...s, folder: trimmed } : s
    );
    onSaveSymbols(updatedSymbols);
    setActiveTab(trimmed);
  };

  const handleDeleteFolder = (folderToDelete: string) => {
    if (folderToDelete === "Por Defecto") return;
    const count = symbols.filter((s) => (s.folder || "Por Defecto") === folderToDelete).length;
    const msg =
      count > 0
        ? `¿Eliminar la galería "${folderToDelete}"? Los ${count} símbolo(s) contenidos se moverán automáticamente a "Por Defecto".`
        : `¿Eliminar la galería vacía "${folderToDelete}"?`;
    if (!window.confirm(msg)) return;

    const nextFolders = folders.filter((f) => f !== folderToDelete);
    setFolders(nextFolders);
    if (onSaveFolders) onSaveFolders(nextFolders);

    const updatedSymbols = symbols.map((s) =>
      (s.folder || "Por Defecto") === folderToDelete ? { ...s, folder: "Por Defecto" } : s
    );
    onSaveSymbols(updatedSymbols);
    setActiveTab("Por Defecto");
  };

  const handleMoveSymbol = (symId: string, targetFolder: string) => {
    const updated = symbols.map((s) => (s.id === symId ? { ...s, folder: targetFolder } : s));
    onSaveSymbols(updated);
  };

  const handleCopySymbol = (sym: SymbolItem, targetFolder: string) => {
    const cleanTag = generateUniqueTag(sym.tag, symbols);
    const newId = `symbol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const copiedSymbol: SymbolItem = {
      id: newId,
      tag: cleanTag,
      src: sym.src,
      folder: targetFolder,
    };
    onSaveSymbols([...symbols, copiedSymbol]);
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
    if (symbols.some((s) => s.id !== id && s.tag.toLowerCase() === cleanTag.toLowerCase())) {
      setErrorMsg(`El tag "${cleanTag}" ya está en uso.`);
      return;
    }

    try {
      await fetch(`/api/symbols/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: cleanTag }),
      });
    } catch (err) {
      console.warn("Backend no disponible para actualización de tag:", err);
    }

    const updated = symbols.map((s) => (s.id === id ? { ...s, tag: cleanTag } : s));
    onSaveSymbols(updated);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/symbols/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Backend no disponible para eliminación de símbolo:", err);
    }

    const updated = symbols.filter((s) => s.id !== id);
    onSaveSymbols(updated);
  };

  const visibleSymbols = symbols.filter(
    (sym) => (sym.folder || "Por Defecto") === activeTab
  );

  return (
    <div className="template-modal-backdrop" style={{ zIndex: 4000 }}>
      <div
        className="template-modal-container multimedia-gallery-wide"
        style={{ maxWidth: "780px", width: "95%", padding: "24px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="template-modal-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              🧸 Galería de Símbolos
            </h2>
            <p className="gallery-popup-subtitle" style={{ margin: "4px 0 0 0" }}>
              {activeTab === "Por Defecto"
                ? "Símbolos e iconos generales del proyecto actual"
                : `Galería personalizada "${activeTab}" de símbolos`}
            </p>
          </div>
          <button
            className="close-btn"
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            &times;
          </button>
        </header>

        {/* Barra de pestañas horizontal al mismo nivel (SRS-096) */}
        <div className="gallery-tabs-row" style={{ marginBottom: "12px" }}>
          {/* 📦 Por Defecto */}
          <button
            type="button"
            className={`gallery-tab-btn ${activeTab === "Por Defecto" ? "active" : ""}`}
            onClick={() => setActiveTab("Por Defecto")}
          >
            📦 Por Defecto{" "}
            <span className="gallery-count-badge">
              ({symbols.filter((s) => (s.folder || "Por Defecto") === "Por Defecto").length})
            </span>
          </button>

          {/* 📁 Galerías Personalizadas */}
          {folders
            .filter((f) => f !== "Por Defecto")
            .map((folder) => {
              const count = symbols.filter((s) => (s.folder || "Por Defecto") === folder).length;
              return (
                <button
                  key={folder}
                  type="button"
                  className={`gallery-tab-btn ${activeTab === folder ? "active" : ""}`}
                  onClick={() => setActiveTab(folder)}
                >
                  📁 {folder} <span className="gallery-count-badge">({count})</span>
                </button>
              );
            })}

          {/* ➕ Nueva Galería */}
          <button
            type="button"
            className="gallery-tab-btn-add"
            onClick={handleCreateNewFolder}
            title="Crear nueva galería de símbolos"
          >
            ➕ Nueva Galería
          </button>
        </div>

        {/* Barra de acciones para galería personalizada activa (Renombrar / Eliminar) */}
        {activeTab !== "Por Defecto" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255,255,255,0.03)",
              padding: "6px 12px",
              borderRadius: "6px",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Galería: <strong style={{ color: "var(--text-primary)" }}>{activeTab}</strong>
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 8px", fontSize: "11px" }}
                onClick={() => handleRenameFolder(activeTab)}
                title="Renombrar esta galería"
              >
                ✏️ Renombrar galería
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 8px", fontSize: "11px", color: "var(--text-danger, #ef4444)" }}
                onClick={() => handleDeleteFolder(activeTab)}
                title="Eliminar esta galería (los símbolos se moverán a Por Defecto)"
              >
                🗑️ Eliminar galería
              </button>
            </div>
          </div>
        )}

        <div className="template-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Area Dropzone Contextual */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: dragActive ? "2px dashed var(--accent-primary)" : "2px dashed var(--border-color)",
              backgroundColor: dragActive ? "rgba(139, 92, 246, 0.12)" : "rgba(255, 255, 255, 0.02)",
              padding: "16px",
              borderRadius: "10px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "28px", display: "block", marginBottom: "4px" }}>📥</span>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
              Arrastra o haz clic para añadir símbolos a <strong>{activeTab}</strong>
            </p>
            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--text-secondary)" }}>
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
            <div
              style={{
                color: "#ef4444",
                fontSize: "13px",
                padding: "8px 12px",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderRadius: "6px",
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Listado de Símbolos filtrado por la pestaña activa */}
          <div
            style={{
              maxHeight: "340px",
              overflowY: "auto",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
            }}
          >
            {visibleSymbols.length === 0 ? (
              <div
                style={{
                  padding: "36px 16px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                }}
              >
                No hay símbolos en la galería <strong>"{activeTab}"</strong>. Utiliza la zona superior para añadir imágenes o muévelos/cópialos desde otra sección.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {visibleSymbols.map((sym, index) => (
                  <div
                    key={sym.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderBottom: index < visibleSymbols.length - 1 ? "1px solid var(--border-color)" : "none",
                      backgroundColor: "rgba(255, 255, 255, 0.01)",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
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
                          padding: "2px",
                          flexShrink: 0,
                        }}
                      />
                      {editingId === sym.id ? (
                        <input
                          type="text"
                          value={editingTag}
                          onChange={(e) => setEditingTag(e.target.value.replace(/\s+/g, ""))}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid var(--border-color)",
                            width: "140px",
                            fontSize: "13px",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "var(--accent-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={`{${sym.tag}}`}
                        >
                          {`{${sym.tag}}`}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      {/* Dropdown Mover a... */}
                      <select
                        className="gallery-action-select"
                        title="Mover a otra galería..."
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleMoveSymbol(sym.id, e.target.value);
                          }
                        }}
                        style={{
                          padding: "2px 4px",
                          fontSize: "11px",
                          height: "24px",
                          maxWidth: "115px",
                        }}
                      >
                        <option value="" disabled>📁 Mover a...</option>
                        {folders
                          .filter((f) => f !== activeTab)
                          .map((f) => (
                            <option key={f} value={f}>📁 {f}</option>
                          ))}
                      </select>

                      {/* Dropdown Copiar a... */}
                      <select
                        className="gallery-action-select"
                        title="Copiar a galería..."
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleCopySymbol(sym, e.target.value);
                          }
                        }}
                        style={{
                          padding: "2px 4px",
                          fontSize: "11px",
                          height: "24px",
                          maxWidth: "115px",
                        }}
                      >
                        <option value="" disabled>📋 Copiar a...</option>
                        {folders.map((f) => (
                          <option key={f} value={f}>📁 {f}</option>
                        ))}
                      </select>

                      {editingId === sym.id ? (
                        <>
                          <button
                            className="btn-primary"
                            onClick={() => handleSaveEdit(sym.id)}
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                          >
                            Guardar
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => setEditingId(null)}
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-secondary"
                            onClick={() => handleStartEdit(sym)}
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            title="Editar Tag"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => handleDelete(sym.id)}
                            style={{ padding: "4px 8px", fontSize: "11px", color: "var(--text-danger, #ef4444)" }}
                            title="Eliminar Símbolo"
                          >
                            🗑️
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

        <footer style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn-primary" onClick={onClose}>
            Aceptar
          </button>
        </footer>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../AuthContext";
import { getAvatarInitials, getAvatarColor } from "../utils/avatarUtils";
import { createSafeBackdropProps } from "../utils/modalUtils";
import type { UserSummary, UserRole, PublicTemplateMetadata } from "shared";

interface DashboardData {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  version: string;
  database: string;
}

export const AdminPanel: React.FC = () => {
  const { user, loading: authLoading, logout, setShowLoginModal } = useAuth();
  const [activeTab, setActiveTab] = useState<"inicio" | "usuarios" | "plantillas">("inicio");

  // Estados de Datos
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Estados de Modales Usuarios
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [addLoading, setAddLoading] = useState(false);

  const [userToReset, setUserToReset] = useState<UserSummary | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserSummary | null>(null);

  // Estado para modificación de nombre de usuario (SRS-075)
  const [userToEditUsername, setUserToEditUsername] = useState<UserSummary | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Estados de Plantillas Públicas (SRS-075)
  const [publicTemplates, setPublicTemplates] = useState<PublicTemplateMetadata[]>([]);
  const [publicTemplatesFilter, setPublicTemplatesFilter] = useState<"pending" | "approved" | "all">("pending");
  const [publicTemplatesLoading, setPublicTemplatesLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Estado para exportación e importación de copias de seguridad (SRS-064)
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [restoreConfirmFile, setRestoreConfirmFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para modificación de cuota de almacenamiento (SRS-065)
  const [userToEditQuota, setUserToEditQuota] = useState<UserSummary | null>(null);
  const [quotaInputMb, setQuotaInputMb] = useState<number | "">(100);
  const [quotaLoading, setQuotaLoading] = useState(false);

  const backdropMouseDownRef = useRef(false);

  // Carga de datos
  const loadDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (err) {
      console.error("Error al cargar dashboard:", err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingData(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadPublicTemplates = async (status?: string) => {
    try {
      setPublicTemplatesLoading(true);
      const query = status && status !== "all" ? `?status=${status}` : "";
      const res = await fetch(`/api/admin/public-templates${query}`);
      if (res.ok) {
        const data = await res.json();
        setPublicTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Error al cargar plantillas públicas:", err);
    } finally {
      setPublicTemplatesLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadDashboard();
      loadUsers();
      loadPublicTemplates(publicTemplatesFilter);
    }
  }, [user]);

  // Mensaje temporal
  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Crear usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, role: newRole, username: newUsername.trim() || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear usuario.");
      }
      showFeedback(`Usuario ${newEmail} registrado con éxito.`);
      setNewEmail("");
      setNewUsername("");
      setShowAddModal(false);
      loadUsers();
      loadDashboard();
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setAddLoading(false);
    }
  };

  // Actualizar nombre de usuario
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEditUsername) return;
    try {
      setUsernameLoading(true);
      const res = await fetch(`/api/admin/users/${userToEditUsername.id}/username`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar el nombre de usuario.");
      }
      showFeedback("Nombre de usuario actualizado con éxito.");
      setUserToEditUsername(null);
      loadUsers();
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setUsernameLoading(false);
    }
  };

  // Aprobar plantilla pública
  const handleApproveTemplate = async (templateId: string) => {
    try {
      setActionLoadingId(templateId);
      const res = await fetch(`/api/admin/public-templates/${templateId}/approve`, {
        method: "POST"
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al aprobar la plantilla.");
      }
      showFeedback("Plantilla aprobada correctamente para la tienda pública.");
      loadPublicTemplates(publicTemplatesFilter);
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Rechazar / eliminar plantilla pública
  const handleRejectTemplate = async (templateId: string) => {
    if (!window.confirm("¿Seguro que deseas rechazar/eliminar esta plantilla pública? Se eliminará el archivo del servidor.")) {
      return;
    }
    try {
      setActionLoadingId(templateId);
      const res = await fetch(`/api/admin/public-templates/${templateId}/reject`, {
        method: "POST"
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al rechazar la plantilla.");
      }
      showFeedback("Plantilla eliminada del repositorio público.");
      loadPublicTemplates(publicTemplatesFilter);
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Resetear contraseña
  const handleResetPassword = async () => {
    if (!userToReset) return;
    try {
      const res = await fetch(`/api/admin/users/${userToReset.id}/reset-password`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al resetear contraseña.");
      }
      showFeedback(`Contraseña de ${userToReset.email} reseteada.`);
      setUserToReset(null);
      loadUsers();
      loadDashboard();
    } catch (err: any) {
      showFeedback(err.message, "error");
    }
  };

  // Cambiar rol
  const handleChangeRole = async (userId: string, currentRole: UserRole) => {
    const nextRole: UserRole = currentRole === "admin" ? "user" : "admin";
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al cambiar rol.");
      }
      showFeedback("Rol de usuario actualizado.");
      loadUsers();
    } catch (err: any) {
      showFeedback(err.message, "error");
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar usuario.");
      }
      showFeedback(`Usuario ${userToDelete.email} eliminado.`);
      setUserToDelete(null);
      loadUsers();
      loadDashboard();
    } catch (err: any) {
      showFeedback(err.message, "error");
    }
  };

  // Modificar Cuota de Espacio (SRS-065)
  const handleUpdateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEditQuota) return;
    const numericQuota = Number(quotaInputMb);
    if (!Number.isInteger(numericQuota) || numericQuota < 1) {
      showFeedback("La cuota debe ser un número entero mayor o igual a 1 MB.", "error");
      return;
    }
    try {
      setQuotaLoading(true);
      const res = await fetch(`/api/admin/users/${userToEditQuota.id}/quota`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotaMb: numericQuota })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar la cuota.");
      }
      showFeedback(`Cuota de ${userToEditQuota.email} actualizada a ${numericQuota} MB.`);
      setUserToEditQuota(null);
      loadUsers();
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setQuotaLoading(false);
    }
  };

  // Descargar Copia de Seguridad (SRS-064)
  const handleExportBackup = async () => {
    try {
      setIsExportingBackup(true);
      const res = await fetch("/api/admin/backup/export");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al exportar la copia de seguridad.");
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "cdc2_backup.zip";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showFeedback("Copia de seguridad descargada con éxito.");
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Seleccionar archivo para restauración (SRS-064)
  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        showFeedback("El archivo debe tener extensión .zip", "error");
        e.target.value = "";
        return;
      }
      setRestoreConfirmFile(file);
    }
    e.target.value = "";
  };

  // Confirmar y ejecutar restauración (SRS-064)
  const handleConfirmRestore = async () => {
    if (!restoreConfirmFile) return;
    try {
      setIsImportingBackup(true);
      const formData = new FormData();
      formData.append("backup", restoreConfirmFile);

      const res = await fetch("/api/admin/backup/import", {
        method: "POST",
        body: formData
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Error al restaurar la copia de seguridad.");
      }

      showFeedback("¡Copia de seguridad restaurada correctamente! Recargando sistema...");
      setRestoreConfirmFile(null);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      showFeedback(err.message, "error");
      setIsImportingBackup(false);
    }
  };

  // Guardia de Acceso
  if (authLoading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#121216", color: "#fff" }}>
        <p>Cargando panel de administración...</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#121216", color: "#fff", padding: "20px" }}>
        <div style={{ backgroundColor: "#1e1e24", border: "1px solid #333340", borderRadius: "12px", padding: "36px 40px", maxWidth: "460px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize: "48px" }}>⛔</span>
          <h2 style={{ fontSize: "22px", marginTop: "12px", marginBottom: "8px" }}>Acceso Restringido</h2>
          <p style={{ color: "#a1a1aa", fontSize: "14px", lineHeight: "1.5", marginBottom: "24px" }}>
            Esta sección está reservada exclusivamente para cuentas con privilegios de <strong>Administrador maestro</strong>.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            {!user ? (
              <button
                onClick={() => setShowLoginModal(true)}
                style={{ padding: "10px 18px", borderRadius: "6px", backgroundColor: "#6366f1", color: "#fff", border: "none", fontWeight: "600", cursor: "pointer" }}
              >
                Iniciar Sesión
              </button>
            ) : null}
            <a
              href="/"
              style={{ padding: "10px 18px", borderRadius: "6px", backgroundColor: "#272730", color: "#fff", textDecoration: "none", fontSize: "14px", fontWeight: "500", border: "1px solid #3f3f4e" }}
            >
              Volver a la App
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Filtrado de usuarios
  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const currentUserInitials = getAvatarInitials(user.email);
  const currentUserColor = getAvatarColor(user.email);

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#121216", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
      {/* 1. SIDEBAR ESTILO WORDPRESS */}
      <aside
        style={{
          width: "240px",
          backgroundColor: "#18181f",
          borderRight: "1px solid #2a2a35",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0
        }}
      >
        {/* Cabecera Sidebar */}
        <div style={{ padding: "20px 18px", borderBottom: "1px solid #2a2a35", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px" }}>🎴</span>
          <div>
            <h1 style={{ fontSize: "14px", fontWeight: "700", margin: 0, color: "#fff" }}>Card Deck Crafter</h1>
            <span style={{ fontSize: "10px", backgroundColor: "#6366f1", color: "#fff", padding: "1px 6px", borderRadius: "4px", fontWeight: "600", textTransform: "uppercase" }}>
              Admin
            </span>
          </div>
        </div>

        {/* Menú de Navegación */}
        <nav style={{ padding: "16px 10px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          <button
            onClick={() => setActiveTab("inicio")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: activeTab === "inicio" ? "#2b2b3b" : "transparent",
              color: activeTab === "inicio" ? "#fff" : "#a1a1aa",
              fontSize: "14px",
              fontWeight: activeTab === "inicio" ? "600" : "500",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s"
            }}
          >
            <span>📊</span> Inicio
          </button>

          <button
            onClick={() => setActiveTab("usuarios")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: activeTab === "usuarios" ? "#2b2b3b" : "transparent",
              color: activeTab === "usuarios" ? "#fff" : "#a1a1aa",
              fontSize: "14px",
              fontWeight: activeTab === "usuarios" ? "600" : "500",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s"
            }}
          >
            <span>👥</span> Usuarios
          </button>

          <button
            onClick={() => {
              setActiveTab("plantillas");
              loadPublicTemplates(publicTemplatesFilter);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: activeTab === "plantillas" ? "#2b2b3b" : "transparent",
              color: activeTab === "plantillas" ? "#fff" : "#a1a1aa",
              fontSize: "14px",
              fontWeight: activeTab === "plantillas" ? "600" : "500",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s"
            }}
          >
            <span>📐</span> Plantillas Públicas
          </button>
        </nav>

        {/* Pie Sidebar */}
        <div style={{ padding: "16px 14px", borderTop: "1px solid #2a2a35" }}>
          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#94a3b8",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "500",
              padding: "6px 8px",
              borderRadius: "4px",
              transition: "color 0.2s"
            }}
          >
            <span>⬅️</span> Volver a la Aplicación
          </a>
        </div>
      </aside>

      {/* 2. ÁREA DE TRABAJO PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Barra Superior Header */}
        <header
          style={{
            height: "56px",
            backgroundColor: "#18181f",
            borderBottom: "1px solid #2a2a35",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#fff" }}>
            {activeTab === "inicio"
              ? "Panel de Control / Resumen"
              : activeTab === "usuarios"
              ? "Gestión de Usuarios"
              : "Moderación de Plantillas Públicas"}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: currentUserColor.bg,
                  color: currentUserColor.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "700"
                }}
              >
                {currentUserInitials}
              </div>
              <span style={{ fontSize: "13px", color: "#cbd5e1" }}>{user.email}</span>
            </div>

            <button
              onClick={() => logout()}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #3f3f4e",
                color: "#ef4444",
                borderRadius: "4px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: "500",
                cursor: "pointer"
              }}
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Notificación Feedback */}
        {actionMessage && (
          <div
            style={{
              padding: "10px 28px",
              backgroundColor: actionMessage.type === "success" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
              color: actionMessage.type === "success" ? "#4ade80" : "#f87171",
              fontSize: "13px",
              fontWeight: "500",
              borderBottom: "1px solid rgba(255,255,255,0.05)"
            }}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Contenido Dinámico */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          {activeTab === "inicio" && (
            <div style={{ maxWidth: "1000px" }}>
              {/* Tarjetas de Resumen */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px", marginBottom: "28px" }}>
                <div style={{ backgroundColor: "#1e1e24", border: "1px solid #2a2a35", borderRadius: "10px", padding: "22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Total Usuarios</span>
                    <span style={{ fontSize: "22px" }}>👥</span>
                  </div>
                  <div style={{ fontSize: "32px", fontWeight: "700", color: "#fff", marginTop: "10px" }}>
                    {dashboard ? dashboard.totalUsers : "..."}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Registrados en la base de datos</div>
                </div>

                <div style={{ backgroundColor: "#1e1e24", border: "1px solid #2a2a35", borderRadius: "10px", padding: "22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Usuarios Activos</span>
                    <span style={{ fontSize: "22px" }}>🟢</span>
                  </div>
                  <div style={{ fontSize: "32px", fontWeight: "700", color: "#4ade80", marginTop: "10px" }}>
                    {dashboard ? dashboard.activeUsers : "..."}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Con contraseña fijada y acceso activo</div>
                </div>

                <div style={{ backgroundColor: "#1e1e24", border: "1px solid #2a2a35", borderRadius: "10px", padding: "22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Pendientes de Activación</span>
                    <span style={{ fontSize: "22px" }}>🟡</span>
                  </div>
                  <div style={{ fontSize: "32px", fontWeight: "700", color: "#facc15", marginTop: "10px" }}>
                    {dashboard ? dashboard.pendingUsers : "..."}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Esperando asignar clave en su primer login</div>
                </div>
              </div>

              {/* Información del Sistema */}
              <div style={{ backgroundColor: "#1e1e24", border: "1px solid #2a2a35", borderRadius: "10px", padding: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px 0", color: "#fff" }}>Información del Sistema</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Versión Software:</span>
                    <strong style={{ color: "#e2e8f0" }}>{dashboard?.version || "v2.261008.3"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Motor de Base de Datos:</span>
                    <strong style={{ color: "#e2e8f0" }}>{dashboard?.database || "SQLite 3 (Embebida)"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Estado del Servidor:</span>
                    <span style={{ color: "#4ade80", fontWeight: "600" }}>● En Línea</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Entorno:</span>
                    <strong style={{ color: "#e2e8f0" }}>Docker / Multiplataforma</strong>
                  </div>
                </div>
              </div>

              {/* Copias de Seguridad del Sistema (SRS-064) */}
              <div style={{ backgroundColor: "#1e1e24", border: "1px solid #2a2a35", borderRadius: "10px", padding: "24px", marginTop: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                  <div style={{ maxWidth: "650px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 6px 0", color: "#fff" }}>
                      📦 Copia de Seguridad del Sistema
                    </h3>
                    <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>
                      Gestiona copias completas de la base de datos de usuarios (SQLite), sesiones y recursos del sistema en archivos comprimidos <code>.zip</code>. Puedes descargar copias de respaldo o restaurar el sistema en cualquier momento.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      onClick={handleExportBackup}
                      disabled={isExportingBackup || isImportingBackup}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        backgroundColor: isExportingBackup ? "#334155" : "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "10px 16px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: isExportingBackup || isImportingBackup ? "wait" : "pointer",
                        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                        transition: "background-color 0.2s"
                      }}
                    >
                      {isExportingBackup ? "Empaquetando datos..." : "⬇️ Descargar Copia (.zip)"}
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isExportingBackup || isImportingBackup}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        backgroundColor: isImportingBackup ? "#334155" : "#6366f1",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "10px 16px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: isExportingBackup || isImportingBackup ? "wait" : "pointer",
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
                        transition: "background-color 0.2s"
                      }}
                    >
                      {isImportingBackup ? "Restaurando..." : "⬆️ Restaurar Copia (.zip)"}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".zip,application/zip"
                      style={{ display: "none" }}
                      onChange={handleSelectRestoreFile}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "usuarios" && (
            <div style={{ maxWidth: "1100px" }}>
              {/* Barra de Acciones y Búsqueda */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Buscar por email..."
                    style={{
                      width: "100%",
                      padding: "9px 14px",
                      borderRadius: "6px",
                      border: "1px solid #333340",
                      backgroundColor: "#1e1e24",
                      color: "#fff",
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "6px",
                    backgroundColor: "#6366f1",
                    color: "#fff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span>➕</span> Añadir Usuario
                </button>
              </div>

              {/* Tabla de Usuarios */}
              <div style={{ backgroundColor: "#1e1e24", border: "1px solid #2a2a35", borderRadius: "10px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#18181f", borderBottom: "1px solid #2a2a35", color: "#94a3b8" }}>
                      <th style={{ padding: "12px 16px", width: "40px" }}></th>
                      <th style={{ padding: "12px 16px" }}>Email</th>
                      <th style={{ padding: "12px 16px" }}>Usuario (@)</th>
                      <th style={{ padding: "12px 16px" }}>Rol</th>
                      <th style={{ padding: "12px 16px" }}>Estado Clave</th>
                      <th style={{ padding: "12px 16px" }}>Cuota (Uso / Límite)</th>
                      <th style={{ padding: "12px 16px" }}>Fecha Registro</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingData ? (
                      <tr>
                        <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                          Cargando usuarios...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                          {searchQuery ? "No se encontraron usuarios coincidentes." : "No hay usuarios registrados."}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const avatarInit = getAvatarInitials(u.email);
                        const avatarClr = getAvatarColor(u.email);
                        const isSelf = u.id === user.id;

                        return (
                          <tr key={u.id} style={{ borderBottom: "1px solid #2a2a35" }}>
                            <td style={{ padding: "12px 16px" }}>
                              <div
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "50%",
                                  backgroundColor: avatarClr.bg,
                                  color: avatarClr.text,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "11px",
                                  fontWeight: "700"
                                }}
                              >
                                {avatarInit}
                              </div>
                            </td>

                            <td style={{ padding: "12px 16px", fontWeight: "500", color: "#fff" }}>
                              {u.email}
                              {isSelf && (
                                <span style={{ marginLeft: "8px", fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>
                                  (tú)
                                </span>
                              )}
                            </td>

                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ color: u.username ? "#a5b4fc" : "#64748b", fontWeight: u.username ? "600" : "400" }}>
                                  {u.username ? `@${u.username}` : "—"}
                                </span>
                                <button
                                  type="button"
                                  title="Editar nombre de usuario"
                                  onClick={() => {
                                    setUserToEditUsername(u);
                                    setUsernameInput(u.username || "");
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    padding: "2px 4px",
                                    borderRadius: "3px",
                                    color: "#94a3b8"
                                  }}
                                >
                                  ✏️
                                </button>
                              </div>
                            </td>

                            <td style={{ padding: "12px 16px" }}>
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  backgroundColor: u.role === "admin" ? "rgba(168, 85, 247, 0.2)" : "rgba(148, 163, 184, 0.2)",
                                  color: u.role === "admin" ? "#c084fc" : "#cbd5e1"
                                }}
                              >
                                {u.role === "admin" ? "🛡️ Admin" : "👤 Usuario"}
                              </span>
                            </td>

                            <td style={{ padding: "12px 16px" }}>
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  backgroundColor: u.hasPassword ? "rgba(34, 197, 94, 0.2)" : "rgba(234, 179, 8, 0.2)",
                                  color: u.hasPassword ? "#4ade80" : "#facc15"
                                }}
                              >
                                {u.hasPassword ? "● Activo" : "○ Pendiente"}
                              </span>
                            </td>

                            <td style={{ padding: "12px 16px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: "500",
                                  backgroundColor: "#272733",
                                  color: "#38bdf8",
                                  border: "1px solid #38384d"
                                }}
                              >
                                💾 {u.usedStorageMb !== undefined ? `${u.usedStorageMb} / ${u.storageQuotaMb || 100} MB` : `${u.storageQuotaMb || 100} MB`}
                              </span>
                            </td>

                            <td style={{ padding: "12px 16px", color: "#94a3b8" }}>
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>

                            <td style={{ padding: "12px 16px", textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                <button
                                  type="button"
                                  title="Modificar Cuota de Espacio"
                                  onClick={() => {
                                    setUserToEditQuota(u);
                                    setQuotaInputMb(u.storageQuotaMb || 100);
                                  }}
                                  style={{
                                    padding: "5px 9px",
                                    borderRadius: "4px",
                                    border: "1px solid #3f3f4e",
                                    backgroundColor: "#2b2b36",
                                    color: "#38bdf8",
                                    fontSize: "12px",
                                    cursor: "pointer"
                                  }}
                                >
                                  💾 Cuota
                                </button>

                                <button
                                  type="button"
                                  title="Resetear Contraseña"
                                  onClick={() => setUserToReset(u)}
                                  style={{
                                    padding: "5px 9px",
                                    borderRadius: "4px",
                                    border: "1px solid #3f3f4e",
                                    backgroundColor: "#2b2b36",
                                    color: "#e2e8f0",
                                    fontSize: "12px",
                                    cursor: "pointer"
                                  }}
                                >
                                  🔑 Resetear
                                </button>

                                {!isSelf && (
                                  <>
                                    <button
                                      type="button"
                                      title={u.role === "admin" ? "Degradar a Usuario" : "Promocionar a Admin"}
                                      onClick={() => handleChangeRole(u.id, u.role)}
                                      style={{
                                        padding: "5px 9px",
                                        borderRadius: "4px",
                                        border: "1px solid #3f3f4e",
                                        backgroundColor: "#2b2b36",
                                        color: "#e2e8f0",
                                        fontSize: "12px",
                                        cursor: "pointer"
                                      }}
                                    >
                                      {u.role === "admin" ? "👤 Hacer User" : "🛡️ Hacer Admin"}
                                    </button>

                                    <button
                                      type="button"
                                      title="Eliminar Usuario"
                                      onClick={() => setUserToDelete(u)}
                                      style={{
                                        padding: "5px 9px",
                                        borderRadius: "4px",
                                        border: "1px solid rgba(239, 68, 68, 0.4)",
                                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                                        color: "#f87171",
                                        fontSize: "12px",
                                        cursor: "pointer"
                                      }}
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "plantillas" && (
            <div style={{ maxWidth: "1100px" }}>
              {/* Barra de Filtros y Controles */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "600", marginRight: "4px" }}>
                    Filtrar por:
                  </span>
                  {(
                    [
                      { key: "pending", label: "⏳ Pendientes de Aprobación" },
                      { key: "approved", label: "✅ Aprobadas / Tienda" },
                      { key: "all", label: "🌐 Todas" }
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => {
                        setPublicTemplatesFilter(f.key);
                        loadPublicTemplates(f.key);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        border: publicTemplatesFilter === f.key ? "1px solid #6366f1" : "1px solid #333340",
                        backgroundColor: publicTemplatesFilter === f.key ? "#4f46e5" : "#1e1e24",
                        color: publicTemplatesFilter === f.key ? "#fff" : "#94a3b8",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => loadPublicTemplates(publicTemplatesFilter)}
                  disabled={publicTemplatesLoading}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    backgroundColor: "#2b2b36",
                    color: "#cbd5e1",
                    border: "1px solid #3f3f4e",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: publicTemplatesLoading ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span>🔄</span> {publicTemplatesLoading ? "Cargando..." : "Refrescar"}
                </button>
              </div>

              {/* Lista de Plantillas */}
              {publicTemplatesLoading ? (
                <div style={{ backgroundColor: "#1e1e24", border: "1px solid #2a2a35", borderRadius: "10px", padding: "40px", textAlign: "center", color: "#64748b" }}>
                  Cargando plantillas públicas...
                </div>
              ) : publicTemplates.length === 0 ? (
                <div style={{ backgroundColor: "#1e1e24", border: "1px solid #2a2a35", borderRadius: "10px", padding: "40px", textAlign: "center", color: "#64748b" }}>
                  No hay plantillas públicas disponibles con el filtro seleccionado.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {publicTemplates.map((tmpl) => {
                    let previewCards: any[] = [];
                    if (tmpl.metadataJson) {
                      try {
                        const parsed = JSON.parse(tmpl.metadataJson);
                        if (Array.isArray(parsed.previewCards)) {
                          previewCards = parsed.previewCards;
                        }
                      } catch {
                        // ignore json parse error
                      }
                    }

                    const isPending = tmpl.status === "pending";
                    const isActionLoading = actionLoadingId === tmpl.id;

                    return (
                      <div
                        key={tmpl.id}
                        style={{
                          backgroundColor: "#1e1e24",
                          border: `1px solid ${isPending ? "#eab308" : "#2a2a35"}`,
                          borderRadius: "10px",
                          padding: "20px 24px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "14px"
                        }}
                      >
                        {/* Cabecera de la plantilla */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#fff" }}>
                                {tmpl.name}
                              </h3>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  backgroundColor: "rgba(99, 102, 241, 0.2)",
                                  color: "#a5b4fc",
                                  border: "1px solid rgba(99, 102, 241, 0.3)"
                                }}
                              >
                                👤 @{tmpl.authorName || "anónimo"}
                              </span>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  backgroundColor: isPending ? "rgba(234, 179, 8, 0.2)" : "rgba(34, 197, 94, 0.2)",
                                  color: isPending ? "#facc15" : "#4ade80",
                                  border: `1px solid ${isPending ? "rgba(234, 179, 8, 0.4)" : "rgba(34, 197, 94, 0.4)"}`
                                }}
                              >
                                {isPending ? "⏳ Pendiente de Aprobación" : "✅ Aprobada para Tienda"}
                              </span>
                            </div>
                            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#cbd5e1", lineHeight: "1.4" }}>
                              {tmpl.description || "Sin descripción proporcionada."}
                            </p>
                          </div>

                          {/* Acciones */}
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <button
                              type="button"
                              title="Abrir esta plantilla en el editor para probar cartas y diseño antes de aprobarla"
                              onClick={() => {
                                window.open(`/?openPublicTemplate=${encodeURIComponent(tmpl.id)}`, "_blank");
                              }}
                              style={{
                                padding: "8px 14px",
                                borderRadius: "6px",
                                border: "1px solid #38bdf8",
                                backgroundColor: "rgba(56, 189, 248, 0.15)",
                                color: "#38bdf8",
                                fontWeight: "600",
                                fontSize: "12px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "background-color 0.15s"
                              }}
                            >
                              <span>👁️</span> Abrir Plantilla
                            </button>

                            {isPending && (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => handleApproveTemplate(tmpl.id)}
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: "6px",
                                  border: "none",
                                  backgroundColor: "#16a34a",
                                  color: "#fff",
                                  fontWeight: "600",
                                  fontSize: "12px",
                                  cursor: isActionLoading ? "wait" : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  boxShadow: "0 2px 6px rgba(22, 163, 74, 0.3)"
                                }}
                              >
                                <span>✅</span> {isActionLoading ? "Procesando..." : "Aprobar Publicación"}
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => handleRejectTemplate(tmpl.id)}
                              style={{
                                padding: "8px 14px",
                                borderRadius: "6px",
                                border: "1px solid rgba(239, 68, 68, 0.4)",
                                backgroundColor: "rgba(239, 68, 68, 0.15)",
                                color: "#f87171",
                                fontWeight: "600",
                                fontSize: "12px",
                                cursor: isActionLoading ? "wait" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                              }}
                            >
                              <span>{isPending ? "❌" : "🗑️"}</span> {isPending ? "Rechazar" : "Retirar / Despublicar"}
                            </button>
                          </div>
                        </div>

                        {/* Metadatos y Estadísticas */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            flexWrap: "wrap",
                            fontSize: "12px",
                            color: "#94a3b8",
                            paddingTop: "8px",
                            borderTop: "1px solid #282834"
                          }}
                        >
                          <span>📄 {tmpl.documentCount} {tmpl.documentCount === 1 ? "documento" : "documentos"}</span>
                          <span>🎴 {tmpl.templateCount} {tmpl.templateCount === 1 ? "plantilla de carta" : "plantillas de carta"}</span>
                          <span>💾 {((tmpl.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB</span>
                          <span>📅 Publicado: {new Date(tmpl.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Miniaturas de vista previa */}
                        {previewCards.length > 0 && (
                          <div style={{ marginTop: "4px" }}>
                            <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                              Miniaturas contenidas en la plantilla:
                            </div>
                            <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "6px" }}>
                              {previewCards.map((p, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    backgroundColor: "#16161c",
                                    border: "1px solid #2a2a35",
                                    borderRadius: "6px",
                                    padding: "6px",
                                    minWidth: "70px",
                                    maxWidth: "90px"
                                  }}
                                >
                                  {p.miniatura ? (
                                    <img
                                      src={p.miniatura}
                                      alt={p.nombre || "Miniatura"}
                                      style={{
                                        width: "56px",
                                        height: "78px",
                                        objectFit: "contain",
                                        backgroundColor: "#0d0d11",
                                        borderRadius: "3px"
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: "56px",
                                        height: "78px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: "#0d0d11",
                                        borderRadius: "3px",
                                        color: "#475569",
                                        fontSize: "18px"
                                      }}
                                    >
                                      🎴
                                    </div>
                                  )}
                                  <span
                                    title={p.nombre}
                                    style={{
                                      fontSize: "10px",
                                      color: "#cbd5e1",
                                      marginTop: "4px",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      width: "100%",
                                      textAlign: "center"
                                    }}
                                  >
                                    {p.nombre || "Carta"}
                                  </span>
                                  <span style={{ fontSize: "9px", color: "#64748b" }}>
                                    {p.anchoMm}×{p.altoMm}mm
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODAL: AÑADIR USUARIO */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
          {...createSafeBackdropProps(backdropMouseDownRef, () => setShowAddModal(false))}
        >
          <div
            style={{
              backgroundColor: "#1e1e24",
              border: "1px solid #333340",
              borderRadius: "10px",
              padding: "24px 28px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 14px 0", fontSize: "18px", color: "#fff" }}>Añadir Nuevo Usuario</h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px", lineHeight: "1.4" }}>
              El usuario se registrará con la contraseña vacía. Al acceder por primera vez, el sistema le solicitará fijar su propia contraseña.
            </p>

            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid #444452",
                    backgroundColor: "#121216",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                  Nombre de Usuario (Opcional)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "600" }}>@</span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="ej. juan_perez"
                    pattern="^[a-zA-Z0-9_\-\.]{3,30}$"
                    title="Entre 3 y 30 caracteres alfanuméricos, guiones o puntos."
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #444452",
                      backgroundColor: "#121216",
                      color: "#fff",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                  Si se omite, se generará uno aleatorio (user_xxxxxx).
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                  Rol Asignado
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid #444452",
                    backgroundColor: "#121216",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="user">Usuario Estándar</option>
                  <option value="admin">Administrador Maestro</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: "6px",
                    border: "1px solid #3f3f4e",
                    backgroundColor: "transparent",
                    color: "#cbd5e1",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#6366f1",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: addLoading ? "not-allowed" : "pointer"
                  }}
                >
                  {addLoading ? "Creando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MODIFICAR NOMBRE DE USUARIO (SRS-075) */}
      {userToEditUsername && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
          {...createSafeBackdropProps(backdropMouseDownRef, () => {
            if (!usernameLoading) setUserToEditUsername(null);
          })}
        >
          <div
            style={{
              backgroundColor: "#1e1e24",
              border: "1px solid #333340",
              borderRadius: "10px",
              padding: "24px 28px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "24px" }}>👤</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", color: "#6366f1" }}>Modificar Nombre de Usuario</h3>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>{userToEditUsername.email}</span>
              </div>
            </div>

            <form onSubmit={handleUpdateUsername}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "500" }}>
                  Nombre de Usuario (Único)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "600" }}>@</span>
                  <input
                    type="text"
                    required
                    pattern="^[a-zA-Z0-9_\-\.]{3,30}$"
                    title="Entre 3 y 30 caracteres alfanuméricos, guiones o puntos."
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    disabled={usernameLoading}
                    placeholder="nombre_usuario"
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #3f3f4e",
                      backgroundColor: "#141418",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "600",
                      outline: "none"
                    }}
                  />
                </div>
                <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                  Solo letras, números, guiones y puntos (3-30 caracteres). Este nombre será visible como autor en plantillas públicas.
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  disabled={usernameLoading}
                  onClick={() => setUserToEditUsername(null)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    border: "1px solid #3f3f4e",
                    backgroundColor: "transparent",
                    color: "#cbd5e1",
                    fontSize: "13px",
                    cursor: usernameLoading ? "not-allowed" : "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={usernameLoading}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: usernameLoading ? "#4338ca" : "#6366f1",
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: usernameLoading ? "wait" : "pointer"
                  }}
                >
                  {usernameLoading ? "Guardando..." : "Guardar Nombre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR RESET DE CONTRASEÑA */}
      {userToReset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
          {...createSafeBackdropProps(backdropMouseDownRef, () => setUserToReset(null))}
        >
          <div
            style={{
              backgroundColor: "#1e1e24",
              border: "1px solid #333340",
              borderRadius: "10px",
              padding: "24px 28px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "17px", color: "#fff" }}>Resetear Contraseña</h3>
            <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5" }}>
              ¿Estás seguro de resetear la contraseña de <strong>{userToReset.email}</strong>?
            </p>
            <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.4" }}>
              Se anulará su clave actual y se cerrarán todas sus sesiones activas. Al intentar acceder nuevamente, se le solicitará fijar una nueva contraseña.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setUserToReset(null)}
                style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #3f3f4e", backgroundColor: "transparent", color: "#cbd5e1", fontSize: "13px", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
              >
                Confirmar Reseteo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MODIFICAR CUOTA DE ESPACIO (SRS-065) */}
      {userToEditQuota && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
          {...createSafeBackdropProps(backdropMouseDownRef, () => {
            if (!quotaLoading) setUserToEditQuota(null);
          })}
        >
          <div
            style={{
              backgroundColor: "#1e1e24",
              border: "1px solid #333340",
              borderRadius: "10px",
              padding: "24px 28px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "24px" }}>💾</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", color: "#38bdf8" }}>Modificar Cuota de Espacio</h3>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>{userToEditQuota.email}</span>
              </div>
            </div>

            <form onSubmit={handleUpdateQuota}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "500" }}>
                  Límite de Almacenamiento (MB)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    step={1}
                    value={quotaInputMb}
                    onChange={(e) => setQuotaInputMb(e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={quotaLoading}
                    required
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #3f3f4e",
                      backgroundColor: "#141418",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "600",
                      outline: "none"
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "600" }}>MB</span>
                </div>
              </div>

              {/* Botones de preajuste rápido */}
              <div style={{ marginBottom: "18px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>Preajustes rápidos:</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[100, 250, 500, 1000, 2000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuotaInputMb(preset)}
                      disabled={quotaLoading}
                      style={{
                        padding: "4px 8px",
                        fontSize: "11px",
                        fontWeight: Number(quotaInputMb) === preset ? "700" : "500",
                        backgroundColor: Number(quotaInputMb) === preset ? "#0284c7" : "#2b2b36",
                        color: Number(quotaInputMb) === preset ? "#fff" : "#cbd5e1",
                        border: Number(quotaInputMb) === preset ? "1px solid #38bdf8" : "1px solid #3f3f4e",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      {preset >= 1000 ? `${preset / 1000} GB` : `${preset} MB`}
                    </button>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.4", margin: "0 0 20px 0" }}>
                Esta cuota define el espacio máximo que el usuario podrá consumir almacenando barajas, plantillas y assets. El valor por defecto del sistema es 100 MB.
              </p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  disabled={quotaLoading}
                  onClick={() => setUserToEditQuota(null)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    border: "1px solid #3f3f4e",
                    backgroundColor: "transparent",
                    color: "#cbd5e1",
                    fontSize: "13px",
                    cursor: quotaLoading ? "not-allowed" : "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={quotaLoading}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: quotaLoading ? "#0369a1" : "#0284c7",
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: quotaLoading ? "wait" : "pointer"
                  }}
                >
                  {quotaLoading ? "Guardando..." : "Guardar Cuota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE USUARIO */}
      {userToDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
          {...createSafeBackdropProps(backdropMouseDownRef, () => setUserToDelete(null))}
        >
          <div
            style={{
              backgroundColor: "#1e1e24",
              border: "1px solid #333340",
              borderRadius: "10px",
              padding: "24px 28px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "17px", color: "#ef4444" }}>Eliminar Usuario</h3>
            <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5" }}>
              ¿Estás seguro de eliminar permanentemente la cuenta de <strong>{userToDelete.email}</strong>?
            </p>
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>
              Esta acción revocará inmediatamente sus credenciales y accesos.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #3f3f4e", backgroundColor: "transparent", color: "#cbd5e1", fontSize: "13px", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#ef4444", color: "#fff", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
              >
                Eliminar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR RESTAURACIÓN DE COPIA DE SEGURIDAD (SRS-064) */}
      {restoreConfirmFile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
          {...createSafeBackdropProps(backdropMouseDownRef, () => {
            if (!isImportingBackup) setRestoreConfirmFile(null);
          })}
        >
          <div
            style={{
              backgroundColor: "#1e1e24",
              border: "1px solid #eab308",
              borderRadius: "10px",
              padding: "24px 28px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "28px" }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: "17px", color: "#facc15" }}>Confirmar Restauración del Sistema</h3>
            </div>
            <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5", margin: "0 0 10px 0" }}>
              Estás a punto de restaurar la copia de seguridad: <strong>{restoreConfirmFile.name}</strong> ({(restoreConfirmFile.size / 1024).toFixed(1)} KB).
            </p>
            <div style={{ backgroundColor: "rgba(234, 179, 8, 0.1)", border: "1px solid rgba(234, 179, 8, 0.3)", borderRadius: "6px", padding: "12px", marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "#fef08a", margin: 0, lineHeight: "1.4" }}>
                <strong>ADVERTENCIA:</strong> Esta acción reemplazará la base de datos y los datos actuales por los contenidos en este archivo. El servidor guardará una copia preventiva automática antes de sobreescribir.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={isImportingBackup}
                onClick={() => setRestoreConfirmFile(null)}
                style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #3f3f4e", backgroundColor: "transparent", color: "#cbd5e1", fontSize: "13px", cursor: isImportingBackup ? "not-allowed" : "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isImportingBackup}
                onClick={handleConfirmRestore}
                style={{
                  padding: "8px 18px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: isImportingBackup ? "#713f12" : "#eab308",
                  color: "#000",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: isImportingBackup ? "wait" : "pointer"
                }}
              >
                {isImportingBackup ? "Restaurando y migrando..." : "Sí, Restaurar Ahora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

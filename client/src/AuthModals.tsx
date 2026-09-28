import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export const AuthModals: React.FC = () => {
  const {
    showLoginModal,
    setShowLoginModal,
    showSetupModal,
    activationEmail,
    setActivationEmail,
    login,
    activatePassword,
    setupAdmin
  } = useAuth();

  // Estados de Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Estados de Setup Admin
  const [setupEmail, setSetupEmail] = useState("admin@admin.com");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  // Estados de Activación
  const [actPassword, setActPassword] = useState("");
  const [actConfirm, setActConfirm] = useState("");
  const [actError, setActError] = useState("");
  const [actLoading, setActLoading] = useState(false);

  // Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await login(loginEmail, loginPassword);
      if (res.error) {
        setLoginError(res.error);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");
    setSetupLoading(true);
    try {
      const res = await setupAdmin(setupEmail, setupPassword, setupConfirm);
      if (!res.success && res.error) {
        setSetupError(res.error);
      }
    } finally {
      setSetupLoading(false);
    }
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActError("");
    setActLoading(true);
    try {
      const res = await activatePassword(actPassword, actConfirm);
      if (!res.success && res.error) {
        setActError(res.error);
      }
    } finally {
      setActLoading(false);
    }
  };

  return (
    <>
      {/* 1. MODAL SETUP INICIAL DE ADMINISTRADOR (BLOQUEANTE) */}
      {showSetupModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-secondary, #1e1e24)",
              border: "1px solid var(--border-color, #333340)",
              borderRadius: "12px",
              padding: "28px 32px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              color: "var(--text-primary, #ffffff)"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span style={{ fontSize: "36px" }}>🎴</span>
              <h2 style={{ fontSize: "20px", fontWeight: "700", marginTop: "8px", marginBottom: "4px" }}>
                Configuración Inicial de Administrador
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary, #a1a1aa)" }}>
                Bienvenido a Card Deck Crafter v2. Define la cuenta de Administrador maestro para comenzar.
              </p>
            </div>

            {setupError && (
              <div
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  marginBottom: "16px"
                }}
              >
                {setupError}
              </div>
            )}

            <form onSubmit={handleSetupSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                  Correo electrónico del Administrador
                </label>
                <input
                  type="email"
                  required
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  placeholder="admin@admin.com"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color, #444452)",
                    backgroundColor: "var(--bg-primary, #121216)",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                  Contraseña (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color, #444452)",
                    backgroundColor: "var(--bg-primary, #121216)",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={setupConfirm}
                  onChange={(e) => setSetupConfirm(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color, #444452)",
                    backgroundColor: "var(--bg-primary, #121216)",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={setupLoading}
                style={{
                  marginTop: "8px",
                  padding: "11px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "var(--accent-primary, #6366f1)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: setupLoading ? "not-allowed" : "pointer",
                  opacity: setupLoading ? 0.7 : 1,
                  transition: "opacity 0.2s"
                }}
              >
                {setupLoading ? "Creando cuenta..." : "Crear Administrador Maestro"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL INICIAR SESIÓN */}
      {showLoginModal && !showSetupModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
          onClick={() => setShowLoginModal(false)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-secondary, #1e1e24)",
              border: "1px solid var(--border-color, #333340)",
              borderRadius: "12px",
              padding: "24px 28px",
              width: "100%",
              maxWidth: "380px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              color: "var(--text-primary, #ffffff)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Iniciar Sesión</h3>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary, #a1a1aa)",
                  fontSize: "18px",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>

            {loginError && (
              <div
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  marginBottom: "14px"
                }}
              >
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color, #444452)",
                    backgroundColor: "var(--bg-primary, #121216)",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  Contraseña
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color, #444452)",
                    backgroundColor: "var(--bg-primary, #121216)",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "var(--accent-primary, #6366f1)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: loginLoading ? "not-allowed" : "pointer",
                  opacity: loginLoading ? 0.7 : 1
                }}
              >
                {loginLoading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL ACTIVACIÓN DE CONTRASEÑA */}
      {activationEmail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999
          }}
          onClick={() => setActivationEmail(null)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-secondary, #1e1e24)",
              border: "1px solid var(--border-color, #333340)",
              borderRadius: "12px",
              padding: "26px 30px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              color: "var(--text-primary, #ffffff)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: "18px" }}>
              <span style={{ fontSize: "32px" }}>🔐</span>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginTop: "6px", marginBottom: "4px" }}>
                Activar Contraseña
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary, #a1a1aa)" }}>
                Establece tu contraseña de acceso para: <br />
                <strong style={{ color: "#fff" }}>{activationEmail}</strong>
              </p>
            </div>

            {actError && (
              <div
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  marginBottom: "14px"
                }}
              >
                {actError}
              </div>
            )}

            <form onSubmit={handleActivateSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  Nueva Contraseña (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  minLength={6}
                  value={actPassword}
                  onChange={(e) => setActPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color, #444452)",
                    backgroundColor: "var(--bg-primary, #121216)",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={actConfirm}
                  onChange={(e) => setActConfirm(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color, #444452)",
                    backgroundColor: "var(--bg-primary, #121216)",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={actLoading}
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "var(--accent-primary, #6366f1)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: actLoading ? "not-allowed" : "pointer",
                  opacity: actLoading ? 0.7 : 1
                }}
              >
                {actLoading ? "Guardando..." : "Guardar Contraseña y Entrar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

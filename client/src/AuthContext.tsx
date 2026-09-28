import React, { createContext, useContext, useState, useEffect } from "react";
import type { UserRole, AuthStatusResponse } from "shared";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  status: AuthStatusResponse | null;
  loading: boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  showSetupModal: boolean;
  setShowSetupModal: (show: boolean) => void;
  activationEmail: string | null;
  setActivationEmail: (email: string | null) => void;
  login: (email: string, password?: string) => Promise<{ status: "OK" | "REQUIRES_ACTIVATION"; error?: string }>;
  activatePassword: (password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  setupAdmin: (email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [activationEmail, setActivationEmail] = useState<string | null>(null);

  const checkStatusAndUser = async () => {
    try {
      // 1. Comprobar si el sistema está inicializado
      const statusRes = await fetch("/api/auth/status");
      if (statusRes.ok) {
        const statusData: AuthStatusResponse = await statusRes.json();
        setStatus(statusData);
        if (!statusData.initialized) {
          setShowSetupModal(true);
        }
      }

      // 2. Comprobar sesión activa
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
      }
    } catch (err) {
      console.warn("[cdc2 auth] No se pudo verificar la sesión:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatusAndUser();
  }, []);

  const login = async (email: string, password?: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { status: "OK" as const, error: data.error || "Credenciales incorrectas." };
      }

      if (data.status === "REQUIRES_ACTIVATION") {
        setActivationEmail(data.email);
        setShowLoginModal(false);
        return { status: "REQUIRES_ACTIVATION" as const };
      }

      setUser(data.user);
      setShowLoginModal(false);
      return { status: "OK" as const };
    } catch (err: any) {
      return { status: "OK" as const, error: err.message || "Error al conectar con el servidor." };
    }
  };

  const activatePassword = async (password: string, confirmPassword: string) => {
    if (!activationEmail) return { success: false, error: "No hay email de activación." };
    try {
      const res = await fetch("/api/auth/activate-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: activationEmail,
          password,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Error al activar la contraseña." };
      }

      setUser(data.user);
      setActivationEmail(null);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Error de conexión." };
    }
  };

  const setupAdmin = async (email: string, password: string, confirmPassword: string) => {
    if (password !== confirmPassword) {
      return { success: false, error: "Las contraseñas no coinciden." };
    }
    if (password.length < 6) {
      return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
    }

    try {
      const res = await fetch("/api/auth/setup-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Error al configurar el administrador." };
      }

      setUser(data.user);
      setShowSetupModal(false);
      setStatus({ initialized: true, usersCount: 1 });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Error de conexión." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("[cdc2 auth] Error al cerrar sesión:", err);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await checkStatusAndUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        loading,
        showLoginModal,
        setShowLoginModal,
        showSetupModal,
        setShowSetupModal,
        activationEmail,
        setActivationEmail,
        login,
        activatePassword,
        setupAdmin,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de un AuthProvider");
  }
  return context;
};

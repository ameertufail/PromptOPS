"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import type { User } from "@promptops/shared";
import { api, ApiError } from "./api-client";

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  const fetchUser = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const data = await api.get<{ user: User; expiresAt: string }>(
        api.paths.auth.me
      );
      setState({ user: data.user, loading: false, error: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState({ user: null, loading: false, error: null });
      } else {
        setState({
          user: null,
          loading: false,
          error: "Failed to load session"
        });
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post(api.paths.auth.logout);
    } catch {
      // best-effort
    }
    setState({ user: null, loading: false, error: null });
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ ...state, logout, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

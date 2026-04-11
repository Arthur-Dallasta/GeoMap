import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../lib/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    cpf: string;
    sex: "M" | "F" | "O";
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setState({ user: null, isLoading: false });
      return;
    }
    try {
      const user = await api.get<User>("/auth/me");
      setState({ user, isLoading: false });
    } catch {
      localStorage.removeItem("token");
      setState({ user: null, isLoading: false });
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.post<{ access_token: string }>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("token", access_token);
    const user = await api.get<User>("/auth/me");
    setState({ user, isLoading: false });
  }, []);

  const register = useCallback(
    async (data: {
      name: string;
      cpf: string;
      sex: "M" | "F" | "O";
      email: string;
      password: string;
    }) => {
      const { access_token } = await api.post<{ access_token: string }>("/auth/register", data);
      localStorage.setItem("token", access_token);
      const user = await api.get<User>("/auth/me");
      setState({ user, isLoading: false });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setState({ user: null, isLoading: false });
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "../api/auth";
import { clearSession, getStoredUser, saveSession, setStoredUser } from "../api/storage";
import type { AuthSession, RoleName, User } from "../types";

interface AuthContextValue {
  user: User | null;
  role: RoleName | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    mobile: string;
    address?: string;
  }) => Promise<void>;
  logout: () => void;
  updateLocalUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applySession(session: AuthSession): User {
  saveSession(session);
  return session.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login(email, password);
    setUser(applySession(session));
  }, []);

  const register = useCallback(
    async (input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      mobile: string;
      address?: string;
    }) => {
      const session = await authApi.register(input);
      setUser(applySession(session));
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const updateLocalUser = useCallback((next: User) => {
    setStoredUser(next);
    setUser(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: (user?.role?.name as RoleName | undefined) ?? null,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      updateLocalUser,
    }),
    [user, login, register, logout, updateLocalUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

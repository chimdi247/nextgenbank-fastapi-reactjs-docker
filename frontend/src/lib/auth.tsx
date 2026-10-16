import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, profileApi, type Me } from "./api";

interface AuthState {
  user: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  completeLogin: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try { setUser(await profileApi.me()); } catch { setUser(null); }
  }, []);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => {
    const h = () => setUser(null);
    window.addEventListener("nextgen:unauthorized", h);
    return () => window.removeEventListener("nextgen:unauthorized", h);
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, loading, refresh,
    completeLogin: async (email, otp) => { await authApi.verifyOtp(email, otp); await refresh(); },
    logout: async () => { try { await authApi.logout(); } finally { setUser(null); } },
  }), [user, loading, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

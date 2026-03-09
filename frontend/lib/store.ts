import { create } from "zustand";
import api, { setAccessToken } from "@/lib/api";
import type { User, Role } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  mfaRequired: boolean;
  tempToken: string | null;
  passwordExpired: boolean;

  login: (email: string, password: string) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  mfaRequired: false,
  tempToken: null,
  passwordExpired: false,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.mfaRequired) {
      set({ mfaRequired: true, tempToken: data.tempToken, passwordExpired: !!data.passwordExpired });
      return;
    }
    // Access token in memory only (HIPAA §164.312)
    setAccessToken(data.accessToken);
    set({ passwordExpired: !!data.passwordExpired });
    await get().loadUser();
  },

  verifyMfa: async (code) => {
    const { tempToken } = get();
    const { data } = await api.post("/auth/mfa/verify", {
      tempToken,
      token: code,
    });
    setAccessToken(data.accessToken);
    set({ mfaRequired: false, tempToken: null });
    await get().loadUser();
  },

  logout: async () => {
    try {
      // Refresh token is sent automatically via httpOnly cookie
      await api.post("/auth/logout");
    } catch { /* ignore */ }
    setAccessToken(null);
    set({ user: null });
  },

  loadUser: async () => {
    try {
      const { data } = await api.get("/users/me");
      set({ user: data, loading: false });
    } catch {
      setAccessToken(null);
      set({ user: null, loading: false });
    }
  },

  hasRole: (...roles) => {
    const { user } = get();
    if (!user) return false;
    return roles.includes(user.role);
  },
}));

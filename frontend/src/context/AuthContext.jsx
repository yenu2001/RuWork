import { useCallback, useEffect, useMemo, useState } from "react";
import { SESSION_EXPIRED_EVENT } from "../services/api";
import { authService } from "../services/authService";
import { clearStoredAuth, readStoredAuth, storeAuth } from "../utils/authStorage";
import { decodeAccessToken } from "../utils/token";
import AuthContext from "./authContextValue";

const LOGIN_METHODS = {
  student: authService.loginStudent,
  Job_Provider: authService.loginJobProvider,
  admin: authService.loginAdmin
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = readStoredAuth();
    const user = stored ? decodeAccessToken(stored.token) : null;
    if (!stored || !user) {
      clearStoredAuth();
      return null;
    }
    return { token: stored.token, user };
  });
  const [isRestoring] = useState(false);

  const login = useCallback(async (expectedRole, credentials) => {
    const loginMethod = LOGIN_METHODS[expectedRole];
    if (!loginMethod) throw new Error("Unsupported RuWork role");

    const response = await loginMethod(credentials);
    const user = decodeAccessToken(response.token);
    if (!user || user.role !== expectedRole) {
      throw new Error("The sign-in response could not be validated.");
    }

    const nextAuth = { token: response.token, user };
    storeAuth(nextAuth);
    setAuth(nextAuth);
    return user;
  }, []);

  /**
   * Best-effort server-side revocation first, then always clear locally. A failed or unreachable
   * revocation call must never leave the user apparently signed in.
   */
  const logout = useCallback(async () => {
    const role = auth?.user?.role;
    if (role) await authService.logout(role).catch(() => {});
    clearStoredAuth();
    setAuth(null);
  }, [auth?.user?.role]);

  /** Replace the session in place after a password change returns a freshly signed token. */
  const replaceToken = useCallback((token) => {
    const user = decodeAccessToken(token);
    if (!user) return null;
    const nextAuth = { token, user };
    storeAuth(nextAuth);
    setAuth(nextAuth);
    return user;
  }, []);

  // The API client clears storage when the server rejects a revoked token; mirror that here so
  // protected routes redirect instead of rendering a workspace that can no longer load data.
  useEffect(() => {
    function handleExpired() { setAuth(null); }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const value = useMemo(() => ({
    isAuthenticated: Boolean(auth?.token),
    isRestoring,
    token: auth?.token || null,
    user: auth?.user || null,
    login,
    logout,
    replaceToken
  }), [auth, isRestoring, login, logout, replaceToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

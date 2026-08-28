import { useCallback, useMemo, useState } from "react";
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

  const logout = useCallback(() => {
    clearStoredAuth();
    setAuth(null);
  }, []);

  const value = useMemo(() => ({
    isAuthenticated: Boolean(auth?.token),
    isRestoring,
    token: auth?.token || null,
    user: auth?.user || null,
    login,
    logout
  }), [auth, isRestoring, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

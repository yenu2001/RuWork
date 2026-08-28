import axios from "axios";
import { clearStoredAuth, getStoredToken } from "../utils/authStorage";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

/** Broadcast when the server rejects the stored token so the app can drop its session. */
export const SESSION_EXPIRED_EVENT = "ruwork:session-expired";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Not every 401 means the session is over. Re-authentication checks inside an already
 * authenticated flow — currently the current-password check on password change — answer 401 for
 * a wrong value, and a typo there must not sign the user out.
 */
const NON_SESSION_401_CODES = new Set(["CURRENT_PASSWORD_INVALID"]);

/**
 * A stored token can be revoked server-side by a password change or an explicit sign-out
 * elsewhere. When that happens the API answers 401, so the client clears its session rather than
 * leaving the user in a workspace where every request now fails.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    if (status === 401 && !NON_SESSION_401_CODES.has(code) && getStoredToken()) {
      clearStoredAuth();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, {
          detail: { code: code || "UNAUTHENTICATED" }
        }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;

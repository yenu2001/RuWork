import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import { AUTH_STORAGE_KEY } from "../utils/authStorage";

function fakeToken(role) {
  const encode = (value) => window.btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "account-1", role, email: "provider@example.com", exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
}

export function setAuthenticatedRole(role) {
  window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: fakeToken(role), user: { role } }));
}

export function renderWithProviders(ui, { route = "/", role } = {}) {
  if (role) setAuthenticatedRole(role);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

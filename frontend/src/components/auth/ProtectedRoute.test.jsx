import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import { AUTH_STORAGE_KEY } from "../../utils/authStorage";
import ProtectedRoute from "./ProtectedRoute";

function fakeToken(role) {
  const encode = (value) => window.btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "account-1", role, email: "user@example.com", exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
}

function renderProtected(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login/student" element={<h1>Student login</h1>} />
          <Route path="/provider/dashboard" element={<h1>Provider dashboard</h1>} />
          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/student/dashboard" element={<h1>Student dashboard</h1>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("protected routes", () => {
  it("redirects an unauthenticated visitor to the role login", () => {
    renderProtected("/student/dashboard");
    expect(screen.getByRole("heading", { name: "Student login" })).toBeInTheDocument();
  });

  it("rejects a valid token with the wrong role and redirects to its own dashboard", () => {
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: fakeToken("Job_Provider"), user: { role: "student" } }));
    renderProtected("/student/dashboard");
    expect(screen.getByRole("heading", { name: "Provider dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Student dashboard" })).not.toBeInTheDocument();
  });
});

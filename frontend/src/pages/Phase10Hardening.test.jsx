import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppHeader from "../components/layout/AppHeader";
import ChangePasswordPage from "./auth/ChangePasswordPage";
import ForgotPasswordPage from "./auth/ForgotPasswordPage";
import LoginPage from "./auth/LoginPage";
import ResetPasswordPage from "./auth/ResetPasswordPage";
import { authService } from "../services/authService";
import { AUTH_STORAGE_KEY, readStoredAuth } from "../utils/authStorage";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("../services/authService", () => ({
  authService: {
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    logout: vi.fn(),
    loginStudent: vi.fn(),
    loginJobProvider: vi.fn(),
    loginAdmin: vi.fn()
  }
}));
vi.mock("../services/messageService", () => ({ messageService: { getUnreadCount: vi.fn() } }));
vi.mock("../services/notificationService", () => ({ notificationService: { getUnreadCount: vi.fn() } }));

function tokenFor(role, version) {
  const encode = (value) => window.btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "account-1", role, email: "student@ruh.ac.lk", tv: version, exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
}

describe("Phase 10 password lifecycle and session hardening", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.values(authService).forEach((mock) => mock.mockReset());
  });

  it("offers password recovery from the Student and Provider sign-in pages but not Admin", () => {
    const { unmount } = renderWithProviders(<LoginPage role="student" />);
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute("href", "/forgot-password/student");
    unmount();

    const provider = renderWithProviders(<LoginPage role="provider" />);
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute("href", "/forgot-password/provider");
    provider.unmount();

    // Admin accounts are provisioned privately and expose no self-service reset.
    renderWithProviders(<LoginPage role="admin" />);
    expect(screen.queryByRole("link", { name: "Forgot your password?" })).not.toBeInTheDocument();
  });

  it("validates the reset address and shows one non-enumerating confirmation", async () => {
    authService.requestPasswordReset.mockResolvedValue({ message: "If an account exists…" });
    renderWithProviders(<ForgotPasswordPage accountType="student" />);

    fireEvent.change(screen.getByLabelText("University email"), { target: { value: "someone@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(/@ruh.ac.lk University email/)).toBeInTheDocument();
    expect(authService.requestPasswordReset).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("University email"), { target: { value: "student@ruh.ac.lk" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => expect(authService.requestPasswordReset).toHaveBeenCalledWith("student", "student@ruh.ac.lk"));
    // The confirmation must not reveal whether that address is registered.
    expect(await screen.findByText(/If an account exists for that address/)).toBeInTheDocument();
    expect(screen.getByText(/does not confirm whether an address is registered/)).toBeInTheDocument();
  });

  it("requires a token, enforces password rules, and confirms the reset", async () => {
    const withoutToken = renderWithProviders(<ResetPasswordPage />, { route: "/reset-password" });
    expect(screen.getByText(/reset link is incomplete/)).toBeInTheDocument();
    withoutToken.unmount();

    authService.resetPassword.mockResolvedValue({ message: "Password reset successfully." });
    renderWithProviders(
      <Routes><Route path="/reset-password" element={<ResetPasswordPage />} /></Routes>,
      { route: `/reset-password?token=${"a".repeat(64)}&type=student` }
    );

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "weak" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "weak" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(authService.resetPassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "BrandNew1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Different1" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "BrandNew1" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => expect(authService.resetPassword).toHaveBeenCalledWith("student", "a".repeat(64), "BrandNew1"));
    expect(await screen.findByText(/All other RuWork sessions have been signed out/)).toBeInTheDocument();
  });

  it("changes a password, refuses reuse, and adopts the reissued session token", async () => {
    const reissuedToken = tokenFor("student", 2);
    authService.changePassword.mockResolvedValue({ message: "Password changed successfully.", token: reissuedToken });
    renderWithProviders(<ChangePasswordPage />, { role: "student" });

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Enter your current password.")).toBeInTheDocument();
    expect(authService.changePassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "SamePass1" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "SamePass1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "SamePass1" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText(/different from your current one/)).toBeInTheDocument();
    expect(authService.changePassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "BrandNew1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "BrandNew1" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(authService.changePassword).toHaveBeenCalledWith("student", "SamePass1", "BrandNew1"));
    expect(await screen.findByText("Password changed successfully.")).toBeInTheDocument();
    // The reissued token replaces the stored session so this device stays signed in.
    await waitFor(() => expect(readStoredAuth().token).toBe(reissuedToken));
    expect(screen.getByText(/signs out every other RuWork session/)).toBeInTheDocument();
  });

  it("surfaces a failed password change without clearing the session", async () => {
    authService.changePassword.mockRejectedValue({ response: { data: { error: "Your current password is incorrect" } } });
    renderWithProviders(<ChangePasswordPage />, { role: "student" });
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "WrongPass1" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "BrandNew1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "BrandNew1" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Your current password is incorrect")).toBeInTheDocument();
    expect(readStoredAuth()).not.toBeNull();
  });

  it("revokes the session server-side on sign out and clears it even when that call fails", async () => {
    authService.logout.mockResolvedValue({ message: "Signed out" });
    const { unmount } = renderWithProviders(<AppHeader />, { role: "student" });
    expect(screen.getByRole("link", { name: "Password" })).toHaveAttribute("href", "/account/password");
    fireEvent.click(screen.getByRole("button", { name: /Log out/ }));
    await waitFor(() => expect(authService.logout).toHaveBeenCalledWith("student"));
    await waitFor(() => expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull());
    unmount();

    // An unreachable revocation endpoint must still end the local session.
    authService.logout.mockRejectedValue(new Error("network"));
    renderWithProviders(<AppHeader />, { role: "Job_Provider" });
    fireEvent.click(screen.getByRole("button", { name: /Log out/ }));
    await waitFor(() => expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull());
  });
});

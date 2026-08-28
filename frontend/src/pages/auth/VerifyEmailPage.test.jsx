import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../context/ToastContext";
import { authService } from "../../services/authService";
import VerifyEmailPage from "./VerifyEmailPage";

vi.mock("../../services/authService", () => ({
  authService: {
    verifyEmail: vi.fn(),
    resendVerification: vi.fn()
  }
}));

describe("email verification route", () => {
  beforeEach(() => {
    authService.verifyEmail.mockResolvedValue({
      message: "Email verified successfully.",
      isEmailVerified: true,
      accountStatus: "pending"
    });
  });

  it("passes the token and account type from the verification URL to the API", async () => {
    render(
      <MemoryRouter initialEntries={["/verify-email?token=sample-token&type=jobProvider"]}>
        <ToastProvider><VerifyEmailPage /></ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("Verifying your email…")).toBeInTheDocument();
    await waitFor(() => expect(authService.verifyEmail).toHaveBeenCalledWith("jobProvider", "sample-token"));
    expect(await screen.findByRole("heading", { name: "Email verified" })).toBeInTheDocument();
    expect(screen.getByText(/waiting for administrator approval/i)).toBeInTheDocument();
  });

  it("rejects an unsupported account type without calling the API", () => {
    render(
      <MemoryRouter initialEntries={["/verify-email?token=sample-token&type=admin"]}>
        <ToastProvider><VerifyEmailPage /></ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Email verification unavailable" })).toBeInTheDocument();
    expect(authService.verifyEmail).not.toHaveBeenCalled();
  });
});

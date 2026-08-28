import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../../context/ToastContext";
import AccountStatePage from "./AccountStatePage";

function renderState(stateType, state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/account/${stateType}`, state }]}>
      <ToastProvider><AccountStatePage stateType={stateType} /></ToastProvider>
    </MemoryRouter>
  );
}

describe("account state pages", () => {
  it("renders the pending Admin-review state", () => {
    renderState("pending", { accountType: "student" });
    expect(screen.getByRole("heading", { name: "Registration under review" })).toBeInTheDocument();
    expect(screen.getByText(/administrator/i)).toBeInTheDocument();
  });

  it("renders a neutral rejected state without inventing a reason", () => {
    renderState("rejected", { accountType: "jobProvider" });
    expect(screen.getByRole("heading", { name: "Registration not approved" })).toBeInTheDocument();
    expect(screen.getByText(/No rejection reason was provided/i)).toBeInTheDocument();
  });
});

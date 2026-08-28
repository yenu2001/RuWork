import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../../context/ToastContext";
import LandingPage from "./LandingPage";

function renderLanding() {
  return render(
    <MemoryRouter>
      <ToastProvider><LandingPage /></ToastProvider>
    </MemoryRouter>
  );
}

describe("landing role selection", () => {
  it("opens a login modal with exactly the three supported roles", async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.click(screen.getAllByRole("button", { name: "Log in" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Log in to RuWork" });
    expect(within(dialog).getByText("Student / Job Seeker")).toBeInTheDocument();
    expect(within(dialog).getByText("Job Provider")).toBeInTheDocument();
    expect(within(dialog).getByText("Admin")).toBeInTheDocument();
    expect(dialog.querySelectorAll("[data-role-option]")).toHaveLength(3);
  });

  it("excludes Admin from Create Account and closes with Escape", async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.click(screen.getAllByRole("button", { name: "Create Account" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Create your RuWork account" });
    expect(within(dialog).getByText("Student / Job Seeker")).toBeInTheDocument();
    expect(within(dialog).getByText("Job Provider")).toBeInTheDocument();
    expect(within(dialog).queryByText("Admin")).not.toBeInTheDocument();
    expect(dialog.querySelectorAll("[data-role-option]")).toHaveLength(2);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

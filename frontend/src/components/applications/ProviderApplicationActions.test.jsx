import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProviderApplicationActions from "./ProviderApplicationActions";

vi.mock("../../services/applicationService", () => ({
  applicationService: { acceptApplication: vi.fn(), declineApplication: vi.fn(), completeApplication: vi.fn() }
}));
import { applicationService } from "../../services/applicationService";

const student = { firstName: "Nimali", lastName: "Perera" };

describe("ProviderApplicationActions", () => {
  beforeEach(() => {
    applicationService.acceptApplication.mockReset();
    applicationService.declineApplication.mockReset();
    applicationService.completeApplication.mockReset();
  });

  it("accepts fixed-price work with an adjusted agreed budget", async () => {
    applicationService.acceptApplication.mockResolvedValue({ application: { id: "app-1", status: "in_progress" } });
    const user = userEvent.setup();
    render(<ProviderApplicationActions application={{ id: "app-1", status: "pending_review", budgetType: "fixed", originalBudget: 8000, student }} />);
    await user.click(screen.getByRole("button", { name: "Accept" }));
    const input = screen.getByLabelText("Final agreed fixed budget (LKR)");
    await user.clear(input);
    await user.type(input, "9500");
    await user.click(screen.getByRole("button", { name: "Accept Application" }));
    await waitFor(() => expect(applicationService.acceptApplication).toHaveBeenCalledWith("app-1", { approvedBudget: 9500 }));
  });

  it("accepts hourly work with an adjusted agreed rate", async () => {
    applicationService.acceptApplication.mockResolvedValue({ application: { id: "app-2", status: "in_progress" } });
    const user = userEvent.setup();
    render(<ProviderApplicationActions application={{ id: "app-2", status: "pending_review", budgetType: "hourly", originalHourlyRate: 1200, student }} />);
    await user.click(screen.getByRole("button", { name: "Accept" }));
    const input = screen.getByLabelText("Final agreed hourly rate (LKR / hour)");
    await user.clear(input);
    await user.type(input, "1500");
    await user.click(screen.getByRole("button", { name: "Accept Application" }));
    await waitFor(() => expect(applicationService.acceptApplication).toHaveBeenCalledWith("app-2", { approvedHourlyRate: 1500 }));
  });

  it("supports decline and completion confirmations", async () => {
    applicationService.declineApplication.mockResolvedValue({ application: { id: "app-3", status: "declined" } });
    const user = userEvent.setup();
    const { rerender } = render(<ProviderApplicationActions application={{ id: "app-3", status: "pending_review", budgetType: "fixed", originalBudget: 8000, student }} />);
    await user.click(screen.getByRole("button", { name: "Decline" }));
    await user.type(screen.getByLabelText("Reason (optional)"), "Another applicant better matches the work.");
    await user.click(screen.getByRole("button", { name: "Decline Application" }));
    await waitFor(() => expect(applicationService.declineApplication).toHaveBeenCalledWith("app-3", "Another applicant better matches the work."));

    applicationService.completeApplication.mockResolvedValue({ application: { id: "app-4", status: "completed" } });
    rerender(<ProviderApplicationActions application={{ id: "app-4", status: "in_progress", budgetType: "fixed", originalBudget: 8000, approvedBudget: 8000, student }} />);
    await user.click(screen.getByRole("button", { name: "Mark as Completed" }));
    await user.click(screen.getByRole("button", { name: "Mark Completed" }));
    await waitFor(() => expect(applicationService.completeApplication).toHaveBeenCalledWith("app-4"));
  });
});

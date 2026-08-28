import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentApplicationActions from "./StudentApplicationActions";

vi.mock("../../services/applicationService", () => ({
  applicationService: { withdrawApplication: vi.fn(), cancelApplication: vi.fn() }
}));
import { applicationService } from "../../services/applicationService";

describe("StudentApplicationActions", () => {
  beforeEach(() => {
    applicationService.withdrawApplication.mockReset();
    applicationService.cancelApplication.mockReset();
  });

  it("requires confirmation before withdrawing a pending Application", async () => {
    applicationService.withdrawApplication.mockResolvedValue({ application: { id: "app-1", status: "withdrawn" } });
    const onUpdated = vi.fn();
    const user = userEvent.setup();
    render(<StudentApplicationActions application={{ id: "app-1", status: "pending_review" }} onUpdated={onUpdated} />);
    await user.click(screen.getByRole("button", { name: "Withdraw Application" }));
    expect(screen.getByRole("dialog", { name: /withdraw this application/i })).toBeInTheDocument();
    expect(applicationService.withdrawApplication).not.toHaveBeenCalled();
    await user.click(screen.getAllByRole("button", { name: "Withdraw Application" })[1]);
    await waitFor(() => expect(applicationService.withdrawApplication).toHaveBeenCalledWith("app-1"));
    expect(onUpdated).toHaveBeenCalledWith({ id: "app-1", status: "withdrawn" });
  });

  it("allows a Student to cancel in-progress work with an optional reason", async () => {
    applicationService.cancelApplication.mockResolvedValue({ application: { id: "app-2", status: "cancelled" } });
    const user = userEvent.setup();
    render(<StudentApplicationActions application={{ id: "app-2", status: "in_progress" }} />);
    await user.click(screen.getByRole("button", { name: "Cancel In-Progress Work" }));
    await user.type(screen.getByLabelText("Reason (optional)"), "My timetable changed unexpectedly.");
    await user.click(screen.getByRole("button", { name: "Cancel Work" }));
    await waitFor(() => expect(applicationService.cancelApplication).toHaveBeenCalledWith("app-2", "My timetable changed unexpectedly."));
  });
});

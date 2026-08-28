import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import JobFormPage from "./JobFormPage";

vi.mock("../../services/jobService", () => ({
  jobService: { getMyJob: vi.fn(), createJob: vi.fn(), updateJob: vi.fn() }
}));
import { jobService } from "../../services/jobService";

describe("JobFormPage", () => {
  beforeEach(() => {
    jobService.createJob.mockReset().mockResolvedValue({});
    jobService.getMyJob.mockReset();
    jobService.updateJob.mockReset();
  });

  it("switches conditional pricing and previews the current form before publishing", async () => {
    const user = userEvent.setup();
    renderWithProviders(<JobFormPage />, { route: "/provider/jobs/new", role: "Job_Provider" });

    await user.type(screen.getByLabelText("Job title"), "Weekend design assistant");
    await user.selectOptions(screen.getByLabelText("Category"), "Content Creation");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.type(screen.getByLabelText("Required skills"), "Figma");
    await user.click(screen.getByRole("button", { name: "Add skill" }));
    await user.type(screen.getByLabelText("Scope of work"), "Prepare three event graphics.");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.type(screen.getByLabelText("Location"), "Matara");
    await user.type(screen.getByLabelText("Working hours"), "Saturday morning");
    await user.type(screen.getByLabelText("Application deadline"), "2099-12-20");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByLabelText("Hourly rate (LKR)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Fixed budget (LKR)")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Pricing type"), "fixed");
    expect(screen.getByLabelText("Fixed budget (LKR)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Hourly rate (LKR)")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Fixed budget (LKR)"), "7500");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.type(screen.getByLabelText("Job description"), "Support a local weekend event with student-friendly hours.");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByLabelText("Job preview")).toHaveTextContent("Weekend design assistant");
    expect(screen.getByLabelText("Job preview")).toHaveTextContent("LKR 7,500 fixed");
    await user.click(screen.getByRole("button", { name: "Publish Job" }));
    await waitFor(() => expect(jobService.createJob).toHaveBeenCalledWith(expect.objectContaining({ jobTitle: "Weekend design assistant", budgetType: "fixed", budget: 7500, hourlyRate: undefined, status: "open" })));
  });
});

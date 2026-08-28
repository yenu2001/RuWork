import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import MyJobsPage from "./MyJobsPage";

vi.mock("../../services/jobService", () => ({
  jobService: { getMyJobs: vi.fn(), updateJob: vi.fn(), deleteJob: vi.fn() }
}));
import { jobService } from "../../services/jobService";

const openJob = {
  id: "job-1", jobTitle: "Campus photographer", category: "Content Creation", location: "Matara",
  status: "open", availabilityStatus: "open", budgetType: "hourly", hourlyRate: 1500,
  applicationDeadline: "2099-12-20T00:00:00.000Z"
};

describe("MyJobsPage", () => {
  beforeEach(() => {
    jobService.getMyJobs.mockReset().mockResolvedValue({ jobs: [openJob], pagination: { page: 1, pages: 1, total: 1 } });
    jobService.updateJob.mockReset().mockResolvedValue({});
    jobService.deleteJob.mockReset().mockResolvedValue({});
  });

  it("supports owner status controls and requires confirmation before deletion", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyJobsPage />, { route: "/provider/jobs", role: "Job_Provider" });
    expect(await screen.findByRole("heading", { name: "Campus photographer" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(jobService.updateJob).toHaveBeenCalledWith("job-1", { status: "closed" }));

    await user.click(screen.getByRole("button", { name: "Archive Campus photographer" }));
    expect(screen.getByRole("dialog", { name: /archive this job/i })).toBeInTheDocument();
    expect(jobService.deleteJob).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Archive Job" }));
    await waitFor(() => expect(jobService.deleteJob).toHaveBeenCalledWith("job-1"));
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApplyToJob from "./ApplyToJob";

vi.mock("../../services/applicationService", () => ({
  applicationService: { applyToJob: vi.fn() }
}));
import { applicationService } from "../../services/applicationService";

const job = {
  id: "job-1", jobTitle: "Research assistant", companyName: "Ruhuna Lab",
  availabilityStatus: "open", budgetType: "fixed", budget: 10000,
  applicationDeadline: "2099-12-20T00:00:00.000Z"
};

function renderApply(props = {}) {
  return render(<MemoryRouter><ApplyToJob job={job} {...props} /></MemoryRouter>);
}

describe("ApplyToJob", () => {
  beforeEach(() => applicationService.applyToJob.mockReset());

  it("directs a public visitor to Student login and blocks non-Students", () => {
    const { rerender } = renderApply();
    expect(screen.getByRole("link", { name: /log in as a student/i })).toHaveAttribute("href", "/login/student");
    rerender(<MemoryRouter><ApplyToJob job={job} viewer={{ role: "Job_Provider" }} /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Only Students can Apply" })).toBeDisabled();
  });

  it("submits a Student note and shows the success state", async () => {
    applicationService.applyToJob.mockResolvedValue({ application: { id: "application-1", status: "pending_review" } });
    const user = userEvent.setup();
    renderApply({ viewer: { role: "student" } });
    await user.click(screen.getByRole("button", { name: "Apply for this Job" }));
    await user.type(screen.getByLabelText("Application note"), "I have relevant research and spreadsheet experience.");
    await user.click(screen.getByRole("button", { name: "Submit Application" }));
    await waitFor(() => expect(applicationService.applyToJob).toHaveBeenCalledWith("job-1", {
      applicationNote: "I have relevant research and spreadsheet experience."
    }));
    expect(await screen.findByRole("heading", { name: "Application submitted" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View My Applications" })).toHaveAttribute("href", "/student/applications");
  });

  it("links an existing Application and disables applications for closed Jobs", () => {
    const { rerender } = renderApply({ viewer: { role: "student" }, existingApplication: { id: "application-1" } });
    expect(screen.getByRole("link", { name: /application submitted/i })).toHaveAttribute("href", "/student/applications/application-1");
    rerender(<MemoryRouter><ApplyToJob job={{ ...job, availabilityStatus: "closed" }} viewer={{ role: "student" }} /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Applications closed" })).toBeDisabled();
  });
});

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import MyApplicationsPage from "./MyApplicationsPage";
import ApplicantsPage from "../provider/ApplicantsPage";
import { ApplicationDetailsContent } from "./ApplicationDetailsPage";

vi.mock("../../services/applicationService", () => ({
  applicationService: {
    getMyApplications: vi.fn(), getJobApplications: vi.fn(), cancelApplication: vi.fn(),
    withdrawApplication: vi.fn(), acceptApplication: vi.fn(), declineApplication: vi.fn(), completeApplication: vi.fn()
  }
}));
import { applicationService } from "../../services/applicationService";

const application = {
  id: "app-1", status: "in_progress", applicationNote: "I have relevant data entry experience.",
  budgetType: "hourly", originalHourlyRate: 1200, approvedHourlyRate: 1500,
  appliedAt: "2026-08-20T00:00:00.000Z", job: { jobTitle: "Data assistant", companyName: "Ruhuna Services" },
  student: { firstName: "Nimali", lastName: "Perera", fieldOfStudy: "Information Systems", yearOfStudy: "Year 3" }
};

describe("Phase 5 Application pages", () => {
  beforeEach(() => {
    applicationService.getMyApplications.mockReset().mockResolvedValue({ applications: [application], pagination: { page: 1, pages: 1, total: 1 } });
    applicationService.getJobApplications.mockReset().mockResolvedValue({ job: application.job, applications: [application], pagination: { page: 1, pages: 1, total: 1 } });
  });

  it("renders the Student's in-progress Application and cancellation action", async () => {
    renderWithProviders(<MyApplicationsPage />, { route: "/student/applications", role: "student" });
    expect(await screen.findByRole("heading", { name: "Data assistant" })).toBeInTheDocument();
    expect(screen.getAllByText("In progress")).toHaveLength(2);
    expect(screen.getByText("Agreed: LKR 1,500 / hour")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel In-Progress Work" })).toBeInTheDocument();
  });

  it("renders only the safe applicant profile fields for a Provider", async () => {
    renderWithProviders(<ApplicantsPage />, { route: "/provider/jobs/job-1/applications", role: "Job_Provider" });
    expect(await screen.findByRole("heading", { name: "Nimali Perera" })).toBeInTheDocument();
    expect(screen.getByText("Information Systems · Year 3")).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it("shows agreed pricing and the external-payment notice in Student details", () => {
    renderWithProviders(<ApplicationDetailsContent application={application} />, { role: "student" });
    expect(screen.getByText("LKR 1,500 / hour")).toBeInTheDocument();
    expect(screen.getByText(/RuWork does not process, collect, or hold payments/i)).toBeInTheDocument();
  });
});

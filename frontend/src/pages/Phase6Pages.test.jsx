import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSummary } from "./admin/AdminDashboardPage";
import RegistrationDetailsPage, { RegistrationDetail } from "./admin/RegistrationDetailsPage";
import RegistrationReviewsPage from "./admin/RegistrationReviewsPage";
import { CompanyProfileForm } from "./provider/CompanyProfilePage";
import { ProviderDashboardContent } from "./provider/ProviderDashboardPage";
import JobHistoryPage from "./student/JobHistoryPage";
import { DashboardContent } from "./student/StudentDashboardPage";
import { ProfileForm } from "./student/StudentProfilePage";
import { dashboardService } from "../services/dashboardService";
import { adminService } from "../services/adminService";

vi.mock("../components/layout/AppHeader", () => ({ default: () => <header>RuWork navigation</header> }));
vi.mock("../hooks/useToast", () => ({ default: () => ({ showToast: vi.fn() }) }));
vi.mock("../services/dashboardService", () => ({
  dashboardService: {
    getStudentDashboard: vi.fn(), getStudentJobHistory: vi.fn(),
    getProviderDashboard: vi.fn(), getAdminDashboard: vi.fn()
  }
}));
vi.mock("../services/adminService", () => ({
  adminService: {
    getRegistrations: vi.fn(), getRegistration: vi.fn(),
    approveRegistration: vi.fn(), rejectRegistration: vi.fn()
  }
}));

function router(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Phase 6 role workspaces", () => {
  beforeEach(() => {
    dashboardService.getStudentJobHistory.mockReset();
    adminService.getRegistrations.mockReset();
    adminService.getRegistration.mockReset();
    adminService.approveRegistration.mockReset();
    adminService.rejectRegistration.mockReset();
  });

  it("renders live Student dashboard totals and honest empty states", () => {
    router(<DashboardContent data={{
      summary: { pendingApplications: 2, inProgress: 1, completedJobs: 4, totalApplications: 9 },
      recentApplications: [], recentJobs: []
    }} />);
    expect(screen.getByText("Pending Applications").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Completed Jobs").parentElement).toHaveTextContent("4");
    expect(screen.getByText("No Applications yet")).toBeInTheDocument();
    expect(screen.getByText("No suitable open Jobs are available right now.")).toBeInTheDocument();
  });

  it("renders Provider activity totals and empty actions without invented records", () => {
    router(<ProviderDashboardContent data={{
      summary: { openJobs: 3, totalApplicants: 8, inProgress: 2, completedEngagements: 5 },
      recentJobs: [], recentApplications: []
    }} />);
    expect(screen.getByText("Open Jobs").parentElement).toHaveTextContent("3");
    expect(screen.getByText("Total Applicants").parentElement).toHaveTextContent("8");
    expect(screen.getByRole("link", { name: "Post a Job" })).toHaveAttribute("href", "/provider/jobs/new");
    expect(screen.getByText("No Student Applications have been received yet.")).toBeInTheDocument();
  });

  it("keeps Student identity fields read-only while editable fields call the update handler", () => {
    const update = vi.fn();
    const submit = vi.fn((event) => event.preventDefault());
    router(<ProfileForm profile={{
      firstName: "Ruhuna", lastName: "Student", email: "student@ruh.ac.lk",
      university: "University of Ruhuna", phoneNumber: "0712345678", dateOfBirth: "2002-01-01",
      gender: "Prefer not to say", faculty: "Science", fieldOfStudy: "Computer Science",
      yearOfStudy: "2nd Year", isEmailVerified: true, accountStatus: "approved"
    }} error="" saving={false} update={update} submit={submit} />);
    expect(screen.getByLabelText("Official University email")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("University")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Nimal" } });
    expect(update).toHaveBeenCalledWith("firstName", "Nimal");
    fireEvent.submit(screen.getByRole("button", { name: /save profile/i }).closest("form"));
    expect(submit).toHaveBeenCalled();
  });

  it("explains current company-name propagation and protects the company email", () => {
    const update = vi.fn();
    router(<CompanyProfileForm profile={{
      companyName: "Current Company", companyEmail: "jobs@example.com", phoneNumber: "0712345678",
      companySize: "11-50", industry: "Technology", companyWebsite: "https://example.com",
      companyAddress: "Matara", companyDescription: "A trusted company.", firstName: "Jane",
      lastName: "Owner", isEmailVerified: true, accountStatus: "approved"
    }} update={update} submit={vi.fn((event) => event.preventDefault())} saving={false} error="" />);
    expect(screen.getByLabelText("Company email")).toHaveAttribute("readonly");
    expect(screen.getByText(/updates all existing and future Job displays/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "New Current Name" } });
    expect(update).toHaveBeenCalledWith("companyName", "New Current Name");
  });

  it("shows terminal Job History using the current Provider company name", async () => {
    dashboardService.getStudentJobHistory.mockResolvedValue({
      applications: [{
        id: "application-1", status: "completed", budgetType: "fixed", originalBudget: 5000,
        approvedBudget: 5500, currency: "LKR", appliedAt: "2026-08-01T00:00:00.000Z",
        job: { jobTitle: "Research Assistant", companyName: "Current Company Name", isArchived: true }
      }],
      pagination: { page: 1, limit: 12, total: 1, pages: 1 }
    });
    router(<JobHistoryPage />);
    expect(await screen.findByText("Current Company Name · Job post archived")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(dashboardService.getStudentJobHistory).toHaveBeenCalledWith({ status: "all", page: 1 });
  });

  it("renders live Admin workload totals", () => {
    router(<AdminSummary summary={{
      pendingRegistrations: 7, totalStudents: 40, totalProviders: 12,
      openJobs: 9, pendingStudents: 4, pendingProviders: 3
    }} />);
    expect(screen.getByText("Pending Registrations").parentElement).toHaveTextContent("7");
    expect(screen.getByText("Open Jobs").parentElement).toHaveTextContent("9");
    expect(screen.getByRole("link", { name: "Review Registrations" })).toHaveAttribute("href", "/admin/registrations");
  });

  it("shows full Admin registration information and gates approval on verified email", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    router(<RegistrationDetail registration={{
      type: "student", firstName: "Pending", lastName: "Student", email: "pending@ruh.ac.lk",
      university: "University of Ruhuna", faculty: "Science", fieldOfStudy: "Statistics",
      yearOfStudy: "3rd Year", phoneNumber: "0712345678", dateOfBirth: "2002-01-01",
      gender: "Female", registeredAt: "2026-08-20", isEmailVerified: false, accountStatus: "pending"
    }} error="" onApprove={onApprove} onReject={onReject} />);
    expect(screen.getByText("Pending Student")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(onReject).toHaveBeenCalled();
  });

  it("loads pending registrations and applies the Job Provider filter through the Admin service", async () => {
    adminService.getRegistrations.mockResolvedValue({ registrations: [] });
    router(<RegistrationReviewsPage />);
    expect(await screen.findByText("No matching registrations")).toBeInTheDocument();
    expect(adminService.getRegistrations).toHaveBeenCalledWith({ status: "pending", type: undefined });
    fireEvent.click(screen.getByRole("button", { name: "Job Providers" }));
    await waitFor(() => expect(adminService.getRegistrations).toHaveBeenLastCalledWith({ status: "pending", type: "jobProvider" }));
  });

  it("requires confirmation before approving and immediately shows the updated registration", async () => {
    const pending = {
      id: "registration-1", type: "jobProvider", companyName: "Verified Company", companyEmail: "jobs@example.com",
      industry: "Technology", companySize: "11-50", companyAddress: "Matara", phoneNumber: "0712345678",
      companyWebsite: "", companyDescription: "A trusted company.", firstName: "Jane", lastName: "Owner",
      registeredAt: "2026-08-20", isEmailVerified: true, accountStatus: "pending"
    };
    adminService.getRegistration.mockResolvedValue(pending);
    adminService.approveRegistration.mockResolvedValue({ message: "Registration approved successfully", registration: { ...pending, accountStatus: "approved" } });
    render(<MemoryRouter initialEntries={["/admin/registrations/jobProvider/registration-1"]}><Routes><Route path="/admin/registrations/:type/:id" element={<RegistrationDetailsPage />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    expect(screen.getByRole("heading", { name: "Approve this registration?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve Registration" }));
    await waitFor(() => expect(adminService.approveRegistration).toHaveBeenCalledWith("jobProvider", "registration-1"));
    expect(await screen.findByText("Account approved")).toBeInTheDocument();
  });

  it("submits the optional rejection reason from the rejection modal", async () => {
    const pending = {
      id: "registration-2", type: "student", firstName: "Pending", lastName: "Student", email: "pending@ruh.ac.lk",
      university: "University of Ruhuna", faculty: "Science", fieldOfStudy: "Statistics", yearOfStudy: "3rd Year",
      phoneNumber: "0712345678", dateOfBirth: "2002-01-01", gender: "Female", registeredAt: "2026-08-20",
      isEmailVerified: true, accountStatus: "pending"
    };
    adminService.getRegistration.mockResolvedValue(pending);
    adminService.rejectRegistration.mockResolvedValue({ message: "Registration rejected successfully", registration: { ...pending, accountStatus: "rejected", rejectionReason: "Details require correction" } });
    render(<MemoryRouter initialEntries={["/admin/registrations/student/registration-2"]}><Routes><Route path="/admin/registrations/:type/:id" element={<RegistrationDetailsPage />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));
    fireEvent.change(screen.getByLabelText("Reason (optional)"), { target: { value: "Details require correction" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject Registration" }));
    await waitFor(() => expect(adminService.rejectRegistration).toHaveBeenCalledWith("student", "registration-2", "Details require correction"));
    expect(await screen.findByText("Account rejected")).toBeInTheDocument();
  });
});

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import AppHeader from "../components/layout/AppHeader";
import AdminAccountDetailsPage from "./admin/AdminAccountDetailsPage";
import AdminAccountsPage from "./admin/AdminAccountsPage";
import AdminDashboardPage from "./admin/AdminDashboardPage";
import AdminJobDetailsPage from "./admin/AdminJobDetailsPage";
import AdminJobsPage from "./admin/AdminJobsPage";
import AdminReviewsPage from "./admin/AdminReviewsPage";
import AdminSettingsPage from "./admin/AdminSettingsPage";
import { adminService } from "../services/adminService";
import { dashboardService } from "../services/dashboardService";
import { reviewService } from "../services/reviewService";
import { AUTH_STORAGE_KEY } from "../utils/authStorage";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("../services/adminService", () => ({ adminService: { getAccounts: vi.fn(), getAccount: vi.fn(), moderateAccount: vi.fn(), getJobs: vi.fn(), getJob: vi.fn(), moderateJob: vi.fn(), moderateReview: vi.fn(), getSettings: vi.fn(), updateSettings: vi.fn(), getAudits: vi.fn() } }));
vi.mock("../services/dashboardService", () => ({ dashboardService: { getAdminDashboard: vi.fn() } }));
vi.mock("../services/reviewService", () => ({ reviewService: { getAdminReviews: vi.fn() } }));

const student = { id: "student-1", firstName: "Yenulu", lastName: "Student", email: "yenulu@ruh.ac.lk", university: "University of Ruhuna", faculty: "Technology", fieldOfStudy: "ICT", yearOfStudy: "2nd Year", phoneNumber: "0710000000", isEmailVerified: true, accountStatus: "approved", moderationStatus: "active", registeredAt: "2026-08-20T00:00:00.000Z" };
const provider = { id: "provider-1", companyName: "Current Company", companyEmail: "jobs@current.lk", industry: "Technology", companySize: "11-50", companyAddress: "Matara", firstName: "Yenulu", lastName: "Manager", isEmailVerified: true, accountStatus: "approved", moderationStatus: "active", registeredAt: "2026-08-20T00:00:00.000Z" };
const job = { id: "job-1", jobTitle: "Research Assistant", companyName: "Current Company", provider: { companyName: "Current Company", companyEmail: "jobs@current.lk" }, category: "Research", location: "Matara", budgetType: "fixed", budget: 10000, currency: "LKR", status: "open", moderationStatus: "visible", applicationDeadline: "2099-09-20", jobDescription: "Assist with a research report.", createdAt: "2026-08-20", updatedAt: "2026-08-21" };
const review = { id: "review-1", rating: 5, comment: "Professional collaboration.", moderationStatus: "active", student: { firstName: "Yenulu", lastName: "Student" }, provider: { companyName: "Current Company" }, job: { jobTitle: "Research Assistant" }, createdAt: "2026-08-20" };
const pagination = { page: 1, limit: 20, total: 21, pages: 2 };
const settings = { studentRegistrationOpen: true, providerRegistrationOpen: true, jobPostingOpen: true };

function fakeToken(role) { const encode = (value) => window.btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); return `${encode({ alg: "HS256" })}.${encode({ sub: "one", role, exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`; }
function protectedAdmin(route, role) {
  if (role) window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: fakeToken(role), user: { role } }));
  return renderWithProviders(<Routes><Route path="/admin/login" element={<h1>Admin login</h1>} /><Route path="/student/dashboard" element={<h1>Student dashboard</h1>} /><Route path="/provider/dashboard" element={<h1>Provider dashboard</h1>} /><Route element={<ProtectedRoute allowedRoles={["admin"]} />}><Route path="/admin/students" element={<h1>Student administration</h1>} /></Route></Routes>, { route });
}

describe("Phase 9 Admin workspace", () => {
  beforeEach(() => { window.sessionStorage.clear(); Object.values(adminService).forEach((mock) => mock.mockReset()); Object.values(dashboardService).forEach((mock) => mock.mockReset()); Object.values(reviewService).forEach((mock) => mock.mockReset()); });

  it("shows only the complete responsive Admin navigation", () => {
    renderWithProviders(<AppHeader />, { role: "admin" });
    for (const label of ["Dashboard", "Registration Reviews", "Students", "Job Providers", "Jobs", "Reviews", "Settings"]) expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Post a Job" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle application navigation" })).toHaveAttribute("aria-expanded", "false");
  });

  it("redirects unauthenticated Admin routes to Admin login", () => {
    protectedAdmin("/admin/students");
    expect(screen.getByRole("heading", { name: "Admin login" })).toBeInTheDocument();
  });

  it.each([["student", "Student dashboard"], ["Job_Provider", "Provider dashboard"]])("rejects the %s role from Admin routes", (role, destination) => {
    protectedAdmin("/admin/students", role);
    expect(screen.getByRole("heading", { name: destination })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Student administration" })).not.toBeInTheDocument();
  });

  it("renders server-authoritative Dashboard statistics and count-only communication", async () => {
    dashboardService.getAdminDashboard.mockResolvedValue({ summary: { pendingRegistrations: 3, pendingStudents: 2, pendingProviders: 1 }, statistics: { accounts: { students: { total: 12, approved: 8, pending: 2, rejected: 1, suspended: 1 }, providers: { total: 6, approved: 4, pending: 1, rejected: 1, suspended: 0 } }, jobs: { total: 9, draft: 2, open: 5, closed: 2, archived: 1, hidden: 1 }, applications: { submitted: 4, accepted: 2 }, reviews: { total: 7, visible: 6, hidden: 1 }, communication: { messages: 22, notifications: 15 } }, recentAudits: [] });
    renderWithProviders(<AdminDashboardPage />, { role: "admin" });
    expect(screen.getByText("Loading Admin dashboard…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Applications" })).toBeInTheDocument();
    expect(screen.getByText("Messages (count only)").parentElement).toHaveTextContent("22");
    expect(screen.queryByText(/private message body/i)).not.toBeInTheDocument();
  });

  it("renders a retryable Dashboard error", async () => {
    dashboardService.getAdminDashboard.mockRejectedValue({ response: { data: { error: "Dashboard unavailable" } } });
    renderWithProviders(<AdminDashboardPage />, { role: "admin" });
    expect(await screen.findByText("Dashboard unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("lists, filters, paginates, and responsively structures Students", async () => {
    adminService.getAccounts.mockResolvedValue({ accounts: [student], pagination });
    renderWithProviders(<AdminAccountsPage type="students" />, { role: "admin" });
    expect(await screen.findByRole("heading", { name: "Yenulu Student" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Approval"), { target: { value: "approved" } });
    await waitFor(() => expect(adminService.getAccounts).toHaveBeenLastCalledWith("students", expect.objectContaining({ accountStatus: "approved", page: 1, limit: 20 })));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(adminService.getAccounts).toHaveBeenLastCalledWith("students", expect.objectContaining({ page: 2 })));
    expect(screen.getByRole("article")).toHaveClass("sm:p-6");
  });

  it("requires a reason, suspends a Student, and shows success feedback", async () => {
    adminService.getAccounts.mockResolvedValue({ accounts: [student], pagination: { ...pagination, pages: 1 } });
    adminService.moderateAccount.mockResolvedValue({ message: "Student suspended successfully", account: { ...student, moderationStatus: "suspended", moderationReason: "Policy breach" } });
    renderWithProviders(<AdminAccountsPage type="students" />, { role: "admin" });
    fireEvent.click(await screen.findByRole("button", { name: "Suspend" }));
    const confirm = screen.getAllByRole("button", { name: "Suspend" }).at(-1);
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Policy breach" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(adminService.moderateAccount).toHaveBeenCalledWith("students", "student-1", "suspended", "Policy breach"));
    expect(await screen.findByText("Student suspended successfully")).toBeInTheDocument();
  });

  it("shows sanitized Job Provider account information", async () => {
    adminService.getAccounts.mockResolvedValue({ accounts: [provider], pagination: { ...pagination, pages: 1 } });
    renderWithProviders(<AdminAccountsPage type="providers" />, { role: "admin" });
    expect(await screen.findByRole("heading", { name: "Current Company" })).toBeInTheDocument();
    expect(screen.getByText("jobs@current.lk")).toBeInTheDocument();
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument();
  });

  it("supports account detail inspection without security fields", async () => {
    adminService.getAccount.mockResolvedValue(student);
    renderWithProviders(<Routes><Route path="/admin/students/:id" element={<AdminAccountDetailsPage type="students" />} /></Routes>, { route: "/admin/students/student-1", role: "admin" });
    expect(await screen.findByText("University of Ruhuna")).toBeInTheDocument();
    expect(screen.getByText("ICT")).toBeInTheDocument();
    expect(screen.queryByText(/token hash/i)).not.toBeInTheDocument();
  });

  it("shows a useful empty account state", async () => {
    adminService.getAccounts.mockResolvedValue({ accounts: [], pagination: { page: 1, pages: 0, total: 0 } });
    renderWithProviders(<AdminAccountsPage type="students" />, { role: "admin" });
    expect(await screen.findByRole("heading", { name: "No matching Students" })).toBeInTheDocument();
  });

  it("filters and reversibly hides Jobs through a reasoned confirmation", async () => {
    adminService.getJobs.mockResolvedValue({ jobs: [job], pagination: { ...pagination, pages: 1 } });
    adminService.moderateJob.mockResolvedValue({ message: "Job hidden successfully", job: { ...job, moderationStatus: "hidden", moderationReason: "Unsafe listing" } });
    renderWithProviders(<AdminJobsPage />, { role: "admin" });
    fireEvent.change(await screen.findByLabelText("Lifecycle"), { target: { value: "open" } });
    await waitFor(() => expect(adminService.getJobs).toHaveBeenLastCalledWith(expect.objectContaining({ status: "open" })));
    fireEvent.click(screen.getAllByRole("button", { name: "Hide" }).at(-1));
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Unsafe listing" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Hide" }).at(-1));
    await waitFor(() => expect(adminService.moderateJob).toHaveBeenCalledWith("job-1", "hidden", "Unsafe listing"));
    expect(await screen.findByRole("button", { name: "Restore" })).toBeInTheDocument();
  });

  it("inspects a Job and its authoritative owning Provider", async () => {
    adminService.getJob.mockResolvedValue(job);
    renderWithProviders(<Routes><Route path="/admin/jobs/:id" element={<AdminJobDetailsPage />} /></Routes>, { route: "/admin/jobs/job-1", role: "admin" });
    expect(await screen.findByRole("heading", { name: "Research Assistant" })).toBeInTheDocument();
    expect(screen.getAllByText("Current Company").length).toBeGreaterThan(0);
    expect(screen.getByText("Provider-authored description")).toBeInTheDocument();
  });

  it("moderates Reviews reversibly with context and feedback", async () => {
    reviewService.getAdminReviews.mockResolvedValue({ reviews: [review], pagination: { page: 1, pages: 1, total: 1 } });
    adminService.moderateReview.mockResolvedValue({ message: "Review hidden successfully", review: { ...review, moderationStatus: "hidden", moderationReason: "Abusive text" } });
    renderWithProviders(<AdminReviewsPage />, { role: "admin" });
    expect(await screen.findByText("Professional collaboration.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Abusive text" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Hide" }).at(-1));
    expect(await screen.findByText("Review hidden successfully")).toBeInTheDocument();
  });

  it("updates only allowlisted Settings and exposes paginated audit activity", async () => {
    adminService.getSettings.mockResolvedValue(settings);
    adminService.getAudits.mockResolvedValue({ audits: [{ id: "audit-1", admin: { email: "admin@ruwork.lk" }, metadata: { changes: { jobPostingOpen: { from: true, to: false } } }, createdAt: "2026-08-28" }], pagination: { page: 1, pages: 2, total: 11 } });
    adminService.updateSettings.mockResolvedValue({ message: "Admin Settings updated successfully", settings: { ...settings, jobPostingOpen: false } });
    renderWithProviders(<AdminSettingsPage />, { role: "admin" });
    fireEvent.click(await screen.findByLabelText("Job posting"));
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));
    await waitFor(() => expect(adminService.updateSettings).toHaveBeenCalledWith({ studentRegistrationOpen: true, providerRegistrationOpen: true, jobPostingOpen: false }));
    expect(await screen.findByText("Admin Settings updated successfully")).toBeInTheDocument();
    expect(screen.getByText(/JWT secrets/)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Settings audit pagination" })).toBeInTheDocument();
  });
});

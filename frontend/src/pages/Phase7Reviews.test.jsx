import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JobReviewsSection from "../components/reviews/JobReviewsSection";
import StarRatingInput from "../components/reviews/StarRatingInput";
import StudentReviewActions from "../components/reviews/StudentReviewActions";
import AdminReviewsPage from "./admin/AdminReviewsPage";
import { JobDetailsContent } from "./jobs/JobDetailsPage";
import ProviderReviewsPage from "./provider/ProviderReviewsPage";
import { reviewService } from "../services/reviewService";
import { adminService } from "../services/adminService";

vi.mock("../components/layout/AppHeader", () => ({ default: () => <header>RuWork navigation</header> }));
vi.mock("../hooks/useToast", () => ({ default: () => ({ showToast: vi.fn() }) }));
vi.mock("../services/reviewService", () => ({
  reviewService: {
    createReview: vi.fn(), getMyReviewForApplication: vi.fn(), deleteMyReview: vi.fn(),
    getJobReviews: vi.fn(), getProviderReviews: vi.fn(), getAdminReviews: vi.fn(), deleteReviewAsAdmin: vi.fn()
  }
}));
vi.mock("../services/adminService", () => ({ adminService: { moderateReview: vi.fn() } }));

const job = {
  id: "job-1", jobTitle: "Research Assistant", companyName: "Current Company", category: "Research", location: "Matara",
  requiredSkills: ["Research"], suitableFor: "2nd Year", budgetType: "fixed", budget: 10000, applicationDeadline: "2099-09-20",
  status: "open", availabilityStatus: "open", averageRating: 4.5, reviewCount: 2, jobDescription: "Research support.", scope: "One report.",
  workingHours: "Flexible", provider: { industry: "Technology", averageRating: 4.8, reviewCount: 12 }
};
const review = {
  id: "review-1", applicationId: "application-1", rating: 5, comment: "Clear scope and respectful communication.",
  student: { id: "student-1", firstName: "Ruhuna", lastName: "Student" },
  job: { id: "job-1", jobTitle: "Research Assistant", isArchived: false },
  provider: { id: "provider-1", companyName: "Current Company" }, createdAt: "2026-08-20T00:00:00.000Z"
};
const completedApplication = { id: "application-1", status: "completed", job: { jobTitle: "Research Assistant", companyName: "Current Company", isArchived: true } };

function router(ui) { return render(<MemoryRouter>{ui}</MemoryRouter>); }

describe("Phase 7 Reviews", () => {
  beforeEach(() => {
    Object.values(reviewService).forEach((mock) => mock.mockReset());
    adminService.moderateReview.mockReset();
  });

  it("loads Job Reviews and distinguishes Job rating from Provider rating", async () => {
    reviewService.getJobReviews.mockResolvedValue({ reviews: [review], pagination: { page: 1, pages: 1, total: 1 } });
    router(<JobDetailsContent job={job} />);
    expect(await screen.findByText(review.comment)).toBeInTheDocument();
    expect(screen.getAllByText("Job rating").length).toBeGreaterThan(0);
    expect(screen.getByText("Provider rating")).toBeInTheDocument();
    expect(screen.getByText("4.8")).toBeInTheDocument();
  });

  it("paginates Job Reviews through the bounded service call", async () => {
    reviewService.getJobReviews.mockResolvedValue({ reviews: [review], pagination: { page: 1, pages: 2, total: 11 } });
    router(<JobReviewsSection job={job} />);
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    await waitFor(() => expect(reviewService.getJobReviews).toHaveBeenLastCalledWith("job-1", { page: 2, limit: 10 }));
  });

  it("provides a keyboard-accessible native 1–5 star radio group", () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={0} onChange={onChange} />);
    const fourStars = screen.getByRole("radio", { name: "4 stars" });
    expect(fourStars).toHaveAttribute("type", "radio");
    fireEvent.click(fourStars);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("submits a Review for a completed archived Job", async () => {
    reviewService.getMyReviewForApplication.mockResolvedValue(null);
    reviewService.createReview.mockResolvedValue({ message: "Review submitted successfully", review });
    router(<StudentReviewActions application={completedApplication} />);
    fireEvent.click(await screen.findByRole("button", { name: /leave a review/i }));
    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));
    fireEvent.change(screen.getByLabelText("Review comment (optional)"), { target: { value: "Clear scope and respectful communication." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    await waitFor(() => expect(reviewService.createReview).toHaveBeenCalledWith({ applicationId: "application-1", rating: 5, comment: "Clear scope and respectful communication." }));
    expect(await screen.findByText(review.comment)).toBeInTheDocument();
  });

  it("does not expose Leave Review for a cancelled engagement", () => {
    router(<StudentReviewActions application={{ ...completedApplication, status: "cancelled" }} />);
    expect(screen.queryByRole("button", { name: /leave a review/i })).not.toBeInTheDocument();
    expect(reviewService.getMyReviewForApplication).not.toHaveBeenCalled();
  });

  it("requires confirmation before deleting the Student's own Review", async () => {
    reviewService.getMyReviewForApplication.mockResolvedValue(review);
    reviewService.deleteMyReview.mockResolvedValue({ message: "Review deleted successfully" });
    router(<StudentReviewActions application={completedApplication} />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete Review" }));
    expect(screen.getByRole("heading", { name: "Delete your Review?" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Delete Review" }).at(-1));
    await waitFor(() => expect(reviewService.deleteMyReview).toHaveBeenCalledWith("review-1"));
    expect(await screen.findByRole("button", { name: /leave a review/i })).toBeInTheDocument();
  });

  it("shows the required Provider aggregate and Reviews without management controls", async () => {
    reviewService.getProviderReviews.mockResolvedValue({ summary: { averageRating: 4.8, reviewCount: 12 }, reviews: [review], pagination: { page: 1, pages: 1, total: 1 } });
    router(<ProviderReviewsPage />);
    expect(await screen.findByText("Overall Provider rating")).toBeInTheDocument();
    expect(screen.getByText("4.8")).toBeInTheDocument();
    expect(screen.getByText("12 reviews")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("Admin lists Reviews and confirms reversible moderation", async () => {
    reviewService.getAdminReviews.mockResolvedValue({ reviews: [review], pagination: { page: 1, pages: 1, total: 1 } });
    adminService.moderateReview.mockResolvedValue({ message: "Review hidden successfully", review: { ...review, moderationStatus: "hidden", moderationReason: "Spam content" } });
    router(<AdminReviewsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Hide" }));
    expect(screen.getByRole("heading", { name: "Hide this Review?" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Spam content" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Hide" }).at(-1));
    await waitFor(() => expect(adminService.moderateReview).toHaveBeenCalledWith("review-1", "hidden", "Spam content"));
    expect(await screen.findByRole("button", { name: "Restore" })).toBeInTheDocument();
  });

  it("Review layouts use responsive wrapping without fixed-width content", async () => {
    reviewService.getJobReviews.mockResolvedValue({ reviews: [review], pagination: { page: 1, pages: 1, total: 1 } });
    router(<JobReviewsSection job={job} />);
    const article = (await screen.findByText(review.comment)).closest("article");
    expect(article).toHaveClass("sm:p-6");
    expect(article.querySelector(".sm\\:flex-row")).toBeTruthy();
  });
});

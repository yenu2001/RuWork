import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobDetailsContent } from "./JobDetailsPage";
import { reviewService } from "../../services/reviewService";

vi.mock("../../services/reviewService", () => ({ reviewService: { getJobReviews: vi.fn() } }));

const baseJob = {
  id: "job-1", jobTitle: "Data helper", companyName: "Ruhuna Services", category: "Data Entry", location: "Remote",
  requiredSkills: ["Excel"], suitableFor: "Any Year", budgetType: "fixed", budget: 8000, applicationDeadline: "2099-10-20T00:00:00.000Z",
  status: "open", availabilityStatus: "open", averageRating: null, reviewCount: 0, jobDescription: "Clean a small dataset.", scope: "One verified workbook.",
  workingHours: "Flexible", provider: { industry: "Services" }
};

describe("JobDetailsContent", () => {
  beforeEach(() => reviewService.getJobReviews.mockResolvedValue({ reviews: [], pagination: { page: 1, pages: 0, total: 0 } }));

  it("shows conditional pricing, the payment disclaimer, and no fabricated reviews", async () => {
    render(<MemoryRouter><JobDetailsContent job={baseJob} /></MemoryRouter>);
    expect(screen.getByText("LKR 8,000 fixed")).toBeInTheDocument();
    expect(screen.getByText(/RuWork does not process, collect, or hold payments/i)).toBeInTheDocument();
    expect(await screen.findByText("No reviews yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in as a student to apply/i })).toHaveAttribute("href", "/login/student");
  });
});

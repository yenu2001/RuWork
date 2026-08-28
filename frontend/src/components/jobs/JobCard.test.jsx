import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import JobCard from "./JobCard";

const job = {
  id: "job-1", jobTitle: "Event assistant", companyName: "Coastal Events", location: "Matara",
  category: "Event Support", applicationDeadline: "2099-09-10T00:00:00.000Z", requiredSkills: ["Coordination"],
  budgetType: "hourly", hourlyRate: 1200, averageRating: null, reviewCount: 0
};

describe("JobCard", () => {
  it("keeps the honest rating summary in a separate desktop-side region", () => {
    render(<MemoryRouter><JobCard job={job} /></MemoryRouter>);
    const rating = screen.getByTestId("job-rating");
    expect(rating.tagName).toBe("ASIDE");
    expect(rating).toHaveTextContent("No ratings yet");
    expect(screen.queryByText(/review comment/i)).not.toBeInTheDocument();
  });

  it("renders real aggregate rating without leaking individual comments", () => {
    render(<MemoryRouter><JobCard job={{ ...job, averageRating: 4.7, reviewCount: 23, reviewComment: "Should never appear" }} /></MemoryRouter>);
    const rating = screen.getByTestId("job-rating");
    expect(rating).toHaveClass("lg:border-l");
    expect(rating).toHaveTextContent("4.7");
    expect(rating).toHaveTextContent("23 reviews");
    expect(screen.queryByText("Should never appear")).not.toBeInTheDocument();
  });
});

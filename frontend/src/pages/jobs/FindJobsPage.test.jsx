import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import FindJobsPage, { JobResultsState } from "./FindJobsPage";

vi.mock("../../services/jobService", () => ({ jobService: { getJobs: vi.fn() } }));
import { jobService } from "../../services/jobService";

describe("FindJobsPage", () => {
  beforeEach(() => jobService.getJobs.mockReset());

  it("renders loading and an empty result without inventing Jobs", async () => {
    let resolveRequest;
    jobService.getJobs.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    renderWithProviders(<FindJobsPage />, { route: "/jobs" });
    expect(screen.getAllByRole("status")).toHaveLength(3);
    resolveRequest({ jobs: [], pagination: { page: 1, pages: 0, total: 0 } });
    expect(await screen.findByRole("heading", { name: /no jobs match/i })).toBeInTheDocument();
  });

  it("sends URL search and filter values to the API", async () => {
    jobService.getJobs.mockResolvedValue({ jobs: [], pagination: { page: 1, pages: 0, total: 0 } });
    renderWithProviders(<FindJobsPage />, { route: "/jobs?q=design&category=Content+Creation&sort=price-high" });
    await waitFor(() => expect(jobService.getJobs).toHaveBeenCalledWith(expect.objectContaining({ q: "design", category: "Content Creation", sort: "price-high" })));
  });

  it("shows a safe retry state when loading fails", async () => {
    renderWithProviders(<JobResultsState result={{ status: "error", jobs: [], error: "This service is temporarily unavailable. Please try again shortly." }} onRetry={vi.fn()} onClear={vi.fn()} />, { route: "/jobs" });
    expect(screen.getByText("This service is temporarily unavailable. Please try again shortly.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

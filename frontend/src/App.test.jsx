import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { renderWithProviders } from "./test/renderWithProviders";

describe("management route protection", () => {
  it("redirects unauthenticated Provider management access to Provider login", () => {
    renderWithProviders(<App />, { route: "/provider/jobs" });
    expect(screen.getByText("Job Provider access")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  });

  it("redirects unauthenticated Student Application access to Student login", () => {
    renderWithProviders(<App />, { route: "/student/applications" });
    expect(screen.getByText("Student access")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  });

  it("protects Student Messages behind Student authentication", () => {
    renderWithProviders(<App />, { route: "/student/messages" });
    expect(screen.getByText("Student access")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  });

  it("protects Provider Notifications behind Job Provider authentication", () => {
    renderWithProviders(<App />, { route: "/provider/notifications" });
    expect(screen.getByText("Job Provider access")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  });
});

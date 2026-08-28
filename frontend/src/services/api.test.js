import { describe, expect, it } from "vitest";
import api, { API_BASE_URL } from "./api";

describe("Axios API client", () => {
  it("uses the configured public API base URL", () => {
    expect(API_BASE_URL).toBe("/api");
    expect(api.defaults.baseURL).toBe(API_BASE_URL);
  });
});

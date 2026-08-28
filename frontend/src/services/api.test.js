import { beforeEach, describe, expect, it } from "vitest";
import api, { API_BASE_URL, SESSION_EXPIRED_EVENT } from "./api";
import { AUTH_STORAGE_KEY } from "../utils/authStorage";

/** Drive the response interceptor exactly as axios would on a rejected request. */
function rejectThrough(error) {
  const handler = api.interceptors.response.handlers.find((entry) => entry?.rejected)?.rejected;
  return handler(error).catch(() => {});
}

describe("Axios API client", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: "stored-token", user: { role: "student" } }));
  });

  it("uses the configured public API base URL", () => {
    expect(API_BASE_URL).toBe("/api");
    expect(api.defaults.baseURL).toBe(API_BASE_URL);
  });

  it("clears the session and announces expiry when the server revokes the token", async () => {
    const events = [];
    const listener = (event) => events.push(event.detail?.code);
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    try {
      await rejectThrough({ response: { status: 401, data: { code: "TOKEN_REVOKED" } } });
      expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
      expect(events).toEqual(["TOKEN_REVOKED"]);
    } finally {
      window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
    }
  });

  it("keeps the session for a wrong current password and for non-401 failures", async () => {
    // A mistyped current password answers 401 inside an authenticated flow; signing the user
    // out there would be wrong.
    await rejectThrough({ response: { status: 401, data: { code: "CURRENT_PASSWORD_INVALID" } } });
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();

    await rejectThrough({ response: { status: 403, data: { code: "STUDENT_NOT_ELIGIBLE" } } });
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();

    await rejectThrough({ message: "Network Error" });
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
  });
});

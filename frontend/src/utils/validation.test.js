import { describe, expect, it } from "vitest";
import { getPasswordError, isRuhunaEmail } from "./validation";

describe("student account validation", () => {
  it("accepts only the exact ruh.ac.lk email domain", () => {
    expect(isRuhunaEmail("student@ruh.ac.lk")).toBe(true);
    expect(isRuhunaEmail(" STUDENT@RUH.AC.LK ")).toBe(true);
    expect(isRuhunaEmail("student@eng.ruh.ac.lk")).toBe(false);
    expect(isRuhunaEmail("student@gmail.com")).toBe(false);
    expect(isRuhunaEmail("@ruh.ac.lk")).toBe(false);
  });

  it("reflects the backend password rules", () => {
    expect(getPasswordError("Short1")).toMatch(/8 characters/);
    expect(getPasswordError("lowercase1")).toMatch(/uppercase/);
    expect(getPasswordError("NoNumberHere")).toMatch(/number/);
    expect(getPasswordError("Secure123")).toBe("");
  });
});

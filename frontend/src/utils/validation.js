export const UNIVERSITY_NAME = "University of Ruhuna";
export const STUDENT_EMAIL_DOMAIN = "ruh.ac.lk";

export function normalizeEmail(value = "") {
  return value.trim().toLowerCase();
}

export function isRuhunaEmail(value) {
  const email = normalizeEmail(value);
  const parts = email.split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1] === STUDENT_EMAIL_DOMAIN && !/\s/.test(email);
}

export function isBasicEmail(value) {
  return /^[^\s@]+@[^\s@]+$/.test(normalizeEmail(value));
}

export function getPasswordError(value) {
  if (value.length < 8) return "Use at least 8 characters.";
  if (!/[A-Z]/.test(value)) return "Include at least one uppercase letter.";
  if (!/[0-9]/.test(value)) return "Include at least one number.";
  return "";
}

export function isValidOptionalUrl(value) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

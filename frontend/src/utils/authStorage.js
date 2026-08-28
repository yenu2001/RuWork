export const AUTH_STORAGE_KEY = "ruwork.auth";

function getSessionStorage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function readStoredAuth() {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const value = JSON.parse(storage.getItem(AUTH_STORAGE_KEY));
    if (!value?.token || !value?.user?.role) return null;
    return value;
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function storeAuth(value) {
  getSessionStorage()?.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
}

export function clearStoredAuth() {
  getSessionStorage()?.removeItem(AUTH_STORAGE_KEY);
}

export function getStoredToken() {
  return readStoredAuth()?.token || null;
}

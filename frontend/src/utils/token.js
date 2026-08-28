function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return decodeURIComponent(
    window
      .atob(padded)
      .split("")
      .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
}

export function decodeAccessToken(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const decoded = JSON.parse(decodeBase64Url(payload));
    if (!decoded?.sub || !decoded?.role) return null;
    if (decoded.exp && decoded.exp * 1000 <= Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

const COOKIE_TOKEN = "bgm_access_token";
const COOKIE_USER = "bgm_user_id";

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function getCookieToken(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[COOKIE_TOKEN] || "";
}

function tokenCookie(token, maxAge) {
  return `${COOKIE_TOKEN}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function userCookie(userId, maxAge) {
  return `${COOKIE_USER}=${encodeURIComponent(userId || "")}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookies() {
  return [
    `${COOKIE_TOKEN}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    `${COOKIE_USER}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  ];
}

function getOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function getRedirectUri(req) {
  return process.env.BANGUMI_REDIRECT_URI || `${getOrigin(req)}/api/bangumi-authorize`;
}

module.exports = {
  clearCookies,
  getCookieToken,
  getOrigin,
  getRedirectUri,
  tokenCookie,
  userCookie,
};

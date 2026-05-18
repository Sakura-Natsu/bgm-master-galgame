const { clearCookies, getCookieToken } = require("./_bgm-auth");

exports.handler = async function handler(event) {
  if (event.httpMethod === "DELETE" || event.queryStringParameters?.logout === "1") {
    return {
      statusCode: 200,
      multiValueHeaders: { "Set-Cookie": clearCookies() },
      body: JSON.stringify({ ok: true, authenticated: false, loggedIn: false }),
    };
  }

  const token = getCookieToken(event);
  if (!token) {
    return { statusCode: 200, body: JSON.stringify({ authenticated: false, loggedIn: false }) };
  }

  try {
    const meRes = await fetch("https://api.bgm.tv/v0/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "bangumi-master-galgame-oauth/1.0",
      },
    });
    if (!meRes.ok) {
      return {
        statusCode: 200,
        multiValueHeaders: { "Set-Cookie": clearCookies() },
        body: JSON.stringify({ authenticated: false, loggedIn: false }),
      };
    }

    const me = await meRes.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authenticated: true,
        loggedIn: true,
        id: me.id,
        username: me.username,
        nickname: me.nickname,
      }),
    };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ authenticated: false, loggedIn: false }) };
  }
};

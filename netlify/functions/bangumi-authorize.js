const { getOrigin, getRedirectUri, tokenCookie, userCookie } = require("./_bgm-auth");

exports.handler = async function handler(event) {
  const code = String(event.queryStringParameters?.code || "");
  if (!code) {
    return { statusCode: 400, body: "Authorization failed. No code received." };
  }

  const appId = process.env.BANGUMI_APPID;
  const appSecret = process.env.BANGUMI_APPSEC;
  if (!appId || !appSecret) {
    return { statusCode: 500, body: "Bangumi OAuth env vars are not configured" };
  }

  try {
    const tokenRes = await fetch("https://bgm.tv/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "bangumi-master-galgame-oauth/1.0",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: appId,
        client_secret: appSecret,
        code,
        redirect_uri: getRedirectUri(event),
      }),
    });

    if (!tokenRes.ok) {
      return { statusCode: tokenRes.status, body: "Failed to exchange Bangumi OAuth code" };
    }

    const data = await tokenRes.json();
    const maxAge = Math.max(60, Number(data.expires_in || 0));
    return {
      statusCode: 302,
      multiValueHeaders: {
        "Set-Cookie": [
          tokenCookie(data.access_token, maxAge),
          userCookie(data.user_id, maxAge),
        ],
      },
      headers: { Location: `${getOrigin(event)}/?bangumi_login=1` },
      body: "",
    };
  } catch {
    return { statusCode: 500, body: "Bangumi OAuth callback error" };
  }
};

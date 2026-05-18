const { getOrigin, getRedirectUri, tokenCookie, userCookie } = require("./_bgm-auth");

module.exports = async function handler(req, res) {
  const code = String(req.query.code || "");
  if (!code) {
    res.status(400).send("Authorization failed. No code received.");
    return;
  }

  const appId = process.env.BANGUMI_APPID;
  const appSecret = process.env.BANGUMI_APPSEC;
  if (!appId || !appSecret) {
    res.status(500).send("Bangumi OAuth env vars are not configured");
    return;
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
        redirect_uri: getRedirectUri(req),
      }),
    });

    if (!tokenRes.ok) {
      res.status(tokenRes.status).send("Failed to exchange Bangumi OAuth code");
      return;
    }

    const data = await tokenRes.json();
    const maxAge = Math.max(60, Number(data.expires_in || 0));
    res.setHeader("Set-Cookie", [
      tokenCookie(data.access_token, maxAge),
      userCookie(data.user_id, maxAge),
    ]);
    res.redirect(302, `${getOrigin(req)}/?bangumi_login=1`);
  } catch {
    res.status(500).send("Bangumi OAuth callback error");
  }
};

const { clearCookies, getCookieToken } = require("./_bgm-auth");

module.exports = async function handler(req, res) {
  if (req.method === "DELETE" || req.query.logout === "1") {
    res.setHeader("Set-Cookie", clearCookies());
    res.status(200).json({ ok: true, authenticated: false, loggedIn: false });
    return;
  }

  const token = getCookieToken(req);
  if (!token) {
    res.status(200).json({ authenticated: false, loggedIn: false });
    return;
  }

  try {
    const meRes = await fetch("https://api.bgm.tv/v0/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "bangumi-master-galgame-oauth/1.0",
      },
    });
    if (!meRes.ok) {
      res.setHeader("Set-Cookie", clearCookies());
      res.status(200).json({ authenticated: false, loggedIn: false });
      return;
    }

    const me = await meRes.json();
    res.status(200).json({
      authenticated: true,
      loggedIn: true,
      id: me.id,
      username: me.username,
      nickname: me.nickname,
    });
  } catch {
    res.status(500).json({ authenticated: false, loggedIn: false });
  }
};

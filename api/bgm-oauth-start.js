const { getRedirectUri } = require("./_bgm-auth");

module.exports = async function handler(req, res) {
  const appId = process.env.BANGUMI_APPID;
  if (!appId) {
    res.status(500).send("BANGUMI_APPID is not configured");
    return;
  }

  const params = new URLSearchParams({
    client_id: appId,
    response_type: "code",
    redirect_uri: getRedirectUri(req),
  });

  res.redirect(302, `https://bgm.tv/oauth/authorize?${params.toString()}`);
};

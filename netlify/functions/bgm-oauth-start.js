const { getRedirectUri } = require("./_bgm-auth");

exports.handler = async function handler(event) {
  const appId = process.env.BANGUMI_APPID;
  if (!appId) {
    return { statusCode: 500, body: "BANGUMI_APPID is not configured" };
  }

  const params = new URLSearchParams({
    client_id: appId,
    response_type: "code",
    redirect_uri: getRedirectUri(event),
  });

  return {
    statusCode: 302,
    headers: { Location: `https://bgm.tv/oauth/authorize?${params.toString()}` },
    body: "",
  };
};

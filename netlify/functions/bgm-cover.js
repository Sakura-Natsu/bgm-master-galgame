const { getCookieToken } = require("./_bgm-auth");

const USER_AGENT = "bangumi-master-galgame-cover-proxy/1.0";

function pickImage(subject) {
  return (
    subject?.images?.common ||
    subject?.images?.large ||
    subject?.images?.medium ||
    subject?.image ||
    ""
  );
}

function getToken(event) {
  return process.env.BANGUMI_TOKEN || getCookieToken(event) || "";
}

async function fetchCover(id, event) {
  const headers = { "User-Agent": USER_AGENT };
  const token = getToken(event);
  if (token) headers.Authorization = `Bearer ${token}`;

  const subjectRes = await fetch(`https://api.bgm.tv/v0/subjects/${id}`, { headers });
  if (!subjectRes.ok) {
    return { statusCode: subjectRes.status, body: "Failed to fetch subject" };
  }

  const subject = await subjectRes.json();
  const imageUrl = pickImage(subject);
  if (!imageUrl) {
    return { statusCode: 404, body: "Cover not found" };
  }

  const imageHost = new URL(imageUrl).hostname;
  if (!imageHost.endsWith("bgm.tv")) {
    return { statusCode: 400, body: "Unexpected image host" };
  }

  const imageRes = await fetch(imageUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: "https://bangumi.tv/",
    },
  });
  if (!imageRes.ok) {
    return { statusCode: imageRes.status, body: "Failed to fetch cover" };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": imageRes.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    },
    body: Buffer.from(await imageRes.arrayBuffer()).toString("base64"),
    isBase64Encoded: true,
  };
}

exports.handler = async function handler(event) {
  const id = String(event.queryStringParameters?.id || "");
  if (!/^\d+$/.test(id)) {
    return { statusCode: 400, body: "Invalid id" };
  }

  try {
    return await fetchCover(id, event);
  } catch {
    return { statusCode: 500, body: "Cover proxy error" };
  }
};

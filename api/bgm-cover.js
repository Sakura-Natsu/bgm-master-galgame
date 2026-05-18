const { getCookieToken } = require("./_bgm-auth");

const USER_AGENT = "bangumi-master-galgame-cover-proxy/1.0";

function getToken(req) {
  return process.env.BANGUMI_TOKEN || getCookieToken(req) || "";
}

function pickImage(subject) {
  return (
    subject?.images?.common ||
    subject?.images?.large ||
    subject?.images?.medium ||
    subject?.image ||
    ""
  );
}

async function fetchCover(id, req) {
  const headers = { "User-Agent": USER_AGENT };
  const token = getToken(req);
  if (token) headers.Authorization = `Bearer ${token}`;

  const subjectRes = await fetch(`https://api.bgm.tv/v0/subjects/${id}`, { headers });
  if (!subjectRes.ok) {
    return { status: subjectRes.status, body: "Failed to fetch subject" };
  }

  const subject = await subjectRes.json();
  const imageUrl = pickImage(subject);
  if (!imageUrl) {
    return { status: 404, body: "Cover not found" };
  }

  const imageHost = new URL(imageUrl).hostname;
  if (!imageHost.endsWith("bgm.tv")) {
    return { status: 400, body: "Unexpected image host" };
  }

  const imageRes = await fetch(imageUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: "https://bangumi.tv/",
    },
  });
  if (!imageRes.ok) {
    return { status: imageRes.status, body: "Failed to fetch cover" };
  }

  return {
    status: 200,
    contentType: imageRes.headers.get("content-type") || "image/jpeg",
    body: Buffer.from(await imageRes.arrayBuffer()),
  };
}

module.exports = async function handler(req, res) {
  const id = String(req.query.id || "");
  if (!/^\d+$/.test(id)) {
    res.status(400).send("Invalid id");
    return;
  }

  try {
    const result = await fetchCover(id, req);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
    if (result.contentType) res.setHeader("Content-Type", result.contentType);
    res.status(result.status).send(result.body);
  } catch (err) {
    res.status(500).send("Cover proxy error");
  }
};

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const outFile = args.get("--out") || "data/galgame_list.json";
const metaFile = args.get("--meta") || "data/galgame_meta.json";
const cacheFile = args.get("--cache") || "data/galgame_details_cache.json";
const maxPagesArg = Number(args.get("--max-pages") || 0);
const delayMs = Number(args.get("--delay-ms") || 250);
const apiConcurrency = Number(args.get("--api-concurrency") || 8);
const skipHydrate = args.has("--skip-hydrate");
const token = process.env.BANGUMI_TOKEN || "";

const baseUrl = "https://bangumi.tv/game/browser/Galgame";
const userAgent = "Codex-bangumi-galgame-builder/1.0 (local)";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function htmlDecode(text = "") {
  return text
    .replace(/<.*?>/gs, "")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function yearDate(info = "") {
  const m = info.match(/(\d{4})(?:[-/.](\d{1,2})(?:[-/.](\d{1,2}))?)?/);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Math.min(12, Math.max(1, Number(m[2] || 1)));
  const d = Math.min(31, Math.max(1, Number(m[3] || 1)));
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function coverUrl(url = "") {
  if (!url || url.startsWith("/img/no_icon_subject.png")) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://bangumi.tv${url}`;
  return url;
}

async function getText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return await res.text();
}

function parseItems(html) {
  const items = [];
  const itemRe = /<li id="item_(\d+)" class="item.*?<\/li>/gs;
  for (const match of html.matchAll(itemRe)) {
    const block = match[0];
    const id = Number(match[1]);
    const titleMatch = block.match(/<h3>.*?<a href="\/subject\/\d+" class="l">(.*?)<\/a>.*?<\/h3>/s);
    if (!titleMatch) continue;
    const title = htmlDecode(titleMatch[1]);
    const scoreMatch = block.match(/<small class="fade">([0-9.]+)<\/small>/);
    const voteMatch = block.match(/\((\d+)[^)]*\)/);
    if (!scoreMatch || !voteMatch) continue;
    const score = Number(scoreMatch[1]);
    const vote_count = Number(voteMatch[1]);
    if (!score || !vote_count) continue;
    const rankMatch = block.match(/<span class="rank"><small>Rank <\/small>(\d+)<\/span>/);
    const imageMatch = block.match(/<img src="([^"]+)" class="cover"/);
    const infoMatch = block.match(/<p class="info tip">\s*(.*?)\s*<\/p>/s);
    const info = infoMatch ? htmlDecode(infoMatch[1]) : "";
    items.push({
      id,
      name: title,
      name_cn: title,
      score,
      rank: rankMatch ? Number(rankMatch[1]) : 0,
      image_url: imageMatch ? coverUrl(imageMatch[1]) : "",
      vote_count,
      tags: ["Galgame"],
      meta_tags: [],
      air_date: yearDate(info),
      info,
    });
  }
  return items;
}

async function fetchDetail(baseItem) {
  const headers = { "User-Agent": userAgent };
  if (token) headers.Authorization = `Bearer ${token}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`https://api.bgm.tv/v0/subjects/${baseItem.id}`, { headers });
      if (res.status === 429) {
        await sleep(1500 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const detail = await res.json();
      const rating = detail.rating || {};
      return {
        id: detail.id,
        name: detail.name || baseItem.name,
        name_cn: detail.name_cn || baseItem.name_cn,
        score: Number(rating.score || baseItem.score),
        rank: Number(rating.rank || baseItem.rank || 0),
        image_url: detail.images?.common || detail.image || baseItem.image_url,
        vote_count: Number(rating.total || baseItem.vote_count),
        tags: Array.isArray(detail.tags) ? detail.tags.slice(0, 40).map((tag) => tag.name) : baseItem.tags,
        meta_tags: Array.isArray(detail.meta_tags) ? detail.meta_tags : [],
        air_date: detail.date || baseItem.air_date,
        info: baseItem.info,
      };
    } catch {
      if (attempt === 3) return baseItem;
      await sleep(1000 * attempt);
    }
  }
  return baseItem;
}

async function hydrateAll(items) {
  let cache = {};
  try {
    cache = JSON.parse(await readFile(cacheFile, "utf8"));
  } catch {
    cache = {};
  }

  const result = new Array(items.length);
  let next = 0;
  let done = 0;
  let fetched = 0;
  let dirty = 0;

  async function flushCache() {
    await mkdir(path.dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, JSON.stringify(cache), "utf8");
    dirty = 0;
  }

  async function worker() {
    while (next < items.length) {
      const index = next++;
      const key = String(items[index].id);
      if (cache[key]) {
        result[index] = cache[key];
      } else {
        result[index] = await fetchDetail(items[index]);
        cache[key] = result[index];
        fetched++;
        dirty++;
      }
      done++;
      if (done % 100 === 0) {
        console.log(`Hydrated ${done} / ${items.length}, fetched this run: ${fetched}`);
      }
      if (dirty >= 50) {
        await flushCache();
      }
    }
  }
  await Promise.all(Array.from({ length: apiConcurrency }, worker));
  if (dirty > 0) await flushCache();
  return result;
}

const firstHtml = await getText(baseUrl);
const pageNumbers = [...firstHtml.matchAll(/page=(\d+)/g)].map((m) => Number(m[1]));
let lastPage = pageNumbers.length ? Math.max(...pageNumbers) : 1;
if (maxPagesArg > 0 && maxPagesArg < lastPage) lastPage = maxPagesArg;

const byId = new Map();
for (const item of parseItems(firstHtml)) byId.set(item.id, item);

for (let page = 2; page <= lastPage; page++) {
  await sleep(delayMs);
  const html = await getText(`${baseUrl}?page=${page}`);
  const items = parseItems(html);
  if (!items.length) break;
  for (const item of items) byId.set(item.id, item);
  if (page % 20 === 0) {
    console.log(`Fetched page ${page} / ${lastPage}, scored items: ${byId.size}`);
  }
}

let list = [...byId.values()].sort((a, b) => b.score - a.score || b.vote_count - a.vote_count);
if (!skipHydrate) {
  list = await hydrateAll(list);
  list = list
    .filter((item) => item.score > 0 && item.vote_count > 0)
    .sort((a, b) => b.score - a.score || b.vote_count - a.vote_count);
}

let scoreRank = 1;
for (const item of list) {
  if (!item.rank || item.rank <= 0) item.rank = scoreRank;
  scoreRank++;
}

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify(list), "utf8");
await writeFile(
  metaFile,
  JSON.stringify({
    collected_at: new Date().toISOString().slice(0, 10),
    source: "Bangumi /game/browser/Galgame",
    pages: lastPage,
    hydrated: !skipHydrate,
    detail_source: skipHydrate ? "browser page only" : "Bangumi v0 /subjects/{id}",
    detail_cache: skipHydrate ? "" : cacheFile,
    filter: "Galgame browser page IDs, scored subjects only",
    count: list.length,
  }),
  "utf8",
);

console.log(`Wrote ${list.length} scored Galgame subjects from ${lastPage} pages to ${outFile}`);

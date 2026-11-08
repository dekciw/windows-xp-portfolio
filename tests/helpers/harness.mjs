// Тестовый стенд: статический сервер (без переписывания URL) + headless Chrome.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon", ".cur": "image/x-icon",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".woff": "font/woff", ".woff2": "font/woff2",
  ".ttf": "font/ttf", ".otf": "font/otf", ".json": "application/json", ".pdf": "application/pdf",
};

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let file = path.join(ROOT, urlPath);
      if (!file.startsWith(ROOT)) throw new Error("outside root");
      if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Тесты не ходят в сеть: fetch к api.github.com и к сервису активности отвечает
// данными из window.__gh (меняются в тесте через page.evaluate).
//   status — код ответа профиля/репозиториев; readme/contrib: null → 404/500 у этого источника;
//   calls — число запросов к api.github.com; delay — задержка ответа, мс.
function installGithubMock(user, repos, readme, contrib) {
  window.__gh = { user, repos, readme, contrib, status: 200, calls: 0, delay: 0 };
  const realFetch = window.fetch.bind(window);
  const reply = (status, body, type) =>
    new Promise((r) =>
      setTimeout(() => r(new Response(body, { status, headers: { "Content-Type": type } })), window.__gh.delay)
    );
  window.fetch = (input, init) => {
    const url = String(input && input.url ? input.url : input);
    const gh = window.__gh;
    if (url.startsWith("https://github-contributions-api.jogruber.de/")) {
      return gh.contrib ? reply(200, JSON.stringify(gh.contrib), "application/json") : reply(500, "{}", "application/json");
    }
    if (!url.startsWith("https://api.github.com/")) return realFetch(input, init);
    gh.calls++;
    if (url.includes("/readme")) {
      return gh.readme ? reply(200, gh.readme, "text/html") : reply(404, '{"message":"Not Found"}', "application/json");
    }
    if (gh.status !== 200) return reply(gh.status, '{"message":"API rate limit exceeded"}', "application/json");
    return reply(200, JSON.stringify(url.includes("/repos") ? gh.repos : gh.user), "application/json");
  };
}

export async function startHarness() {
  const { GH_USER, GH_REPOS, GH_README, GH_CONTRIB } = await import("../fixtures/github.mjs");
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: 1366, height: 768 },
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e)));
  await page.evaluateOnNewDocument(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  });
  await page.evaluateOnNewDocument(installGithubMock, GH_USER, GH_REPOS, GH_README, GH_CONTRIB);
  await page.goto(`${base}/Bureau/Bureau.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof openWindow === "function");
  // Base window template is fetched asynchronously by Bureau.js.
  await page.waitForFunction(() => typeof openWindowHTML === "string" && openWindowHTML.length > 0);
  return {
    page,
    browser,
    base,
    async close() {
      await browser.close();
      await new Promise((r) => server.close(r));
    },
  };
}

export const ABOUT = '[id="window-About Me"]';

export async function openAboutMe(page) {
  const icon = await page.$('.icon[data-app="About Me"]');
  if (!icon) throw new Error('desktop icon .icon[data-app="About Me"] not found');
  await icon.click({ count: 2 });
  await page.waitForSelector(`${ABOUT} .am-root`, { timeout: 5000 });
}

export async function closeAboutMe(page) {
  await page.evaluate(() => closeWindow("About Me"));
  await page.waitForFunction(() => !document.getElementById("window-About Me"));
}

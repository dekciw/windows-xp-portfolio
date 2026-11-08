import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
import { startServer, CHROME } from "./helpers/harness.mjs";

// Экран входа WoW (/WoW/index.html): три дополнения, музыка сразу, Quit/Esc возвращают на рабочий стол.

let server, browser, page, base, errors;
before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server.close(r));
});
beforeEach(async () => {
  if (page) await page.close();
  page = await browser.newPage();
  errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluateOnNewDocument(() => {
    window.__played = [];
    HTMLMediaElement.prototype.play = function () {
      window.__played.push(decodeURIComponent(this.currentSrc || this.src));
      return Promise.resolve();
    };
  });
});

const openWoW = () => page.goto(`${base}/WoW/index.html`, { waitUntil: "load" });

test("three expansions, starts on Vanilla", async () => {
  await openWoW();
  const s = await page.evaluate(() => ({
    title: document.title,
    map: expansionMap,
    ver: document.getElementById("buildVersion").textContent,
    src: document.querySelector("#background source").getAttribute("src"),
    sources: document.querySelectorAll("#background source").length,
  }));
  assert.equal(s.title, "World of Warcraft");
  assert.deepEqual(s.map, ["Vanilla", "WrathOfTheLichKing", "Shadowlands"]);
  assert.equal(s.ver, "Version 1.12.1 (5875) (Release)");
  assert.match(s.src, /Vanilla\.mp4$/);
  assert.equal(s.sources, 1);
});

test("logo click cycles and wraps", async () => {
  await openWoW();
  const seq = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      manualChangeExpac();
      out.push(expansion);
    }
    return out;
  });
  assert.deepEqual(seq, [1, 2, 0]);
});

test("music starts without a click", async () => {
  await openWoW();
  const played = await page.evaluate(() => window.__played);
  assert.ok(played.some((u) => u.endsWith("Vanilla.ogg")), JSON.stringify(played));
  assert.deepEqual(errors, []);
});

test("music refused by the browser does not throw", async () => {
  await page.evaluateOnNewDocument(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("blocked", "NotAllowedError"));
  });
  await openWoW();
  await new Promise((r) => setTimeout(r, 300));
  assert.deepEqual(errors, []);
});

test("quit calls launcher (button and Escape)", async () => {
  await page.goto(`${base}/tests/fixtures/wow-host.html`, { waitUntil: "load" });
  const frame = await (await page.waitForSelector("#f")).contentFrame();
  await frame.waitForFunction(() => document.readyState === "complete" && typeof quitGame === "function");
  await frame.click("#quitButton");
  assert.equal(await page.evaluate(() => window.__closed), 1);
  await frame.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  assert.equal(await page.evaluate(() => window.__closed), 2);
});

test("quit without launcher", async () => {
  await openWoW();
  await Promise.all([page.waitForNavigation(), page.click("#quitButton")]);
  assert.equal(page.url(), `${base}/`);
});

test("all referenced media exist", async () => {
  const files = [
    "assets/img/bg/Vanilla.mp4", "assets/img/bg/Wrathofthelichking.mp4", "assets/img/bg/Shadowlands.mp4",
    "assets/audio/Vanilla.ogg", "assets/audio/WrathOfTheLichKing.ogg", "assets/audio/Shadowlands.ogg",
    "assets/img/ui/logos/Vanilla.png", "assets/img/ui/logos/WrathOfTheLichKing.png", "assets/img/ui/logos/Shadowlands.png",
  ];
  for (const f of files) {
    const r = await fetch(`${base}/WoW/${f}`, { method: "HEAD" });
    assert.equal(r.status, 200, f);
  }
});

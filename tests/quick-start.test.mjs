import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Значок «Quick Start» в трее (стена с глобусом): подсказка при наведении,
// по щелчку открываются «Обо мне», «Мои проекты», «Моё резюме» и GitHub.

const APPS = ["About Me", "My Projects", "Resume", "GitHub"];
const ICON = "#quick-start-toggle";
const NAV = "Windows Navigation Start.wav";

let h;
let page;
before(async () => {
  h = await startHarness();
  page = h.page;
  await page.waitForSelector("#window-GitHub .gh-root", { timeout: 10000 });
});
after(async () => h && (await h.close()));

const closeAll = () =>
  page.evaluate(() => document.querySelectorAll(".window").forEach((w) => closeWindow(w.id.slice("window-".length))));
const state = () =>
  page.evaluate((apps) => {
    const z = (w) => parseInt(w.style.zIndex, 10) || 0;
    const all = [...document.querySelectorAll(".window")];
    return apps.map((a) => {
      const w = document.getElementById(`window-${a}`);
      return {
        app: a,
        open: !!w,
        count: all.filter((x) => x.id === `window-${a}`).length,
        shown: !!w && w.style.display !== "none",
      };
    });
  }, APPS);

test("значок в трее: стена с глобусом перед часами", async () => {
  const r = await page.$eval(ICON, (i) => ({
    src: decodeURIComponent(i.getAttribute("src")),
    next: i.nextElementSibling && i.nextElementSibling.id,
    ok: i.complete && i.naturalWidth > 0,
  }));
  assert.match(r.src, /Firewall\.png$/);
  assert.equal(r.next, "footer-time");
  assert.equal(r.ok, true);
});

test("наведение: подсказка «Quick Start» над значком в стиле XP", async () => {
  await page.hover(ICON);
  await page.waitForSelector(".xp-tray-tip", { visible: true, timeout: 3000 });
  const tip = await page.evaluate((ICON) => {
    const t = document.querySelector(".xp-tray-tip");
    const cs = getComputedStyle(t);
    const tr = t.getBoundingClientRect();
    const ir = document.querySelector(ICON).getBoundingClientRect();
    return {
      text: t.textContent.trim(),
      bg: cs.backgroundColor,
      border: cs.borderTopColor,
      above: tr.bottom <= ir.top,
      inScreen: tr.left >= 0 && tr.right <= innerWidth,
    };
  }, ICON);
  assert.deepEqual(tip, { text: "Quick Start", bg: "rgb(255, 255, 225)", border: "rgb(0, 0, 0)", above: true, inScreen: true });
  await page.mouse.move(400, 300);
  await page.waitForSelector(".xp-tray-tip", { hidden: true, timeout: 3000 });
});

test("щелчок: открываются все четыре окна, звук открытия один раз", async () => {
  await closeAll();
  await page.evaluate(() => (window.__played = []));
  await page.click(ICON);
  for (const a of APPS) await page.waitForSelector(`[id="window-${a}"]`, { visible: true });
  assert.deepEqual(
    await state(),
    APPS.map((app) => ({ app, open: true, count: 1, shown: true }))
  );
  const nav = await page.evaluate((nav) => window.__played.filter((s) => s.includes(nav)).length, NAV);
  assert.equal(nav, 1);
});

test("повторный щелчок: окна не дублируются, свёрнутые разворачиваются и встают наверх", async () => {
  await page.evaluate(() => {
    toggleWindow("My Projects"); // свернуть
    bringWindowToFront("About Me"); // About Me поверх Resume и GitHub
  });
  await page.click(ICON);
  assert.deepEqual(
    await state(),
    APPS.map((app) => ({ app, open: true, count: 1, shown: true }))
  );
  // Все четыре окна выше любых других открытых окон.
  const onTop = await page.evaluate((apps) => {
    const z = (w) => parseInt(w.style.zIndex, 10) || 0;
    const mine = apps.map((a) => z(document.getElementById(`window-${a}`)));
    const others = [...document.querySelectorAll(".window")]
      .filter((w) => !apps.includes(w.id.slice("window-".length)))
      .map(z);
    return Math.min(...mine) > Math.max(0, ...others);
  }, APPS);
  assert.equal(onTop, true);
});

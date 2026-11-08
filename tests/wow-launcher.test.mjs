import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Запуск World of Warcraft: настоящий полноэкранный режим, чёрный экран, iframe поверх всего XP.

let h, page, errors;
before(async () => {
  h = await startHarness();
  page = h.page;
  errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
});
after(async () => h && (await h.close()));

// Fullscreen API в headless заменяем заглушкой: считаем вызовы, состояние — в window.__fsEl.
async function stubFullscreen(mode = "ok") {
  await page.evaluate((mode) => {
    window.__fs = 0;
    window.__exitFs = 0;
    window.__fsEl = null;
    const root = document.documentElement;
    if (mode === "missing") root.requestFullscreen = undefined;
    else
      root.requestFullscreen = async () => {
        window.__fs++;
        if (mode === "reject") throw new TypeError("Permissions check failed");
      };
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => window.__fsEl });
    document.exitFullscreen = async () => {
      window.__exitFs++;
    };
  }, mode);
}

const overlayCount = () => page.evaluate(() => document.querySelectorAll("#wow-overlay").length);
const waitOpen = () => page.waitForSelector("#wow-overlay iframe#wow-frame", { timeout: 3000 });
const waitGone = () => page.waitForFunction(() => !document.getElementById("wow-overlay"), { timeout: 2000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

beforeEach(async () => {
  await page.evaluate(() => typeof closeWoW === "function" && closeWoW());
  await page.waitForFunction(() => !document.getElementById("wow-overlay") && !document.body.classList.contains("wow-launching"), { timeout: 3000 });
  errors.length = 0;
  await stubFullscreen();
});

test("launch requests fullscreen synchronously", async () => {
  const s = await page.evaluate(() => {
    launchWoW();
    return { fs: window.__fs, launching: document.body.classList.contains("wow-launching") };
  });
  assert.deepEqual(s, { fs: 1, launching: true });
});

test("overlay appears after delay and covers everything", async () => {
  await page.evaluate(() => launchWoW());
  await waitOpen();
  const s = await page.evaluate(() => {
    const o = document.getElementById("wow-overlay");
    const r = o.getBoundingClientRect();
    const bottom = document.elementFromPoint(10, innerHeight - 5); // там панель задач
    return {
      src: document.getElementById("wow-frame").getAttribute("src"),
      z: Number(getComputedStyle(o).zIndex),
      rect: [r.left, r.top, r.width, r.height],
      vp: [innerWidth, innerHeight],
      onTop: o.contains(bottom),
      launching: document.body.classList.contains("wow-launching"),
    };
  });
  assert.equal(s.src, "/WoW/index.html");
  assert.ok(s.z > 9999, `z-index ${s.z}`);
  assert.deepEqual(s.rect, [0, 0, ...s.vp]);
  assert.ok(s.onTop, "overlay must be above the taskbar");
  await page.waitForFunction(() => !document.body.classList.contains("wow-launching"), { timeout: 3000 });
});

test("second launch is ignored", async () => {
  await page.evaluate(() => launchWoW());
  await sleep(200);
  await page.evaluate(() => launchWoW());
  await waitOpen();
  await page.evaluate(() => launchWoW());
  await sleep(200);
  assert.equal(await overlayCount(), 1);
  assert.equal(await page.evaluate(() => window.__fs), 1);
});

test("close removes overlay and leaves fullscreen", async () => {
  await page.evaluate(() => {
    launchWoW();
    window.__fsEl = document.documentElement;
  });
  await waitOpen();
  await page.evaluate(() => closeWoW());
  await waitGone();
  assert.equal(await page.evaluate(() => document.getElementById("wow-frame")), null);
  assert.equal(await page.evaluate(() => window.__exitFs), 1);
});

test("leaving fullscreen (Esc) closes the game", async () => {
  await page.evaluate(() => {
    launchWoW();
    window.__fsEl = document.documentElement;
  });
  await waitOpen();
  await page.evaluate(() => {
    window.__fsEl = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  await waitGone();
});

test("exit during launch delay cancels", async () => {
  await page.evaluate(() => {
    launchWoW();
    window.__fsEl = document.documentElement;
  });
  await sleep(100);
  await page.evaluate(() => {
    window.__fsEl = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  await sleep(1500);
  assert.equal(await overlayCount(), 0);
  assert.equal(await page.evaluate(() => document.body.classList.contains("wow-launching")), false);
});

for (const mode of ["reject", "missing"]) {
  test(`works without fullscreen (${mode})`, async () => {
    await stubFullscreen(mode);
    await page.evaluate(() => launchWoW());
    await waitOpen();
    await sleep(200);
    assert.deepEqual(errors, []);
  });
}

test("no taskbar button", async () => {
  await page.evaluate(() => launchWoW());
  await waitOpen();
  const txt = await page.evaluate(() =>
    [...document.querySelectorAll('[class*="taskbar" i], [id*="taskbar" i]')].map((e) => e.textContent).join(" ")
  );
  assert.ok(!txt.includes("World of Warcraft"));
});

test("desktop icon launches", async () => {
  const label = await page.$eval('.icon[data-app="World of Warcraft"] span', (s) => s.textContent.trim());
  assert.equal(label, "World of Warcraft");
  const icon = await page.$('.icon[data-app="World of Warcraft"]');
  await icon.click({ count: 2 });
  await waitOpen();
});

test("games menu item launches", async () => {
  await page.waitForFunction(() => !recentlyClosedStartMenu);
  await page.click("#start-button");
  await page.waitForSelector("#StartMenu .AllProgMenu", { timeout: 5000 });
  await page.hover("#StartMenu .AllProgMenu");
  // Подменю перерисовываются при наведении: ищем пункт заново и наводим мышь по координатам.
  const hoverItem = async (sel, text) => {
    const box = await page.waitForFunction(
      (sel, text) => {
        const el = [...document.querySelectorAll(sel)].find((i) => i.querySelector(".hover-infotxt")?.textContent.trim() === text);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      },
      { timeout: 5000 }, sel, text
    );
    const { x, y } = await box.jsonValue();
    await page.mouse.move(x, y);
  };
  await hoverItem(".hover-infoitm", "Игры");
  await page.waitForFunction(() => /Сапёр/.test(document.querySelector(".sub-tooltip")?.textContent || ""), { timeout: 5000 }); // меню «Игры» открылось
  const item = await page.waitForFunction(
    () => [...document.querySelectorAll(".sub-tooltip .hover-infoitm")].find((i) => i.querySelector(".hover-infotxt")?.textContent.trim() === "World of Warcraft"),
    { timeout: 5000 }
  );
  const img = await item.asElement().$eval("img", (i) => i.getAttribute("src"));
  assert.equal(img, "/Assets/Images/Icons/wow-icon.svg");
  await item.asElement().evaluate((el) => el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
  await waitOpen();
});

test("icon file exists", async () => {
  const r = await fetch(`${h.base}/Assets/Images/Icons/wow-icon.svg`, { method: "HEAD" });
  assert.equal(r.status, 200);
});

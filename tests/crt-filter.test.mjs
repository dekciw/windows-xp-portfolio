import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./helpers/harness.mjs";

// CRT-эффект (шейдер по мотивам github.com/Ichiaka/CRTFilter, MIT):
// по умолчанию выключен; на рабочем столе включается/выключается щитом в трее
// (зелёный - включён, красный - выключен), выбор действует и на экранах входа.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICONS = "/Assets/Windows XP High Resolution Icon Pack avec MAOSX/Windows XP High Resolution Icon Pack/Windows XP Icons/";
const ON_ICON = ICONS + "Security - Ok.png";
const OFF_ICON = ICONS + "Security Error.png";
const LOGIN_PAGES = [
  "index.html",
  "Loader_Login/Loader_Login.html",
  "Start_Menu/Log_Off/Transition/Login.html",
  "Start_Menu/Log_Off/Transition/Switch_User.html",
];

test("скрипт эффекта подключён на всех экранах входа и на рабочем столе", () => {
  for (const p of [...LOGIN_PAGES, "Bureau/Bureau.html"]) {
    const html = readFileSync(path.join(ROOT, p), "utf8");
    assert.match(html, /<script src="\/Bureau\/DesktopFeatures\/crt-filter\.js[^"]*"><\/script>/, p);
  }
});

test("в трее вместо «Безопасного извлечения устройства» - щит", () => {
  const html = readFileSync(path.join(ROOT, "Bureau/Bureau.html"), "utf8");
  assert.ok(!html.includes("Safely Remove Hardware.png"));
  assert.match(html, /id="crt-toggle"/);
});

let h;
before(async () => {
  h = await startHarness();
});
after(async () => h && (await h.close()));

const overlay = (pg) =>
  pg.evaluate(() => {
    const o = document.getElementById("crt-overlay");
    if (!o) return null;
    const cs = getComputedStyle(o);
    return { pointer: cs.pointerEvents, position: cs.position, z: Number(cs.zIndex), display: cs.display };
  });

test("по умолчанию эффект выключен: на экране выбора пользователя и на рабочем столе его нет", async () => {
  const p = await h.browser.newPage();
  await p.goto(`${h.base}/Loader_Login/Loader_Login.html`, { waitUntil: "domcontentloaded" });
  // Старое значение (экран входа раньше сам записывал "on") сбрасывается.
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("crtEffect", "on");
  });
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.evaluate(() => document.getElementById("login-screen").classList.remove("hidden"));
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await overlay(p), null);
  assert.equal(await p.evaluate(() => CRTEffect.isEnabled()), false);
  assert.equal(await p.evaluate(() => localStorage.getItem("crtEffect")), null);

  await p.goto(`${h.base}/Bureau/Bureau.html`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#crt-toggle");
  assert.equal(await overlay(p), null);
  assert.equal(await p.$eval("#crt-toggle", (i) => decodeURIComponent(new URL(i.src).pathname)), OFF_ICON);
  await p.close();
});

test("включённый эффект показывается и на экране выбора пользователя (не во время загрузки)", async () => {
  const p = await h.browser.newPage();
  await p.goto(`${h.base}/Loader_Login/Loader_Login.html`, { waitUntil: "domcontentloaded" });
  await p.evaluate(() => localStorage.setItem("crtEffect.v2", "on"));
  await p.reload({ waitUntil: "domcontentloaded" });
  // Пока идёт загрузка (экран входа скрыт) - эффекта нет.
  assert.equal(await overlay(p), null);
  await p.evaluate(() => document.getElementById("login-screen").classList.remove("hidden"));
  await p.waitForFunction(() => document.getElementById("crt-overlay"));
  const o = await overlay(p);
  assert.equal(o.pointer, "none", "эффект не мешает кликам");
  assert.equal(o.position, "fixed");
  assert.ok(o.z >= 2147480000, "эффект поверх всех окон");
  await p.evaluate(() => localStorage.removeItem("crtEffect.v2"));
  await p.close();
});

test("щит в трее выключает и включает эффект, выбор переживает перезагрузку", async () => {
  const p = h.page;
  await p.evaluate(() => localStorage.setItem("crtEffect.v2", "on"));
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => document.getElementById("crt-overlay"));
  const icon = () =>
    p.$eval("#crt-toggle", (i) => ({ src: decodeURIComponent(new URL(i.src).pathname), title: i.title }));

  assert.equal((await icon()).src, ON_ICON);
  assert.match((await icon()).title, /включ/i);

  await showTrayIcons(p);
  await p.click("#crt-toggle");
  assert.equal(await overlay(p), null);
  assert.equal((await icon()).src, OFF_ICON);
  assert.equal(await p.evaluate(() => localStorage.getItem("crtEffect.v2")), "off");

  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForSelector("#crt-toggle");
  assert.equal(await overlay(p), null, "выключенный эффект остаётся выключенным");
  assert.equal((await icon()).src, OFF_ICON);

  await showTrayIcons(p);
  await p.click("#crt-toggle");
  assert.ok(await overlay(p));
  assert.equal((await icon()).src, ON_ICON);
  assert.equal(await p.evaluate(() => localStorage.getItem("crtEffect.v2")), "on");
});

// Щит CRT - среди скрытых значков трея (tray.js): раскрываем их стрелкой, как пользователь.
async function showTrayIcons(page) {
  await page.waitForFunction(() => window.XPTray);
  if ((await page.$eval("#tray-chevron", (c) => c.getAttribute("aria-expanded"))) !== "true") {
    await page.click("#tray-chevron");
  }
  await page.waitForFunction(() => {
    const box = document.getElementById("tray-hidden");
    const icon = document.getElementById("crt-toggle").getBoundingClientRect();
    return box.getAnimations().length === 0 && icon.width > 0 && icon.right <= box.getBoundingClientRect().right + 0.5;
  });
}
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./helpers/harness.mjs";

// Общая громкость проекта: щелчок по динамику в трее открывает ползунок Volume
// с флажком Mute (как в Windows XP). Громкость и Mute действуют на все звуки
// сайта, выбор хранится в sessionStorage (в пределах визита), при Mute значок
// в трее перечёркнут. Каждая загрузка сайта (экран загрузки) - громкость 100%.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICONS = "/Assets/Windows XP High Resolution Icon Pack avec MAOSX/Windows XP High Resolution Icon Pack/Windows XP Icons/";
const PAGES_WITH_SOUND = [
  "Bureau/Bureau.html",
  "index.html",
  "Loader_Login/Loader_Login.html",
  "Loader_Login/Startup_Transition.html",
  "Open_Windows/Space Cadet Pinball/Space Cadet Pinball.html",
  "Start_Menu/Log_Off/Transition/Login.html",
  "Start_Menu/Log_Off/Transition/Log_Off_Transition.html",
  "Start_Menu/Log_Off/Transition/Switch_User.html",
  "Start_Menu/Turn_Off_Computer/Shut_Down/Shut_Down.html",
  "SpaceCadetPinball-master/bin/SpaceCadetPinball.html",
  "WoW/index.html",
];

test("громкость подключена на всех страницах со звуком раньше остальных скриптов", () => {
  for (const p of PAGES_WITH_SOUND) {
    const html = readFileSync(path.join(ROOT, p), "utf8");
    const at = html.search(/<script src="\/Bureau\/DesktopFeatures\/volume\.js[^"]*"><\/script>/);
    assert.ok(at > 0, p);
    const firstScript = html.search(/<script[\s>]/);
    assert.equal(at, firstScript, `${p}: volume.js должен быть первым скриптом`);
  }
});

let h;
let p;
before(async () => {
  h = await startHarness();
  p = h.page;
  await p.evaluate(() => {
    sessionStorage.removeItem("xpVolume");
    sessionStorage.removeItem("xpMuted");
  });
  await p.reload({ waitUntil: "domcontentloaded" });
  await showVolumeIcon(p);
});
after(async () => h && (await h.close()));

// Динамик - среди скрытых значков трея (tray.js): раскрываем их стрелкой, как пользователь.
async function showVolumeIcon(page) {
  await page.waitForSelector("#volume-toggle");
  await page.waitForFunction(() => window.XPTray);
  await page.click("#tray-chevron");
  await page.waitForFunction(() => {
    const box = document.getElementById("tray-hidden");
    const icon = document.getElementById("volume-toggle").getBoundingClientRect();
    return box.getAnimations().length === 0 && icon.right <= box.getBoundingClientRect().right + 0.5 && icon.width > 0;
  });
}

const popupShown = () =>
  p.evaluate(() => {
    const el = document.getElementById("volume-popup");
    return !!el && getComputedStyle(el).display !== "none";
  });
const iconSrc = () => p.$eval("#volume-toggle", (i) => decodeURIComponent(new URL(i.src).pathname));

test("щелчок по динамику открывает ползунок, щелчок мимо - закрывает", async () => {
  assert.equal(await popupShown(), false);
  await p.click("#volume-toggle");
  assert.equal(await popupShown(), true);
  const txt = await p.$eval("#volume-popup", (el) => el.textContent);
  assert.match(txt, /Volume/);
  assert.match(txt, /Mute/);
  // Окно ползунка - над динамиком, внутри экрана.
  const r = await p.$eval("#volume-popup", (el) => el.getBoundingClientRect().toJSON());
  const ic = await p.$eval("#volume-toggle", (el) => el.getBoundingClientRect().toJSON());
  assert.ok(r.bottom <= ic.top, "над панелью задач");
  assert.ok(r.left >= 0 && r.right <= 1366);
  await p.mouse.click(600, 300);
  assert.equal(await popupShown(), false);
});

test("ползунок меняет общую громкость всех звуков", async () => {
  await p.click("#volume-toggle");
  const res = await p.evaluate(() => {
    const a = new Audio();
    a.volume = 0.8; // собственная громкость звука
    const before = XPVolume.nativeVolume(a);
    XPVolume.setVolume(0.5);
    return { own: a.volume, before, after: XPVolume.nativeVolume(a), stored: sessionStorage.getItem("xpVolume") };
  });
  assert.equal(res.own, 0.8, "код страницы видит свою громкость");
  assert.equal(res.before, 0.8);
  assert.equal(res.after, 0.4, "реально звучит 0.8 × 0.5");
  assert.equal(res.stored, "0.5");

  // Бегунок стоит посередине дорожки.
  const pos = await p.evaluate(() => {
    const t = document.querySelector("#volume-popup .xp-vol-track").getBoundingClientRect();
    const th = document.querySelector("#volume-popup .xp-vol-thumb").getBoundingClientRect();
    return (th.top + th.height / 2 - t.top) / t.height;
  });
  assert.ok(Math.abs(pos - 0.5) < 0.08, `бегунок на ${pos}`);

  // Клавиши: стрелка вниз - тише.
  await p.focus("#volume-popup .xp-vol-thumb");
  await p.keyboard.press("ArrowDown");
  const v = await p.evaluate(() => XPVolume.getVolume());
  assert.ok(v < 0.5, `громкость ${v}`);

  // Перетаскивание бегунка в самый верх - громкость 100%.
  const t = await p.$eval("#volume-popup .xp-vol-track", (el) => el.getBoundingClientRect().toJSON());
  const th = await p.$eval("#volume-popup .xp-vol-thumb", (el) => el.getBoundingClientRect().toJSON());
  await p.mouse.move(th.x + th.width / 2, th.y + th.height / 2);
  await p.mouse.down();
  await p.mouse.move(th.x + th.width / 2, t.y - 40, { steps: 5 });
  await p.mouse.up();
  assert.equal(await p.evaluate(() => XPVolume.getVolume()), 1);
  await p.mouse.click(600, 300);
});

test("ползунок до самого низа включает Mute, вверх - выключает", async () => {
  await p.evaluate(() => XPVolume.setVolume(0.6));
  await p.click("#volume-toggle");
  const t = await p.$eval("#volume-popup .xp-vol-track", (el) => el.getBoundingClientRect().toJSON());
  const th = await p.$eval("#volume-popup .xp-vol-thumb", (el) => el.getBoundingClientRect().toJSON());
  await p.mouse.move(th.x + th.width / 2, th.y + th.height / 2);
  await p.mouse.down();
  await p.mouse.move(th.x + th.width / 2, t.bottom + 40, { steps: 5 });
  await p.mouse.up();
  const muted = await p.evaluate(() => ({
    v: XPVolume.getVolume(),
    m: XPVolume.isMuted(),
    box: document.querySelector("#volume-popup .xp-vol-mute").getAttribute("aria-checked"),
  }));
  assert.deepEqual(muted, { v: 0, m: true, box: "true" });
  assert.equal(await iconSrc(), ICONS + "Mute.png");

  // Снять Mute при нулевой громкости - ползунок возвращается на прежний уровень.
  await p.click("#volume-popup .xp-vol-mute");
  assert.equal(await p.evaluate(() => XPVolume.getVolume()), 0.6);
  assert.equal(await iconSrc(), ICONS + "Volume.png");

  // Снова в ноль клавишей End, потом стрелкой вверх - Mute снимается.
  await p.focus("#volume-popup .xp-vol-thumb");
  await p.keyboard.press("End");
  assert.equal(await p.evaluate(() => XPVolume.isMuted()), true);
  await p.keyboard.press("ArrowUp");
  assert.equal(await p.evaluate(() => XPVolume.isMuted()), false);
  assert.equal(await iconSrc(), ICONS + "Volume.png");
  await p.evaluate(() => XPVolume.setVolume(1));
  await p.mouse.click(600, 300);
});

test("между окошком Volume и панелью задач - зазор", async () => {
  await p.click("#volume-toggle");
  const gap = await p.evaluate(() => {
    const pop = document.getElementById("volume-popup").getBoundingClientRect();
    const bar = document.getElementById("volume-toggle").closest("footer").getBoundingClientRect();
    return bar.top - pop.bottom;
  });
  assert.ok(gap >= 5 && gap <= 10, `зазор ${gap}px`);
  await p.mouse.click(600, 300);
});

test("при загрузке сайта звук всегда на максимуме", async () => {
  const q = await h.browser.newPage();
  await q.goto(`${h.base}/Bureau/Bureau.html`, { waitUntil: "domcontentloaded" });
  await q.evaluate(() => {
    XPVolume.setVolume(0.3);
    XPVolume.setMuted(true);
  });
  // Новый заход на сайт - экран загрузки.
  await q.goto(`${h.base}/`, { waitUntil: "domcontentloaded" });
  await q.waitForFunction(() => window.XPVolume);
  const s = await q.evaluate(() => ({ v: XPVolume.getVolume(), m: XPVolume.isMuted() }));
  assert.deepEqual(s, { v: 1, m: false });
  // И на рабочем столе после входа - тоже максимум.
  await q.goto(`${h.base}/Bureau/Bureau.html`, { waitUntil: "domcontentloaded" });
  await q.waitForSelector("#volume-toggle");
  assert.deepEqual(await q.evaluate(() => ({ v: XPVolume.getVolume(), m: XPVolume.isMuted() })), { v: 1, m: false });
  assert.equal(
    await q.$eval("#volume-toggle", (i) => decodeURIComponent(new URL(i.src).pathname)),
    ICONS + "Volume.png"
  );
  await q.close();
});

test("Mute выключает звук везде и меняет значок в трее, выбор переживает перезагрузку", async () => {
  assert.equal(await iconSrc(), ICONS + "Volume.png");
  await p.click("#volume-toggle");
  await p.click("#volume-popup .xp-vol-mute");
  const res = await p.evaluate(() => {
    const a = new Audio();
    a.volume = 1;
    const ctx = new AudioContext();
    const dest = ctx.destination;
    return {
      native: XPVolume.nativeVolume(a),
      gain: dest.gain ? dest.gain.value : null,
      stored: sessionStorage.getItem("xpMuted"),
      checked: document.querySelector("#volume-popup .xp-vol-mute").getAttribute("aria-checked"),
    };
  });
  assert.equal(res.native, 0, "HTML-звуки молчат");
  assert.equal(res.gain, 0, "Web Audio (Winamp, Pinball) молчит");
  assert.equal(res.stored, "1");
  assert.equal(res.checked, "true");
  assert.equal(await iconSrc(), ICONS + "Mute.png");

  await p.reload({ waitUntil: "domcontentloaded" });
  await showVolumeIcon(p);
  assert.equal(await iconSrc(), ICONS + "Mute.png");

  await p.click("#volume-toggle");
  await p.click("#volume-popup .xp-vol-mute");
  assert.equal(await iconSrc(), ICONS + "Volume.png");
  assert.equal(await p.evaluate(() => sessionStorage.getItem("xpMuted")), "0");
  await p.mouse.click(600, 300);
});

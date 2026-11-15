import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Сворачивание/разворачивание как в Windows XP: звук и полёт окна в кнопку панели задач и обратно.

const MIN = "Windows XP Minimize.wav";
const RESTORE = "Windows XP Restore.wav";
const MC = '[id="window-My Computer"]';

let h;
let page;
before(async () => {
  h = await startHarness({ windowAnimation: true });
  page = h.page;
  await page.waitForSelector("#window-GitHub .gh-root", { timeout: 10000 });
  await page.evaluate(() => {
    document.querySelectorAll(".window").forEach((w) => closeWindow(w.id.slice("window-".length)));
    openWindow("My Computer", { silent: true });
  });
  await page.waitForSelector(MC, { visible: true });
});
after(async () => h && (await h.close()));

const played = () => page.evaluate(() => window.__played.map((s) => s.split("/").pop()));
const resetPlayed = () => page.evaluate(() => (window.__played = []));
const display = () => page.$eval(MC, (w) => w.style.display);
// Прямоугольник окна в момент `at` мс анимации и кнопки панели задач. Анимацию ставим на
// этот момент и на паузу - замер не зависит от того, как часто тестовый браузер рисует кадры.
const midFlight = (at) =>
  page.evaluate(
    (MC, at) => {
      const win = document.querySelector(MC);
      const a = win.getAnimations()[0];
      if (a) {
        a.pause();
        a.currentTime = at;
      }
      const w = win.getBoundingClientRect();
      const b = document.getElementById("taskbar-My Computer").getBoundingClientRect();
      if (a) a.play();
      return { running: !!a, w: { x: w.left, y: w.top, width: w.width }, b: { x: b.left, y: b.top, width: b.width } };
    },
    MC,
    at
  );

test("кнопка «Свернуть»: звук Minimize, окно летит в кнопку панели задач и скрывается", async () => {
  await resetPlayed();
  const before = await page.$eval(MC, (w) => w.getBoundingClientRect().width);
  await page.click(`${MC} .header-button--minimize, ${MC} [onclick^="toggleWindow"]`);
  assert.deepEqual(await played(), [MIN]);
  const mid = await midFlight(150);
  assert.ok(mid.running, "анимация идёт");
  assert.ok(mid.w.width < before * 0.9 && mid.w.width > mid.b.width, `окно сжимается: ${JSON.stringify(mid)}`);
  assert.ok(mid.w.y > 115, "и опускается к панели задач");
  // В конце полёта - почти на кнопке.
  const end = await midFlight(240);
  assert.ok(end.w.width < mid.w.width && end.w.y > mid.w.y, `ближе к кнопке: ${JSON.stringify(end)}`);
  await page.waitForFunction((MC) => document.querySelector(MC).style.display === "none", { timeout: 2000 }, MC);
  const t = await page.$eval(MC, (w) => ({ anims: w.getAnimations().length, pe: w.style.pointerEvents }));
  assert.deepEqual(t, { anims: 0, pe: "" }, "после анимации ничего не висит");
});

test("кнопка на панели задач: звук Restore, окно вылетает из кнопки на своё место", async () => {
  await resetPlayed();
  await page.click('[id="taskbar-My Computer"]');
  assert.deepEqual(await played(), [RESTORE]);
  assert.equal(await display(), "", "окно снова видно сразу");
  const mid = await midFlight(60);
  assert.ok(mid.running, "анимация идёт");
  const full = await page.evaluate(
    (MC) => new Promise((r) => setTimeout(() => r(document.querySelector(MC).getBoundingClientRect().width), 400)),
    MC
  );
  assert.ok(mid.w.width < full * 0.95, `в начале окно ещё меньше: ${mid.w.width} < ${full}`);
  const st = await page.$eval(MC, (w) => ({ anims: w.getAnimations().length, inactive: w.classList.contains("window-inactive") }));
  assert.deepEqual(st, { anims: 0, inactive: false });
});

test("двойной быстрый клик по кнопке панели задач не ломает окно", async () => {
  await page.evaluate(() => {
    toggleWindow("My Computer"); // свернуть (анимация пошла)
    toggleWindow("My Computer"); // сразу развернуть
  });
  await new Promise((r) => setTimeout(r, 400));
  const st = await page.$eval(MC, (w) => ({ display: w.style.display, anims: w.getAnimations().length, minimizing: !!w.dataset.minimizing }));
  assert.deepEqual(st, { display: "", anims: 0, minimizing: false });
});

test("«Свернуть все окна»: все окна улетают, звук Minimize один раз", async () => {
  await page.evaluate(() => openWindow("About Me", { silent: true }));
  await page.waitForSelector('[id="window-About Me"]', { visible: true });
  await resetPlayed();
  await page.evaluate(() => window.DesktopContextMenu.actions.showDesktop());
  assert.deepEqual(await played(), [MIN]);
  await page.waitForFunction(
    () => [...document.querySelectorAll(".window")].every((w) => w.style.display === "none"),
    { timeout: 2000 }
  );
});

test("разворачивание через bringWindowToFront (ссылки, уведомления) - звук Restore", async () => {
  await resetPlayed();
  await page.evaluate(() => bringWindowToFront("About Me"));
  assert.deepEqual(await played(), [RESTORE]);
  assert.equal(await page.$eval('[id="window-About Me"]', (w) => w.style.display), "");
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Системное меню окна, как в Windows XP: правый щелчок по заголовку окна (или по его кнопке
// на панели задач) - «Восстановить», «Свернуть», «Развернуть», «Закрыть».

const MP = '[id="window-My Projects"]';
let h;
let page;

before(async () => {
  h = await startHarness();
  page = h.page;
  await page.waitForSelector("#window-GitHub .gh-root", { timeout: 10000 });
  await page.evaluate(() => document.querySelectorAll(".window").forEach((w) => closeWindow(w.id.slice("window-".length))));
});
after(async () => h && (await h.close()));

async function openApp(app) {
  await page.evaluate((a) => openWindow(a, { silent: true }), app);
  await page.waitForSelector(`[id="window-${app}"]`, { visible: true });
}
// Пункты открытого меню: [подпись, активен?]
const menuItems = () =>
  page.$$eval(".dcm--root > .dcm-item", (l) => l.map((r) => [r.textContent.trim(), !r.classList.contains("dcm-item--disabled")]));
// Правый щелчок по заголовку окна. Заголовок может быть закрыт другим окном - тогда событие
// посылаем прямо ему (как если бы щёлкнули по видимой части).
async function headerMenu(app) {
  const r = await page.$eval(`[id="window-${app}"] .window-header-title`, (t) => {
    const b = t.getBoundingClientRect();
    const x = b.left + 20;
    const y = b.top + b.height / 2;
    return { x, y, visible: t.contains(document.elementFromPoint(x, y)) };
  });
  if (r.visible) {
    await page.mouse.click(r.x, r.y, { button: "right" });
  } else {
    await page.$eval(`[id="window-${app}"] .window-header-title`, (t, r) => {
      t.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.x, clientY: r.y, button: 2 }));
    }, r);
  }
  await page.waitForSelector(".dcm--root", { visible: true });
}
async function pick(label) {
  const rows = await page.$$(".dcm--root > .dcm-item");
  for (const row of rows) if ((await row.evaluate((r) => r.textContent.trim())) === label) return row.click();
  throw new Error("нет пункта " + label);
}
const win = (app) =>
  page.$eval(`[id="window-${app}"]`, (w) => ({ shown: w.style.display !== "none", maximized: w.dataset.maximized === "true" }));

test("правый щелчок по заголовку «Моих проектов»: меню окна в стиле XP", async () => {
  await openApp("My Projects");
  await headerMenu("My Projects");
  assert.deepEqual(await menuItems(), [
    ["Восстановить", false],
    ["Свернуть", true],
    ["Развернуть", true],
    ["Закрыть", true],
  ]);
  assert.equal(await page.$eval(".dcm--root", (m) => m.dataset.kind), "window");
  // Разделитель перед «Закрыть», как в XP.
  assert.equal(await page.$eval(".dcm--root", (m) => m.lastElementChild.previousElementSibling.classList.contains("dcm-sep")), true);
  await page.keyboard.press("Escape");
});

test("«Развернуть» - окно на весь экран; тогда активно «Восстановить», и оно возвращает размер", async () => {
  const before = await page.$eval(MP, (w) => w.offsetWidth);
  await headerMenu("My Projects");
  await pick("Развернуть");
  assert.deepEqual(await win("My Projects"), { shown: true, maximized: true });
  await headerMenu("My Projects");
  assert.deepEqual(await menuItems(), [
    ["Восстановить", true],
    ["Свернуть", true],
    ["Развернуть", false],
    ["Закрыть", true],
  ]);
  await pick("Восстановить");
  assert.deepEqual(await win("My Projects"), { shown: true, maximized: false });
  assert.equal(await page.$eval(MP, (w) => w.offsetWidth), before);
});

test("«Свернуть» - окно уходит в панель задач; меню кнопки панели задач - «Восстановить»", async () => {
  await headerMenu("My Projects");
  await pick("Свернуть");
  assert.equal((await win("My Projects")).shown, false);
  await page.click('[id="taskbar-My Projects"]', { button: "right" });
  await page.waitForSelector(".dcm--root", { visible: true });
  assert.deepEqual(await menuItems(), [
    ["Восстановить", true],
    ["Свернуть", false],
    ["Развернуть", true],
    ["Закрыть", true],
  ]);
  await pick("Восстановить");
  assert.equal((await win("My Projects")).shown, true);
});

test("«Развернуть» из свёрнутого: окно возвращается и сразу на весь экран", async () => {
  await page.evaluate(() => toggleWindow("My Projects"));
  await page.click('[id="taskbar-My Projects"]', { button: "right" });
  await page.waitForSelector(".dcm--root", { visible: true });
  await pick("Развернуть");
  assert.deepEqual(await win("My Projects"), { shown: true, maximized: true });
  await page.evaluate(() => maximazeWindow("My Projects")); // вернуть размер
});

test("«Свернуть» окна, которое не сверху, - тоже сворачивает (а не поднимает наверх)", async () => {
  await openApp("My Computer"); // теперь сверху «Мой компьютер»
  await headerMenu("My Projects");
  await pick("Свернуть");
  assert.equal((await win("My Projects")).shown, false);
  await page.evaluate(() => bringWindowToFront("My Projects"));
});

test("«Закрыть» закрывает окно и убирает его с панели задач", async () => {
  await headerMenu("My Computer");
  await pick("Закрыть");
  assert.equal(await page.$('[id="window-My Computer"]'), null);
  assert.equal(await page.$('[id="taskbar-My Computer"]'), null);
});

test("меню работает в любом окне; у окон без разворота (Калькулятор) «Развернуть» неактивно", async () => {
  await page.evaluate(() => openCalculator());
  await page.waitForSelector('[id="window-Calculator"]', { visible: true });
  await headerMenu("Calculator");
  assert.deepEqual(await menuItems(), [
    ["Восстановить", false],
    ["Свернуть", true],
    ["Развернуть", false],
    ["Закрыть", true],
  ]);
  await pick("Закрыть");
  assert.equal(await page.$('[id="window-Calculator"]'), null);
});

test("правый щелчок по содержимому окна меню окна не показывает", async () => {
  await page.click(`${MP} .mp-page`, { button: "right" });
  assert.equal(await page.$(".dcm--root"), null);
});

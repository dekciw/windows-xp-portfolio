import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Рамка выделения по пустому месту рабочего стола не должна включать встроенное выделение
// текста браузера: иначе подсвечиваются (синим) значки, которые в разметке лежат между
// началом и концом протяжки, хотя на экране далеко от рамки.

let h;
let page;
before(async () => {
  h = await startHarness();
  page = h.page;
  await page.setViewport({ width: 1280, height: 667 }); // как у экрана 1920 при масштабе 150%
  await page.waitForSelector("#window-GitHub .gh-root", { timeout: 10000 });
  await page.evaluate(() => document.querySelectorAll(".window").forEach((w) => w.remove()));
});
after(async () => h && (await h.close()));

const state = () =>
  page.evaluate(() => ({
    nativeSelection: getSelection().toString().replace(/\s+/g, " ").trim(),
    selectedIcons: [...document.querySelectorAll("#desktop .icon.selected")].map((i) => i.textContent.trim()),
  }));

test("рамка по пустому месту: ни встроенного выделения текста, ни выделенных значков", async () => {
  await page.mouse.move(545, 100);
  await page.mouse.down();
  await page.mouse.move(800, 300, { steps: 5 });
  await page.mouse.move(1079, 453, { steps: 5 });
  const during = await state();
  await page.mouse.up();
  assert.deepEqual(during, { nativeSelection: "", selectedIcons: [] });
  assert.deepEqual(await state(), { nativeSelection: "", selectedIcons: [] });
});

test("рамка через значки выделяет их своим выделением, без синего выделения браузера", async () => {
  await page.mouse.move(300, 5);
  await page.mouse.down();
  await page.mouse.move(200, 150, { steps: 4 });
  await page.mouse.move(150, 330, { steps: 4 });
  await page.mouse.up();
  const s = await state();
  assert.equal(s.nativeSelection, "");
  assert.ok(s.selectedIcons.length >= 2, JSON.stringify(s.selectedIcons));
});

// Правый щелчок по значку выделяет его; после «Закрепить» и щелчка по пустому месту
// выделение должно сниматься, как у любого значка.
async function iconMenu(name, item) {
  const box = await page.evaluate((name) => {
    const icon = [...document.querySelectorAll("#desktop .icon")].find((i) => i.textContent.trim() === name);
    const r = icon.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + 30 };
  }, name);
  await page.mouse.click(box.x, box.y, { button: "right" });
  await page.waitForSelector(".dcm-item", { visible: true });
  const items = await page.$$(".dcm-item");
  for (const it of items) {
    if ((await it.evaluate((e) => e.textContent.trim())) === item) return it.click();
  }
  throw new Error(`нет пункта «${item}»: ${await page.$$eval(".dcm-item", (l) => l.map((e) => e.textContent.trim()).join(", "))}`);
}

test("«Закрепить» в меню значка: после щелчка по пустому месту значок не остаётся выделенным", async () => {
  await page.mouse.click(700, 500); // снять всё
  await iconMenu("Мои проекты", "Закрепить");
  await page.mouse.click(700, 500);
  assert.deepEqual((await state()).selectedIcons, []);
});

test("значок, выделенный правым щелчком, снимается и рамкой по пустому месту", async () => {
  await iconMenu("Блокнот", "Закрепить"); // второй щелчок по пункту - открепить
  await page.mouse.move(545, 100);
  await page.mouse.down();
  await page.mouse.move(800, 300, { steps: 4 });
  await page.mouse.up();
  assert.deepEqual((await state()).selectedIcons, []);
});

test("подпись значка нельзя выделить как текст (двойной клик по подписи)", async () => {
  const us = await page.$eval("#desktop .icon span", (s) => getComputedStyle(s).userSelect);
  assert.equal(us, "none");
});

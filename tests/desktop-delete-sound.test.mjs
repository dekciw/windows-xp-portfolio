import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Удаление на рабочем столе («Удалить» в меню ярлыка) - звук «Windows XP Recycle».

const RECYCLE = "Windows XP Recycle.wav";
let h;
let page;

before(async () => {
  h = await startHarness();
  page = h.page;
  await page.waitForSelector("#window-GitHub .gh-root", { timeout: 10000 });
  await page.evaluate(() => document.querySelectorAll(".window").forEach((w) => w.remove()));
});
after(async () => h && (await h.close()));

const iconPoint = (name) =>
  page.evaluate((name) => {
    const icon = [...document.querySelectorAll("#desktop .icon")].find((i) => i.textContent.trim() === name);
    if (!icon) return null;
    const r = icon.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + 30 };
  }, name);

async function menuAt(p, item) {
  await page.mouse.click(p.x, p.y, { button: "right" });
  await page.waitForSelector(".dcm--root", { visible: true });
  for (const row of await page.$$(".dcm--root > .dcm-item")) {
    if ((await row.evaluate((r) => r.textContent.trim())) === item) return row.click();
  }
  throw new Error("нет пункта " + item);
}

const sounds = () => page.evaluate(() => window.__played.map((s) => s.split("/").pop()));

test("«Удалить» ярлык на рабочем столе - звук Windows XP Recycle", async () => {
  await menuAt(await iconPoint("Мой компьютер"), "Копировать");
  await menuAt({ x: 700, y: 400 }, "Вставить");
  const copy = await iconPoint("Мой компьютер (2)");
  assert.ok(copy, "ярлык вставлен");

  await page.evaluate(() => (window.__played = []));
  await menuAt(copy, "Удалить");
  assert.equal(await iconPoint("Мой компьютер (2)"), null, "ярлык удалён");
  assert.deepEqual(await sounds(), [RECYCLE]);
});

test("без удаления (например, «Копировать») звука корзины нет", async () => {
  await page.evaluate(() => (window.__played = []));
  await menuAt(await iconPoint("Мой компьютер"), "Копировать");
  assert.deepEqual(await sounds(), []);
});

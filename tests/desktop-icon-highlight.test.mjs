// Подсветка иконок рабочего стола: наведение - лёгкая подложка, 1 клик - плотнее + светлая рамка.
import { test } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

test("иконка: подсветка при наведении и выделение по клику", async () => {
  const h = await startHarness();
  try {
    const { page } = h;
    const sel = '#desktop .icon[data-app="About Me"]';
    await page.waitForSelector(sel);
    const style = () => page.$eval(sel, (e) => {
      const cs = getComputedStyle(e);
      return { bg: cs.backgroundColor, border: cs.borderTopColor, w: e.offsetWidth, h: e.offsetHeight };
    });
    const before = await style();
    assert.equal(before.bg, "rgba(0, 0, 0, 0)");
    assert.equal(before.w, 80);
    assert.equal(before.h, 80);

    const r = await page.$eval(sel, (e) => { const b = e.getBoundingClientRect(); return { x: b.left + 40, y: b.top + 30 }; });
    await page.mouse.move(r.x, r.y);
    const hover = await style();
    assert.equal(hover.bg, "rgba(44, 100, 200, 0.2)");
    assert.equal(hover.border, "rgba(0, 0, 0, 0)");

    await page.mouse.click(r.x, r.y);
    await page.waitForFunction((s) => document.querySelector(s).classList.contains("selected"), {}, sel);
    const selected = await style();
    assert.equal(selected.bg, "rgba(48, 104, 201, 0.38)");
    assert.equal(selected.border, "rgba(255, 255, 255, 0.14)");
    // Подпись остаётся белой, без синей плашки XP.
    const text = await page.$eval(sel + " .selection-text", (e) => getComputedStyle(e).backgroundColor);
    assert.equal(text, "rgba(0, 0, 0, 0)");
    // Размер рамки не меняется при выделении.
    assert.equal(selected.w, before.w);
    assert.equal(selected.h, before.h);
  } finally {
    await h.close();
  }
});

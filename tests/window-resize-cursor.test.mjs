// Курсор растягивания окна: на рамке - XP-курсор нужного направления, внутри - обычная стрелка.
import { test } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

test("рамка окна показывает XP-курсоры растягивания", async () => {
  const h = await startHarness();
  try {
    const { page } = h;
    const W = '[id="window-My Computer"]';
    await page.evaluate(() => openWindow("My Computer", { silent: true }));
    await page.waitForSelector(W);
    await new Promise((r) => setTimeout(r, 300)); // дать окну догрузить содержимое
    await page.evaluate((sel) => {
      const w = document.querySelector(sel);
      // Поверх автооткрытых окон (GitHub), чтобы края не перекрывались.
      Object.assign(w.style, { left: "200px", top: "150px", width: "600px", height: "400px", zIndex: "99999" });
    }, W);
    const r = await page.$eval(W, (w) => {
      const b = w.getBoundingClientRect();
      return { l: b.left, t: b.top, r: b.right, b: b.bottom };
    });
    const cursorAt = async (x, y) => {
      await page.mouse.move(x, y);
      return page.evaluate(
        (x, y) => getComputedStyle(document.elementFromPoint(x, y)).cursor,
        x, y
      );
    };
    const midX = (r.l + r.r) / 2;
    const midY = (r.t + r.b) / 2;
    // Верхние углы скруглены (8px) - берём точку чуть внутри, но в зоне захвата (4px).
    const cases = [
      [r.l + 1, midY, "resize-ew"],
      [r.r - 1, midY, "resize-ew"],
      [midX, r.t + 1, "resize-ns"],
      [midX, r.b - 1, "resize-ns"],
      [r.l + 3, r.t + 3, "resize-nwse"],
      [r.r - 1, r.b - 1, "resize-nwse"],
      [r.r - 3, r.t + 3, "resize-nesw"],
      [r.l + 1, r.b - 1, "resize-nesw"],
    ];
    for (const [x, y, want] of cases) {
      const c = await cursorAt(x, y);
      assert.ok(c.includes(`windows-xp-${want}.cur`), `(${x},${y}) ждали ${want}, получили ${c}`);
    }
    // Шапка окна (не край) - обычная стрелка.
    const header = await cursorAt(midX, r.t + 15);
    assert.ok(!header.includes("resize"), `в шапке не должно быть resize: ${header}`);

    // Во время растягивания курсор держится, даже когда мышь ушла за рамку.
    await page.mouse.move(r.r - 1, midY);
    await page.mouse.down();
    await page.mouse.move(r.r + 120, midY + 40);
    const dragging = await page.evaluate(
      (x, y) => getComputedStyle(document.elementFromPoint(x, y)).cursor,
      r.r + 120, midY + 40
    );
    assert.ok(dragging.includes("windows-xp-resize-ew.cur"), `при растягивании: ${dragging}`);
    await page.mouse.up();
    const width = await page.$eval(W, (w) => w.getBoundingClientRect().width);
    assert.ok(Math.abs(width - (r.r - r.l + 120)) <= 2, `ширина стала ${width}`);
    const after = await page.evaluate(() => document.documentElement.dataset.xpResize);
    assert.equal(after, undefined);
  } finally {
    await h.close();
  }
});

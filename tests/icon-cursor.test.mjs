import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Курсор-«палец» (windows-xp-link.cur) по всей иконке рабочего стола: над картинкой,
// над подписью и по краю - а не только на полоске рамки вокруг.

let h;
let page;
before(async () => {
  h = await startHarness();
  page = h.page;
  await page.waitForSelector("#window-GitHub .gh-root", { timeout: 10000 });
  // Окна не должны закрывать иконки; их стили (с «* { стрелка }») остаются подключёнными.
  await page.evaluate(() => document.querySelectorAll(".window").forEach((w) => w.remove()));
});
after(async () => h && (await h.close()));

test("над картинкой, подписью и краем каждой иконки - курсор-палец", async () => {
  const bad = await page.evaluate(() => {
    const out = [];
    for (const icon of document.querySelectorAll("#desktop .icon")) {
      const r = icon.getBoundingClientRect();
      if (!r.width) continue;
      for (const [spot, fx, fy] of [
        ["картинка", 0.5, 0.3],
        ["подпись", 0.5, 0.8],
        ["край", 0.04, 0.3],
      ]) {
        const el = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
        if (!el || !icon.contains(el)) continue; // точку закрыло что-то другое
        const cursor = getComputedStyle(el).cursor;
        if (!cursor.includes("windows-xp-link.cur")) {
          out.push(`${icon.textContent.trim()} / ${spot}: <${el.tagName.toLowerCase()}> ${cursor}`);
        }
      }
    }
    return out;
  });
  assert.deepEqual(bad, []);
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness, openAboutMe, ABOUT } from "./helpers/harness.mjs";

// Синяя полоса заголовка окна (макет Figma 763:7246): Trebuchet MS Bold 13px,
// значок 16px в 6px от левого края окна (рамка 3px + отступ 3px), до текста 9px (4 + 5).

let h;
before(async () => {
  h = await startHarness();
});
after(async () => h && (await h.close()));

const measure = (winSel) => (sel) => {
  const win = document.querySelector(sel);
  const img = win.querySelector(".window-header img");
  const title = win.querySelector(".window-header-title");
  const w = win.getBoundingClientRect();
  const i = img.getBoundingClientRect();
  const t = title.getBoundingClientRect();
  const cs = getComputedStyle(title);
  return {
    font: [cs.fontFamily.split(",")[0].replace(/"/g, "").trim(), cs.fontWeight, cs.fontSize, cs.letterSpacing],
    icon: [Math.round(i.width), Math.round(i.height)],
    iconLeft: Math.round(i.left - w.left),
    gap: Math.round(t.left - i.right),
  };
};

const EXPECTED = {
  font: ["Trebuchet MS", "700", "13px", "normal"],
  icon: [16, 16],
  iconLeft: 6,
  gap: 9,
};

test("заголовок обычного окна: Trebuchet MS Bold 13px, значок 16px в 6px от края, до текста 9px", async () => {
  await h.page.waitForSelector('[id="window-GitHub"]', { timeout: 10000 });
  await openAboutMe(h.page);
  assert.deepEqual(await h.page.evaluate(measure(), ABOUT), EXPECTED);
});

test("заголовок отдельного окна «Блокнота» — так же", async () => {
  const p = await h.browser.newPage();
  await p.goto(`${h.base}/Bureau/Notepad_Standalone/notepad-popup.html`, { waitUntil: "load" });
  const sel = await p.evaluate(() => {
    const hd = document.querySelector(".window-header");
    const win = hd.parentElement.closest("[class]") || hd.parentElement;
    win.setAttribute("data-test-win", "");
    return "[data-test-win]";
  });
  assert.deepEqual(await p.evaluate(measure(), sel), EXPECTED);
  await p.close();
});

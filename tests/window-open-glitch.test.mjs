import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

let h;
let page;

before(async () => {
  h = await startHarness();
  page = h.page;
  await page.waitForSelector("#window-GitHub .gh-root", { timeout: 10000 });
});
after(async () => h && (await h.close()));

// Каждый кадр смотрим на окно: пока оно видно, в нём уже должно быть содержимое,
// и стоять оно должно на одном месте (без прыжка после загрузки).
async function watchOpening(app, inner) {
  return page.evaluate(
    (app, inner) =>
      new Promise((resolve) => {
        document.querySelectorAll(".window").forEach((w) => w.remove());
        const frames = [];
        const t0 = performance.now();
        openWindow(app, { silent: true });
        (function tick() {
          const w = document.getElementById(`window-${app}`);
          if (w && getComputedStyle(w).visibility === "visible" && w.style.display !== "none") {
            frames.push({ empty: !w.querySelector(inner), left: w.style.left, top: w.style.top, w: w.offsetWidth, h: w.offsetHeight });
          }
          if (performance.now() - t0 < 1500) requestAnimationFrame(tick);
          else resolve(frames);
        })();
      }),
    app,
    inner
  );
}

for (const [app, inner] of [
  ["My Projects", ".mp-root"],
  ["My Computer", ".computer_body"],
  ["GitHub", ".gh-root"],
]) {
  test(`«${app}»: при открытии нет пустого окна и прыжка`, async () => {
    const frames = await watchOpening(app, inner);
    assert.ok(frames.length > 0, "окно показалось");
    assert.equal(frames.filter((f) => f.empty).length, 0, "пустое окно было видно");
    const spots = new Set(frames.map((f) => `${f.left},${f.top},${f.w}x${f.h}`));
    assert.equal(spots.size, 1, `окно меняло место/размер: ${[...spots].join(" | ")}`);
  });
}

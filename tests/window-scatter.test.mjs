import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Новые окна открываются не в одной точке: первое - по центру, следующие - в разных местах.

let h;
const closeAll = () =>
  h.page.evaluate(() => document.querySelectorAll('.window[id^="window-"]').forEach((w) => closeWindow(w.id.slice(7))));

before(async () => {
  h = await startHarness();
  await h.page.waitForSelector('[id="window-GitHub"]', { timeout: 10000 }).catch(() => {});
  await closeAll();
});
after(async () => h && (await h.close()));

const APPS = ["About Me", "My Projects", "Resume", "My Computer", "Notepad", "Calculator"];

async function openAll(vw, vh) {
  await h.page.setViewport({ width: vw, height: vh });
  await closeAll();
  for (const app of APPS) {
    await h.page.evaluate((app) => openWindow(app, { silent: true }), app);
    await h.page.waitForFunction((app) => {
      const w = document.getElementById(`window-${app}`);
      return w && w.querySelector(".window-content") && w.querySelector(".window-content").children.length > 0;
    }, {}, app);
    await new Promise((r) => setTimeout(r, 50));
  }
  return h.page.evaluate((apps) => {
    const d = document.getElementById("desktop").getBoundingClientRect();
    return {
      d: { left: d.left, top: d.top, right: d.right, bottom: d.bottom },
      wins: apps.map((app) => {
        const r = document.getElementById(`window-${app}`).getBoundingClientRect();
        return { app, left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) };
      }),
    };
  }, APPS);
}

for (const [vw, vh] of [[1920, 1080], [1366, 768]]) {
  test(`${vw}×${vh}: окна в разных местах, первое по центру, заголовки на экране`, async () => {
    const { d, wins } = await openAll(vw, vh);
    // Первое окно - по центру рабочего стола.
    const first = wins[0];
    const cx = (first.left + first.right) / 2 - (d.left + d.right) / 2;
    const cy = (first.top + first.bottom) / 2 - (d.top + d.bottom) / 2;
    assert.ok(Math.abs(cx) <= 2 && Math.abs(cy) <= 2, `первое окно не по центру: ${JSON.stringify(first)}`);
    // Никакие два окна не открылись в одной точке.
    for (let i = 0; i < wins.length; i++) {
      for (let j = i + 1; j < wins.length; j++) {
        const a = wins[i];
        const b = wins[j];
        const same = Math.abs(a.left - b.left) < 25 && Math.abs(a.top - b.top) < 25;
        assert.ok(!same, `${a.app} и ${b.app} открылись в одной точке: ${JSON.stringify([a, b])}`);
      }
    }
    // Заголовок каждого окна виден и доступен для перетаскивания.
    for (const w of wins) {
      assert.ok(w.top >= d.top && w.top <= d.bottom - 30 && w.left >= d.left && w.left <= d.right - 100, `${w.app} за краем: ${JSON.stringify(w)}`);
    }
  });
}

test("окна, восстановленные после перезагрузки, остаются на своих местах", async () => {
  await h.page.setViewport({ width: 1366, height: 768 });
  await closeAll();
  await h.page.evaluate(() => {
    openWindow("Notepad", { silent: true, restore: true });
    const w = document.getElementById("window-Notepad");
    w.style.left = "333px";
    w.style.top = "222px";
  });
  await h.page.waitForFunction(() => document.querySelector("#window-Notepad .window-content")?.children.length > 0);
  await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(await h.page.$eval("#window-Notepad", (w) => [w.style.left, w.style.top]), ["333px", "222px"]);
  await closeAll();
});

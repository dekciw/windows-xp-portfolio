import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Звук «Windows Navigation Start» при открытии окна: у каждой иконки и пункта меню «Пуск»,
// только при настоящем открытии нового окна, и не при автооткрытии GitHub на старте.

const NAV = "Windows Navigation Start.wav";

let h;
let page;
before(async () => {
  h = await startHarness();
  page = h.page;
  // Дождаться автооткрытия GitHub после загрузки страницы.
  await page.waitForSelector('[id="window-GitHub"]', { timeout: 10000 });
});
after(async () => h && (await h.close()));

const navCount = () => page.evaluate((nav) => window.__played.filter((s) => s.includes(nav)).length, NAV);
const resetPlayed = () => page.evaluate(() => (window.__played = []));

test("при загрузке рабочего стола звучит только мелодия запуска, без звука открытия GitHub", async () => {
  const played = await page.evaluate(() => window.__played);
  assert.ok(played.some((s) => s.includes("windows-xp-startup.mp3")), `нет мелодии запуска: ${JSON.stringify(played)}`);
  assert.equal(await navCount(), 0, `лишний звук открытия при старте: ${JSON.stringify(played)}`);
});

const DESKTOP_ICONS = [
  "My Computer",
  "About Me",
  "Recycle Bin (empty)",
  "Internet Explorer 6",
  "Minesweeper",
  "Space Cadet Pinball",
  "Paint",
  "Notepad",
];

for (const app of DESKTOP_ICONS) {
  test(`двойной клик по иконке «${app}» проигрывает звук открытия`, async () => {
    await page.evaluate((a) => closeWindow(a), app);
    await resetPlayed();
    const icon = await page.evaluateHandle(
      (a) => [...document.querySelectorAll("#desktop .icon")].find((i) => (i.getAttribute("ondblclick") || "").includes(`openWindow('${a}')`)),
      app
    );
    assert.ok(icon.asElement(), `нет иконки для ${app}`);
    await icon.asElement().click({ count: 2 });
    await page.waitForSelector(`[id="window-${app}"]`);
    assert.equal(await navCount(), 1);
    await page.evaluate((a) => closeWindow(a), app);
  });
}

for (const app of ["Calculator", "GitHub"]) {
  test(`открытие «${app}» проигрывает звук открытия`, async () => {
    await page.evaluate((a) => closeWindow(a), app);
    await resetPlayed();
    await page.evaluate((a) => openWindow(a), app);
    assert.equal(await navCount(), 1);
    await page.evaluate((a) => closeWindow(a), app);
  });
}

test("пункт меню «Пуск» (Блокнот) проигрывает звук открытия", async () => {
  await page.evaluate(() => closeWindow("Notepad"));
  await page.click("#start-button");
  const item = await page.waitForFunction(
    () => [...document.querySelectorAll("#StartMenu .ItemMenu")].find((i) => (i.getAttribute("onclick") || "").includes("openWindow('Notepad')")),
    { timeout: 5000 }
  );
  await resetPlayed();
  await item.asElement().click();
  await page.waitForSelector('[id="window-Notepad"]');
  assert.equal(await navCount(), 1);
  await page.evaluate(() => closeWindow("Notepad"));
});

test("повторный запуск уже открытого окна не проигрывает звук", async () => {
  await page.evaluate(() => closeWindow("Paint"));
  await page.evaluate(() => openWindow("Paint"));
  await resetPlayed();
  await page.evaluate(() => openWindow("Paint"));
  assert.equal(await navCount(), 0);
  await page.evaluate(() => closeWindow("Paint"));
});

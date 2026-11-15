import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

let h;
let page;

before(async () => {
  h = await startHarness({ addressLoading: true });
  page = h.page;
  // GitHub открывается сам при старте - дожидаемся, чтобы он не появился посреди теста.
  await page.waitForSelector("#window-GitHub .gh-root", { timeout: 10000 });
});
after(async () => h && (await h.close()));

// [окно, поле адреса, содержимое под адресной строкой]
const CASES = [
  ["My Computer", ".address_bar_content", ".content"],
  ["About Me", ".address_bar_content", ".am-body"],
  ["My Projects", ".address_bar_content", ".mp-page"],
  ["GitHub", ".IE_address_bar_IE_content", ".IE_content"],
  ["Internet Explorer 6", ".IE_address_bar_IE_content", ".IE_content"],
];

const durations = {};

for (const [app, field, body] of CASES) {
  test(`«${app}»: сначала полоска загрузки в адресе, потом появляется содержимое`, async () => {
    const win = `[id="window-${app}"]`;
    await page.evaluate((a) => {
      if (document.getElementById(`window-${a}`)) closeWindow(a);
      openWindow(a, { silent: true });
    }, app);
    await page.waitForSelector(`${win} ${field} .addr-progress`);

    const info = await page.evaluate(
      (win, field, body) => {
        const bar = document.querySelector(`${win} ${field} .addr-progress`);
        const anim = bar.getAnimations()[0];
        const content = document.querySelector(`${win} ${body}`);
        const cs = getComputedStyle(bar);
        return {
          running: anim && anim.playState === "running",
          duration: anim.effect.getTiming().duration,
          origin: cs.transformOrigin.split(" ")[0],
          behindText: cs.zIndex === "-1" && getComputedStyle(bar.parentElement).isolation === "isolate",
          clicks: cs.pointerEvents,
          contentOpacity: [...content.children].every((c) => getComputedStyle(c).opacity === "0") ? "0" : "visible",
          contentClicks: getComputedStyle(content).pointerEvents,
          status: document.querySelector(`${win} .IE_footer_status_text`)?.textContent,
        };
      },
      win,
      field,
      body
    );
    assert.equal(info.running, true, "анимация идёт");
    assert.equal(info.origin, "0px", "растёт от левого края");
    assert.equal(info.behindText, true, "заливка под иконкой и текстом");
    assert.equal(info.clicks, "none", "полоска не мешает кликам");
    assert.equal(info.contentOpacity, "0", "пока грузится - содержимого не видно");
    assert.equal(info.contentClicks, "none", "невидимое содержимое не кликается");
    if (app === "GitHub") assert.equal(info.status, "Opening page https://github.com/dekciw...");
    if (app === "Internet Explorer 6") assert.equal(info.status, "Открытие страницы https://ru.wikipedia.org...");
    if (app === "Internet Explorer 6") assert.ok(info.duration >= 1500, "IE грузится как сайт, подольше");
    durations[app] = info.duration;

    // По окончании полоска убирается, содержимое на месте.
    await page.waitForFunction((s) => !document.querySelector(`${s} .addr-progress`), { timeout: 5000 }, `${win} ${field}`);
    const after = await page.evaluate(
      (win, body) => ({
        opacity: [...document.querySelector(`${win} ${body}`).children].every((c) => getComputedStyle(c).opacity === "1")
          ? "1"
          : "hidden",
        status: document.querySelector(`${win} .IE_footer_status_text`)?.textContent,
      }),
      win,
      body
    );
    assert.equal(after.opacity, "1", "содержимое появилось");
    if (app === "GitHub") assert.equal(after.status, "Done");
    if (app === "Internet Explorer 6") assert.equal(after.status, "Готово");
  });
}

test("«Мой компьютер» и «Обо мне» грузятся быстрее «Моих проектов» и GitHub", () => {
  const fast = Math.max(durations["My Computer"], durations["About Me"]);
  const slow = Math.min(durations["My Projects"], durations["GitHub"]);
  assert.ok(fast <= 300, JSON.stringify(durations));
  assert.ok(fast * 2 < slow, JSON.stringify(durations));
});

// ---------- переходы внутри окна (смена адреса) ----------

const MP = '[id="window-My Projects"]';
const loadDone = (win) =>
  page.waitForFunction((w) => !document.querySelector(`${w} .addr-progress`), { timeout: 5000 }, win);
// Состояние сразу после перехода: идёт ли полоска, пуста ли середина, видны ли шапка и меню.
const navState = () =>
  page.evaluate((MP) => {
    const bar = document.querySelector(`${MP} .address_bar_content .addr-progress`);
    const main = document.querySelector(`${MP} .mp-main`);
    const vis = (el) => getComputedStyle(el).opacity !== "0";
    return {
      loading: !!bar && bar.getAnimations()[0]?.playState === "running",
      duration: bar?.getAnimations()[0]?.effect.getTiming().duration,
      mainHidden: [...main.children].every((c) => !vis(c)),
      headerShown: vis(document.querySelector(`${MP} .mp-header`)) && vis(document.querySelector(`${MP} .mp-sidebar`)),
    };
  }, MP);

async function openMyProjectsLoaded() {
  await page.evaluate(() => {
    if (document.getElementById("window-My Projects")) closeWindow("My Projects");
    openWindow("My Projects", { silent: true });
  });
  await page.waitForSelector(`${MP} .addr-progress`);
  await loadDone(MP);
}

test("«Мои проекты»: открытие проекта - загрузка в адресе, середина пустая, шапка на месте", async () => {
  await openMyProjectsLoaded();
  await page.click(`${MP} .mp-grid .mp-card[data-mp-slug]`);
  const s = await navState();
  assert.deepEqual(
    { loading: s.loading, mainHidden: s.mainHidden, headerShown: s.headerShown },
    { loading: true, mainHidden: true, headerShown: true }
  );
  assert.ok(s.duration >= 800 && s.duration < 2000, `переход быстрее первого открытия: ${s.duration}`);
  await loadDone(MP);
  const after = await navState();
  assert.equal(after.mainHidden, false, "страница проекта появилась");
});

test("«Мои проекты»: «Назад», раздел и «Домой» тоже грузятся", async () => {
  for (const act of [
    () => page.click(`${MP} [data-mp-tool="back"]`),
    () => page.evaluate((MP) => document.querySelectorAll(`${MP} .mp-nav`)[1].click(), MP),
    () => page.click(`${MP} [data-mp-action="home"]`),
  ]) {
    await loadDone(MP);
    await act();
    assert.equal((await navState()).loading, true);
  }
  await loadDone(MP);
});

test("«Мои проекты»: клик во время загрузки начинает её заново, без застрявшей полоски", async () => {
  await loadDone(MP);
  await page.evaluate((MP) => {
    const navs = document.querySelectorAll(`${MP} .mp-nav`);
    navs[1].click();
    navs[2].click();
  }, MP);
  assert.equal(await page.$$eval(`${MP} .addr-progress`, (l) => l.length), 1, "одна полоска");
  await loadDone(MP);
  assert.equal((await navState()).mainHidden, false);
});

test("«Обо мне»: «Назад» - быстрая загрузка в адресе", async () => {
  const AM = '[id="window-About Me"]';
  await page.evaluate(() => {
    if (document.getElementById("window-About Me")) closeWindow("About Me");
    openWindow("About Me", { silent: true });
  });
  await page.waitForSelector(`${AM} .addr-progress`);
  await loadDone(AM);
  await page.evaluate((AM) => AboutMe.show(document.querySelector(AM), "projects"), AM);
  await loadDone(AM);
  await page.click(`${AM} [data-am-nav="back"]`);
  const d = await page.$eval(`${AM} .addr-progress`, (b) => b.getAnimations()[0].effect.getTiming().duration);
  assert.ok(d <= 300, String(d));
  await loadDone(AM);
});

// После загрузки содержимое везде появляется резко, без проявления.
for (const [app, body, smooth] of [
  ["My Computer", ".content", false],
  ["About Me", ".am-body", false],
  ["My Projects", ".mp-page", false],
  ["GitHub", ".IE_content", false],
  ["Internet Explorer 6", ".IE_content", false],
]) {
  test(`«${app}»: содержимое появляется ${smooth ? "плавно" : "резко"}`, async () => {
    const win = `[id="window-${app}"]`;
    await page.evaluate((a) => {
      if (document.getElementById(`window-${a}`)) closeWindow(a);
      openWindow(a, { silent: true });
    }, app);
    // Ловим момент, когда содержимое только что открылось.
    const fading = await page.waitForFunction(
      (win, body) => {
        const el = document.querySelector(`${win} ${body}`);
        if (!el || el.classList.contains("addr-page-hidden")) return false;
        return { fading: [...el.children].some((c) => c.getAnimations().length > 0) };
      },
      { polling: "mutation", timeout: 5000 },
      win,
      body
    );
    assert.equal((await fading.jsonValue()).fading, smooth);
  });
}

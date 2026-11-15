import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Трей как в Windows XP: три значка видны, остальные - за стрелкой; часы в 24-часовом формате.

let h;
let page;
before(async () => {
  h = await startHarness();
  page = h.page;
  await page.waitForSelector("#footer-time");
  await page.waitForFunction(() => document.getElementById("footer-time").textContent.trim() !== "");
});
after(async () => h && (await h.close()));

const ICONS = "[id='Desktop_Footer'] .footer__icon";
// Видимые значки трея (не скрытые нулевой шириной) - по alt, слева направо.
const visibleIcons = () =>
  page.evaluate((ICONS) => {
    const box = document.getElementById("tray-hidden").getBoundingClientRect();
    return [...document.querySelectorAll(ICONS)]
      .filter((i) => {
        const r = i.getBoundingClientRect();
        const inHidden = i.closest("#tray-hidden");
        return r.width > 0 && (!inHidden || (r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && box.width > 0));
      })
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
      .map((i) => i.id || i.alt || "i"); // alt у CRT меняется («выключен»/«включён») - берём id
  }, ICONS);
const SHOWN = ["Windows Messenger", "i", "quick-start-toggle"];
// Состояние стрелки: aria-expanded и какая картинка из макета показана («‹» left / «›» right).
const chevron = () =>
  page.$eval("#tray-chevron", (c) => {
    const img = c.querySelector(".tray-chevron__img");
    return {
      expanded: c.getAttribute("aria-expanded"),
      img: img.getAttribute("src").split("/").pop(),
      loaded: img.complete && img.naturalWidth === 19 && img.naturalHeight === 19,
    };
  });
// Дождаться, пока выезд значков и поворот стрелки закончатся (под нагрузкой это дольше 250 мс).
const settle = () =>
  page.waitForFunction(
    () => document.getAnimations().every((a) => !document.getElementById("Desktop_Footer").contains(a.effect?.target)),
    { timeout: 5000 }
  );

test("свёрнуто: стрелка «‹» и три значка - Windows Messenger, «i», Quick Start", async () => {
  assert.deepEqual(await visibleIcons(), SHOWN);
  assert.deepEqual(await chevron(), { expanded: "false", img: "chevron-left.png", loaded: true });
  // Стрелка - левее трёх значков и на левой границе трея.
  const pos = await page.evaluate(() => {
    const c = document.getElementById("tray-chevron").getBoundingClientRect();
    const tray = document.querySelector(".footer__items.right").getBoundingClientRect();
    const first = document.querySelector(".footer__items.right .footer__icon").getBoundingClientRect();
    return { leftOfIcons: c.right <= first.left, onEdge: c.left < tray.left && c.right > tray.left };
  });
  assert.deepEqual(pos, { leftOfIcons: true, onEdge: true });
});

test("щелчок по стрелке: левее неё выезжают щит CRT и громкость, стрелка становится «›»", async () => {
  await page.click("#tray-chevron");
  await settle();
  assert.deepEqual(await visibleIcons(), ["crt-toggle", "volume-toggle", ...SHOWN]);
  assert.deepEqual(await chevron(), { expanded: "true", img: "chevron-right.png", loaded: true });
  const leftOfChevron = await page.evaluate(() => {
    const c = document.getElementById("tray-chevron").getBoundingClientRect();
    return [...document.querySelectorAll("#tray-hidden .footer__icon")].every((i) => i.getBoundingClientRect().right <= c.left + 1);
  });
  assert.equal(leftOfChevron, true);
});

test("значки выезжают плавно (ширина растёт анимацией)", async () => {
  await page.click("#tray-chevron"); // спрятать
  await settle();
  const anim = await page.evaluate(() => {
    document.getElementById("tray-chevron").click();
    const a = document.getElementById("tray-hidden").getAnimations()[0];
    return a ? a.effect.getTiming().duration : 0;
  });
  assert.ok(anim >= 150, `анимация ${anim} мс`);
  await settle();
});

test("повторный щелчок прячет значки обратно", async () => {
  await page.click("#tray-chevron");
  await settle();
  assert.deepEqual(await visibleIcons(), SHOWN);
  assert.deepEqual(await chevron(), { expanded: "false", img: "chevron-left.png", loaded: true });
});

test("подсказка стрелки: «Показать скрытые значки», после раскрытия - «Скрыть»", async () => {
  await page.mouse.move(400, 300); // после прошлых щелчков мышь стоит на стрелке
  await page.hover("#tray-chevron");
  await page.waitForSelector(".xp-tray-tip", { visible: true });
  assert.equal(await page.$eval(".xp-tray-tip", (t) => t.textContent), "Показать скрытые значки");
  await page.click("#tray-chevron");
  await page.mouse.move(400, 300);
  await page.hover("#tray-chevron");
  await page.waitForSelector(".xp-tray-tip", { visible: true });
  assert.equal(await page.$eval(".xp-tray-tip", (t) => t.textContent), "Скрыть");
  await page.click("#tray-chevron");
  await page.mouse.move(400, 300);
});

test("часы - 24 часа, как в России: ЧЧ:ММ без AM/PM и совпадают с текущим временем", async () => {
  const r = await page.evaluate(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return { shown: document.getElementById("footer-time").textContent.trim(), now: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
  });
  assert.match(r.shown, /^\d{2}:\d{2}$/);
  // Минута могла смениться между отрисовкой и проверкой - сравниваем часы.
  assert.equal(r.shown.slice(0, 2), r.now.slice(0, 2));
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

let h;
let page;
const MC = '[id="window-My Computer"]';

before(async () => {
  h = await startHarness();
  page = h.page;
  await page.evaluate(() => openWindow("My Computer"));
  await page.waitForSelector(`${MC} .content_right_card--me`);
});
after(async () => h && (await h.close()));

test("«Мой компьютер»: карточка «О себе» вместо «About Me :)»", async () => {
  const title = await page.$eval(`${MC} .content_right_card--me .content_right_card_header`, (e) =>
    e.textContent.trim()
  );
  assert.equal(title, "О себе");
});

test("«Мой компьютер»: в «О себе» Telegram и GitHub владельца, чужих ссылок нет", async () => {
  const links = await page.$$eval(`${MC} .content_right_card--me a`, (l) =>
    l.map((a) => ({
      text: a.textContent.trim(),
      href: a.getAttribute("href"),
      target: a.target,
      icon: a.querySelector("img").getAttribute("src"),
    }))
  );
  assert.deepEqual(links, [
    { text: "Telegram", href: "https://t.me/atanov_roman", target: "_blank", icon: "/Assets/Images/Logos/telegram-logo.svg" },
    { text: "GitHub", href: "https://github.com/dekciw", target: "_blank", icon: "/Assets/Images/Logos/github-logo.svg" },
  ]);
  const html = await page.$eval(MC, (w) => w.innerHTML);
  assert.doesNotMatch(html, /joris|Joris-Grvl|linkedin\.com/i);
});

test("«Мой компьютер»: иконки в «О себе» загрузились", async () => {
  const ok = await page.$$eval(`${MC} .content_right_card--me img`, async (imgs) => {
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
    return imgs.map((i) => i.naturalWidth > 0);
  });
  assert.deepEqual(ok, [true, true]);
});

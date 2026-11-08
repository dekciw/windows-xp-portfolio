import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Правая колонка меню «Пуск»: Telegram, GitHub, Instagram (ссылки), «Обо мне» (окно), «Резюме» (пока заглушка).

let h;
let page;
before(async () => {
  h = await startHarness();
  page = h.page;
  await page.waitForSelector('[id="window-GitHub"]', { timeout: 10000 });
  // Внешние ссылки в тестах не открываем: отменяем переход, но остальные обработчики клика срабатывают.
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (e) => {
        const a = e.target.closest('a[target="_blank"]');
        if (a) {
          e.preventDefault();
          window.__followed = a.href;
        }
      },
      true
    );
  });
});
after(async () => h && (await h.close()));

async function openMenu() {
  if (!(await page.$("#StartMenu"))) {
    // После закрытия меню ~115 мс не открывается повторно (защита от двойного щелчка).
    await page.waitForFunction(() => !recentlyClosedStartMenu);
    await page.click("#start-button");
    await page.waitForSelector("#StartMenu .RightMenu .ItemMenu", { timeout: 5000 });
  }
}
const menuOpen = () => page.evaluate(() => !!document.getElementById("StartMenu"));
const topItems = () =>
  page.$$eval("#StartMenu .RightMenu > .ItemMenu", (items) =>
    items.slice(0, 5).map((i) => ({
      text: i.querySelector(".MenuItemTxt").textContent.trim(),
      href: i.getAttribute("href"),
      target: i.getAttribute("target"),
      img: i.querySelector("img").getAttribute("src"),
    }))
  );

test("первые пять пунктов справа: Telegram, GitHub, Instagram, Обо мне, Резюме", async () => {
  await openMenu();
  const items = await topItems();
  assert.deepEqual(
    items.map((i) => i.text),
    ["Telegram", "GitHub", "Instagram", "Обо мне", "Резюме"]
  );
  assert.deepEqual(items.slice(0, 3).map((i) => [i.href, i.target]), [
    ["https://t.me/atanov_roman", "_blank"],
    ["https://github.com/dekciw", "_blank"],
    ["https://www.instagram.com/666kaine", "_blank"],
  ]);
  const texts = await page.$$eval("#StartMenu .RightMenu .MenuItemTxt", (l) => l.map((e) => e.textContent.trim()));
  for (const old of ["Мои документы", "Недавние документы", "Мои рисунки", "Моя музыка", "Мой компьютер"]) {
    assert.ok(!texts.includes(old), `остался старый пункт «${old}»`);
  }
});

test("подписи Telegram, GitHub, Instagram, Обо мне, Резюме не жирные", async () => {
  await openMenu();
  const weights = await page.$$eval("#StartMenu .RightMenu > .ItemMenu", (items) =>
    items.slice(0, 5).map((i) => getComputedStyle(i.querySelector(".MenuItemTxt")).fontWeight)
  );
  assert.deepEqual(weights, ["400", "400", "400", "400", "400"]);
});

test("значки всех пяти пунктов загружаются", async () => {
  await openMenu();
  const broken = await page.$$eval("#StartMenu .RightMenu > .ItemMenu", (items) =>
    Promise.all(
      items.slice(0, 5).map(async (i) => {
        const img = i.querySelector("img");
        if (!img.complete) await new Promise((r) => (img.onload = img.onerror = r));
        return img.naturalWidth > 0 ? null : img.getAttribute("src");
      })
    ).then((l) => l.filter(Boolean))
  );
  assert.deepEqual(broken, []);
});

test("щелчок по Telegram открывает ссылку и закрывает меню", async () => {
  await openMenu();
  await page.evaluate(() => (window.__followed = null));
  await page.click('#StartMenu .RightMenu a[href="https://t.me/atanov_roman"]');
  assert.equal(await page.evaluate(() => window.__followed), "https://t.me/atanov_roman");
  assert.equal(await menuOpen(), false);
});

test("щелчок по «Обо мне» открывает окно «Обо мне» и закрывает меню", async () => {
  await page.evaluate(() => closeWindow("About Me"));
  await openMenu();
  const item = await page.evaluateHandle(() =>
    [...document.querySelectorAll("#StartMenu .RightMenu .ItemMenu")].find(
      (i) => i.querySelector(".MenuItemTxt").textContent.trim() === "Обо мне"
    )
  );
  await item.asElement().click();
  await page.waitForSelector('[id="window-About Me"] .am-root', { timeout: 5000 });
  assert.equal(await menuOpen(), false);
  const hash = await page.evaluate(() => location.hash);
  assert.equal(hash, "", "ссылка не должна менять адрес страницы");
});

test("«Проводник» вместо «Выбор программ по умолчанию»: значок проводника, открывает «Мой компьютер»", async () => {
  await page.evaluate(() => closeWindow("My Computer"));
  await openMenu();
  const texts = await page.$$eval("#StartMenu .RightMenu .MenuItemTxt", (l) => l.map((e) => e.textContent.trim()));
  assert.ok(!texts.includes("Выбор программ по умолчанию"), "остался старый пункт");
  const item = await page.evaluateHandle(() =>
    [...document.querySelectorAll("#StartMenu .RightMenu .ItemMenu")].find(
      (i) => i.querySelector(".MenuItemTxt").textContent.trim() === "Проводник"
    )
  );
  assert.ok(item.asElement(), "нет пункта «Проводник»");
  const src = await item.evaluate((i) => decodeURIComponent(i.querySelector("img").src));
  assert.ok(src.endsWith("/Windows XP Icons/Explorer.png"), src);
  await item.asElement().click();
  await page.waitForSelector('[id="window-My Computer"]', { timeout: 5000 });
  assert.equal(await menuOpen(), false);
  await page.evaluate(() => closeWindow("My Computer"));
});

test("«Резюме» пока неактивно: бледное, подсказка «Скоро», щелчок ничего не делает", async () => {
  await openMenu();
  const r = await page.evaluate(() => {
    const i = [...document.querySelectorAll("#StartMenu .RightMenu .ItemMenu")].find(
      (x) => x.querySelector(".MenuItemTxt").textContent.trim() === "Резюме"
    );
    return { title: i.getAttribute("title"), opacity: parseFloat(getComputedStyle(i).opacity), href: i.getAttribute("href") };
  });
  assert.equal(r.title, "Скоро");
  assert.ok(r.opacity < 1, "пункт должен быть бледным");
  assert.equal(r.href, null);
  const windowsBefore = await page.$$eval(".window", (l) => l.length);
  await page.evaluate(() =>
    [...document.querySelectorAll("#StartMenu .RightMenu .ItemMenu")]
      .find((x) => x.querySelector(".MenuItemTxt").textContent.trim() === "Резюме")
      .click()
  );
  assert.equal(await page.$$eval(".window", (l) => l.length), windowsBefore);
});

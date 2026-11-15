import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Контекстные меню (правая кнопка): рабочий стол, значок, пункт меню «Пуск».

let h;
const closeAllWindows = () =>
  h.page.evaluate(() => document.querySelectorAll('.window[id^="window-"]').forEach((w) => closeWindow(w.id.slice(7))));

before(async () => {
  h = await startHarness();
  await h.page.waitForFunction(() => window.DesktopIcons && window.DesktopContextMenu);
  // Автооткрывающиеся окна (GitHub) не должны мешать: дождёмся и закроем их.
  await h.page.waitForSelector('[id="window-GitHub"]', { timeout: 10000 }).catch(() => {});
  await closeAllWindows();
});
after(async () => h && (await h.close()));

// Свободная точка рабочего стола (правее значков).
const SPOT = { x: 900, y: 300 };
const openMenuAt = async (x, y) => {
  await h.page.mouse.click(x, y, { button: "right" });
  await h.page.waitForSelector(".dcm--root");
};
const openMenu = () => openMenuAt(SPOT.x, SPOT.y);
const rows = () =>
  h.page.$$eval(".dcm--root > .dcm-item, .dcm--root > .dcm-sep", (els) =>
    els.map((e) =>
      e.classList.contains("dcm-sep")
        ? "---"
        : `${e.querySelector(".dcm-label").textContent}${e.classList.contains("dcm-item--disabled") ? " (off)" : ""}`
    )
  );
const clickItem = async (label) => {
  const handle = await h.page.evaluateHandle(
    (label) => [...document.querySelectorAll(".dcm-item")].find((r) => r.querySelector(".dcm-label").textContent === label),
    label
  );
  await handle.asElement().click();
};
const iconOrder = () =>
  h.page.evaluate(() =>
    DesktopIcons.list()
      .slice()
      .sort((a, b) => parseInt(a.style.left) - parseInt(b.style.left) || parseInt(a.style.top) - parseInt(b.style.top))
      .map((i) => i.querySelector("span").textContent.trim())
  );
const iconNames = () => h.page.evaluate(() => DesktopIcons.list().map((i) => i.querySelector("span").textContent.trim()));
const openStartMenu = async () => {
  await h.page.evaluate(() => openStartMenu());
  await h.page.waitForSelector("#StartMenu .ItemMenu");
};
const startItem = (label) =>
  h.page.evaluateHandle(
    (label) => [...document.querySelectorAll("#StartMenu .ItemMenu")].find((i) => i.querySelector(".MenuItemTxt")?.textContent.trim() === label),
    label
  );

test("правая кнопка по рабочему столу: пункты как в XP, без «Проверить версию»", async () => {
  await openMenu();
  assert.deepEqual(await rows(), [
    "Упорядочить значки", "---",
    "Вставить (off)", "---",
    "Сбросить рабочий стол", "Показать рабочий стол", "---",
    "Обновить страницу", "CRT-эффект", "Полный экран",
  ]);
  const pos = await h.page.$eval(".dcm--root", (m) => [Math.round(m.getBoundingClientRect().left), Math.round(m.getBoundingClientRect().top)]);
  assert.deepEqual(pos, [SPOT.x, SPOT.y]);
  await h.page.keyboard.press("Escape");
  assert.equal(await h.page.$(".dcm--root"), null);
});

test("Показать рабочий стол сворачивает все окна: «Обо мне», «Мой компьютер», «Мои проекты»", async () => {
  await h.page.evaluate(() => {
    openWindow("About Me", { silent: true });
    openWindow("My Computer", { silent: true });
    openWindow("My Projects", { silent: true });
  });
  for (const id of ["About Me", "My Computer", "My Projects"]) await h.page.waitForSelector(`[id="window-${id}"]`);
  // Окна не должны закрывать точку клика по рабочему столу.
  await h.page.evaluate(() =>
    document.querySelectorAll('.window[id^="window-"]').forEach((w) => Object.assign(w.style, { left: "0px", top: "0px", width: "300px", height: "200px" }))
  );
  await openMenu();
  await clickItem("Показать рабочий стол");
  const states = await h.page.evaluate(() =>
    ["About Me", "My Computer", "My Projects"].map((id) => document.getElementById(`window-${id}`).style.display)
  );
  assert.deepEqual(states, ["none", "none", "none"]);
  // Окно возвращается кнопкой на панели задач.
  await h.page.evaluate(() => toggleWindow("About Me"));
  assert.equal(await h.page.evaluate(() => document.getElementById("window-About Me").style.display), "");
  await closeAllWindows();
});

test("Упорядочить значки: по имени, затем сброс возвращает исходный порядок", async () => {
  const initial = await iconOrder();
  await openMenu();
  await h.page.hover(".dcm--root > .dcm-item--parent");
  await h.page.waitForSelector(".dcm-item--open .dcm--sub", { visible: true });
  await clickItem("По имени");
  assert.deepEqual(await iconOrder(), [...initial].sort((a, b) => a.localeCompare(b, "ru")));
  await openMenu();
  await clickItem("Сбросить рабочий стол");
  assert.deepEqual(await iconOrder(), initial);
});

test("Отображать значки рабочего стола: снимает и возвращает галочку", async () => {
  await openMenu();
  await h.page.hover(".dcm--root > .dcm-item--parent");
  await clickItem("Отображать значки рабочего стола");
  assert.equal(await h.page.$eval(".icon", (i) => getComputedStyle(i).visibility), "hidden");
  await openMenu();
  await h.page.hover(".dcm--root > .dcm-item--parent");
  assert.equal(await h.page.$eval('.dcm-item[data-action="toggleIcons"]', (r) => r.getAttribute("aria-checked")), "false");
  await clickItem("Отображать значки рабочего стола");
  assert.equal(await h.page.$eval(".icon", (i) => getComputedStyle(i).visibility), "visible");
});

test("CRT-эффект переключается и показывает галочку", async () => {
  const before = await h.page.evaluate(() => CRTEffect.isEnabled());
  await openMenu();
  await clickItem("CRT-эффект");
  assert.equal(await h.page.evaluate(() => CRTEffect.isEnabled()), !before);
  await openMenu();
  assert.equal(await h.page.$eval('.dcm-item[data-action="toggleCrt"]', (r) => r.getAttribute("aria-checked")), String(!before));
  await clickItem("CRT-эффект");
  assert.equal(await h.page.evaluate(() => CRTEffect.isEnabled()), before);
});

test("меню значка: Открыть / Копировать / Удалить (серый у встроенных) / Закрепить", async () => {
  await h.page.click('.icon[data-app="Resume"]', { button: "right" });
  await h.page.waitForSelector('.dcm--root[data-kind="icon"]');
  assert.deepEqual(await rows(), ["Открыть", "---", "Копировать", "Удалить (off)", "---", "Закрепить"]);
  assert.ok(await h.page.$eval('.icon[data-app="Resume"]', (i) => i.classList.contains("selected")));
  await clickItem("Открыть");
  await h.page.waitForSelector('[id="window-Resume"]');
  await closeAllWindows();
});

test("Закрепить: закреплённый значок не перетаскивается", async () => {
  const sel = '.icon[data-app="About Me"]';
  await h.page.click(sel, { button: "right" });
  await clickItem("Закрепить");
  const before = await h.page.$eval(sel, (i) => [i.style.left, i.style.top]);
  const box = await (await h.page.$(sel)).boundingBox();
  await h.page.mouse.move(box.x + 20, box.y + 20);
  await h.page.mouse.down();
  await h.page.mouse.move(box.x + 300, box.y + 200, { steps: 5 });
  await h.page.mouse.up();
  assert.deepEqual(await h.page.$eval(sel, (i) => [i.style.left, i.style.top]), before);
  await h.page.click(sel, { button: "right" });
  assert.equal(await h.page.$eval('.dcm-item[data-action="lock"]', (r) => r.getAttribute("aria-checked")), "true");
  await clickItem("Закрепить");
  assert.equal(await h.page.$eval(sel, (i) => i.dataset.locked), undefined);
});

test("Копировать значок → Вставить на рабочем столе создаёт ярлык; его можно удалить", async () => {
  await h.page.click('.icon[data-app="Resume"]', { button: "right" });
  await clickItem("Копировать");
  await openMenu();
  assert.ok((await rows()).includes("Вставить"));
  await clickItem("Вставить");
  assert.ok((await iconNames()).includes("Моё резюме (2)"));
  const shortcut = await h.page.evaluateHandle(() => DesktopIcons.list().find((i) => i.textContent.includes("Моё резюме (2)")));
  // Ярлык встаёт возле места щелчка.
  const box = await shortcut.asElement().boundingBox();
  assert.ok(Math.abs(box.x - SPOT.x) < 140 && Math.abs(box.y - SPOT.y) < 140, JSON.stringify(box));
  await shortcut.asElement().click({ count: 2 });
  await h.page.waitForSelector('[id="window-Resume"]');
  await closeAllWindows();
  await shortcut.asElement().click({ button: "right" });
  assert.ok((await rows()).includes("Удалить"));
  await clickItem("Удалить");
  assert.ok(!(await iconNames()).includes("Моё резюме (2)"));
});

test("Пуск, правая кнопка: Открыть / Добавить на рабочий стол / Копировать", async () => {
  await openStartMenu();
  const item = (await startItem("Сапёр")).asElement();
  await item.click({ button: "right" });
  await h.page.waitForSelector('.dcm--root[data-kind="start"]');
  assert.deepEqual(await rows(), ["Открыть", "---", "Добавить на рабочий стол", "Копировать"]);
  await clickItem("Открыть");
  await h.page.waitForSelector("#window-Minesweeper");
  assert.equal(await h.page.$("#StartMenu"), null);
  await closeAllWindows();
});

test("Пуск → Добавить на рабочий стол: ярлык появляется и исчезает после перезагрузки", async () => {
  await openStartMenu();
  await (await startItem("Telegram")).asElement().click({ button: "right" });
  await clickItem("Добавить на рабочий стол");
  assert.ok((await iconNames()).includes("Telegram"));
  // Повторное добавление не плодит дубликаты.
  await openStartMenu();
  await (await startItem("Telegram")).asElement().click({ button: "right" });
  await clickItem("Добавить на рабочий стол");
  assert.equal((await iconNames()).filter((n) => n === "Telegram").length, 1);

  // Ярлыки нигде не сохраняются; старые сохранённые (из прошлой версии) тоже не всплывают.
  await h.page.evaluate(() =>
    localStorage.setItem("desktopShortcuts", JSON.stringify([{ label: "Старый", icon: "/x.png", cmd: { fn: "openWindow", arg: "Paint" } }]))
  );
  await h.page.reload({ waitUntil: "domcontentloaded" });
  await h.page.waitForFunction(() => window.DesktopIcons && window.DesktopContextMenu);
  await h.page.waitForSelector('[id="window-GitHub"]', { timeout: 10000 }).catch(() => {});
  await closeAllWindows();
  const names = await iconNames();
  assert.ok(!names.includes("Telegram") && !names.includes("Старый"), names.join(", "));
  assert.equal(await h.page.evaluate(() => localStorage.getItem("desktopShortcuts")), null);
});

test("Сбросить рабочий стол убирает добавленные ярлыки", async () => {
  await openStartMenu();
  await (await startItem("Paint")).asElement().click({ button: "right" });
  await clickItem("Добавить на рабочий стол");
  assert.equal((await iconNames()).filter((n) => n.startsWith("Paint")).length, 1);
  await openMenu();
  await clickItem("Сбросить рабочий стол");
  assert.equal((await iconNames()).filter((n) => n.startsWith("Paint")).length, 1);
  assert.ok(await h.page.evaluate(() => DesktopIcons.list().every((i) => DesktopIcons.isDefault(i))));
});

test("Пуск → Копировать → Вставить на рабочем столе", async () => {
  await openStartMenu();
  await (await startItem("Блокнот")).asElement().click({ button: "right" });
  await clickItem("Копировать");
  await openMenu();
  await clickItem("Вставить");
  assert.ok((await iconNames()).includes("Блокнот (2)"));
  await openMenu();
  await clickItem("Сбросить рабочий стол");
});

test("неактивные пункты ничего не делают и меню не закрывают; Полный экран и Обновить работают", async () => {
  await h.page.click('.icon[data-app="Resume"]', { button: "right" });
  await clickItem("Удалить");
  assert.ok(await h.page.$(".dcm--root"));
  await h.page.mouse.click(SPOT.x - 200, SPOT.y + 100);
  assert.equal(await h.page.$(".dcm--root"), null);

  await h.page.evaluate(() => {
    window.__fs = 0;
    document.documentElement.requestFullscreen = () => {
      window.__fs++;
      return Promise.resolve();
    };
  });
  await openMenu();
  await clickItem("Полный экран");
  assert.equal(await h.page.evaluate(() => window.__fs), 1);

  await h.page.evaluate(() => (window.__marker = 1));
  await openMenu();
  await Promise.all([h.page.waitForNavigation({ waitUntil: "domcontentloaded" }), clickItem("Обновить страницу")]);
  assert.equal(await h.page.evaluate(() => window.__marker), undefined);
});

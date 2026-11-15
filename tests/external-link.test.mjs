import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Ссылка на другой сайт: сначала XP-диалог «Открыть ссылку» со звуком Exclamation,
// и только по кнопке «Открыть в новой вкладке» - переход.

const EXCL = "Windows XP Exclamation.wav";
const DLG = ".xp-link-dialog";

let h;
let page;
before(async () => {
  h = await startHarness();
  page = h.page;
  await page.waitForSelector("#window-GitHub .gh-root", { timeout: 10000 });
  // window.open не открывает вкладки, а запоминает вызовы.
  await page.evaluate(() => {
    window.__opened = [];
    window.open = (url, target, features) => {
      window.__opened.push({ url, target, features });
      return null;
    };
  });
});
after(async () => h && (await h.close()));

const opened = () => page.evaluate(() => window.__opened.map((o) => o.url));
const reset = () => page.evaluate(() => ((window.__opened = []), (window.__played = [])));
// Только звуки (видео-аватар в «Пуске» тоже проходит через play()).
const played = () =>
  page.evaluate(() => window.__played.map((s) => s.split("/").pop()).filter((s) => /\.(wav|mp3)$/.test(s)));
const dialog = () =>
  page.evaluate((DLG) => {
    const d = document.querySelector(DLG);
    if (!d) return null;
    return {
      title: d.querySelector(".window-header").textContent.trim(),
      text: d.querySelector(".xp-link-dialog__text").textContent.trim(),
      buttons: [...d.querySelectorAll(".xp-link-dialog__buttons button")].map((b) => b.textContent.trim()),
      focused: document.activeElement && document.activeElement.textContent.trim(),
    };
  }, DLG);

async function startMenuLink(name) {
  // openStartMenu - переключатель с защитой от повторного открытия 115 мс после закрытия и
  // вставкой меню через setTimeout: под нагрузкой один вызов иногда ничего не открывает -
  // повторяем, пока меню не появится.
  await page.waitForFunction(() => !document.getElementById("StartMenu"));
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((r) => setTimeout(r, 200));
    if (!(await page.$("#StartMenu"))) await page.evaluate(() => openStartMenu());
    const shown = await page
      .waitForSelector("#StartMenu .RightMenu a.ItemMenu", { visible: true, timeout: 1500 })
      .then(() => true, () => false);
    if (shown) break;
  }
  const links = await page.$$("#StartMenu .RightMenu a.ItemMenu");
  for (const l of links) {
    if ((await l.evaluate((a) => a.textContent.trim())) === name) return l;
  }
  throw new Error("нет пункта " + name);
}

test("«Пуск» → Telegram: диалог со звуком, сайт ещё не открыт", async () => {
  await reset();
  await (await startMenuLink("Telegram")).click();
  await page.waitForSelector(DLG, { visible: true });
  assert.deepEqual(await dialog(), {
    title: "Открыть ссылку",
    text: "Вы уверены, что хотите открыть «Telegram»?",
    buttons: ["Отмена", "Открыть в новой вкладке"],
    focused: "Открыть в новой вкладке",
  });
  assert.deepEqual(await played(), [EXCL]);
  assert.deepEqual(await opened(), []);
  // Под диалогом - лёгкое затемнение всего экрана, включая панель задач.
  const dim = await page.evaluate(() => {
    const o = document.querySelector(".xp-link-overlay");
    o.getAnimations().forEach((a) => a.finish());
    const r = o.getBoundingClientRect();
    const alpha = Number((getComputedStyle(o).backgroundColor.match(/rgba\(0, 0, 0, ([\d.]+)\)/) || [])[1]);
    return { full: r.width === innerWidth && r.height === innerHeight, light: alpha > 0.1 && alpha < 0.5 };
  });
  assert.deepEqual(dim, { full: true, light: true });
});

test("«Открыть в новой вкладке» - переход на сайт и диалог закрывается", async () => {
  await page.click(`${DLG} .xp-link-dialog__ok`);
  assert.deepEqual(await opened(), ["https://t.me/atanov_roman"]);
  assert.equal(await page.$(DLG), null);
});

test("«Отмена», крестик и Esc - никуда не переходим", async () => {
  for (const close of [
    () => page.click(`${DLG} .xp-link-dialog__cancel`),
    () => page.click(`${DLG} .header-button--close`),
    () => page.keyboard.press("Escape"),
  ]) {
    await reset();
    await (await startMenuLink("Instagram")).click();
    await page.waitForSelector(DLG, { visible: true });
    await close();
    assert.equal(await page.$(DLG), null);
    assert.deepEqual(await opened(), []);
  }
});

test("Enter - открыть (кнопка по умолчанию)", async () => {
  await reset();
  await (await startMenuLink("GitHub")).click();
  await page.waitForSelector(DLG, { visible: true });
  await page.keyboard.press("Enter");
  assert.deepEqual(await opened(), ["https://github.com/dekciw"]);
});

test("«Мои проекты» → «Открыть сайт»: в диалоге название проекта", async () => {
  await reset();
  const slug = await page.evaluate(() => {
    openWindow("My Projects", { silent: true });
    return (MY_PROJECTS_DATA.projects || []).find((p) => p.site && p.slug).slug;
  });
  await page.waitForSelector('[id="window-My Projects"] .mp-grid .mp-card', { visible: true });
  const { title, site } = await page.evaluate((slug) => {
    MyProjects.openProject(document.getElementById("window-My Projects"), slug);
    const p = MY_PROJECTS_DATA.projects.find((x) => x.slug === slug);
    return { title: p.title, site: p.site };
  }, slug);
  await page.waitForSelector('[id="window-My Projects"] .mp-vsite', { visible: true });
  await page.click('[id="window-My Projects"] .mp-vsite');
  await page.waitForSelector(DLG, { visible: true });
  assert.equal((await dialog()).text, `Вы уверены, что хотите открыть «${title}»?`);
  await page.click(`${DLG} .xp-link-dialog__ok`);
  assert.deepEqual(await opened(), [new URL(site).href]);
});

test("внутренние ссылки и ссылки без адреса сайта диалог не показывают", async () => {
  await reset();
  await page.evaluate(() => {
    const a = document.createElement("a");
    a.href = "#home";
    a.id = "tmp-inner";
    a.textContent = "внутренняя";
    document.body.appendChild(a);
  });
  await page.click("#tmp-inner");
  assert.equal(await page.$(DLG), null);
  await page.evaluate(() => document.getElementById("tmp-inner").remove());
});

test("пункт «Пуска», закреплённый на рабочем столе, тоже спрашивает", async () => {
  await reset();
  await page.evaluate(() => XPLinkConfirm.open("https://t.me/atanov_roman", "Telegram"));
  await page.waitForSelector(DLG, { visible: true });
  assert.equal((await dialog()).text, "Вы уверены, что хотите открыть «Telegram»?");
  await page.keyboard.press("Escape");
});

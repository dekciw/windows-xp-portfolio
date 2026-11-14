import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness, openProjects, closeProjects, PROJECTS } from "./helpers/harness.mjs";

// Страница проекта внутри окна «Мои проекты»: маршрут, история, инфо и описание.

let h;
let page;
before(async () => {
  h = await startHarness();
  page = h.page;
  await page.waitForSelector('[id="window-GitHub"]', { timeout: 10000 });
  await page.evaluate(() => {
    try {
      localStorage.removeItem("mp-theme");
    } catch (e) {}
    // Тесты подменяют requestFullscreen — запоминаем настоящий, fresh() его возвращает.
    window.__realRequestFullscreen = Element.prototype.requestFullscreen;
  });
});
after(async () => h && (await h.close()));

// После closeWindow стиль окна удаляется и подключается заново: ждём, пока он (и вложенный
// @import страницы проекта) загрузится, иначе замеры стилей случайно падают.
async function fresh() {
  await page.evaluate(() => (Element.prototype.requestFullscreen = window.__realRequestFullscreen));
  if (await page.$(PROJECTS)) await closeProjects(page);
  await openProjects(page);
  await page.waitForFunction(
    () => {
      const sheet = document.getElementById("css-window-My Projects")?.sheet;
      if (!sheet) return false;
      const imp = [...sheet.cssRules].find((r) => r.href && r.href.includes("my-project-page.css"));
      return !!(imp && imp.styleSheet && imp.styleSheet.cssRules.length > 0);
    },
    { timeout: 5000 }
  );
  await page.evaluate(() => document.fonts.ready);
}

const SLUG = "burger-cheddar";
const CARD = `${PROJECTS} .mp-card`;
const text = (sel) => page.$eval(`${PROJECTS} ${sel}`, (e) => e.textContent.trim());
const isHidden = (sel) =>
  page.$eval(`${PROJECTS} ${sel}`, (e) => e.hidden || getComputedStyle(e).display === "none");
const projectData = () => page.evaluate((s) => window.MY_PROJECTS_DATA.projects.find((p) => p.slug === s), SLUG);
const toolState = (name) =>
  page.$eval(`${PROJECTS} [data-mp-tool="${name}"]`, (b) => ({
    on: b.classList.contains("function_bar_button"),
    off: b.classList.contains("function_bar_button--disable"),
  }));
const ON = { on: true, off: false };
const OFF = { on: false, off: true };

async function openBurger() {
  await fresh();
  await page.click(CARD);
  await page.waitForFunction((sel) => !document.querySelector(`${sel} .mp-project`).hidden, {}, PROJECTS);
}

async function expectGrid() {
  assert.equal(await isHidden(".mp-project"), true, "страница проекта должна быть скрыта");
  assert.equal(await isHidden(".mp-grid"), false, "сетка должна быть видна");
}
async function expectProject() {
  assert.equal(await isHidden(".mp-project"), false, "страница проекта должна быть видна");
  assert.equal(await isHidden(".mp-grid"), true, "сетка должна быть скрыта");
  assert.equal(await text(".mp-address"), `https://www.myprojects.com/${SLUG}`);
}

test("щелчок по карточке открывает страницу проекта: адрес /burger-cheddar, сетка скрыта, строки состояния нет", async () => {
  await openBurger();
  await expectProject();
  assert.equal(await page.$(`${PROJECTS} .mp-status`), null);
  assert.equal(await text(".mp-ptitle"), "Burger Cheddar");
  assert.ok((await page.$eval(`${PROJECTS} .mp-player`, (p) => p.children.length)) > 0, "в плеере карусель");
});

test("Enter на карточке тоже открывает", async () => {
  await fresh();
  await page.$eval(CARD, (c) => c.focus());
  await page.keyboard.press("Enter");
  await page.waitForFunction((sel) => !document.querySelector(`${sel} .mp-project`).hidden, { timeout: 3000 }, PROJECTS);
  await expectProject();
});

test("Назад → сетка, Вперёд → снова проект; кнопки активны только когда есть куда", async () => {
  await fresh();
  assert.deepEqual(await toolState("back"), OFF);
  assert.deepEqual(await toolState("forward"), OFF);
  await page.click(CARD);
  await expectProject();
  assert.deepEqual(await toolState("back"), ON);
  assert.deepEqual(await toolState("forward"), OFF);

  await page.click(`${PROJECTS} [data-mp-tool="back"]`);
  await expectGrid();
  assert.equal(await text(".mp-address"), "https://www.myprojects.com");
  assert.deepEqual(await toolState("back"), OFF);
  assert.deepEqual(await toolState("forward"), ON);

  await page.click(`${PROJECTS} [data-mp-tool="forward"]`);
  await expectProject();
  assert.deepEqual(await toolState("back"), ON);
  assert.deepEqual(await toolState("forward"), OFF);

  // Новый переход обрезает «вперёд»: проект → Назад → категория → «Вперёд» неактивна.
  await page.evaluate(() => MyProjects.goBack(document.getElementById("window-My Projects")));
  await expectGrid();
  await page.click(`${PROJECTS} .mp-nav[data-mp-category="personal"]`);
  assert.deepEqual(await toolState("forward"), OFF);
});

test("фокус: Enter на карточке → на названии проекта; Назад → снова на этой карточке", async () => {
  await fresh();
  const cardSel = `${CARD}[data-mp-slug="${SLUG}"]`;
  await page.$eval(cardSel, (c) => c.focus());
  await page.keyboard.press("Enter");
  await page.waitForFunction((sel) => !document.querySelector(`${sel} .mp-project`).hidden, { timeout: 3000 }, PROJECTS);
  assert.equal(
    await page.evaluate(() => document.activeElement && document.activeElement.className),
    "mp-ptitle",
    "после открытия фокус на названии"
  );
  assert.equal(await page.$eval(`${PROJECTS} .mp-ptitle`, (t) => t.tabIndex), -1);
  assert.equal(await page.$eval(`${PROJECTS} .mp-page`, (p) => p.scrollTop), 0, "фокус не прокручивает страницу");

  await page.click(`${PROJECTS} [data-mp-tool="back"]`);
  await expectGrid();
  assert.equal(
    await page.evaluate(() => document.activeElement && document.activeElement.dataset.mpSlug),
    SLUG,
    "после «Назад» фокус на карточке, с которой пришли"
  );
});

test("Домой / логотип / пункт меню / поиск возвращают к сетке", async () => {
  const ways = {
    home: () => page.click(`${PROJECTS} [data-mp-tool="home"]`),
    logo: () => page.click(`${PROJECTS} .mp-logo`),
    nav: () => page.click(`${PROJECTS} .mp-nav[data-mp-category="personal"]`),
    search: async () => {
      await page.click(`${PROJECTS} .mp-search-input`);
      await page.keyboard.type("burger");
    },
  };
  for (const [name, go] of Object.entries(ways)) {
    await openBurger();
    await go();
    await expectGrid().catch((e) => {
      throw new Error(`${name}: ${e.message}`);
    });
    assert.deepEqual(await toolState("back"), ON, `${name}: можно вернуться к проекту`);
  }
  assert.equal(await text(".mp-address"), "https://www.myprojects.com?q=burger");
});

test("точки слайдов: при наведении неактивный кружок загорается белым", async () => {
  await openBurger();
  const DOT = `${PROJECTS} .mp-dot[data-index="2"]`;
  const bgOf = () => page.$eval(DOT, (d) => getComputedStyle(d).backgroundColor);
  assert.equal(await bgOf(), "rgba(0, 0, 0, 0)");
  await page.hover(DOT);
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s)).backgroundColor === "rgb(255, 255, 255)", { timeout: 3000 }, DOT);
  await page.mouse.move(1, 1);
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s)).backgroundColor === "rgba(0, 0, 0, 0)", { timeout: 3000 }, DOT);
});

test("точки слайдов, светлая тема: при наведении кружок — серая заливка #606060 и тёмная обводка", async () => {
  await openBurger();
  await page.$eval(`${PROJECTS} .mp-page`, (p) => (p.dataset.theme = "light"));
  try {
    const DOT = `${PROJECTS} .mp-dot[data-index="2"]`;
    await page.hover(DOT);
    await page.waitForFunction(
      (s) => { const cs = getComputedStyle(document.querySelector(s)); return cs.backgroundColor === "rgb(96, 96, 96)" && cs.borderTopColor === "rgb(15, 15, 15)"; },
      { timeout: 3000 },
      DOT
    );
  } finally {
    await page.$eval(`${PROJECTS} .mp-page`, (p) => (p.dataset.theme = "dark"));
  }
});

test("инфо: аватар 40px, название Roboto Bold 26px −0.5px, статистика 14px #aaa, точки по числу media", async () => {
  await openBurger();
  const d = await projectData();
  const s = await page.$eval(PROJECTS, (w) => {
    const cs = (sel) => getComputedStyle(w.querySelector(sel));
    const av = w.querySelector(".mp-avatar-lg").getBoundingClientRect();
    const dots = [...w.querySelectorAll(".mp-dots button")];
    return {
      avatar: [Math.round(av.width), Math.round(av.height), cs(".mp-avatar-lg").borderRadius],
      title: [cs(".mp-ptitle").fontFamily.split(",")[0].replace(/"/g, ""), cs(".mp-ptitle").fontWeight, cs(".mp-ptitle").fontSize, cs(".mp-ptitle").lineHeight, cs(".mp-ptitle").letterSpacing, cs(".mp-ptitle").color],
      stats: [cs(".mp-pstats").fontSize, cs(".mp-pstats").lineHeight, cs(".mp-pstats").color],
      statsText: w.querySelector(".mp-pstats").textContent,
      dots: dots.length,
      dotSize: dots.map((b) => Math.round(b.getBoundingClientRect().width)),
      first: [getComputedStyle(dots[0]).backgroundColor, getComputedStyle(dots[0]).borderTopColor, getComputedStyle(dots[0]).borderTopWidth],
      other: [getComputedStyle(dots[1]).backgroundColor, getComputedStyle(dots[1]).borderTopColor],
      active: dots.map((b) => b.classList.contains("is-active")),
    };
  });
  assert.deepEqual(s.avatar, [40, 40, "50%"]);
  assert.deepEqual(s.title, ["Roboto", "700", "26px", "29.9px", "-0.5px", "rgb(255, 255, 255)"]);
  assert.deepEqual(s.stats, ["14px", "16.8px", "rgb(170, 170, 170)"]);
  const expected = await page.evaluate(
    (p) => `${MyProjects.viewsLabel(p.views)} • ${MyProjects.timeAgo(p.date)}`,
    d
  );
  assert.equal(s.statsText, expected);
  assert.equal(s.dots, d.media.length);
  assert.ok(s.dots >= 5, "видео + 4 скриншота");
  assert.deepEqual(s.dotSize, d.media.map(() => 14));
  assert.deepEqual(s.first, ["rgb(255, 0, 0)", "rgb(255, 0, 0)", "2px"]);
  assert.equal(s.other[1], "rgb(170, 170, 170)");
  assert.notEqual(s.other[0], "rgb(255, 0, 0)");
  assert.deepEqual(s.active, d.media.map((_, i) => i === 0));
});

test("данные Burger Cheddar: slug, медиа, сайт, описание (меток нет)", async () => {
  const d = await page.evaluate(() => window.MY_PROJECTS_DATA.projects[0]);
  assert.equal(d.slug, SLUG);
  assert.equal(d.tags, undefined);
  assert.equal(d.site, "https://dekciw.github.io/BurgerCheddar/");
  const dir = "/Assets/Projects/media/burger-cheddar/";
  assert.deepEqual(d.media[0], { type: "video", src: dir + "presentation.mp4", poster: dir + "presentation-poster.jpg" });
  assert.deepEqual(d.media.slice(1).map((m) => [m.type, m.src]), ["hero", "menu", "order", "why"].map((n) => ["image", `${dir}${n}.jpg`]));
  for (const m of d.media.slice(1)) assert.match(m.alt, /[а-яё]/i);
  assert.equal(d.brief, "Сделать лендинг бургерной, где гость быстро выбирает бургер, видит цену в своей валюте и оформляет заказ");
  assert.equal(d.role, "Дизайн и разработка");
  // Описание — что за проект и подробный стек (без «заказ не отправляется на сервер…»).
  assert.doesNotMatch(d.desc, /не отправляется на сервер|чистые HTML/);
  // Правило пользователя: на сайте короткий дефис « - », а не длинное тире «—».
  const real = (await page.evaluate(() => window.__realComments || null)) || d.comments;
  for (const t of [d.desc, d.brief, d.role, ...real.map((c) => c.text)]) assert.ok(!t.includes("—"), `длинное тире в «${t.slice(0, 40)}…»`);
  for (const w of ["HTML5", "CSS3", "Flexbox", "Grid", "@font-face", "JavaScript", "scrollIntoView", "data-атрибут", "GitHub Pages"]) {
    assert.ok(d.desc.includes(w), `в описании нет «${w}»`);
  }
  assert.equal((await page.evaluate(() => window.__realComments || null)) || d.comments, d.comments);
});

// Метки-кнопки («Личные», «Сборки») убраны по просьбе пользователя — ни в узком, ни в широком окне.
test("под плеером нет меток-кнопок ни в обычном, ни в развёрнутом окне; точки справа от названия", async () => {
  await openBurger();
  const check = () =>
    page.$eval(PROJECTS, (w) => {
      const t = w.querySelector(".mp-ptitle").getBoundingClientRect();
      const d = w.querySelector(".mp-dots").getBoundingClientRect();
      return { tags: w.querySelectorAll(".mp-tags, .mp-tag").length, dotsRight: d.left > t.left, dotsRow: Math.abs(d.top + d.height / 2 - (t.top + t.height / 2)) < 12 };
    });
  assert.deepEqual(await check(), { tags: 0, dotsRight: true, dotsRow: true });
  try {
    await page.evaluate(() => maximazeWindow("My Projects"));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.deepEqual(await check(), { tags: 0, dotsRight: true, dotsRow: true });
  } finally {
    await page.evaluate(() => maximazeWindow("My Projects"));
  }
});

test("описание: фон #1e1e1e, рамка #333, скругление 12px; подписи Задача/Роль/Описание 108px; свёрнуто — описание 3 строки и «Ещё», щелчок — «Свернуть» и полный текст", async () => {
  await openBurger();
  const d = await projectData();
  const s = await page.$eval(PROJECTS, (w) => {
    const box = getComputedStyle(w.querySelector(".mp-desc"));
    const rows = [...w.querySelectorAll(".mp-desc-row")];
    return {
      box: [box.backgroundColor, box.borderTopColor, box.borderTopWidth, box.borderTopLeftRadius],
      keys: rows.map((r) => r.dataset.key),
      labels: rows.map((r) => r.querySelector(".mp-desc-label").textContent),
      labelW: rows.map((r) => Math.round(r.querySelector(".mp-desc-label").getBoundingClientRect().width)),
      label: (() => {
        const cs = getComputedStyle(rows[0].querySelector(".mp-desc-label"));
        return [cs.fontWeight, cs.fontSize, cs.color];
      })(),
      textStyle: (() => {
        const cs = getComputedStyle(rows[0].querySelector(".mp-desc-text"));
        return [cs.fontSize, cs.lineHeight, cs.color];
      })(),
      texts: rows.map((r) => r.querySelector(".mp-desc-text").textContent),
    };
  });
  assert.deepEqual(s.box, ["rgb(30, 30, 30)", "rgb(51, 51, 51)", "1px", "12px"]);
  assert.deepEqual(s.keys, ["brief", "role", "desc"]);
  assert.deepEqual(s.labels, ["Задача:", "Роль:", "Описание:"]);
  assert.deepEqual(s.labelW, [108, 108, 108]);
  assert.deepEqual(s.label, ["500", "16px", "rgb(170, 170, 170)"]);
  assert.deepEqual(s.textStyle, ["16px", "24px", "rgb(255, 255, 255)"]);
  assert.deepEqual(s.texts, [d.brief, d.role, d.desc]);

  const DESC = `${PROJECTS} .mp-desc-row[data-key="desc"] .mp-desc-text`;
  const descH = () => page.$eval(DESC, (e) => e.getBoundingClientRect().height);
  const TOGGLE = `${PROJECTS} .mp-desc-toggle`;
  await page.waitForFunction((sel) => !document.querySelector(sel).hidden, { timeout: 3000 }, TOGGLE);
  assert.equal(await text(".mp-desc-toggle"), "Ещё");
  assert.equal(await page.$eval(DESC, (e) => getComputedStyle(e).webkitLineClamp), "3");
  assert.ok((await descH()) <= 3 * 24 + 1, `свёрнутое описание выше 3 строк: ${await descH()}`);
  const tg = await page.$eval(TOGGLE, (b) => {
    const cs = getComputedStyle(b);
    return [cs.fontWeight, cs.fontSize, cs.color];
  });
  assert.deepEqual(tg, ["500", "14px", "rgb(170, 170, 170)"]);

  await page.click(TOGGLE);
  assert.equal(await text(".mp-desc-toggle"), "Свернуть");
  assert.ok((await descH()) > 72, "развёрнутое описание показывает весь текст");
  await page.click(TOGGLE);
  assert.equal(await text(".mp-desc-toggle"), "Ещё");
  assert.ok((await descH()) <= 73);
});

test("короткое описание помещается в 3 строки — кнопки «Ещё» нет", async () => {
  if (await page.$(PROJECTS)) await closeProjects(page);
  const saved = await page.evaluate(() => JSON.stringify(window.MY_PROJECTS_DATA.projects));
  await page.evaluate(() => (window.MY_PROJECTS_DATA.projects[0].desc = "Коротко."));
  try {
    await openBurger();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.equal(await page.$eval(`${PROJECTS} .mp-desc-toggle`, (b) => b.hidden), true);
  } finally {
    await page.evaluate((s) => (window.MY_PROJECTS_DATA.projects = JSON.parse(s)), saved);
    await closeProjects(page);
  }
});

test("текст из данных попадает в страницу как текст, не как разметка", async () => {
  if (await page.$(PROJECTS)) await closeProjects(page);
  const saved = await page.evaluate(() => JSON.stringify(window.MY_PROJECTS_DATA.projects));
  await page.evaluate(() => {
    const p = window.MY_PROJECTS_DATA.projects[0];
    p.title = "<b>Бургер</b>";
    p.desc = "<img src=x onerror=window.__xss=1>";
    p.role = "<i>т</i>";
  });
  try {
    await openBurger();
    assert.equal(await text(".mp-ptitle"), "<b>Бургер</b>");
    assert.equal(await page.$$eval(`${PROJECTS} .mp-project b, ${PROJECTS} .mp-project i, ${PROJECTS} .mp-desc img`, (l) => l.length), 0);
    assert.equal(await page.evaluate(() => window.__xss), undefined);
  } finally {
    await page.evaluate((s) => (window.MY_PROJECTS_DATA.projects = JSON.parse(s)), saved);
    await closeProjects(page);
  }
});

test("проект без media/comments не падает", async () => {
  if (await page.$(PROJECTS)) await closeProjects(page);
  const saved = await page.evaluate(() => JSON.stringify(window.MY_PROJECTS_DATA.projects));
  const errors = [];
  const onErr = (e) => errors.push(String(e));
  page.on("pageerror", onErr);
  await page.evaluate(() => (window.MY_PROJECTS_DATA.projects = [{ title: "Пустой", slug: "empty" }]));
  try {
    await fresh();
    await page.click(CARD);
    await page.waitForFunction((sel) => !document.querySelector(`${sel} .mp-project`).hidden, { timeout: 3000 }, PROJECTS);
    assert.equal(await text(".mp-address"), "https://www.myprojects.com/empty");
    assert.equal(await text(".mp-ptitle"), "Пустой");
    assert.equal(await page.$$eval(`${PROJECTS} .mp-dots button`, (l) => l.length), 0);
    await page.click(`${PROJECTS} [data-mp-tool="back"]`);
    await expectGrid();
    assert.deepEqual(errors, []);
  } finally {
    page.off("pageerror", onErr);
    await page.evaluate((s) => (window.MY_PROJECTS_DATA.projects = JSON.parse(s)), saved);
    await closeProjects(page);
  }
});

test("destroy ставит видео на странице на паузу", async () => {
  await openBurger();
  const paused = await page.$eval(PROJECTS, (w) => {
    const v = document.createElement("video");
    let called = false;
    v.pause = () => (called = true);
    w.querySelector(".mp-player").appendChild(v);
    MyProjectsPage.destroy(w);
    return called;
  });
  assert.equal(paused, true);
});

// ---------- карусель (Task 3) ----------

const PLAYER = `${PROJECTS} .mp-player`;
const activeDot = () =>
  page.$$eval(`${PROJECTS} .mp-dot`, (l) => l.findIndex((b) => b.classList.contains("is-active")));
const trackX = () =>
  page.$eval(`${PROJECTS} .mp-track`, (t) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(t).transform);
    return Math.round(m.m41);
  });
async function expectSlide(i) {
  await page.waitForFunction(
    (sel, i) => {
      const t = document.querySelector(`${sel} .mp-track`);
      const w = document.querySelector(`${sel} .mp-player`).clientWidth;
      return Math.abs(new DOMMatrixReadOnly(getComputedStyle(t).transform).m41 + i * w) < 1;
    },
    { timeout: 3000 },
    PROJECTS,
    i
  );
  assert.equal(await activeDot(), i);
}

test("плеер: чёрный, скругление 12px, белая рамка 1px, шире 16:9 — 2.3125 (как в макете)", async () => {
  await openBurger();
  const r = await page.$eval(PLAYER, (p) => {
    const cs = getComputedStyle(p);
    const af = getComputedStyle(p, "::after");
    const b = p.getBoundingClientRect();
    return {
      bg: cs.backgroundColor,
      radius: cs.borderTopLeftRadius,
      afterBorder: af.borderTopWidth + " " + af.borderTopColor + " " + af.borderTopStyle,
      ratio: b.width / b.height,
    };
  });
  assert.equal(r.bg, "rgb(0, 0, 0)");
  assert.equal(r.radius, "12px");
  assert.equal(r.afterBorder, "1px rgb(255, 255, 255) solid");
  assert.ok(Math.abs(r.ratio - 2.3125) < 0.02, `2.3125, а не ${r.ratio}`);
  const slides = await page.$$eval(`${PLAYER} .mp-track > .mp-slide`, (l) => l.map((s) => s.dataset.type));
  assert.deepEqual(slides, ["video", "image", "image", "image", "image"]);
});

// Размер плеера и строки названия относительно видимой области страницы.
const playerBox = () =>
  page.$eval(PROJECTS, (w) => {
    const pg = w.querySelector(".mp-page");
    const top = pg.getBoundingClientRect().top + pg.clientTop;
    const b = w.querySelector(".mp-player").getBoundingClientRect();
    // Строка названия: аватар, название и статистика.
    const t = w.querySelector(".mp-meta-row").getBoundingClientRect();
    return { w: b.width, h: b.height, pageH: pg.clientHeight, top: b.top - top, titleBottom: t.bottom - top, scroll: pg.scrollTop };
  });

test("плеер: в обычном окне 2.3125 без ограничения; в развёрнутом — высота ≤ видимой высоты − 126, строка названия видна целиком", async () => {
  await openBurger();
  try {
    const n = await playerBox();
    assert.ok(n.h < n.pageH - 126 - 1, `в обычном окне высота не ограничена: ${JSON.stringify(n)}`);
    assert.ok(Math.abs(n.w / n.h - 2.3125) < 0.02, `2.3125: ${JSON.stringify(n)}`);

    await page.evaluate(() => maximazeWindow("My Projects"));
    await page.waitForFunction(
      (sel, w0) => {
        const p = document.querySelector(`${sel} .mp-player`).getBoundingClientRect();
        const pg = document.querySelector(`${sel} .mp-page`);
        return p.width > w0 + 50 && p.height <= pg.clientHeight - 126 + 1;
      },
      { timeout: 3000 },
      PROJECTS,
      n.w
    );
    const m = await playerBox();
    assert.equal(m.scroll, 0);
    assert.ok(m.h <= m.pageH - 126 + 1, `высота ограничена: ${JSON.stringify(m)}`);
    assert.ok(m.w / m.h > 2.3125 + 0.1, `в развёрнутом окне шире 2.3125: ${JSON.stringify(m)}`);
    assert.ok(m.titleBottom <= m.pageH + 1, `название помещается: ${JSON.stringify(m)}`);
    // Медиа — по центру с чёрными полями, не обрезаны.
    const fit = await page.$eval(`${PLAYER} video.mp-pvideo`, (v) => getComputedStyle(v).objectFit);
    assert.equal(fit, "contain");
  } finally {
    await closeProjects(page);
  }
});

test("стрелки: opacity 0.4, наведение → 1; › на 2-й слайд, ‹ с первого — на последний; точки меняют активную", async () => {
  await openBurger();
  const next = `${PLAYER} .mp-arrow--next`;
  const prev = `${PLAYER} .mp-arrow--prev`;
  await page.hover(PLAYER);
  const op = (sel) => page.$eval(sel, (e) => getComputedStyle(e).opacity);
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s)).opacity === "0.4", { timeout: 3000 }, next);
  const box = await page.$eval(next, (e) => {
    const b = e.getBoundingClientRect();
    return [b.width, b.height];
  });
  assert.deepEqual(box, [88, 44]);
  await page.hover(next);
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s)).opacity === "1", { timeout: 3000 }, next);
  assert.equal(await op(next), "1");

  await page.click(next);
  await expectSlide(1);
  await page.click(prev);
  await expectSlide(0);
  await page.click(prev);
  await expectSlide(4);
  await page.click(next);
  await expectSlide(0);

  // Справа снизу окно уведомления может перекрывать точки: щёлкаем программно.
  await page.$eval(`${PROJECTS} .mp-dot[data-index="3"]`, (b) => b.click());
  await expectSlide(3);
  assert.equal(await page.$$eval(`${PROJECTS} .mp-dot.is-active`, (l) => l.length), 1);
});

test("слайд-картинка: кнопка полного экрана при наведении краснеет", async () => {
  await openBurger();
  await page.click(`${PLAYER} .mp-arrow--next`);
  await expectSlide(1);
  const FS = `${PLAYER} .mp-slide.is-current .mp-slide-fs`;
  await page.hover(FS);
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s)).color === "rgb(255, 0, 0)", { timeout: 3000 }, FS);
});

test("слайд-картинка: object-fit contain, при наведении градиент и кнопка 40px; щелчок — requestFullscreen на .mp-player", async () => {
  await openBurger();
  await page.evaluate(() => {
    window.__fs = [];
    Element.prototype.requestFullscreen = function () {
      window.__fs.push(this.className);
      return Promise.resolve();
    };
  });
  await page.click(`${PLAYER} .mp-arrow--next`);
  await expectSlide(1);
  await page.mouse.move(1, 1);
  const img = `${PLAYER} .mp-slide[data-type="image"] img`;
  assert.equal(await page.$eval(img, (i) => getComputedStyle(i).objectFit), "contain");
  const btn = `${PLAYER} .mp-slide[data-type="image"] .mp-slide-fs`;
  const slideSel = `${PLAYER} .mp-slide[data-type="image"]`;
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s)).opacity === "0", { timeout: 3000 }, btn);
  await page.hover(slideSel);
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s)).opacity === "1", { timeout: 3000 }, btn);
  const r = await page.$eval(btn, (b) => {
    const cs = getComputedStyle(b);
    const bb = b.getBoundingClientRect();
    return { w: bb.width, h: bb.height, bg: cs.backgroundColor, radius: cs.borderTopLeftRadius };
  });
  assert.deepEqual([r.w, r.h], [40, 40]);
  assert.equal(r.bg, "rgba(0, 0, 0, 0.3)");
  assert.equal(r.radius, "28px");
  const g = await page.$eval(slideSel, (s) => {
    const af = getComputedStyle(s, "::after");
    return { h: af.height, bg: af.backgroundImage, op: af.opacity };
  });
  assert.equal(g.h, "88px");
  assert.match(g.bg, /linear-gradient/);
  assert.match(g.bg, /rgba\(0, 0, 0, 0\.78\)/);
  assert.equal(g.op, "1");
  await page.click(btn);
  assert.deepEqual(await page.evaluate(() => window.__fs), ["mp-player"]);
});

test("requestFullscreen бросает или отклоняется — страница жива", async () => {
  await openBurger();
  const errors = [];
  const onErr = (e) => errors.push(String(e));
  page.on("pageerror", onErr);
  try {
    await page.click(`${PLAYER} .mp-arrow--next`);
    await expectSlide(1);
    const btn = `${PLAYER} .mp-slide[data-type="image"] .mp-slide-fs`;
    await page.hover(`${PLAYER} .mp-slide[data-type="image"]`);
    await page.evaluate(() => {
      Element.prototype.requestFullscreen = () => {
        throw new Error("нет");
      };
    });
    await page.click(btn);
    await page.evaluate(() => {
      Element.prototype.requestFullscreen = () => Promise.reject(new Error("отказ"));
    });
    await page.click(btn);
    await new Promise((r) => setTimeout(r, 100));
    await page.click(`${PLAYER} .mp-arrow--next`);
    await expectSlide(2);
    assert.deepEqual(errors, []);
  } finally {
    page.off("pageerror", onErr);
  }
});

test("уход со слайда ставит видео в нём на паузу", async () => {
  await openBurger();
  await page.evaluate(() => {
    const s = document.querySelector("[id='window-My Projects'] .mp-slide[data-type=video]");
    const v = document.createElement("video");
    v.pause = () => (window.__paused = (window.__paused || 0) + 1);
    s.appendChild(v);
  });
  await page.click(`${PLAYER} .mp-arrow--next`);
  await expectSlide(1);
  assert.equal(await page.evaluate(() => window.__paused), 1);
});

test("один слайд — стрелок нет", async () => {
  if (await page.$(PROJECTS)) await closeProjects(page);
  const saved = await page.evaluate(() => JSON.stringify(window.MY_PROJECTS_DATA.projects));
  await page.evaluate(() => {
    const p = window.MY_PROJECTS_DATA.projects[0];
    p.media = [p.media[1]];
  });
  try {
    await fresh();
    await page.click(CARD);
    await page.waitForFunction((sel) => !document.querySelector(`${sel} .mp-project`).hidden, {}, PROJECTS);
    assert.equal(await page.$$eval(`${PLAYER} .mp-arrow`, (l) => l.filter((a) => getComputedStyle(a).display !== "none").length), 0);
  } finally {
    await page.evaluate((s) => (window.MY_PROJECTS_DATA.projects = JSON.parse(s)), saved);
    await closeProjects(page);
  }
});

// ---------- видеослайд (Task 4) ----------

const VSLIDE = `${PLAYER} .mp-slide[data-type="video"]`;
const VIDEO = `${VSLIDE} video.mp-pvideo`;
// Стенд не проигрывает медиа: длительность, время и paused подделываем, события шлём сами.
const fakeMedia = (props) =>
  page.$eval(
    VIDEO,
    (v, props) => {
      for (const [k, val] of Object.entries(props)) Object.defineProperty(v, k, { value: val, writable: true, configurable: true });
    },
    props
  );
const fire = (...types) => page.$eval(VIDEO, (v, types) => types.forEach((t) => v.dispatchEvent(new Event(t))), types);
// Шпион pause(): window.__vpaused — сколько раз ставили на паузу.
const spyPause = () =>
  page.$eval(VIDEO, (v) => {
    window.__vpaused = 0;
    v.pause = function () {
      window.__vpaused++;
      return HTMLMediaElement.prototype.pause.call(this);
    };
  });
const posterShown = () =>
  page.$eval(`${VSLIDE} .mp-vposter`, (e) => {
    const cs = getComputedStyle(e);
    return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity === "1";
  });
const waitPoster = (shown) =>
  page.waitForFunction(
    (sel, shown) => {
      const cs = getComputedStyle(document.querySelector(sel));
      const vis = cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity === "1";
      const gone = cs.visibility === "hidden" || cs.display === "none";
      return shown ? vis : gone;
    },
    { timeout: 3000 },
    `${VSLIDE} .mp-vposter`,
    shown
  );
async function startPlaying() {
  await fakeMedia({ paused: false, duration: 66.4, currentTime: 0 });
  await fire("loadedmetadata", "play", "playing");
  await waitPoster(false);
}
const stubFullscreen = () =>
  page.evaluate(() => {
    window.__fs = [];
    window.__played = [];
    Element.prototype.requestFullscreen = function () {
      window.__fs.push(this.className);
      return Promise.resolve();
    };
  });

// Перемотка требует, чтобы сервер отдавал файл по частям (HTTP Range, ответ 206): иначе Chrome
// считает видео неперематываемым (seekable 0–0) и при щелчке по дорожке начинает сначала.
test("видео перематывается: сервер отдаёт куски (206), seekable ≈ вся длительность", async () => {
  const r = await page.evaluate(async () => {
    const res = await fetch("/Assets/Projects/media/burger-cheddar/presentation.mp4", { headers: { Range: "bytes=100-199" } });
    const buf = await res.arrayBuffer();
    return { status: res.status, len: buf.byteLength, range: res.headers.get("content-range"), accept: res.headers.get("accept-ranges") };
  });
  assert.deepEqual([r.status, r.len, r.accept], [206, 100, "bytes"]);
  assert.match(r.range, /^bytes 100-199\/\d+$/);
  await openBurger();
  await page.waitForFunction(
    (s) => {
      const v = document.querySelector(s);
      return v && v.readyState >= 1 && v.seekable.length > 0 && v.seekable.end(0) > 60;
    },
    { timeout: 10000 },
    `${VSLIDE} video`
  );
});

test("видео: <video> появляется только на странице проекта, preload=metadata, без autoplay, со звуком", async () => {
  await fresh();
  assert.equal(await page.$$eval(`${PROJECTS} video`, (l) => l.filter((v) => /presentation\.mp4/.test(v.src)).length), 0);
  await page.click(CARD);
  await page.waitForSelector(VIDEO, { timeout: 3000 });
  const d = await projectData();
  const v = await page.$eval(VIDEO, (v) => ({
    src: new URL(v.getAttribute("src"), location.href).pathname,
    preload: v.preload,
    autoplay: v.autoplay,
    muted: v.muted,
    controls: v.controls,
    fit: getComputedStyle(v).objectFit,
  }));
  assert.deepEqual(v, { src: d.media[0].src, preload: "metadata", autoplay: false, muted: false, controls: false, fit: "contain" });
});

test("видео до запуска: постер, название 24px белое слева сверху, красная кнопка 68×48 r14 по центру; управление на месте", async () => {
  await openBurger();
  const d = await projectData();
  assert.equal(await posterShown(), true);
  const r = await page.$eval(PLAYER, (p) => {
    const q = (s) => p.querySelector(`.mp-slide[data-type="video"] ${s}`);
    const pr = p.getBoundingClientRect();
    const rect = (s) => {
      const b = q(s).getBoundingClientRect();
      return { x: b.left - pr.left, y: b.top - pr.top, w: b.width, h: b.height, cx: b.left + b.width / 2 - pr.left, cy: b.top + b.height / 2 - pr.top };
    };
    const cs = (s) => getComputedStyle(q(s));
    return {
      pw: pr.width,
      ph: pr.height,
      poster: new URL(q(".mp-vposter img").getAttribute("src"), location.href).pathname,
      title: q(".mp-vtitle").textContent,
      titleStyle: [cs(".mp-vtitle").fontSize, cs(".mp-vtitle").color],
      titleBox: rect(".mp-vtitle"),
      big: rect(".mp-bigplay"),
      bigStyle: [cs(".mp-bigplay").backgroundColor, cs(".mp-bigplay").borderTopLeftRadius],
      seekParts: [...q(".mp-seek").children].map((c) => c.className),
      row: [...q(".mp-vrow").children].map((c) => c.tagName.toLowerCase() + "." + c.className.split(" ")[0]),
      vplay: rect(".mp-vplay"),
      vplayRadius: cs(".mp-vplay").borderTopLeftRadius,
      knob: [rect(".mp-seek-knob").w, rect(".mp-seek-knob").h, cs(".mp-seek-knob").backgroundColor],
      buffer: cs(".mp-seek-buffer").backgroundColor,
      time: q(".mp-vtime").textContent,
      timeStyle: [cs(".mp-vtime").fontSize, cs(".mp-vtime").color, cs(".mp-vtime").fontFamily.split(",")[0].replace(/"/g, "")],
      controls: cs(".mp-vcontrols").opacity,
    };
  });
  assert.equal(r.poster, d.media[0].poster);
  assert.equal(r.title, "Burger Cheddar");
  assert.deepEqual(r.titleStyle, ["24px", "rgb(255, 255, 255)"]);
  assert.ok(r.titleBox.x < 40 && r.titleBox.y < 40, `название слева сверху: ${JSON.stringify(r.titleBox)}`);
  assert.deepEqual([r.big.w, r.big.h], [68, 48]);
  assert.deepEqual(r.bigStyle, ["rgb(255, 0, 0)", "14px"]);
  assert.ok(Math.abs(r.big.cx - r.pw / 2) < 2 && Math.abs(r.big.cy - r.ph / 2) < 2, "кнопка ▶ по центру");
  assert.deepEqual(r.seekParts, ["mp-seek-buffer", "mp-seek-played", "mp-seek-knob", "mp-seek-tip"]);
  assert.deepEqual(r.row, ["button.mp-vplay", "div.mp-vvol", "span.mp-vtime", "a.mp-vsite", "button.mp-vfs"]);
  assert.deepEqual([r.vplay.w, r.vplay.h, r.vplayRadius], [56, 56, "50%"]);
  assert.deepEqual(r.knob, [13, 13, "rgb(255, 0, 0)"]);
  assert.equal(r.buffer, "rgba(255, 255, 255, 0.6)");
  assert.match(r.time, /^0:00 \/ (0:00|1:06)$/, "до запуска — 0:00 (длительность — когда браузер прочтёт метаданные)");
  assert.deepEqual(r.timeStyle, ["16px", "rgb(255, 255, 255)", "Roboto"]);
  assert.equal(r.controls, "1", "на паузе управление видно");
});

test("большая ▶ вызывает play() (в __played — presentation.mp4), на playing постер скрыт", async () => {
  await openBurger();
  await page.evaluate(() => (window.__played = []));
  await page.click(`${VSLIDE} .mp-bigplay`);
  const played = await page.evaluate(() => window.__played);
  assert.equal(played.length, 1);
  assert.match(played[0], /\/Assets\/Projects\/media\/burger-cheddar\/presentation\.mp4$/);
  await startPlaying();
  assert.equal(await page.$eval(VSLIDE, (s) => s.classList.contains("is-playing")), true);
});

test("время «0:07 / 1:06» при currentTime 7, duration 66.4", async () => {
  await openBurger();
  await fakeMedia({ duration: 66.4, currentTime: 7 });
  await fire("loadedmetadata", "timeupdate");
  assert.equal(await text(".mp-vtime"), "0:07 / 1:06");
});

test("дорожка: проиграно красное, ширина = доля; щелчок по середине ставит currentTime ≈ duration/2", async () => {
  await openBurger();
  await fakeMedia({ duration: 66.4, currentTime: 16.6 });
  await fire("loadedmetadata", "timeupdate");
  const s = await page.$eval(`${VSLIDE} .mp-seek`, (seek) => {
    const played = seek.querySelector(".mp-seek-played");
    const b = seek.getBoundingClientRect();
    return { w: b.width, x: b.left, y: b.top, h: b.height, played: played.getBoundingClientRect().width, color: getComputedStyle(played).backgroundColor };
  });
  assert.equal(s.color, "rgb(255, 0, 0)");
  assert.ok(Math.abs(s.played - s.w / 4) < 1.5, `проиграно ${s.played} из ${s.w}`);
  await page.mouse.click(s.x + s.w / 2, s.y + s.h / 2);
  const t = await page.$eval(VIDEO, (v) => v.currentTime);
  assert.ok(Math.abs(t - 33.2) < 0.6, `currentTime ${t}`);
  const played = await page.$eval(`${VSLIDE} .mp-seek-played`, (e) => e.getBoundingClientRect().width);
  assert.ok(Math.abs(played - s.w / 2) < 1.5, "дорожка сразу показывает новое место");
});

test("при наведении «Открыть сайт» и кнопка полного экрана загораются красным", async () => {
  await openBurger();
  for (const sel of [`${VSLIDE} a.mp-vsite`, `${VSLIDE} .mp-vfs`]) {
    await page.hover(sel);
    await page.waitForFunction(
      (s) => getComputedStyle(document.querySelector(s)).color === "rgb(255, 0, 0)",
      { timeout: 3000 },
      sel
    );
  }
  await page.mouse.move(1, 1);
  await page.waitForFunction(
    (s) => getComputedStyle(document.querySelector(s)).color === "rgb(255, 255, 255)",
    { timeout: 3000 },
    `${VSLIDE} .mp-vfs`
  );
});

test("стрелки плеера: меньше (иконка 30px), в покое серые; при наведении чуть крупнее (scale 1.08) и ярко-белые", async () => {
  await openBurger();
  const ARROW = `${PLAYER} .mp-arrow--prev`;
  const s = await page.$eval(`${ARROW} svg`, (v) => {
    const p = v.querySelector("path");
    const b = p.getBoundingClientRect();
    return { w: v.getAttribute("width"), sw: p.getAttribute("stroke-width"), cap: p.getAttribute("stroke-linecap"), h: Math.round(b.height) };
  });
  assert.deepEqual([s.w, s.sw, s.cap], ["30", "3", "square"]);
  assert.ok(s.h <= 20, `шеврон слишком высокий: ${s.h}px`);
  const look = () => page.$eval(`${ARROW} svg`, (v) => ({ op: getComputedStyle(v.parentElement).opacity, sc: new DOMMatrix(getComputedStyle(v).transform).a }));
  await page.hover(PLAYER);
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s)).opacity === "0.4", { timeout: 3000 }, ARROW);
  assert.equal((await look()).sc, 1);
  await page.hover(ARROW);
  await page.waitForFunction(
    (s) => getComputedStyle(document.querySelector(s)).opacity === "1" && new DOMMatrix(getComputedStyle(document.querySelector(s + " svg")).transform).a.toFixed(2) === "1.08",
    { timeout: 3000 },
    ARROW
  );
});

test("кнопка ▶/⏸ в ряду управления при наведении краснеет", async () => {
  await openBurger();
  const B = `${VSLIDE} .mp-vplay`;
  await page.hover(B);
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s)).color === "rgb(255, 0, 0)", { timeout: 3000 }, B);
});

test("иконки плеера из макета: пуск и полный экран", async () => {
  await openBurger();
  const d = await page.$eval(VSLIDE, (sl) => ({
    play: sl.querySelector(".mp-vplay .mp-vplay-play path").getAttribute("d"),
    fs: sl.querySelector(".mp-vfs path").getAttribute("d"),
  }));
  assert.match(d.play, /^M21.3333 15.7333/);
  assert.match(d.fs, /^M24 13H17/);
});

test("громкость: кнопка звука и ползунок; щелчок по кнопке — без звука и обратно; ←↓ на ползунке тише; M — выкл/вкл", async () => {
  await openBurger();
  const VOL = `${VSLIDE} .mp-vvol`;
  const st = () => page.$eval(VSLIDE, (sl) => {
    const v = sl.querySelector("video");
    return { muted: v.muted, vol: Math.round(v.volume * 100), icon: sl.querySelector(".mp-vmute").dataset.state };
  });
  assert.equal(await page.$eval(`${VOL} .mp-vmute path`, (p) => p.getAttribute("d").slice(0, 10)), "M21.6 12.0");
  const pill = await page.$eval(VOL, (e) => { const cs = getComputedStyle(e); return [cs.height, cs.borderTopLeftRadius, cs.backgroundColor]; });
  assert.deepEqual(pill, ["40px", "28px", "rgba(0, 0, 0, 0.3)"]);
  assert.deepEqual(await st(), { muted: false, vol: 100, icon: "on" });
  await page.$eval(`${VOL} .mp-vmute`, (b) => b.click());
  assert.deepEqual(await st(), { muted: true, vol: 100, icon: "off" });
  await page.$eval(`${VOL} .mp-vmute`, (b) => b.click());
  assert.equal((await st()).muted, false);
  await page.focus(`${VOL} .mp-vslider`);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  assert.equal((await st()).vol, 80);
  // щелчок в левый край ползунка — 0 и значок «без звука»
  const box = await page.$eval(`${VOL} .mp-vslider`, (e) => { const r = e.getBoundingClientRect(); return { x: r.left + 1, y: r.top + r.height / 2 }; });
  await page.hover(VOL);
  await page.mouse.click(box.x, box.y);
  assert.deepEqual(await st(), { muted: true, vol: 0, icon: "off" });
  await page.focus(`${VSLIDE} .mp-seek`);
  await page.keyboard.press("m");
  assert.equal((await st()).muted, false);
  assert.ok((await st()).vol > 0, "после включения звука громкость не 0");
});

test("дорожка при наведении толще и показывает время под курсором", async () => {
  await openBurger();
  await fakeMedia({ duration: 66.4, currentTime: 0 });
  await fire("loadedmetadata");
  const SEEK = `${VSLIDE} .mp-seek`;
  const h = () => page.$eval(SEEK, (e) => getComputedStyle(e, "::before").height);
  assert.equal(await h(), "3px");
  const b = await page.$eval(SEEK, (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(b.x, b.y);
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s), "::before").height === "5px", { timeout: 3000 }, SEEK);
  const tip = await page.$eval(`${SEEK} .mp-seek-tip`, (t) => ({ text: t.textContent, vis: getComputedStyle(t).opacity }));
  assert.equal(tip.text, "0:33");
  assert.equal(tip.vis, "1");
});

test("«Открыть сайт» — ссылка https://dekciw.github.io/BurgerCheddar/ target _blank", async () => {
  await openBurger();
  const a = await page.$eval(`${VSLIDE} a.mp-vsite`, (a) => ({
    href: a.href,
    target: a.target,
    rel: a.rel,
    text: a.textContent.trim(),
    font: [getComputedStyle(a).fontSize, getComputedStyle(a).fontWeight],
    icon: a.querySelector("svg") && Math.round(a.querySelector("svg").getBoundingClientRect().width),
  }));
  assert.equal(a.href, "https://dekciw.github.io/BurgerCheddar/");
  assert.equal(a.target, "_blank");
  assert.match(a.rel, /noopener/);
  assert.equal(a.text, "Открыть сайт");
  assert.deepEqual(a.font, ["16px", "500"]);
  assert.equal(a.icon, 20);
});

test("Пробел/K пауза, ←/→ ±5 с, F — requestFullscreen (фокус в плеере); вне плеера клавиши не трогаем", async () => {
  await openBurger();
  await stubFullscreen();
  await spyPause();
  await fakeMedia({ paused: false, duration: 66.4, currentTime: 20 });
  await page.$eval(`${VSLIDE} .mp-seek`, (e) => e.focus());
  await page.keyboard.press("Space");
  assert.equal(await page.evaluate(() => window.__vpaused), 1, "Пробел — пауза");
  await fakeMedia({ paused: true });
  await page.keyboard.press("k");
  assert.equal(await page.evaluate(() => window.__played.length), 1, "K — снова play");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.$eval(VIDEO, (v) => v.currentTime), 25);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.$eval(VIDEO, (v) => v.currentTime), 15);
  await page.keyboard.press("f");
  assert.deepEqual(await page.evaluate(() => window.__fs), ["mp-player"]);

  // Фокус в поле под плеером (как поле комментария): пробел — это пробел, плеер не реагирует.
  await page.$eval(`${PROJECTS} .mp-comments`, (c) => {
    const t = document.createElement("textarea");
    t.className = "test-field";
    c.appendChild(t);
    t.focus();
  });
  await page.keyboard.press("Space");
  await page.keyboard.press("k");
  await page.keyboard.press("f");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.evaluate(() => window.__played.length), 1);
  assert.equal(await page.evaluate(() => window.__vpaused), 1);
  assert.deepEqual(await page.evaluate(() => window.__fs), ["mp-player"]);
  assert.equal(await page.$eval(VIDEO, (v) => v.currentTime), 15);
  assert.equal(await page.$eval(`${PROJECTS} .test-field`, (e) => e.value), " kf");
});

test("кнопки управления: Play/Pause и полный экран", async () => {
  await openBurger();
  await stubFullscreen();
  await page.$eval(`${VSLIDE} .mp-vplay`, (b) => b.click());
  assert.equal(await page.evaluate(() => window.__played.length), 1);
  await spyPause();
  await startPlaying();
  await page.$eval(`${VSLIDE} .mp-vplay`, (b) => b.click());
  assert.equal(await page.evaluate(() => window.__vpaused), 1);
  await page.$eval(`${VSLIDE} .mp-vfs`, (b) => b.click());
  assert.deepEqual(await page.evaluate(() => window.__fs), ["mp-player"]);
});

test("ended → снова постер", async () => {
  await openBurger();
  await startPlaying();
  assert.equal(await page.$eval(`${VSLIDE} .mp-vposter img`, (i) => getComputedStyle(i).visibility), "hidden");
  await fakeMedia({ paused: true, currentTime: 66.4 });
  await fire("pause", "ended");
  await waitPoster(true);
  assert.equal(await page.$eval(`${VSLIDE} .mp-vposter img`, (i) => getComputedStyle(i).visibility), "visible");
  assert.equal(await page.$eval(VSLIDE, (s) => s.classList.contains("is-playing")), false);
});

test("управление прячется через 2.5 с без движения при проигрывании (is-idle), движение мыши возвращает", async () => {
  await openBurger();
  const box = await page.$eval(PLAYER, (p) => {
    const b = p.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 3 };
  });
  await page.mouse.move(box.x, box.y);
  await startPlaying();
  const CONTROLS = `${VSLIDE} .mp-vcontrols`;
  const opacityIs = (v) =>
    page.waitForFunction((s, v) => getComputedStyle(document.querySelector(s)).opacity === v, { timeout: 3000 }, CONTROLS, v);
  await page.mouse.move(box.x + 5, box.y);
  const t0 = Date.now();
  await opacityIs("1");
  await page.waitForFunction((s) => document.querySelector(s).classList.contains("is-idle"), { timeout: 5000, polling: 50 }, VSLIDE);
  const dt = Date.now() - t0;
  assert.ok(dt >= 2300 && dt < 4000, `спрятано через ${dt} мс`);
  await opacityIs("0");
  await page.mouse.move(box.x + 20, box.y + 5);
  await page.waitForFunction((s) => !document.querySelector(s).classList.contains("is-idle"), { timeout: 3000 }, VSLIDE);
  await opacityIs("1");
  // Мышь ушла с плеера во время проигрывания — управление прячется; пауза — снова видно.
  await page.mouse.move(1, 1);
  await opacityIs("0");
  await fakeMedia({ paused: true });
  await fire("pause");
  await opacityIs("1");
});

test("закрытие окна на странице проекта — видео на паузе", async () => {
  await openBurger();
  await startPlaying();
  await spyPause();
  await closeProjects(page);
  await page.waitForFunction(() => window.__vpaused > 0, { timeout: 3000 });
});

test("переход в сетку — видео на паузе", async () => {
  await openBurger();
  await startPlaying();
  await spyPause();
  await page.click(`${PROJECTS} [data-mp-tool="home"]`);
  await expectGrid();
  assert.ok((await page.evaluate(() => window.__vpaused)) > 0);
});

test("мышь: после щелчка по большой ▶ Пробел ставит на паузу; после щелчка по видео K и ← работают", async () => {
  await openBurger();
  await page.evaluate(() => (window.__played = []));
  await spyPause();
  await page.click(`${VSLIDE} .mp-bigplay`);
  assert.equal(await page.evaluate(() => window.__played.length), 1);
  await startPlaying();
  const focusInPlayer = () => page.$eval(PLAYER, (p) => p.contains(document.activeElement));
  assert.equal(await focusInPlayer(), true, "после ▶ фокус в плеере, а не на body");
  await page.keyboard.press("Space");
  assert.equal(await page.evaluate(() => window.__vpaused), 1, "Пробел — пауза");
  assert.equal(await page.$eval(`${PROJECTS} .mp-page`, (p) => p.scrollTop), 0, "Пробел не прокручивает страницу");

  // Снова играет; щелчок по самому видео (пауза), затем клавиши.
  await fakeMedia({ paused: false, currentTime: 20 });
  await fire("play", "playing");
  await waitPoster(false);
  const b = await page.$eval(PLAYER, (p) => {
    const r = p.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 3 };
  });
  await page.mouse.click(b.x, b.y);
  assert.equal(await page.evaluate(() => window.__vpaused), 2, "щелчок по видео — пауза");
  assert.equal(await focusInPlayer(), true, "после щелчка по видео фокус в плеере");
  await fakeMedia({ paused: true });
  await fire("pause");
  await page.keyboard.press("k");
  assert.equal(await page.evaluate(() => window.__played.length), 2, "K — play");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.$eval(VIDEO, (v) => v.currentTime), 15, "← — минус 5 с");
});

test("плеер без своей рамки фокуса (outline none)", async () => {
  await openBurger();
  const r = await page.$eval(PLAYER, (p) => {
    p.focus();
    return { active: document.activeElement === p, tab: p.tabIndex, outline: getComputedStyle(p).outlineStyle };
  });
  assert.deepEqual(r, { active: true, tab: -1, outline: "none" });
});

test("play() отклонён — снова постер с ▶; событие error — тоже", async () => {
  await openBurger();
  // Как в браузере при ошибке файла: событие play, затем промис отклоняется.
  await page.$eval(VIDEO, (v) => {
    v.play = function () {
      this.dispatchEvent(new Event("play"));
      return Promise.reject(new DOMException("нет файла", "NotSupportedError"));
    };
  });
  await page.click(`${VSLIDE} .mp-bigplay`);
  await page.waitForFunction((s) => !document.querySelector(s).classList.contains("is-playing"), { timeout: 3000 }, VSLIDE);
  await waitPoster(true);
  assert.equal(await page.$eval(VSLIDE, (s) => s.classList.contains("is-started")), false);
  assert.equal(await page.$eval(`${VSLIDE} .mp-vposter img`, (i) => getComputedStyle(i).visibility), "visible");

  await startPlaying();
  await fire("error");
  await waitPoster(true);
  assert.equal(await page.$eval(VSLIDE, (s) => s.classList.contains("is-playing")), false);
  assert.equal(await page.$eval(VSLIDE, (s) => s.classList.contains("is-started")), false);
  assert.equal(await page.$eval(`${VSLIDE} .mp-vposter img`, (i) => getComputedStyle(i).visibility), "visible");
});

test("idle при проигрывании: стрелки прячутся (opacity 0), спрятанные стрелки и управление не ловят щелчки", async () => {
  await openBurger();
  const box = await page.$eval(PLAYER, (p) => {
    const b = p.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 3 };
  });
  await page.mouse.move(box.x, box.y);
  await startPlaying();
  await page.mouse.move(box.x + 5, box.y);
  const CONTROLS = `${VSLIDE} .mp-vcontrols`;
  const ARROW = `${PLAYER} .mp-arrow--next`;
  const styleIs = (sel, prop, v) =>
    page.waitForFunction((s, prop, v) => getComputedStyle(document.querySelector(s))[prop] === v, { timeout: 5000 }, sel, prop, v);
  await styleIs(CONTROLS, "pointerEvents", "auto");
  await page.waitForFunction((s) => document.querySelector(s).classList.contains("is-idle"), { timeout: 5000, polling: 50 }, VSLIDE);
  await styleIs(ARROW, "opacity", "0");
  assert.equal(await page.$eval(ARROW, (a) => getComputedStyle(a).pointerEvents), "none");
  assert.equal(await page.$eval(CONTROLS, (c) => getComputedStyle(c).pointerEvents), "none");
  // Движение мыши — всё снова видно и доступно.
  await page.mouse.move(box.x + 20, box.y + 5);
  await styleIs(ARROW, "opacity", "0.4");
  await styleIs(CONTROLS, "pointerEvents", "auto");
  assert.equal(await page.$eval(ARROW, (a) => getComputedStyle(a).pointerEvents), "auto");
  // Мышь ушла с плеера во время проигрывания — управление спрятано и не ловит щелчки.
  await page.mouse.move(1, 1);
  await styleIs(CONTROLS, "pointerEvents", "none");
});

// ---------- комментарии ----------

const COMMENTS = `${PROJECTS} .mp-comments`;
const clearComments = () =>
  page.evaluate(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("mp-comments:") || k.startsWith("mp-reactions:"))
        .forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
    // свои комментарии теперь в памяти страницы — сбрасываем как при обновлении
    if (window.MyProjectsPage && window.MyProjectsPage.clearSessionComments) window.MyProjectsPage.clearSessionComments();
  });
const ctext = (sel) => page.$eval(`${COMMENTS} ${sel}`, (e) => e.textContent.trim());
const bg = (sel) => page.$eval(`${COMMENTS} ${sel}`, (e) => getComputedStyle(e).backgroundColor);

// Механика комментариев проверяется на пустом списке: опубликованные комментарии из данных
// временно убираются (оригинал хранится в window.__realComments и возвращается в тестах данных).
async function openBurgerClean() {
  await clearComments();
  await page.evaluate((s) => {
    const p = window.MY_PROJECTS_DATA.projects.find((x) => x.slug === s);
    if (!window.__realComments) window.__realComments = p.comments;
    p.comments = [];
  }, SLUG);
  await openBurger();
}
async function restoreRealComments() {
  await page.evaluate((s) => {
    const p = window.MY_PROJECTS_DATA.projects.find((x) => x.slug === s);
    if (window.__realComments) p.comments = window.__realComments;
  }, SLUG);
}

test("комментарии: в данных 3 опубликованных комментария — видны всегда, «3 комментария»", async () => {
  await clearComments();
  await restoreRealComments();
  await openBurger();
  const d = await page.evaluate((s) => window.MY_PROJECTS_DATA.projects.find((x) => x.slug === s).comments, SLUG);
  assert.equal(d.length, 3);
  for (const c of d) {
    assert.match(c.user, /^@[\w.]+$/);
    assert.match(c.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(c.text.length > 20 && Number.isInteger(c.likes));
  }
  assert.equal(await ctext(".mp-ccount"), "3 комментария");
  assert.equal(await page.$$eval(`${COMMENTS} .mp-comment`, (l) => l.length), 3);
});

test("комментарии: поле при фокусе — линия снизу красная", async () => {
  await openBurgerClean();
  await page.click(`${COMMENTS} .mp-cinput`);
  await page.waitForFunction(
    (s) => getComputedStyle(document.querySelector(s)).borderBottomColor === "rgb(255, 0, 0)",
    { timeout: 3000 },
    `${COMMENTS} .mp-cinput`
  );
});

test("комментарии: лайк — иконка из макета (контур), у нажатой — заливка", async () => {
  await openBurgerClean();
  await postComment("иконка");
  const icon = () => page.$eval(`${COMMENTS} .mp-comment .mp-like svg`, (v) => ({
    tag: v.getAttribute("data-icon"),
    d: v.querySelector("path").getAttribute("d"),
    fill: getComputedStyle(v.querySelector("path")).fill,
  }));
  let s = await icon();
  assert.equal(s.tag, "thumb");
  assert.match(s.d, /^M6.248 0.00955/);
  assert.ok(s.d.includes("M4.59 7.39855"), "контур: внутренний вырез на месте");
  assert.equal(s.fill, "rgb(255, 255, 255)");
  await page.click(`${COMMENTS} .mp-comment .mp-like`);
  s = await icon();
  assert.ok(!s.d.includes("M4.59 7.39855"), "нажатый лайк — сплошная заливка без выреза");
});

test("комментарии: свои комментарии пропадают после обновления страницы, опубликованные остаются", async () => {
  await clearComments();
  await restoreRealComments();
  await openBurger();
  await postComment("исчезну");
  assert.equal(await ctext(".mp-ccount"), "4 комментария");
  assert.equal(await page.evaluate((s) => localStorage.getItem("mp-comments:" + s), SLUG), null);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof openWindowHTML === "string" && openWindowHTML.length > 0);
  await openBurger();
  assert.equal(await ctext(".mp-ccount"), "3 комментария");
  assert.ok(!(await page.$$eval(`${COMMENTS} .mp-ctext`, (l) => l.map((e) => e.textContent))).includes("исчезну"));
});

test("комментарии: «Отправить» с текстом при наведении темнеет (#cc0000)", async () => {
  await openBurgerClean();
  await page.click(`${COMMENTS} .mp-cinput`);
  await page.keyboard.type("тёмная кнопка");
  const SEND = `${COMMENTS} .mp-csend`;
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s)).backgroundColor === "rgb(255, 0, 0)", { timeout: 3000 }, SEND);
  await page.hover(SEND);
  await page.waitForFunction((s) => getComputedStyle(document.querySelector(s)).backgroundColor === "rgb(204, 0, 0)", { timeout: 3000 }, SEND);
});

test("комментарии: «⋯» своего комментария — без круга, точки мелкие (r ≤ 1.3), подсветка при наведении — круг 32px", async () => {
  await openBurgerClean();
  await postComment("точки");
  const s = await page.$eval(`${COMMENTS} .mp-comment.is-mine .mp-cmore`, (b) => ({
    bg: getComputedStyle(b).backgroundColor,
    r: Math.max(...[...b.querySelectorAll("circle")].map((c) => Number(c.getAttribute("r")))),
    n: b.querySelectorAll("circle").length,
  }));
  assert.equal(s.bg, "rgba(0, 0, 0, 0)");
  assert.equal(s.n, 3);
  assert.ok(s.r <= 1.3, `точки r=${s.r}`);
  const MORE = `${COMMENTS} .mp-comment.is-mine .mp-cmore`;
  await page.$eval(MORE, (b) => b.scrollIntoView({ block: "center" }));
  await page.hover(MORE);
  const under = await page.$eval(MORE, (b) => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && (e === b || b.contains(e)) ? "ok" : (e ? e.className || e.tagName : "null"); });
  assert.equal(under, "ok", "под курсором не кнопка «⋯»");
  const h = await page.$eval(MORE, (b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), getComputedStyle(b).backgroundColor]; });
  assert.deepEqual(h.slice(0, 2), [32, 32]);
  assert.notEqual(h[2], "rgba(0, 0, 0, 0)");
});

test("комментарии: меню сортировки компактное (13px, пункт ≤ 32px, ширина ≤ 160px), полоса наведения ровная — во всю ширину и по скруглению меню", async () => {
  await openBurgerClean();
  await page.click(`${COMMENTS} .mp-csort`);
  const ITEM = `${COMMENTS} .mp-csort-menu .mp-csort-item:nth-child(2)`;
  const m = await page.$eval(ITEM, (i) => ({ size: getComputedStyle(i).fontSize, h: i.getBoundingClientRect().height }));
  assert.equal(m.size, "13px");
  assert.ok(m.h <= 32, `пункт высотой ${m.h}px`);
  const menu = await page.$eval(`${COMMENTS} .mp-csort-menu`, (e) => { const r = e.getBoundingClientRect(); return { w: r.width, overflow: getComputedStyle(e).overflow, padY: getComputedStyle(e).paddingTop }; });
  assert.ok(menu.w <= 160, `меню шириной ${menu.w}px`);
  assert.equal(menu.overflow, "hidden", "полоса должна обрезаться по скруглению меню");
  // полоса во всю ширину меню (без зазоров по бокам)
  const gap = await page.$eval(ITEM, (i) => { const a = i.getBoundingClientRect(), b = i.parentElement.getBoundingClientRect(); return Math.round(b.right - a.right) + Math.round(a.left - b.left); });
  assert.ok(gap <= 2, `зазор полосы ${gap}px`);
  // полоса первого и последнего пункта доходит до верхнего и нижнего края меню (без тёмной полоски)
  const edges = await page.$eval(`${COMMENTS} .mp-csort-menu`, (m) => { const r = m.getBoundingClientRect(), cs = getComputedStyle(m), bw = parseFloat(cs.borderTopWidth); const f = m.firstElementChild.getBoundingClientRect(), l = m.lastElementChild.getBoundingClientRect(); return { top: Math.round(f.top - r.top - bw), bottom: Math.round(r.bottom - bw - l.bottom) }; });
  assert.deepEqual(edges, { top: 0, bottom: 0 });
  // открыто мышью — без подчёркивания у пунктов (подчёркивание только для клавиатуры)
  assert.deepEqual(await page.$$eval(`${COMMENTS} .mp-csort-item`, (l) => l.map((i) => getComputedStyle(i).textDecorationLine)), ["none", "none"]);
  await page.hover(ITEM);
  assert.equal(await page.$eval(ITEM, (i) => getComputedStyle(i).backgroundColor), "rgb(62, 62, 62)");
  assert.equal(await page.$eval(`${COMMENTS} .mp-csort-menu .mp-csort-item:nth-child(1)`, (i) => getComputedStyle(i).backgroundColor), "rgba(0, 0, 0, 0)");
  await page.keyboard.press("Escape");
});

test("комментарии: меню «Удалить» маленькое (13px, пункт ≤ 32px, ширина ≤ 110px)", async () => {
  await openBurgerClean();
  await postComment("меньше");
  const MORE = `${COMMENTS} .mp-comment.is-mine .mp-cmore`;
  await page.$eval(MORE, (b) => b.click());
  const d = await page.$eval(`${COMMENTS} .mp-comment.is-mine .mp-cdelete`, (b) => { const r = b.getBoundingClientRect(), m = b.parentElement.getBoundingClientRect(); return { size: getComputedStyle(b).fontSize, h: r.height, w: m.width }; });
  assert.equal(d.size, "13px");
  assert.ok(d.h <= 32 && d.w <= 110, JSON.stringify(d));
});

test("комментарии: у своего комментария «⋯» → «Удалить» убирает его; у опубликованных «⋯» нет", async () => {
  await clearComments();
  await restoreRealComments();
  await openBurger();
  assert.equal(await page.$$eval(`${COMMENTS} .mp-cmore`, (l) => l.length), 0, "у опубликованных нет меню");
  await postComment("удали меня");
  assert.equal(await ctext(".mp-ccount"), "4 комментария");
  const MINE = `${COMMENTS} .mp-comment.is-mine`;
  assert.equal(await page.$$eval(`${COMMENTS} .mp-cmore`, (l) => l.length), 1);
  const MENU = `${MINE} .mp-cmore-menu`;
  assert.equal(await page.$eval(MENU, (m) => m.hidden), true);
  await page.click(`${MINE} .mp-cmore`);
  assert.equal(await page.$eval(MENU, (m) => m.hidden), false);
  assert.equal(await page.$eval(`${MENU} .mp-cdelete`, (b) => b.textContent.trim()), "Удалить");
  // Esc и щелчок мимо закрывают меню
  await page.keyboard.press("Escape");
  assert.equal(await page.$eval(MENU, (m) => m.hidden), true);
  await page.click(`${MINE} .mp-cmore`);
  await page.click(`${COMMENTS} .mp-ccount`);
  assert.equal(await page.$eval(MENU, (m) => m.hidden), true);
  await page.click(`${MINE} .mp-cmore`);
  await page.click(`${MENU} .mp-cdelete`);
  await page.waitForFunction((s) => !document.querySelector(s), { timeout: 3000 }, MINE);
  assert.equal(await ctext(".mp-ccount"), "3 комментария");
  // удалённый не возвращается после закрытия и открытия окна
  await openBurger();
  assert.equal(await ctext(".mp-ccount"), "3 комментария");
});

test("комментарии: «Сортировка» открывает меню «Сначала новые / Сначала популярные», выбранный пункт красный", async () => {
  const list = [mk("@a", "2026-11-01", "старый но популярный", 20), mk("@b", "2026-11-10", "новый", 2)];
  await withDataComments(list, async () => {
    const users = () => page.$$eval(`${COMMENTS} .mp-comment .mp-cuser`, (l) => l.map((e) => e.textContent.trim()));
    const MENU = `${COMMENTS} .mp-csort-menu`;
    assert.equal(await page.$eval(MENU, (m) => m.hidden), true);
    assert.deepEqual(await users(), ["@b", "@a"], "по умолчанию — сначала новые");
    await page.click(`${COMMENTS} .mp-csort`);
    assert.equal(await page.$eval(MENU, (m) => m.hidden), false);
    const items = await page.$$eval(`${MENU} .mp-csort-item`, (l) =>
      l.map((i) => [i.textContent.trim(), getComputedStyle(i).color, i.getAttribute("aria-checked")])
    );
    assert.deepEqual(items, [
      ["Сначала новые", "rgb(255, 0, 0)", "true"],
      ["Сначала популярные", "rgb(255, 255, 255)", "false"],
    ]);
    const box = await page.$eval(MENU, (m) => {
      const cs = getComputedStyle(m);
      return [cs.borderTopLeftRadius, cs.backgroundColor];
    });
    assert.equal(box[0], "12px");
    await page.click(`${MENU} .mp-csort-item:nth-child(2)`);
    assert.equal(await page.$eval(MENU, (m) => m.hidden), true);
    assert.deepEqual(await users(), ["@a", "@b"]);
    // повторно открыть и закрыть щелчком мимо / Esc
    await page.click(`${COMMENTS} .mp-csort`);
    await page.keyboard.press("Escape");
    assert.equal(await page.$eval(MENU, (m) => m.hidden), true);
    await page.click(`${COMMENTS} .mp-csort`);
    await page.click(`${COMMENTS} .mp-ccount`);
    assert.equal(await page.$eval(MENU, (m) => m.hidden), true);
  });
});
async function postComment(t) {
  await page.click(`${COMMENTS} .mp-cinput`);
  await page.keyboard.type(t);
  await page.keyboard.press("Enter");
  await page.waitForFunction((s) => document.querySelectorAll(`${s} .mp-comment`).length > 0, {}, COMMENTS);
}
// Подмена комментариев в данных Burger Cheddar на время одного теста.
async function withDataComments(list, fn) {
  if (await page.$(PROJECTS)) await closeProjects(page);
  await clearComments();
  const saved = await page.evaluate(() => JSON.stringify(window.MY_PROJECTS_DATA.projects));
  await page.evaluate(
    (l, s) => {
      window.MY_PROJECTS_DATA.projects.find((p) => p.slug === s).comments = l;
    },
    list,
    SLUG
  );
  try {
    await openBurger();
    await fn();
  } finally {
    await page.evaluate((s) => (window.MY_PROJECTS_DATA.projects = JSON.parse(s)), saved);
    await closeProjects(page);
  }
}

test("комментарии: пусто — «0 комментариев», кнопка неактивна #272727, поле с placeholder", async () => {
  await openBurgerClean();
  assert.equal(await ctext(".mp-ccount"), "0 комментариев");
  assert.equal(await page.$eval(`${COMMENTS} .mp-cinput`, (t) => t.placeholder), "Добавьте комментарий…");
  assert.equal(await page.$eval(`${COMMENTS} .mp-csend`, (b) => b.disabled), true);
  assert.equal(await bg(".mp-csend"), "rgb(39, 39, 39)");
  assert.equal(await page.$$eval(`${COMMENTS} .mp-comment`, (l) => l.length), 0);
});

test("комментарии: ввод — кнопка красная; Enter отправляет: «1 комментарий», @гость, «только что», поле очищено", async () => {
  await openBurgerClean();
  await page.click(`${COMMENTS} .mp-cinput`);
  await page.keyboard.type("Привет!");
  await page.waitForFunction(
    (s) => getComputedStyle(document.querySelector(s)).backgroundColor === "rgb(255, 0, 0)",
    {},
    `${COMMENTS} .mp-csend`
  );
  await page.keyboard.press("Enter");
  await page.waitForFunction((s) => document.querySelectorAll(`${s} .mp-comment`).length === 1, {}, COMMENTS);
  assert.equal(await ctext(".mp-ccount"), "1 комментарий");
  assert.equal(await ctext(".mp-comment .mp-cuser"), "@гость");
  assert.match(await ctext(".mp-comment .mp-ctime"), /только что/);
  assert.equal(await ctext(".mp-comment .mp-ctext"), "Привет!");
  assert.equal(await page.$eval(`${COMMENTS} .mp-cinput`, (t) => t.value), "");
  assert.equal(await page.$eval(`${COMMENTS} .mp-csend`, (b) => b.disabled), true);
});

test("комментарии: кнопка «Отправить» отправляет; пробелы — не комментарий", async () => {
  await openBurgerClean();
  await page.click(`${COMMENTS} .mp-cinput`);
  await page.keyboard.type("   ");
  assert.equal(await page.$eval(`${COMMENTS} .mp-csend`, (b) => b.disabled), true);
  await page.keyboard.press("Enter");
  assert.equal(await page.$$eval(`${COMMENTS} .mp-comment`, (l) => l.length), 0);
  await page.keyboard.type("текст");
  await page.click(`${COMMENTS} .mp-csend`);
  await page.waitForFunction((s) => document.querySelectorAll(`${s} .mp-comment`).length === 1, {}, COMMENTS);
});

test("комментарии: Shift+Enter — перенос строки, не отправка", async () => {
  await openBurgerClean();
  await page.click(`${COMMENTS} .mp-cinput`);
  await page.keyboard.type("a b");
  await page.keyboard.down("Shift");
  await page.keyboard.press("Enter");
  await page.keyboard.up("Shift");
  await page.keyboard.type("c");
  assert.equal(await page.$eval(`${COMMENTS} .mp-cinput`, (t) => t.value), "a b\nc");
  assert.equal(await page.$$eval(`${COMMENTS} .mp-comment`, (l) => l.length), 0);
});

test("комментарии: сохраняются после закрытия и открытия окна", async () => {
  await openBurgerClean();
  await postComment("Останусь");
  await openBurger(); // fresh() закрывает окно и открывает заново
  await page.waitForFunction((s) => document.querySelectorAll(`${s} .mp-comment`).length === 1, {}, COMMENTS);
  assert.equal(await ctext(".mp-comment .mp-ctext"), "Останусь");
  assert.equal(await ctext(".mp-ccount"), "1 комментарий");
});

test("комментарии: испорченный localStorage не ломает страницу", async () => {
  await clearComments();
  await page.evaluate((s) => {
    localStorage.setItem(`mp-comments:${s}`, "{не json");
    localStorage.setItem(`mp-reactions:${s}`, "[1,");
  }, SLUG);
  const errors = [];
  const onErr = (e) => errors.push(String(e));
  page.on("pageerror", onErr);
  try {
    await openBurger();
    assert.equal(await ctext(".mp-ccount"), "0 комментариев");
    await postComment("жив");
    assert.deepEqual(errors, []);
  } finally {
    page.off("pageerror", onErr);
    await clearComments();
  }
});

test("комментарии: 👍 ставит/снимает лайк (+1/−1), 👎 аналогично, взаимоисключение", async () => {
  await openBurgerClean();
  await postComment("реакции");
  const C = `${COMMENTS} .mp-comment`;
  const counts = () =>
    page.$eval(C, (c) => [c.querySelector(".mp-like").textContent.trim(), c.querySelector(".mp-dislike").textContent.trim()]);
  const on = () =>
    page.$eval(C, (c) => [c.querySelector(".mp-like").classList.contains("is-on"), c.querySelector(".mp-dislike").classList.contains("is-on")]);
  assert.deepEqual(await counts(), ["0", "0"]);
  await page.click(`${C} .mp-like`);
  assert.deepEqual(await counts(), ["1", "0"]);
  assert.deepEqual(await on(), [true, false]);
  await page.click(`${C} .mp-like`);
  assert.deepEqual(await counts(), ["0", "0"]);
  await page.click(`${C} .mp-dislike`);
  assert.deepEqual(await counts(), ["0", "1"]);
  await page.click(`${C} .mp-like`); // взаимоисключение
  assert.deepEqual(await counts(), ["1", "0"]);
  assert.deepEqual(await on(), [true, false]);
  // реакция переживает перезапуск окна
  await openBurger();
  await page.waitForSelector(C);
  assert.deepEqual(await counts(), ["1", "0"]);
  assert.deepEqual(await on(), [true, false]);
});

const mk = (user, date, text, likes, dislikes = 0) => ({ user, date, text, likes, dislikes });


test("комментарии: склонения 1 комментарий, 2 комментария, 5 комментариев", async () => {
  const many = (n) => Array.from({ length: n }, (_, i) => mk("@u" + i, "2026-11-01", "т" + i, i));
  for (const [n, label] of [
    [1, "1 комментарий"],
    [2, "2 комментария"],
    [5, "5 комментариев"],
  ]) {
    await withDataComments(many(n), async () => {
      assert.equal(await ctext(".mp-ccount"), label);
    });
  }
});

test("комментарии: XSS — текст с разметкой выводится как текст", async () => {
  await openBurgerClean();
  const payload = "<img src=x onerror=window.__xss=1>";
  await page.evaluate(() => delete window.__xss);
  await postComment(payload);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
  assert.equal(await ctext(".mp-comment .mp-ctext"), payload);
  assert.equal(await page.$$eval(`${COMMENTS} .mp-ctext img`, (l) => l.length), 0);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
});

test("комментарии: после реакции с клавиатуры фокус остаётся на кнопке того же комментария", async () => {
  await openBurgerClean();
  await postComment("фокус");
  const like = `${COMMENTS} .mp-comment .mp-like`;
  await page.focus(like);
  await page.keyboard.press("Enter");
  const st = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      return { cls: a.className, count: a.textContent.trim(), same: !!a.closest(".mp-comment") };
    });
  assert.deepEqual(await st(), { cls: "mp-like is-on", count: "1", same: true });
  await page.keyboard.press("Space");
  assert.deepEqual(await st(), { cls: "mp-like", count: "0", same: true });
});

test("комментарии: поле 32px пустое и после набора/стирания, растёт по строкам, максимум 120px", async () => {
  await openBurgerClean();
  const h = () => page.$eval(`${COMMENTS} .mp-cinput`, (t) => t.getBoundingClientRect().height);
  assert.equal(await h(), 32);
  await page.click(`${COMMENTS} .mp-cinput`);
  await page.keyboard.type("a");
  assert.equal(await h(), 32);
  await page.keyboard.press("Backspace");
  assert.equal(await h(), 32);
  await page.keyboard.type("1");
  for (const c of "234") {
    await page.keyboard.down("Shift");
    await page.keyboard.press("Enter");
    await page.keyboard.up("Shift");
    await page.keyboard.type(c);
  }
  assert.ok((await h()) > 32, "растёт");
  for (let i = 0; i < 12; i++) {
    await page.keyboard.down("Shift");
    await page.keyboard.press("Enter");
    await page.keyboard.up("Shift");
  }
  assert.equal(await h(), 120);
});

test("комментарии: аватар — SVG-силуэт 32px (в поле добавления и в списке), цвет currentColor", async () => {
  await openBurgerClean();
  await postComment("аватар");
  const r = await page.$$eval(`${COMMENTS} .mp-cavatar`, (l) =>
    l.map((a) => {
      const b = a.getBoundingClientRect();
      return { svg: !!a.querySelector("svg"), w: b.width, h: b.height, img: !!a.querySelector("img") || a.tagName === "IMG" };
    })
  );
  assert.equal(r.length, 2);
  for (const a of r) assert.deepEqual(a, { svg: true, w: 32, h: 32, img: false });
  assert.equal(await page.$$eval(`${COMMENTS} .mp-cavatar svg [stroke="currentColor"], ${COMMENTS} .mp-cavatar svg [fill="currentColor"]`, (l) => l.length > 0), true);
});

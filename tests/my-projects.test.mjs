import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness, openProjects, closeProjects, PROJECTS } from "./helpers/harness.mjs";

// Окно «Мои проекты»: шапка с поиском, меню категорий, сетка карточек, светлая/тёмная тема.

let h;
let page;
const requests = [];
const consoleErrors = [];
before(async () => {
  h = await startHarness();
  page = h.page;
  page.on("request", (r) => requests.push(r.url()));
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  await page.waitForSelector('[id="window-GitHub"]', { timeout: 10000 });
  await page.evaluate(() => {
    try {
      localStorage.removeItem("mp-theme");
    } catch (e) {}
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

async function fresh() {
  if (await page.$(PROJECTS)) await closeProjects(page);
  await openProjects(page);
  await page.waitForFunction(
    (sel) => {
      const p = document.querySelector(`${sel} .mp-page`);
      return p && getComputedStyle(p).overflowY === "auto";
    },
    { timeout: 5000 },
    PROJECTS
  );
}
const text = (sel) => page.$eval(`${PROJECTS} ${sel}`, (e) => e.textContent.trim());
const titles = () => page.$$eval(`${PROJECTS} .mp-card .mp-title`, (l) => l.map((e) => e.textContent.trim()));
const projectsData = () => page.evaluate(() => window.MY_PROJECTS_DATA);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickMenu(label) {
  const handle = await page.evaluateHandle(
    (sel, label) =>
      [...document.querySelectorAll(`${sel} .drop_down_label`)].find((l) => l.textContent.trim() === label),
    PROJECTS,
    label
  );
  await handle.asElement().click();
}

test("иконка «Мои проекты» на рабочем столе сразу после «Моё резюме», все иконки видны", async () => {
  assert.equal(await page.$eval('.icon[data-app="My Projects"] span', (e) => e.textContent.trim()), "Мои проекты");
  const prev = await page.$eval('.icon[data-app="My Projects"]', (e) => e.previousElementSibling?.dataset.app);
  assert.equal(prev, "Resume");
  const hidden = await page.evaluate(() => {
    const desk = document.getElementById("desktop").getBoundingClientRect();
    return [...document.querySelectorAll("#desktop .icon")]
      .filter((i) => {
        const r = i.getBoundingClientRect();
        return r.bottom > desk.bottom || r.right > desk.right;
      })
      .map((i) => i.querySelector("span")?.textContent.trim());
  });
  assert.deepEqual(hidden, []);
});

test("двойной клик: окно «Мои проекты» по центру, кнопка в панели задач, адрес myprojects.com", async () => {
  await fresh();
  assert.equal(await text(".window-header-title"), "Мои проекты");
  assert.equal(await page.$eval('[id="taskbar-My Projects"] span', (e) => e.textContent.trim()), "Мои проекты");
  assert.equal(await text(".mp-address"), "https://www.myprojects.com");
  assert.equal(await text(".mp-status-text"), "Готово");
  assert.equal(await text(".mp-status-zone"), "Мои проекты");
  const fits = await page.$eval(PROJECTS, (w) => {
    const d = document.getElementById("desktop").getBoundingClientRect();
    const r = w.getBoundingClientRect();
    return r.left >= d.left && r.top >= d.top && r.right <= d.right && r.bottom <= d.bottom;
  });
  assert.equal(fits, true);
});

test("все картинки окна загружаются (иконки XP, соцсети, аватары, заглушки)", async () => {
  await fresh();
  await page.waitForFunction(
    (sel) => [...document.querySelectorAll(`${sel} img`)].every((i) => i.complete),
    { timeout: 5000 },
    PROJECTS
  );
  const broken = await page.$$eval(`${PROJECTS} img`, (l) =>
    l.filter((i) => !(i.naturalWidth > 0)).map((i) => i.getAttribute("src"))
  );
  assert.deepEqual(broken, []);
});

test("карточек столько же, сколько проектов в данных; на превью нет бейджа с числом элементов", async () => {
  await fresh();
  const d = await projectsData();
  assert.deepEqual(await titles(), d.projects.map((p) => p.title));
  assert.equal(await page.$$eval(`${PROJECTS} .mp-thumb`, (l) => l.filter((t) => /элемент/.test(t.textContent)).length), 0);
});

// Пока в данных одна карточка (доводим её до ума, потом масштабируем).
test("в данных пока одна карточка — «Burger Cheddar»", async () => {
  await fresh();
  const d = await projectsData();
  assert.deepEqual(d.projects.map((p) => p.title), ["Burger Cheddar"]);
  assert.deepEqual(await titles(), ["Burger Cheddar"]);
});

// ---- Видео-превью карточки: обложка в покое, видео по кругу при наведении, красная дорожка ----
const COVER = "/Assets/Projects/covers/BurgerCheddar.jpg";
const VIDEO = "/Assets/Projects/previews/BurgerCheddar.mp4";
const CARD = `${PROJECTS} .mp-card`;
const previewState = () =>
  page.$eval(CARD, (c) => {
    const t = c.querySelector(".mp-thumb");
    const v = t.querySelector("video.mp-thumb-video");
    const prog = t.querySelector(".mp-progress");
    const bar = t.querySelector(".mp-progress-bar");
    return {
      playing: t.classList.contains("is-playing"),
      coverSrc: t.querySelector("img.mp-thumb-cover")?.getAttribute("src"),
      coverOpacity: getComputedStyle(t.querySelector("img.mp-thumb-cover")).opacity,
      src: v.getAttribute("src"),
      preload: v.preload,
      muted: v.muted,
      loop: v.loop,
      progOpacity: getComputedStyle(prog).opacity,
      progHeight: getComputedStyle(prog).height,
      barColor: getComputedStyle(bar).backgroundColor,
      barW: bar.getBoundingClientRect().width,
      progW: prog.getBoundingClientRect().width,
    };
  });
async function leaveCard() {
  await page.mouse.move(2, 2);
  await page.$eval(CARD, (c) => c.blur());
}
// Стенд подменяет play(); pause() отмечаем сами, чтобы видеть вызов.
async function trackPause() {
  await page.evaluate(() => {
    if (window.__pauseTracked) return;
    window.__pauseTracked = true;
    const orig = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function () {
      this.__paused = true;
      return orig.call(this);
    };
  });
}

test("превью до наведения: обложка видна, видео не загружено, дорожки не видно", async () => {
  await fresh();
  await leaveCard();
  const s = await previewState();
  assert.equal(s.coverSrc, COVER);
  assert.equal(s.coverOpacity, "1");
  assert.equal(s.src, null, "видео не должно получать src до наведения");
  assert.equal(s.preload, "none");
  assert.ok(s.muted && s.loop);
  assert.equal(s.playing, false);
  assert.equal(s.progOpacity, "0");
  assert.ok(!requests.some((u) => u.includes("previews/BurgerCheddar.mp4")), "видео запрошено до наведения");
});

test("наведение: видео с начала, после playing обложка скрыта, красная дорожка 3px растёт", async () => {
  await fresh();
  await leaveCard();
  await page.evaluate(() => (window.__played.length = 0));
  await page.hover(CARD);
  assert.ok((await page.evaluate(() => window.__played)).some((s) => s.endsWith(VIDEO)), "play() не вызван");
  let s = await previewState();
  assert.equal(s.src, VIDEO);
  assert.equal(s.playing, false, "до playing обложка не прячется");
  await page.$eval(`${CARD} video`, (v) => {
    Object.defineProperty(v, "duration", { value: 8, configurable: true });
    Object.defineProperty(v, "currentTime", { value: 4, configurable: true, writable: true });
    v.dispatchEvent(new Event("playing"));
  });
  // обложка гаснет плавно (transition 0.15s) — ждём конца перехода, а не фиксированное время
  await page.waitForFunction(
    (sel) => getComputedStyle(document.querySelector(`${sel} img.mp-thumb-cover`)).opacity === "0",
    { timeout: 3000 },
    CARD
  );
  s = await previewState();
  assert.equal(s.playing, true);
  assert.equal(s.coverOpacity, "0");
  assert.equal(s.progOpacity, "1");
  assert.equal(s.progHeight, "3px");
  assert.equal(s.barColor, "rgb(255, 0, 0)");
  assert.ok(Math.abs(s.barW - s.progW / 2) <= 2, `дорожка ${s.barW} из ${s.progW}`);
});

test("уход курсора: пауза, сброс на начало, дорожка 0, обложка вернулась", async () => {
  // самостоятельный тест: сам наводит, сам подделывает время (не зависит от предыдущего)
  await fresh();
  await trackPause();
  await leaveCard();
  await page.hover(CARD);
  await page.$eval(`${CARD} video`, (v) => {
    Object.defineProperty(v, "duration", { value: 8, configurable: true });
    Object.defineProperty(v, "currentTime", { value: 4, configurable: true, writable: true });
    v.dispatchEvent(new Event("playing"));
  });
  await leaveCard();
  // обложка возвращается плавно (transition 0.15s) — ждём конца перехода
  await page.waitForFunction(
    (sel) => getComputedStyle(document.querySelector(`${sel} img.mp-thumb-cover`)).opacity === "1",
    { timeout: 3000 },
    CARD
  );
  const s = await previewState();
  assert.equal(s.playing, false);
  assert.equal(s.coverOpacity, "1");
  assert.equal(s.barW, 0);
  // stop() записывает 0 в подменённое свойство (было 4) — это и проверяем, до удаления подмены
  const v = await page.$eval(`${CARD} video`, (v) => {
    const t = v.currentTime;
    delete v.currentTime;
    delete v.duration;
    return { paused: v.__paused === true, t };
  });
  assert.equal(v.paused, true, "pause() не вызван");
  assert.equal(v.t, 0);
});

// В роликах-слайдах по бокам тёмные поля до 56px из 1280 — видео увеличено, чтобы они ушли за край
// превью: нужно ≥ 1280 / (1280 − 2·56) ≈ 1.096; по центру, обрезка внутри .mp-thumb.
test("видео увеличено ≥1.096 по центру, чтобы тёмные поля слайда ушли за край превью", async () => {
  await fresh();
  const r = await page.$eval(`${CARD} .mp-thumb`, (t) => {
    const v = t.querySelector("video");
    const m = new DOMMatrix(getComputedStyle(v).transform);
    const [ox, oy] = getComputedStyle(v).transformOrigin.split(" ").map(parseFloat);
    return { sx: m.a, sy: m.d, ox, oy, w: v.offsetWidth, h: v.offsetHeight, overflow: getComputedStyle(t).overflow };
  });
  assert.ok(r.sx >= 1.096 && Math.abs(r.sx - r.sy) < 1e-6, `масштаб ${r.sx}×${r.sy}`);
  assert.ok(Math.abs(r.ox - r.w / 2) <= 1 && Math.abs(r.oy - r.h / 2) <= 1, `центр ${r.ox},${r.oy} при ${r.w}×${r.h}`);
  assert.equal(r.overflow, "hidden");
});

test("уход до playing: обложка остаётся, если видео стартовало уже после ухода", async () => {
  await fresh();
  await page.hover(CARD);
  await leaveCard();
  await page.$eval(`${CARD} video`, (v) => v.dispatchEvent(new Event("playing")));
  await pause(50);
  const s = await previewState();
  assert.equal(s.playing, false);
  assert.equal(s.coverOpacity, "1");
});

// Щелчок мышью тоже даёт карточке фокус — но это не клавиатурный фокус: уход курсора должен остановить видео.
test("щелчок по карточке, затем уход курсора: видео остановилось, обложка вернулась", async () => {
  await fresh();
  await leaveCard();
  await page.click(CARD);
  await page.$eval(`${CARD} video`, (v) => v.dispatchEvent(new Event("playing")));
  await page.mouse.move(2, 2);
  await page.waitForFunction(
    (sel) => getComputedStyle(document.querySelector(`${sel} img.mp-thumb-cover`)).opacity === "1",
    { timeout: 3000 },
    CARD
  );
  assert.equal((await previewState()).playing, false);
});

test("фокус с клавиатуры тоже запускает превью", async () => {
  await fresh();
  await leaveCard();
  await page.evaluate(() => (window.__played.length = 0));
  await page.$eval(CARD, (c) => c.focus());
  assert.ok((await page.evaluate(() => window.__played)).some((s) => s.endsWith(VIDEO)));
  await leaveCard();
});

// Фильтр и поиск проверяем на своём наборе из нескольких карточек — не зависим от числа проектов в данных.
const SAMPLE_PROJECTS = [
  { title: "Калькулятор локеров", category: "client", views: 2300, date: "2026-10-08", color: "#3a6df0", href: "" },
  { title: "Windows XP Portfolio", category: "personal", views: 46000, date: "2025-11-02", color: "#1f9d73", href: "" },
  { title: "Telegram-бот заметок", category: "builds", views: 79000, date: "2026-04-05", color: "#8e44ad", href: "" },
  { title: "Дашборд логистики", category: "client", views: 12400, date: "2026-07-19", color: "#d35400", href: "" },
  { title: "Лендинг кофейни", category: "media", views: 845, date: "2026-10-27", color: "#c0392b", href: "" },
];
async function withSampleProjects(fn) {
  if (await page.$(PROJECTS)) await closeProjects(page);
  const saved = await page.evaluate((s) => {
    const prev = JSON.stringify(window.MY_PROJECTS_DATA.projects);
    window.MY_PROJECTS_DATA.projects = s;
    return prev;
  }, SAMPLE_PROJECTS);
  try {
    await fresh();
    await fn();
  } finally {
    await page.evaluate((s) => (window.MY_PROJECTS_DATA.projects = JSON.parse(s)), saved);
    if (await page.$(PROJECTS)) await closeProjects(page);
  }
}

test("меню категорий: «Все» + категории из данных, выбор фильтрует и меняет адрес", () => withSampleProjects(async () => {
  const d = await projectsData();
  const nav = await page.$$eval(`${PROJECTS} .mp-nav`, (l) =>
    l.map((b) => [b.dataset.mpCategory, b.textContent.trim(), b.getAttribute("aria-current")])
  );
  assert.deepEqual(nav, [["all", "Все", "true"], ...d.categories.map((c) => [c.id, c.label, "false"])]);

  await page.click(`${PROJECTS} .mp-nav[data-mp-category="media"]`);
  assert.deepEqual(
    await titles(),
    d.projects.filter((p) => p.category === "media").map((p) => p.title)
  );
  assert.equal(await text(".mp-address"), "https://www.myprojects.com/media");
  assert.equal(
    await page.$eval(`${PROJECTS} .mp-nav[data-mp-category="media"]`, (b) => b.getAttribute("aria-current")),
    "true"
  );
  // красная метка у выбранного пункта
  const marker = await page.$eval(`${PROJECTS} .mp-nav[aria-current="true"]`, (b) => {
    const s = getComputedStyle(b, "::before");
    return [s.width, s.height, s.backgroundColor];
  });
  assert.deepEqual(marker, ["3px", "24px", "rgb(255, 0, 0)"]);

  // логотип возвращает ко всем проектам
  await page.click(`${PROJECTS} .mp-logo`);
  assert.equal((await titles()).length, d.projects.length);
  assert.equal(await text(".mp-address"), "https://www.myprojects.com");
}));

test("поиск фильтрует по названию, «Ничего не найдено» при пустом результате, Esc очищает", () => withSampleProjects(async () => {
  const d = await projectsData();
  const target = d.projects[2].title;
  await page.type(`${PROJECTS} .mp-search-input`, target);
  assert.deepEqual(await titles(), [target]);
  assert.match(await text(".mp-address"), /\?q=/);

  await page.$eval(`${PROJECTS} .mp-search-input`, (i) => (i.value = ""));
  await page.type(`${PROJECTS} .mp-search-input`, "zzz-нет-такого");
  assert.deepEqual(await titles(), []);
  assert.equal(await page.$eval(`${PROJECTS} .mp-empty`, (e) => e.hidden), false);
  assert.equal(await text(".mp-empty"), "Ничего не найдено");

  await page.focus(`${PROJECTS} .mp-search-input`);
  await page.keyboard.press("Escape");
  assert.equal(await page.$eval(`${PROJECTS} .mp-search-input`, (i) => i.value), "");
  assert.equal((await titles()).length, d.projects.length);
  assert.ok(await page.$(PROJECTS), "Esc в поиске не должен закрывать окно");
}));

test("Светлая/Тёмная: по умолчанию тёмная, кнопка переключает, выбор запоминается", async () => {
  await fresh();
  const theme = () => page.$eval(`${PROJECTS} .mp-page`, (p) => p.dataset.theme);
  const bg = () => page.$eval(`${PROJECTS} .mp-page`, (p) => getComputedStyle(p).backgroundColor);
  assert.equal(await theme(), "dark");
  assert.equal(await bg(), "rgb(18, 18, 18)");
  await page.click(`${PROJECTS} [data-mp-action="theme"]`);
  assert.equal(await theme(), "light");
  assert.equal(await bg(), "rgb(255, 255, 255)");
  await fresh();
  assert.equal(await theme(), "light", "тема не запомнилась");
  await page.click(`${PROJECTS} [data-mp-action="theme"]`);
  assert.equal(await theme(), "dark");
});

test("меню «Вид» переключает тему, «Файл → Закрыть» закрывает окно", async () => {
  await fresh();
  await clickMenu("Вид");
  await page.waitForSelector(`${PROJECTS} .window-tooltip [data-mp-theme="light"]`, { timeout: 5000 });
  await page.click(`${PROJECTS} .window-tooltip [data-mp-theme="light"] .drop-down__text`);
  assert.equal(await page.$eval(`${PROJECTS} .mp-page`, (p) => p.dataset.theme), "light");
  await page.evaluate(() => MyProjects.setTheme(document.getElementById("window-My Projects"), "dark"));

  await clickMenu("Файл");
  await page.waitForSelector(`${PROJECTS} .window-tooltip .drop-down__text`, { timeout: 5000 });
  await page.click(`${PROJECTS} .window-tooltip .drop-down__text`);
  await page.waitForFunction(() => !document.getElementById("window-My Projects"), { timeout: 3000 });
});

test("«Сервис» и «Справка» неактивны: щелчок не открывает меню и ничего не запрашивает", async () => {
  await fresh();
  const errorsBefore = consoleErrors.length;
  const requestsBefore = requests.length;
  for (const label of ["Сервис", "Справка"]) {
    await clickMenu(label);
    await pause(300);
    assert.equal(await page.$(`${PROJECTS} .window-tooltip`), null, `открылось меню ${label}`);
  }
  assert.deepEqual(requests.slice(requestsBefore).filter((u) => u.includes("/Tooltip/")), []);
  assert.deepEqual(consoleErrors.slice(errorsBefore), []);
});

test("соцсети в шапке берутся из «Обо мне» и открываются в новой вкладке", async () => {
  await fresh();
  const expected = await page.evaluate(() => window.ABOUT_ME_DATA.social.map((s) => s.href));
  const links = await page.$$eval(`${PROJECTS} .mp-social a`, (l) =>
    l.map((a) => [a.getAttribute("href"), a.target, a.rel])
  );
  assert.deepEqual(links, expected.map((href) => [href, "_blank", "noreferrer"]));
});

test("карточка-заглушка без ссылки: щелчок пишет в строке состояния, а не открывает вкладку", async () => {
  await fresh();
  await page.evaluate(() => (window.__followed = null));
  await page.click(`${PROJECTS} .mp-card`);
  assert.equal(await text(".mp-status-text"), "Проект скоро появится");
  assert.equal(await page.evaluate(() => window.__followed), null);
});

test("карточка со ссылкой и картинкой — это ссылка в новой вкладке с превью", async () => {
  if (await page.$(PROJECTS)) await closeProjects(page);
  const saved = await page.evaluate(() => JSON.stringify(window.MY_PROJECTS_DATA.projects));
  await page.evaluate(() => {
    window.MY_PROJECTS_DATA.projects[0] = {
      title: "Сайт",
      category: "personal",
      href: "https://example.com/",
      thumb: "/Assets/Images/Logos/windows-xp-logo.png",
    };
  });
  try {
    await openProjects(page);
    const c = await page.$eval(`${PROJECTS} .mp-card`, (a) => ({
      tag: a.tagName,
      href: a.getAttribute("href"),
      target: a.target,
      thumb: a.querySelector(".mp-thumb > img")?.getAttribute("src"),
    }));
    assert.deepEqual(c, {
      tag: "A",
      href: "https://example.com/",
      target: "_blank",
      thumb: "/Assets/Images/Logos/windows-xp-logo.png",
    });
    await page.click(`${PROJECTS} .mp-card`);
    assert.equal(await page.evaluate(() => window.__followed), "https://example.com/");
  } finally {
    await page.evaluate((s) => (window.MY_PROJECTS_DATA.projects = JSON.parse(s)), saved);
    await closeProjects(page);
  }
});

test("боковое меню только из значков: подписей не видно, есть aria-label и подсказка", async () => {
  await fresh();
  const nav = await page.$$eval(`${PROJECTS} .mp-nav`, (l) =>
    l.map((b) => {
      const t = b.querySelector(".mp-nav-text").getBoundingClientRect();
      const svg = b.querySelector(".mp-nav-icon").getBoundingClientRect(); const ih = Math.round(svg.height);
      return { textVisible: t.width > 1 && t.height > 1, label: !!b.getAttribute("aria-label"), title: !!b.title, icon: Math.round(svg.width) + 16, iconH: ih };
    })
  );
  for (const n of nav) assert.deepEqual(n, { textVisible: false, label: true, title: true, icon: 36, iconH: 20 });
});

test("значки меню — файлы из макета nav-*.png, все загружаются", async () => {
  await fresh();
  const srcs = await page.$$eval(`${PROJECTS} .mp-nav-icon`, (l) => l.map((e) => e.dataset.src));
  assert.deepEqual(srcs, ["all", "media", "builds", "personal", "client"].map((n) => `/Assets/Images/My Projects/nav-${n}.png`));
  const ok = await page.evaluate((l) => Promise.all(l.map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = s; }))), srcs);
  assert.deepEqual(ok, srcs.map(() => true));
});

test("сетка подстраивается: 2 колонки в обычном окне, 3 в развёрнутом, 1 в узком", async () => {
  await fresh();
  const cols = () =>
    page.$eval(`${PROJECTS} .mp-grid`, (g) => getComputedStyle(g).gridTemplateColumns.split(" ").length);
  assert.equal(await cols(), 2);
  await page.evaluate(() => maximazeWindow("My Projects"));
  await pause(100);
  assert.equal(await cols(), 3);
  await page.evaluate(() => maximazeWindow("My Projects"));
  await page.$eval(PROJECTS, (w) => (w.style.width = "560px"));
  await pause(100);
  assert.equal(await cols(), 1);
  const overflow = await page.$eval(`${PROJECTS} .mp-page`, (p) => p.scrollWidth > p.clientWidth);
  assert.equal(overflow, false, "горизонтальная прокрутка в узком окне");
});

test("при наведении значки соцсетей окрашиваются в #FF4500", async () => {
  await fresh();
  const n = await page.$$eval(`${PROJECTS} .mp-social a`, (l) => l.length);
  assert.ok(n >= 3);
  for (let i = 0; i < n; i++) {
    const sel = `${PROJECTS} .mp-social a:nth-child(${i + 1})`;
    const before = await page.$eval(sel, (a) => getComputedStyle(a).color);
    assert.notEqual(before, "rgb(255, 69, 0)");
    await page.hover(sel);
    await pause(250);
    const after = await page.$eval(sel, (a) => {
      const icon = a.querySelector("svg, .mp-social-icon");
      return [getComputedStyle(a).color, icon.tagName === "svg" ? getComputedStyle(icon).color : getComputedStyle(icon).backgroundColor];
    });
    assert.deepEqual(after, ["rgb(255, 69, 0)", "rgb(255, 69, 0)"]);
  }
  await page.mouse.move(0, 0);
});

// В тестовом Chrome полосы прокрутки скрыты (--hide-scrollbars), поэтому проверяем сами правила стилей.
test("полоса прокрутки XP общая для всего рабочего стола: 17px, бегунок, кнопки во все стороны", async () => {
  await fresh();
  const rules = await page.evaluate(() => {
    const out = {};
    for (const sheet of document.styleSheets) {
      if (!sheet.href || !sheet.href.includes("/Bureau/xp-scrollbar.css")) continue;
      for (const r of sheet.cssRules) if (r.selectorText) out[r.selectorText] = r.style.cssText;
    }
    return out;
  });
  assert.match(rules["::-webkit-scrollbar"] || "", /width: 17px/);
  assert.match(rules["::-webkit-scrollbar"] || "", /height: 17px/);
  assert.match(rules["::-webkit-scrollbar-thumb"] || "", /border-radius: 2px/);
  for (const sel of ["vertical:start:decrement", "vertical:end:increment", "horizontal:start:decrement", "horizontal:end:increment"]) {
    assert.match(rules["::-webkit-scrollbar-button:" + sel] || "", /background-image: url/, sel);
  }
  // правила общие (без привязки к .mp-page), значит действуют во всех окнах
  assert.equal(Object.keys(rules).some((s) => s.includes(".mp-page")), false);
});

test("полоса прокрутки не подсвечивается при наведении (нет правил :hover/:active)", async () => {
  await fresh();
  const hover = await page.evaluate(() => {
    const out = [];
    for (const sheet of document.styleSheets) {
      let list;
      try {
        list = sheet.cssRules;
      } catch (e) {
        continue;
      }
      const walk = (rules) => {
        for (const r of rules) {
          if (r.cssRules) walk(r.cssRules);
          if (r.selectorText && /::-webkit-scrollbar/.test(r.selectorText) && /:hover|:active/.test(r.selectorText)) out.push(r.selectorText);
        }
      };
      walk(list);
    }
    return out;
  });
  assert.deepEqual(hover, []);
});

test("превью карточки 333.77×188.03 как в макете — в обычном и развёрнутом окне", async () => {
  await fresh();
  const size = () =>
    page.$eval(`${PROJECTS} .mp-thumb`, (t) => {
      const r = t.getBoundingClientRect();
      return [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10];
    });
  assert.deepEqual(await size(), [333.8, 188]);
  await page.evaluate(() => maximazeWindow("My Projects"));
  await pause(100);
  try {
    assert.deepEqual(await size(), [333.8, 188], "в развёрнутом окне карточки не должны растягиваться");
  } finally {
    await page.evaluate(() => maximazeWindow("My Projects"));
  }
});

test("строка под названием: просмотры и «сколько назад» с правильными склонениями", async () => {
  await fresh();
  const r = await page.evaluate(() => {
    const now = new Date(2026, 10, 8); // 8 ноября 2026
    const ago = (d) => MyProjects.timeAgo(d, now);
    return {
      views: [1, 3, 5, 21, 845, 1000, 2300, 46000, 79999, 1250000].map(MyProjects.viewsLabel),
      ago: ["2026-11-08", "2026-11-07", "2026-11-05", "2026-11-01", "2026-10-25", "2026-10-08", "2026-04-05", "2025-11-02", "2023-10-01"].map(ago),
    };
  });
  assert.deepEqual(r.views, [
    "1 просмотр",
    "3 просмотра",
    "5 просмотров",
    "21 просмотр",
    "845 просмотров",
    "1 тыс. просмотров",
    "2,3 тыс. просмотров",
    "46 тыс. просмотров",
    "79 тыс. просмотров",
    "1,2 млн просмотров",
  ]);
  assert.deepEqual(r.ago, [
    "сегодня",
    "вчера",
    "3 дня назад",
    "1 неделю назад",
    "2 недели назад",
    "1 месяц назад",
    "7 месяцев назад",
    "1 год назад",
    "3 года назад",
  ]);
  // в карточках строка собрана из views и date
  const d = await projectsData();
  const metas = await page.$$eval(`${PROJECTS} .mp-card .mp-meta`, (l) => l.map((e) => e.textContent));
  assert.equal(metas.length, d.projects.length);
  for (const m of metas) assert.match(m, /просмотр.* • /);
});

// Логотип — персональный (MyProjects_profile.svg, 2172×724). В светлой теме значок слева
// цветной, надпись справа чёрная; граница clip-path должна попасть в просвет между ними:
// значок кончается на x=645, буква «M» начинается на x=712 (из 2172).
test("логотип — персональный, пропорции 3:1, граница светлой темы в просвете значок/надпись", async () => {
  const { readFileSync } = await import("node:fs");
  const svg = readFileSync(new URL("../Assets/Images/My Projects/logo.svg", import.meta.url), "utf8");
  assert.match(svg, /MyProjects — персональный логотип/);
  assert.match(svg, /viewBox="0 0 2172 724"/);
  await openProjects(page);
  const r = await page.$eval(`${PROJECTS} .mp-logo-image`, (i) => {
    const b = i.getBoundingClientRect();
    const cs = getComputedStyle(document.querySelector(".mp-page"));
    return { w: b.width, h: b.height };
  });
  assert.ok(Math.abs(r.w / r.h - 3) < 0.05, `пропорции ${r.w}×${r.h}`);
  const css = readFileSync(new URL("../Open_Windows/My Projects/My Projects.css", import.meta.url), "utf8");
  const right = +css.match(/\.mp-logo-image \{\s*clip-path: inset\(0 ([\d.]+)% 0 0\)/)[1];
  const left = +css.match(/\.mp-logo::after \{[^}]*clip-path: inset\(0 0 0 ([\d.]+)%\)/)[1];
  const cut = (100 - right) / 100;
  assert.equal(left, 100 - right, "две половины должны стыковаться");
  assert.ok(cut > 645 / 2172 && cut < 712 / 2172, `граница ${cut} не в просвете`);
});

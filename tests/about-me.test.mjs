import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness, openAboutMe, closeAboutMe, ABOUT } from "./helpers/harness.mjs";

let h;
let page;
before(async () => {
  h = await startHarness();
  page = h.page;
});
after(async () => h && (await h.close()));

// Свежее окно: закрыть (если открыто) и открыть заново.
async function fresh() {
  if (await page.$(ABOUT)) await closeAboutMe(page);
  await openAboutMe(page);
  await page.waitForSelector(`${ABOUT} .am-title`, { timeout: 5000 });
}
const clickIn = (sel) => page.click(`${ABOUT} ${sel}`);
const text = (sel) => page.$eval(`${ABOUT} ${sel}`, (e) => e.textContent.trim());

// ---------- иконка, окно, рабочий стол ----------

test("иконка «Обо мне» есть на рабочем столе", async () => {
  const label = await page.$eval('.icon[data-app="About Me"] span', (e) => e.textContent.trim());
  assert.equal(label, "Обо мне");
  const loaded = await page.$eval('.icon[data-app="About Me"] img', (e) =>
    e.complete ? e.naturalWidth > 0 : new Promise((r) => (e.onload = () => r(e.naturalWidth > 0)))
  );
  assert.equal(loaded, true);
});

test("на экране 1366×768 все иконки рабочего стола видны (не уходят под панель задач)", async () => {
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

test("двойной клик открывает окно с заголовком и кнопкой в панели задач", async () => {
  await openAboutMe(page);
  assert.equal(await text(".window-header-title"), "Обо мне");
  assert.ok(await page.$('[id="taskbar-About Me"]'), "нет кнопки в панели задач");
  await page.waitForFunction(
    (sel) => {
      const img = document.querySelector(sel);
      return img && img.complete && img.naturalWidth > 0;
    },
    { timeout: 5000 },
    `${ABOUT} .window-header img`
  );
});

test("двойной клик по иконке открывает «Обо мне» поверх уже открытого окна (GitHub при запуске)", async () => {
  if (await page.$(ABOUT)) await closeAboutMe(page);
  await page.waitForSelector('[id="window-GitHub"]');
  await openAboutMe(page);
  const r = await page.evaluate(() => {
    const am = document.getElementById("window-About Me");
    const z = (w) => parseInt(getComputedStyle(w).zIndex) || 0;
    const others = [...document.querySelectorAll(".window")].filter((w) => w !== am && w.style.display !== "none");
    // и проверка по пикселю: в центре «Обо мне» сверху лежит именно оно
    const b = am.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + 60);
    return { onTop: others.every((w) => z(am) > z(w)), hitInside: am.contains(hit) };
  });
  assert.deepEqual(r, { onTop: true, hitInside: true });
});

test("повторный двойной клик не создаёт второе окно и не сбрасывает страницу", async () => {
  await fresh();
  await clickIn('[data-am-action="projects"]');
  await openAboutMe(page);
  assert.equal(await page.$$eval(ABOUT, (l) => l.length), 1);
  assert.equal(await text(".address_bar_content_text"), "Обо мне › Мои проекты");
});

test("ссылка «Обо мне» в приветственном уведомлении открывает окно и закрывает уведомление", async () => {
  if (await page.$(ABOUT)) await closeAboutMe(page);
  const link = await page.waitForFunction(
    () => [...document.querySelectorAll(".xp-notification a")].find((a) => a.textContent.trim() === "Обо мне"),
    { timeout: 10000 }
  );
  const hashBefore = await page.evaluate(() => location.hash);
  await link.asElement().click();
  await page.waitForSelector(`${ABOUT} .am-title`, { timeout: 5000 });
  assert.equal(await page.evaluate(() => location.hash), hashBefore, "ссылка не должна менять адрес страницы");
  await page.waitForFunction(
    () => {
      const n = document.querySelector(".xp-notification");
      return !n || n.classList.contains("hide");
    },
    { timeout: 3000 }
  );
});

async function clickNotificationAboutMe() {
  await page.evaluate(() => {
    if (currentNotification && currentNotification.isShowing) currentNotification._remove();
    showWelcomeNotification(0);
  });
  const link = await page.waitForFunction(
    () => [...document.querySelectorAll(".xp-notification.show a")].find((a) => a.textContent.trim() === "Обо мне"),
    { timeout: 5000 }
  );
  await link.asElement().click();
  await new Promise((r) => setTimeout(r, 300));
}

const topState = () =>
  page.evaluate(() => {
    const am = document.getElementById("window-About Me");
    const others = [...document.querySelectorAll(".window")].filter((w) => w !== am && w.style.display !== "none");
    const z = (w) => parseInt(getComputedStyle(w).zIndex) || 0;
    return { visible: !!am && am.style.display !== "none", onTop: !!am && others.every((w) => z(am) > z(w)) };
  });

test("ссылка в уведомлении: «Обо мне» открывается поверх уже открытого окна", async () => {
  if (await page.$(ABOUT)) await closeAboutMe(page);
  await page.evaluate(() => openWindow("My Computer"));
  await page.waitForSelector('[id="window-My Computer"] .content_left');
  await page.click('[id="window-My Computer"] .window-header'); // поднять «Мой компьютер» наверх
  await clickNotificationAboutMe();
  assert.deepEqual(await topState(), { visible: true, onTop: true });
  await page.evaluate(() => closeWindow("My Computer"));
});

test("ссылка в уведомлении: свёрнутое «Обо мне» разворачивается и встаёт наверх", async () => {
  await page.evaluate(() => {
    toggleWindow("About Me");
    if (document.getElementById("window-About Me").style.display !== "none") toggleWindow("About Me");
  });
  assert.equal((await topState()).visible, false, "подготовка: окно должно быть свёрнуто");
  await clickNotificationAboutMe();
  assert.deepEqual(await topState(), { visible: true, onTop: true });
});

test("при открытии «Обо мне» звучит звук навигации, как у «Мой компьютер»", async () => {
  if (await page.$(ABOUT)) await closeAboutMe(page);
  await page.evaluate(() => {
    window.__played = [];
    HTMLMediaElement.prototype.play = function () {
      window.__played.push(decodeURIComponent(this.currentSrc || this.src));
      return Promise.resolve();
    };
  });
  await openAboutMe(page);
  const played = await page.evaluate(() => window.__played);
  assert.ok(
    played.some((s) => s.includes("Windows Navigation Start.wav")),
    `звук навигации не проигран: ${JSON.stringify(played)}`
  );
});

// ---------- v2 Task 1: страница-профиль ----------

test("при открытии сразу профиль: заголовок и абзацы; разделов «Опыт работы» и «Образование» нет", async () => {
  await fresh();
  assert.equal(await text(".am-title"), "Обо мне");
  const n = await page.evaluate(() => ABOUT_ME_DATA.about.length);
  assert.ok(n >= 1);
  assert.equal((await page.$$(`${ABOUT} .am-profile .am-about-block`)).length, n);
  assert.equal((await page.$$(`${ABOUT} .am-section`)).length, 0);
  assert.equal((await page.$$(`${ABOUT} .am-tile`)).length, 0);
  assert.equal(await text(".address_bar_content_text"), "Обо мне");
});

test("если в данных есть опыт и образование — разделы рисуются", async () => {
  await fresh();
  const r = await page.evaluate((root) => {
    const w = document.querySelector(root);
    const d = window.ABOUT_ME_DATA;
    const saved = { experience: d.experience, education: d.education };
    d.experience = [{ title: "Должность", subtitle: "Компания", period: "2024" }];
    d.education = [{ title: "Университет" }];
    AboutMe.init(w);
    Object.assign(d, saved);
    const t = (s) => w.querySelector(`.am-section[data-section="${s}"] .am-section-title`)?.textContent;
    const res = { exp: t("experience"), edu: t("education"), items: w.querySelectorAll(".am-section .am-item").length };
    AboutMe.init(w);
    return res;
  }, ABOUT);
  assert.deepEqual(r, { exp: "Опыт работы", edu: "Образование", items: 2 });
});

test("меню как у «Мой компьютер»; строки состояния внизу нет (как у «Мой компьютер»)", async () => {
  const menu = await page.$$eval(`${ABOUT} .drop_down_label`, (l) => l.map((e) => e.textContent.trim()));
  assert.deepEqual(menu, ["Файл", "Правка", "Вид", "Избранное", "Сервис", "Справка"]);
  assert.equal(await page.$(`${ABOUT} .am-statusbar`), null);
  // тело окна доходит до нижнего края окна
  const gap = await page.evaluate((root) => {
    const w = document.querySelector(root);
    return w.querySelector(".window-content").getBoundingClientRect().bottom - w.querySelector(".am-body").getBoundingClientRect().bottom;
  }, ABOUT);
  assert.ok(gap < 1, `под телом окна остаётся полоса ${gap}px`);
});

for (const [vw, vh] of [[1366, 768], [1024, 600], [1920, 1080]]) {
  test(`окно открывается по центру рабочего стола и целиком на экране ${vw}×${vh}`, async () => {
    await page.setViewport({ width: vw, height: vh });
    try {
      await fresh();
      const r = await page.evaluate((root) => {
        const w = document.querySelector(root).getBoundingClientRect();
        const d = document.getElementById("desktop").getBoundingClientRect();
        return {
          inside: w.left >= d.left && w.top >= d.top && w.right <= d.right && w.bottom <= d.bottom,
          dx: Math.abs((w.left + w.right) / 2 - (d.left + d.right) / 2),
          dy: Math.abs((w.top + w.bottom) / 2 - (d.top + d.bottom) / 2),
          w: w.width,
          h: w.height,
        };
      }, ABOUT);
      assert.ok(r.inside, `окно выходит за рабочий стол: ${JSON.stringify(r)}`);
      assert.ok(r.dx <= 2 && r.dy <= 2, `окно не по центру: ${JSON.stringify(r)}`);
      assert.ok(r.w >= Math.min(800, vw - 40) && r.h >= Math.min(560, vh - 100), `окно слишком маленькое: ${JSON.stringify(r)}`);
    } finally {
      await page.setViewport({ width: 1366, height: 768 });
    }
  });
}

test("панель: Назад/Вперёд неактивны, есть «Мои проекты» и «Моё резюме»", async () => {
  const dis = (n) =>
    page.$eval(`${ABOUT} [data-am-nav="${n}"]`, (e) => e.classList.contains("function_bar_button--disable"));
  assert.equal(await dis("back"), true);
  assert.equal(await dis("forward"), true);
  assert.equal(await text('[data-am-action="projects"]'), "Мои проекты");
  assert.equal(await text('[data-am-action="resume"]'), "Моё резюме");
});

test("«Мои проекты» и навигация Назад / Вперёд / папка", async () => {
  await fresh();
  const st = () =>
    page.evaluate((root) => {
      const w = document.querySelector(root);
      const vis = (s) => !w.querySelector(s).hidden;
      return {
        profile: vis(".am-profile"),
        projects: vis(".am-projects"),
        address: w.querySelector(".address_bar_content_text").textContent.trim(),
      };
    }, ABOUT);
  await clickIn('[data-am-action="projects"]');
  assert.deepEqual(await st(), { profile: false, projects: true, address: "Обо мне › Мои проекты" });
  assert.ok((await page.$$(`${ABOUT} .am-projects .am-item`)).length >= 1);
  await clickIn('[data-am-nav="back"]');
  assert.deepEqual(await st(), { profile: true, projects: false, address: "Обо мне" });
  await clickIn('[data-am-nav="forward"]');
  assert.equal((await st()).projects, true);
  await clickIn('[data-am-nav="up"]');
  assert.equal((await st()).profile, true);
});

test("абзац без картинки — текст начинается от левого края блока", async () => {
  await fresh();
  const r = await page.evaluate((root) => {
    const w = document.querySelector(root);
    // Тест не зависит от контента владельца: подставляем свои абзацы.
    const saved = ABOUT_ME_DATA.about;
    ABOUT_ME_DATA.about = [{ text: "без картинки" }, { text: "с картинкой", image: saved.find((a) => a.image)?.image }];
    AboutMe.init(w);
    ABOUT_ME_DATA.about = saved;
    const blocks = [...w.querySelectorAll(".am-about-block")];
    const noImg = blocks.find((b) => !b.querySelector(".am-about-img"));
    const withImg = blocks.find((b) => b.querySelector(".am-about-img"));
    const left = (b) => b.querySelector(".am-about-text").getBoundingClientRect().left - b.getBoundingClientRect().left;
    const res = { noImg: noImg && left(noImg), withImg: withImg && left(withImg) };
    AboutMe.init(w);
    return res;
  }, ABOUT);
  assert.ok(r.noImg != null && r.withImg != null);
  assert.ok(r.noImg < 5, `отступ слева у абзаца без картинки: ${r.noImg}`);
  assert.ok(r.withImg >= 120, `у абзаца с картинкой текст должен быть правее картинки: ${r.withImg}`);
});

test("абзацы «Обо мне»: у каждого картинка 120px со скруглёнными углами", async () => {
  await fresh();
  const imgs = await page.$$eval(`${ABOUT} .am-about-block`, (blocks) =>
    blocks.map((b) => {
      const i = b.querySelector(".am-about-img");
      if (!i) return null;
      const cs = getComputedStyle(i);
      return { w: cs.width, h: cs.height, radius: cs.borderTopLeftRadius, loaded: i.naturalWidth > 0 };
    })
  );
  assert.equal(imgs.length, 3);
  for (const i of imgs) assert.deepEqual(i, { w: "120px", h: "120px", radius: "12px", loaded: true });
});

test("одна общая прокрутка: панель и текст едут вместе, панель не обрезана", async () => {
  await fresh();
  const r = await page.evaluate((root) => {
    const w = document.querySelector(root);
    w.style.height = "420px";
    const body = w.querySelector(".am-body");
    const own = (s) => {
      const e = w.querySelector(s);
      const oy = getComputedStyle(e).overflowY;
      return (oy === "auto" || oy === "scroll") && e.scrollHeight > e.clientHeight;
    };
    const res = {
      sidebarScrolls: own(".am-sidebar"),
      mainScrolls: own(".am-main"),
      bodyScrolls: body.scrollHeight > body.clientHeight,
    };
    // последнюю строку последней карточки можно докрутить до видимости (её не обрезает панель)
    const rows = w.querySelectorAll(".am-sidebar .am-link");
    rows[rows.length - 1].scrollIntoView({ block: "end" });
    const last = rows[rows.length - 1].getBoundingClientRect();
    const b = body.getBoundingClientRect();
    res.lastSidebarRowVisible = last.bottom <= b.bottom + 0.5 && last.top >= b.top;
    // обе колонки доходят до низа прокрутки — без полосы фона окна под ними
    res.columnsFillScroll =
      w.querySelector(".am-sidebar").offsetHeight === body.scrollHeight &&
      w.querySelector(".am-main").offsetHeight === body.scrollHeight;
    w.style.height = "";
    return res;
  }, ABOUT);
  assert.deepEqual(r, {
    sidebarScrolls: false,
    mainScrolls: false,
    bodyScrolls: true,
    lastSidebarRowVisible: true,
    columnsFillScroll: true,
  });
});

test("длинный профиль прокручивается в области, адресная строка видна", async () => {
  await fresh();
  const r = await page.evaluate((root) => {
    const w = document.querySelector(root);
    const saved = ABOUT_ME_DATA.about;
    ABOUT_ME_DATA.about = Array.from({ length: 80 }, (_, i) => ({ text: `Абзац ${i}` }));
    AboutMe.init(w);
    ABOUT_ME_DATA.about = saved;
    const main = w.querySelector(".am-body");
    main.scrollTop = 99999;
    const win = w.getBoundingClientRect();
    const inside = (s) => {
      const b = w.querySelector(s).getBoundingClientRect();
      return b.top >= win.top && b.bottom <= win.bottom && b.height > 0;
    };
    return {
      scrolled: main.scrollHeight > main.clientHeight && main.scrollTop > 0,
      address: inside(".address_bar"),
    };
  }, ABOUT);
  assert.deepEqual(r, { scrolled: true, address: true });
});

test("стили: заголовок Trebuchet MS Bold белый, текст абзаца белый Tahoma", async () => {
  await fresh();
  const s = await page.evaluate((root) => {
    const cs = (sel) => getComputedStyle(document.querySelector(`${root} ${sel}`));
    const t = cs(".am-title");
    const p = cs(".am-about-text");
    return { tf: t.fontFamily, tw: t.fontWeight, tc: t.color, pf: p.fontFamily, pc: p.color, bg: cs(".am-main").backgroundColor };
  }, ABOUT);
  assert.match(s.tf, /Trebuchet MS/);
  assert.equal(s.tw, "700");
  assert.equal(s.tc, "rgb(255, 255, 255)");
  assert.match(s.pf, /Tahoma/);
  assert.equal(s.pc, "rgb(255, 255, 255)");
  assert.equal(s.bg, "rgb(99, 117, 214)");
});

test("все картинки окна загрузились", async () => {
  const broken = await page.evaluate(async (root) => {
    const imgs = [...document.querySelectorAll(`${root} img`)];
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    return imgs.filter((i) => !(i.naturalWidth > 0)).map((i) => i.getAttribute("src"));
  }, ABOUT);
  assert.deepEqual(broken, []);
});

test("окно шириной 500px — без горизонтальной прокрутки области", async () => {
  const r = await page.evaluate((root) => {
    const win = document.querySelector(root);
    const prev = win.style.width;
    win.style.width = "500px";
    const main = win.querySelector(".am-main");
    const res = { sw: main.scrollWidth, cw: main.clientWidth };
    win.style.width = prev;
    return res;
  }, ABOUT);
  assert.ok(r.sw <= r.cw, `scrollWidth ${r.sw} > clientWidth ${r.cw}`);
});

// ---------- v2 Task 2: сворачиваемые карточки ----------

const cardState = (id) =>
  page.evaluate(
    (root, id) => {
      const c = document.querySelector(`${root} .am-card[data-card="${id}"]`);
      const arrow = c.querySelector(".am-card-arrow");
      return {
        h: c.querySelector(".am-card-collapse").getBoundingClientRect().height,
        transform: getComputedStyle(arrow).transform,
        expanded: c.querySelector(".am-card-header").getAttribute("aria-expanded"),
        inert: c.querySelector(".am-card-body").inert,
      };
    },
    ABOUT,
    id
  );
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ROTATED = "matrix(-1, 0, 0, -1, 0, 0)";
const isUpright = (t) => t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)";

test("три карточки по порядку: Соцсети, Стек технологий, Фреймворки; в соцсетях — ссылки", async () => {
  await fresh();
  const cards = await page.$$eval(`${ABOUT} .am-card`, (l) =>
    l.map((c) => [c.dataset.card, c.querySelector(".am-card-header-text").textContent.trim()])
  );
  assert.deepEqual(cards, [["social", "Соцсети"], ["stack", "Стек технологий"], ["frameworks", "Фреймворки"]]);
  const links = await page.$$eval(`${ABOUT} .am-card[data-card="social"] a.am-link`, (l) =>
    l.map((a) => ({ href: a.getAttribute("href"), target: a.target }))
  );
  const n = await page.evaluate(() => ABOUT_ME_DATA.social.length);
  assert.equal(links.length, n);
  for (const l of links) assert.equal(l.target, l.href.startsWith("mailto:") ? "" : "_blank");
});

test("клик по заголовку сворачивает карточку, стрелка поворачивается на 180°; повторный — разворачивает", async () => {
  await fresh();
  const open = await cardState("frameworks");
  assert.ok(open.h > 0);
  assert.ok(isUpright(open.transform), open.transform);
  assert.equal(open.expanded, "true");
  await clickIn('.am-card[data-card="frameworks"] .am-card-header');
  await wait(400);
  const closed = await cardState("frameworks");
  assert.equal(closed.h, 0);
  assert.equal(closed.transform, ROTATED);
  assert.equal(closed.expanded, "false");
  await clickIn('.am-card[data-card="frameworks"] .am-card-arrow');
  await wait(400);
  const again = await cardState("frameworks");
  assert.ok(again.h > 0);
  assert.ok(isUpright(again.transform), again.transform);
});

test("анимация — CSS transition 0.25s у стрелки и содержимого", async () => {
  const d = await page.evaluate((root) => {
    const c = document.querySelector(`${root} .am-card[data-card="stack"]`);
    return [c.querySelector(".am-card-arrow"), c.querySelector(".am-card-collapse")].map(
      (e) => getComputedStyle(e).transitionDuration
    );
  }, ABOUT);
  for (const x of d) assert.match(x, /0\.25s/);
});

test("анимация идёт плавно: в середине перехода высота промежуточная", async () => {
  await fresh();
  const full = (await cardState("stack")).h;
  await clickIn('.am-card[data-card="stack"] .am-card-header');
  await wait(110);
  const mid = (await cardState("stack")).h;
  assert.ok(mid > 0 && mid < full, `ожидалась промежуточная высота, получено ${mid} из ${full}`);
});

test("быстрый двойной клик — карточка снова развёрнута, стрелка согласована", async () => {
  await fresh();
  const hdr = await page.$(`${ABOUT} .am-card[data-card="social"] .am-card-header`);
  await hdr.click();
  await hdr.click();
  await wait(400);
  const s = await cardState("social");
  assert.ok(s.h > 0);
  assert.ok(isUpright(s.transform), s.transform);
  assert.equal(s.expanded, "true");
});

test("у свёрнутой карточки содержимое inert (ссылки не получают фокус)", async () => {
  await fresh();
  await clickIn('.am-card[data-card="social"] .am-card-header');
  assert.equal((await cardState("social")).inert, true);
});

test("заголовок карточки работает с клавиатуры (Enter)", async () => {
  await fresh();
  await page.focus(`${ABOUT} .am-card[data-card="stack"] .am-card-header`);
  await page.keyboard.press("Enter");
  await wait(400);
  assert.equal((await cardState("stack")).expanded, "false");
});

test("закрыть и открыть окно — все карточки снова развёрнуты", async () => {
  await fresh();
  await clickIn('.am-card[data-card="frameworks"] .am-card-header');
  await fresh();
  for (const id of ["social", "stack", "frameworks"]) assert.equal((await cardState(id)).expanded, "true");
});

// ---------- карточки слева в стиле «Мой компьютер» ----------

test("карточки слева выглядят как в «Мой компьютер»", async () => {
  await fresh();
  await page.evaluate(() => openWindow("My Computer"));
  await page.waitForSelector('[id="window-My Computer"] .content_left_card_text');
  const styles = await page.evaluate(() => {
    const pick = (el, props) => {
      const cs = getComputedStyle(el);
      return Object.fromEntries(props.map((p) => [p, cs[p]]));
    };
    const read = (win, q) => ({
      sidebar: pick(win.querySelector(q.sidebar), ["backgroundImage", "width"]),
      header: pick(win.querySelector(q.header), ["backgroundImage", "height"]),
      headerText: pick(win.querySelector(q.headerText), ["color", "fontWeight", "fontSize", "fontFamily"]),
      arrow: pick(win.querySelector(q.arrow), ["width", "height", "filter"]),
      body: pick(win.querySelector(q.body), ["backgroundImage", "backgroundColor", "paddingLeft"]),
      text: pick(win.querySelector(q.text), ["color", "fontSize", "lineHeight", "fontFamily"]),
      icon: pick(win.querySelector(q.icon), ["width", "height", "marginRight"]),
    });
    const mc = read(document.getElementById("window-My Computer"), {
      sidebar: ".content_left",
      header: ".content_left_card_header",
      headerText: ".content_left_card_header_text",
      arrow: ".content_left_card_header_img",
      body: ".content_left_card_content",
      text: ".content_left_card_text",
      icon: ".content_left_card_img",
    });
    const am = read(document.getElementById("window-About Me"), {
      sidebar: ".am-sidebar",
      header: ".am-card-header",
      headerText: ".am-card-header-text",
      arrow: ".am-card-arrow",
      body: ".am-card-body",
      text: ".am-link-text",
      icon: ".am-link-icon",
    });
    return { mc, am };
  });
  await page.evaluate(() => closeWindow("My Computer"));
  assert.deepEqual(styles.am, styles.mc);
});

// ---------- ревью: устойчивость к правкам данных и узкое окно ----------

test("в данных нет некоторых разделов — окно всё равно рисуется", async () => {
  await fresh();
  const r = await page.evaluate((root) => {
    const w = document.querySelector(root);
    const saved = window.ABOUT_ME_DATA;
    window.ABOUT_ME_DATA = { about: [{ text: "Только абзац" }] };
    let error = null;
    try {
      AboutMe.init(w);
    } catch (e) {
      error = String(e);
    }
    const res = {
      error,
      title: w.querySelector(".am-title")?.textContent,
      sections: w.querySelectorAll(".am-section").length,
      cards: w.querySelectorAll(".am-card").length,
    };
    window.ABOUT_ME_DATA = saved;
    AboutMe.init(w);
    return res;
  }, ABOUT);
  assert.deepEqual(r, { error: null, title: "Обо мне", sections: 0, cards: 3 });
});

for (const width of [400, 300]) {
  test(`окно шириной ${width}px — основная область без горизонтальной прокрутки и не уже 150px`, async () => {
    await fresh();
    const r = await page.evaluate(
      (root, width) => {
        const win = document.querySelector(root);
        win.style.width = width + "px";
        const main = win.querySelector(".am-main");
        const res = { sw: main.scrollWidth, cw: main.clientWidth };
        win.style.width = "";
        return res;
      },
      ABOUT,
      width
    );
    assert.ok(r.sw <= r.cw, `scrollWidth ${r.sw} > clientWidth ${r.cw}`);
    assert.ok(r.cw >= 150, `основная область слишком узкая: ${r.cw}px`);
  });
}

// ---------- резюме ----------

test("«Моё резюме» открывает окно резюме, новых вкладок нет", async () => {
  await fresh();
  const before = (await h.browser.pages()).length;
  assert.equal(await page.$eval(`${ABOUT} [data-am-action="resume"]`, (e) => e.tagName === "A"), false);
  await clickIn('[data-am-action="resume"]');
  await page.waitForSelector('[id="window-Resume"]', { timeout: 5000 });
  assert.equal((await h.browser.pages()).length, before);
  await page.evaluate(() => closeWindow("Resume"));
});

test("закрыть и открыть снова — профиль, «Назад» неактивна", async () => {
  await fresh();
  await clickIn('[data-am-action="projects"]');
  await fresh();
  assert.equal(await text(".address_bar_content_text"), "Обо мне");
  assert.equal(
    await page.$eval(`${ABOUT} [data-am-nav="back"]`, (e) => e.classList.contains("function_bar_button--disable")),
    true
  );
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

let h;
let page;
const GH = '[id="window-GitHub"]';

before(async () => {
  h = await startHarness();
  page = h.page;
  // окно открывается само при загрузке рабочего стола (после load)
  await page.waitForSelector(GH, { timeout: 10000 });
});
after(async () => h && (await h.close()));

// ---------- Task 1: окно «GitHub» вместо «LinkedIn» ----------

test("при запуске в панели задач «GitHub», окна «LinkedIn» нет", async () => {
  assert.ok(await page.$('[id="taskbar-GitHub"]'), "нет кнопки GitHub в панели задач");
  assert.equal(await page.$('[id="window-LinkedIn"]'), null);
  assert.equal(await page.$('[id="taskbar-LinkedIn"]'), null);
  const label = await page.$eval('[id="taskbar-GitHub"] span', (e) => e.textContent.trim());
  assert.equal(label, "GitHub");
});

test("окно GitHub при запуске открыто: видно, по центру рабочего стола и целиком на экране", async () => {
  const r = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const w = el.getBoundingClientRect();
    const d = document.getElementById("desktop").getBoundingClientRect();
    return {
      visible: el.style.display !== "none" && w.width > 0,
      inside: w.left >= d.left && w.top >= d.top && w.right <= d.right && w.bottom <= d.bottom,
      centered: Math.abs((w.left + w.right) / 2 - (d.left + d.right) / 2) <= 2 && Math.abs((w.top + w.bottom) / 2 - (d.top + d.bottom) / 2) <= 2,
      taskbarActive: !!document.querySelector('[id="taskbar-GitHub"]'),
    };
  }, GH);
  assert.deepEqual(r, { visible: true, inside: true, centered: true, taskbarActive: true });
});

test("адрес — https://github.com/dekciw (ссылка в новой вкладке), чужих данных нет", async () => {
  const a = await page.$eval(`${GH} .IE_address_bar_IE_content_text a`, (a) => ({
    href: a.getAttribute("href"),
    text: a.textContent.trim(),
    target: a.target,
  }));
  assert.deepEqual(a, { href: "https://github.com/dekciw", text: "https://github.com/dekciw", target: "_blank" });
  const html = await page.$eval(GH, (w) => w.innerHTML);
  assert.doesNotMatch(html, /linkedin|joris/i);
});

test("иконки заголовка и панели задач GitHub загрузились", async () => {
  const ok = await page.evaluate(async () => {
    const imgs = [
      document.querySelector('[id="window-GitHub"] .window-header img'),
      document.querySelector('[id="taskbar-GitHub"] img'),
    ];
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
    return imgs.map((i) => i.naturalWidth > 0);
  });
  assert.deepEqual(ok, [true, true]);
});

// ---------- Task 2: живая карточка ----------

async function reopen() {
  await page.evaluate(() => {
    if (document.getElementById("window-GitHub")) closeWindow("GitHub");
    openWindow("GitHub");
  });
  await page.waitForFunction(
    () => document.querySelector('[id="window-GitHub"] .gh-root')?.dataset.state,
    { timeout: 5000 }
  );
  await page.waitForFunction(
    () => document.querySelector('[id="window-GitHub"] .gh-root').dataset.state !== "loading",
    { timeout: 5000 }
  );
}
const resetGh = () =>
  page.evaluate(() => {
    try { localStorage.removeItem("gh-cache-v2"); } catch (e) {}
    Object.assign(window.__gh, { status: 200, calls: 0, delay: 0 });
  });
const q = (sel) => page.$eval(`${GH} ${sel}`, (e) => e.textContent.trim());

test("профиль: аватар, логин, описание, город, подписчики, кнопка «Открыть на GitHub»", async () => {
  await resetGh();
  await reopen();
  assert.equal(await q(".gh-name"), "dekciw");
  assert.equal(await page.$(`${GH} .gh-login`), null, "без имени логин показывается один раз");
  assert.equal(await q(".gh-bio"), "Фронтенд это место, где логика встречается с эстетикой");
  assert.equal(await q(".gh-location"), "Moscow");
  assert.equal(await q(".gh-follow"), "3 подписчика · 5 подписок");
  const open = await page.$eval(`${GH} a.gh-open`, (a) => ({ href: a.getAttribute("href"), target: a.target, text: a.textContent.trim() }));
  assert.deepEqual(open, { href: "https://github.com/dekciw", target: "_blank", text: "Открыть на GitHub" });
  const avatar = await page.$eval(`${GH} .gh-avatar`, (i) => (i.complete ? i.naturalWidth > 0 : new Promise((r) => (i.onload = () => r(true)))));
  assert.equal(avatar, true);
});

test("репозитории: по дате обновления, без форков и служебного dekciw/dekciw, ссылки в новой вкладке", async () => {
  assert.equal(await q(".gh-repos-title"), "Репозитории 2");
  const repos = await page.$$eval(`${GH} .gh-repo a.gh-repo-name`, (l) =>
    l.map((a) => ({ name: a.textContent.trim(), href: a.getAttribute("href"), target: a.target }))
  );
  assert.deepEqual(repos, [
    { name: "windows-xp-portfolio", href: "https://github.com/dekciw/windows-xp-portfolio", target: "_blank" },
    { name: "morningbot", href: "https://github.com/dekciw/morningbot", target: "_blank" },
  ]);
  const first = await page.$eval(`${GH} .gh-repo`, (r) => ({
    desc: r.querySelector(".gh-repo-desc")?.textContent.trim(),
    lang: r.querySelector(".gh-repo-lang")?.textContent.trim(),
    stars: r.querySelector(".gh-repo-stars")?.textContent.trim(),
    updated: r.querySelector(".gh-repo-updated")?.textContent.trim(),
  }));
  assert.deepEqual(first, {
    desc: "Интерактивное веб-портфолио в стиле Windows XP",
    lang: "JavaScript",
    stars: "2",
    updated: "обновлён 8 ноября 2026 г.",
  });
});

test("пустые описание и язык — без пустых строк и слова null", async () => {
  const r = await page.$$eval(`${GH} .gh-repo`, (l) => {
    const m = l.find((x) => x.querySelector(".gh-repo-name").textContent.trim() === "morningbot");
    return { desc: !!m.querySelector(".gh-repo-desc"), lang: !!m.querySelector(".gh-repo-lang"), text: m.textContent };
  });
  assert.equal(r.desc, false);
  assert.equal(r.lang, false);
  assert.doesNotMatch(r.text, /null|undefined/);
});

test("пока данные грузятся — «Загрузка…»", async () => {
  await resetGh();
  await page.evaluate(() => (window.__gh.delay = 800));
  await page.evaluate(() => {
    if (document.getElementById("window-GitHub")) closeWindow("GitHub");
    openWindow("GitHub");
  });
  await page.waitForSelector(`${GH} .gh-loading`, { timeout: 3000 });
  assert.equal(await q(".gh-loading"), "Загрузка…");
  await page.waitForSelector(`${GH} .gh-profile`, { timeout: 5000 });
  assert.equal(await page.$(`${GH} .gh-loading`), null);
});

test("кэш: повторное открытие в течение часа без запроса; после истечения — новый запрос", async () => {
  await resetGh();
  await reopen();
  assert.equal(await page.evaluate(() => window.__gh.calls), 3); // профиль, репозитории, README
  await reopen();
  assert.equal(await page.evaluate(() => window.__gh.calls), 3, "второе открытие не должно ходить в GitHub");
  await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem("gh-cache-v2"));
    c.time -= 3600 * 1000 + 1;
    localStorage.setItem("gh-cache-v2", JSON.stringify(c));
  });
  await reopen();
  assert.equal(await page.evaluate(() => window.__gh.calls), 6);
});

test("GitHub недоступен (403, лимит) — сообщение и ссылка на профиль", async () => {
  await resetGh();
  await page.evaluate(() => (window.__gh.status = 403));
  await reopen();
  assert.match(await q(".gh-error"), /Не удалось загрузить профиль GitHub/);
  const href = await page.$eval(`${GH} .gh-error a`, (a) => a.getAttribute("href"));
  assert.equal(href, "https://github.com/dekciw");
  assert.equal(await page.$(`${GH} .gh-profile`), null);
});

test("localStorage недоступен — карточка всё равно рисуется", async () => {
  await resetGh();
  await page.evaluate(() => {
    window.__savedStorage = { g: Storage.prototype.getItem, s: Storage.prototype.setItem };
    Storage.prototype.getItem = () => { throw new Error("blocked"); };
    Storage.prototype.setItem = () => { throw new Error("blocked"); };
  });
  try {
    await reopen();
    assert.equal(await q(".gh-name"), "dekciw");
  } finally {
    await page.evaluate(() => {
      Storage.prototype.getItem = window.__savedStorage.g;
      Storage.prototype.setItem = window.__savedStorage.s;
    });
  }
});

test("узкое окно — репозитории в одну колонку, без горизонтальной прокрутки", async () => {
  await resetGh();
  await reopen();
  const r = await page.evaluate(() => {
    const w = document.getElementById("window-GitHub");
    w.style.width = "460px";
    const lefts = [...w.querySelectorAll(".gh-repo")].map((x) => Math.round(x.getBoundingClientRect().left));
    const sc = w.querySelector(".IE_content");
    const res = { sameColumn: new Set(lefts).size === 1, noHScroll: sc.scrollWidth <= sc.clientWidth };
    w.style.width = "";
    return res;
  });
  assert.deepEqual(r, { sameColumn: true, noHScroll: true });
});

test("широкое окно — репозитории в две колонки", async () => {
  const r = await page.evaluate(() => {
    const w = document.getElementById("window-GitHub");
    w.style.width = "1000px";
    const lefts = [...w.querySelectorAll(".gh-repo")].map((x) => Math.round(x.getBoundingClientRect().left));
    w.style.width = "";
    return new Set(lefts).size;
  });
  assert.equal(r, 2);
});

test("если в профиле GitHub задано имя — крупно имя, под ним логин", async () => {
  await resetGh();
  await page.evaluate(() => (window.__gh.user = { ...window.__gh.user, name: "Роман Атанов" }));
  try {
    await reopen();
    assert.equal(await q(".gh-name"), "Роман Атанов");
    assert.equal(await q(".gh-login"), "dekciw");
  } finally {
    await page.evaluate(() => (window.__gh.user = { ...window.__gh.user, name: null }));
    await resetGh();
  }
});

// ---------- README профиля и активность ----------

test("README профиля: заголовок «dekciw / README.md», текст, ссылки в новой вкладке", async () => {
  await resetGh();
  await reopen();
  assert.equal(await q(".gh-readme-title"), "dekciw / README.md");
  assert.equal(await q(".gh-readme-body h1"), "Привет! 👋 Я Роман");
  const links = await page.$$eval(`${GH} .gh-readme-body a`, (l) =>
    l.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href"), target: a.target }))
  );
  assert.deepEqual(links.slice(0, 2), [
    { text: "Eng version", href: "https://github.com/dekciw/dekciw/blob/main/readme.en.md", target: "_blank" },
    { text: "Logiways", href: "https://logiways.ru/", target: "_blank" },
  ]);
});

test("README профиля: скрипты, обработчики и javascript:-ссылки вычищены", async () => {
  const r = await page.evaluate((root) => {
    const body = document.querySelector(`${root} .gh-readme-body`);
    const bad = [...body.querySelectorAll("a")].find((a) => a.textContent.trim() === "bad link");
    return {
      scripts: body.querySelectorAll("script, iframe, object, embed, style").length,
      onAttrs: [...body.querySelectorAll("*")].some((e) => [...e.attributes].some((a) => a.name.startsWith("on"))),
      badHref: bad ? bad.getAttribute("href") : null,
      xss: window.__xss || 0,
    };
  }, GH);
  assert.equal(r.scripts, 0);
  assert.equal(r.onAttrs, false);
  assert.ok(r.badHref === null || !/^\s*javascript:/i.test(r.badHref), `опасная ссылка осталась: ${r.badHref}`);
  assert.equal(r.xss, 0);
});

test("README профиля недоступен — блока нет, остальное на месте", async () => {
  await resetGh();
  await page.evaluate(() => ((window.__savedReadme = window.__gh.readme), (window.__gh.readme = null)));
  try {
    await reopen();
    assert.equal(await page.$(`${GH} .gh-readme`), null);
    assert.equal(await q(".gh-repos-title"), "Репозитории 2");
  } finally {
    await page.evaluate(() => (window.__gh.readme = window.__savedReadme));
  }
});

test("активность: «N действий за последний год», 365 клеток по уровням, подсказка у клетки", async () => {
  await resetGh();
  await reopen();
  const expected = await page.evaluate(() => window.__gh.contrib.total.lastYear);
  const title = await q(".gh-contrib-title");
  assert.match(title, /^[\d\s]+ действ(ие|ия|ий) за последний год$/);
  assert.equal(Number(title.replace(/\D/g, "")), expected);
  const cells = await page.$$eval(`${GH} .gh-contrib-grid .gh-day:not(.gh-day--empty)`, (l) => l.map((c) => c.dataset.level));
  assert.equal(cells.length, 365);
  assert.ok(cells.every((lv) => ["0", "1", "2", "3", "4"].includes(lv)));
  const last = await page.$$eval(`${GH} .gh-contrib-grid .gh-day:not(.gh-day--empty)`, (l) => l[l.length - 1].title);
  assert.ok(/8 ноября 2026/.test(last), `подсказка последнего дня: ${last}`);
  const legend = await page.$$eval(`${GH} .gh-contrib-legend > span`, (l) =>
    l.map((s) => s.textContent.trim() || `[${s.dataset.level}]`)
  );
  assert.deepEqual(legend, ["Меньше", "[0]", "[1]", "[2]", "[3]", "[4]", "Больше"]);
});

test("число действий склоняется: 1 действие, 3 действия, 5 действий", async () => {
  const r = await page.evaluate(() => [1, 3, 5, 11, 21, 1064].map((n) => GitHubWindow._actions(n)));
  assert.deepEqual(
    r.map((s) => s.replace(/\s/g, " ")),
    ["1 действие", "3 действия", "5 действий", "11 действий", "21 действие", "1 064 действия"]
  );
});

test("сервис активности недоступен — блока нет, остальное на месте", async () => {
  await resetGh();
  await page.evaluate(() => ((window.__savedContrib = window.__gh.contrib), (window.__gh.contrib = null)));
  try {
    await reopen();
    assert.equal(await page.$(`${GH} .gh-contrib`), null);
    assert.equal(await q(".gh-readme-title"), "dekciw / README.md");
  } finally {
    await page.evaluate(() => (window.__gh.contrib = window.__savedContrib));
  }
});

test("порядок справа: README, репозитории, активность", async () => {
  await resetGh();
  await reopen();
  const order = await page.$$eval(`${GH} .gh-main > *`, (l) => l.map((e) => e.className.split(" ")[0]));
  const pos = (c) => order.indexOf(c);
  assert.ok(
    pos("gh-readme") >= 0 && pos("gh-readme") < pos("gh-repos-title") && pos("gh-repos") < pos("gh-contrib"),
    order.join(",")
  );
});

test("график активности целиком помещается в окно шириной 1100px (без прокрутки)", async () => {
  await resetGh();
  await reopen();
  const r = await page.evaluate(() => {
    const w = document.getElementById("window-GitHub");
    w.style.width = "1100px";
    const s = w.querySelector(".gh-contrib-scroll");
    const res = { sw: s.scrollWidth, cw: s.clientWidth };
    w.style.width = "";
    return res;
  });
  assert.ok(r.sw <= r.cw, `график не помещается: ${r.sw} > ${r.cw}`);
});

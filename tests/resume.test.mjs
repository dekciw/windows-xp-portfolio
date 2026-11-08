import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness, openResume, closeResume, RESUME } from "./helpers/harness.mjs";

// Окно «Моё резюме»: страницы-картинки из pages.json, масштаб, сохранение PDF, связь в Telegram.

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
  // Внешние ссылки в тестах не открываем: отменяем переход, но запоминаем адрес.
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

// Свежее окно: закрыть (если открыто), открыть и дождаться стилей окна.
async function fresh() {
  if (await page.$(RESUME)) await closeResume(page);
  await openResume(page);
  await page.waitForFunction(
    (sel) => {
      const v = document.querySelector(`${sel} .rs-viewer`);
      return v && getComputedStyle(v).overflowY === "auto";
    },
    { timeout: 5000 },
    RESUME
  );
}
const text = (sel) => page.$eval(`${RESUME} ${sel}`, (e) => e.textContent.trim());
const zoom = () => page.$eval(`${RESUME} .rs-viewer`, (v) => v.dataset.zoom);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Геометрия области просмотра и первой страницы.
const geo = () =>
  page.$eval(`${RESUME} .rs-viewer`, (v) => {
    const p = v.querySelector(".rs-page").getBoundingClientRect();
    return {
      scrollWidth: v.scrollWidth,
      clientWidth: v.clientWidth,
      scrollLeft: v.scrollLeft,
      scrollTop: v.scrollTop,
      pageWidth: p.width,
    };
  });

// Точка внутри первой страницы, видимая в области просмотра.
const pointOnPage = (fx = 0.5, fy = 0.5) =>
  page.$eval(
    `${RESUME} .rs-viewer`,
    (v, fx, fy) => {
      const vr = v.getBoundingClientRect();
      const pr = v.querySelector(".rs-page").getBoundingClientRect();
      const left = Math.max(vr.left, pr.left);
      const right = Math.min(vr.left + v.clientWidth, pr.right);
      const top = Math.max(vr.top, pr.top);
      const bottom = Math.min(vr.top + v.clientHeight, pr.bottom);
      return { x: left + (right - left) * fx, y: top + (bottom - top) * fy };
    },
    fx,
    fy
  );

// Доля страницы (0..1) под точкой экрана.
const fractionAt = (pt) =>
  page.$eval(
    `${RESUME} .rs-page`,
    (p, pt) => {
      const r = p.getBoundingClientRect();
      return { fx: (pt.x - r.left) / r.width, fy: (pt.y - r.top) / r.height };
    },
    pt
  );

async function clickMenu(label) {
  const handle = await page.evaluateHandle(
    (sel, label) =>
      [...document.querySelectorAll(`${sel} .drop_down_label`)].find((l) => l.textContent.trim() === label),
    RESUME,
    label
  );
  await handle.asElement().click();
}

// ---------- иконка и окно ----------

test("иконка «Моё резюме» есть, картинка загружается, все иконки видны на 1366×768", async () => {
  const label = await page.$eval('.icon[data-app="Resume"] span', (e) => e.textContent.trim());
  assert.equal(label, "Моё резюме");
  const loaded = await page.$eval('.icon[data-app="Resume"] img', (e) =>
    e.complete ? e.naturalWidth > 0 : new Promise((r) => (e.onload = e.onerror = () => r(e.naturalWidth > 0)))
  );
  assert.equal(loaded, true);
  // сразу после «Обо мне»
  const prev = await page.$eval('.icon[data-app="Resume"]', (e) => e.previousElementSibling?.dataset.app);
  assert.equal(prev, "About Me");
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

test("двойной клик: окно «Моё резюме», кнопка в панели задач, иконка заголовка загружена", async () => {
  await fresh();
  assert.equal(await text(".window-header-title"), "Моё резюме");
  assert.equal(await page.$eval("#taskbar-Resume span", (e) => e.textContent.trim()), "Моё резюме");
  for (const sel of [`${RESUME} .window-header img`, "#taskbar-Resume img"]) {
    await page.waitForFunction(
      (sel) => {
        const img = document.querySelector(sel);
        return img && img.complete && img.naturalWidth > 0;
      },
      { timeout: 5000 },
      sel
    );
  }
  // окно целиком помещается на рабочем столе
  const fits = await page.$eval(RESUME, (w) => {
    const d = document.getElementById("desktop").getBoundingClientRect();
    const r = w.getBoundingClientRect();
    return r.left >= d.left && r.top >= d.top && r.right <= d.right && r.bottom <= d.bottom;
  });
  assert.equal(fits, true);
});

test("страниц столько же, сколько в pages.json, src содержит ?v=", async () => {
  await fresh();
  const manifest = await page.evaluate(() =>
    fetch("/Assets/Images/Resume/pages.json", { cache: "no-store" }).then((r) => r.json())
  );
  const imgs = await page.$$eval(`${RESUME} .rs-page img`, (l) =>
    l.map((i) => ({ src: i.getAttribute("src"), width: +i.getAttribute("width"), height: +i.getAttribute("height") }))
  );
  assert.equal(imgs.length, manifest.pages.length);
  assert.deepEqual(
    imgs.map((i) => i.src),
    manifest.pages.map((p) => p.src)
  );
  for (const i of imgs) assert.match(i.src, /\?v=/);
  assert.deepEqual(
    imgs.map((i) => [i.width, i.height]),
    manifest.pages.map((p) => [p.width, p.height])
  );
  // первая страница реально загружается
  await page.waitForFunction(
    (sel) => {
      const img = document.querySelector(`${sel} .rs-page img`);
      return img.complete && img.naturalWidth > 0;
    },
    { timeout: 5000 },
    RESUME
  );
  assert.deepEqual(
    requests.filter((u) => u.includes("pdfjs")),
    [],
    "pdfjs-dist не должен грузиться страницами сайта"
  );
});

test("панель: Масштаб, Сохранить (download → /Assets/Docs/resume.pdf), Печать неактивна, Связаться → t.me/atanov_roman", async () => {
  await fresh();
  assert.equal(await text('[data-rs-action="zoom"]'), "Масштаб");

  const save = await page.$eval(`${RESUME} [data-rs-action="save"]`, (a) => ({
    tag: a.tagName,
    href: a.getAttribute("href"),
    download: a.getAttribute("download"),
    text: a.textContent.trim(),
  }));
  assert.deepEqual(save, {
    tag: "A",
    href: "/Assets/Docs/resume.pdf",
    download: "Резюме Атанов Роман.pdf",
    text: "Сохранить",
  });
  const pdf = await page.evaluate(() => fetch("/Assets/Docs/resume.pdf", { method: "HEAD" }).then((r) => r.status));
  assert.equal(pdf, 200);

  const print = await page.$eval(`${RESUME} [data-rs-action="print"]`, (e) => ({
    disabled: e.classList.contains("function_bar_button--disable"),
    text: e.textContent.trim(),
  }));
  assert.deepEqual(print, { disabled: true, text: "Печать" });

  const contact = await page.$eval(`${RESUME} [data-rs-action="contact"]`, (a) => ({
    tag: a.tagName,
    href: a.getAttribute("href"),
    target: a.getAttribute("target"),
    rel: a.getAttribute("rel"),
    text: a.textContent.trim(),
  }));
  assert.deepEqual(contact, {
    tag: "A",
    href: "https://t.me/atanov_roman",
    target: "_blank",
    rel: "noreferrer",
    text: "Связаться со мной",
  });
  await page.evaluate(() => (window.__followed = null));
  await page.click(`${RESUME} [data-rs-action="contact"]`);
  assert.equal(await page.evaluate(() => window.__followed), "https://t.me/atanov_roman");

  // иконки кнопок загружаются
  const broken = await page.$$eval(`${RESUME} .function_bar img`, (l) =>
    Promise.all(
      l.map(async (img) => {
        if (!img.complete) await new Promise((r) => (img.onload = img.onerror = r));
        return img.naturalWidth > 0 ? null : img.getAttribute("src");
      })
    ).then((l) => l.filter(Boolean))
  );
  assert.deepEqual(broken, []);
});

test("«Справка» неактивна: щелчок не открывает меню", async () => {
  await fresh();
  const labels = await page.$$eval(`${RESUME} .drop_down_label`, (l) =>
    l.map((e) => [e.textContent.trim(), e.classList.contains("rs-disabled")])
  );
  assert.deepEqual(labels, [
    ["Файл", false],
    ["Вид", false],
    ["Справка", true],
  ]);
  const errorsBefore = consoleErrors.length;
  const requestsBefore = requests.length;
  await clickMenu("Справка");
  await pause(400);
  assert.equal(await page.$(`${RESUME} .window-tooltip`), null, "открылось меню");
  assert.deepEqual(
    requests.slice(requestsBefore).filter((u) => u.includes("/Tooltip/")),
    [],
    "запрошен файл меню"
  );
  assert.deepEqual(consoleErrors.slice(errorsBefore), []);
});

// ---------- масштаб ----------

test("в режиме «по ширине» нет горизонтальной прокрутки и страница уже области просмотра", async () => {
  await fresh();
  assert.equal(await zoom(), "fit");
  const g = await geo();
  assert.ok(g.scrollWidth <= g.clientWidth, `горизонтальная прокрутка: ${g.scrollWidth} > ${g.clientWidth}`);
  assert.ok(g.pageWidth <= g.clientWidth, `страница ${g.pageWidth} шире области ${g.clientWidth}`);
  assert.equal(
    await page.$eval(`${RESUME} .rs-page`, (p) => getComputedStyle(p).cursor),
    "zoom-in"
  );
});

test("щелчок по странице → large (страница шире области), повторный щелчок → fit", async () => {
  await fresh();
  const pt = await pointOnPage(0.3, 0.4);
  const before = await fractionAt(pt);
  await page.mouse.click(pt.x, pt.y);
  assert.equal(await zoom(), "large");
  assert.equal(await page.evaluate(() => document.getElementById("window-Resume")._rs.zoom), "large");
  const g = await geo();
  assert.ok(g.pageWidth > g.clientWidth, `страница ${g.pageWidth} не шире области ${g.clientWidth}`);
  assert.equal(g.pageWidth, 1191);
  // точка под курсором осталась под курсором
  const after = await fractionAt(pt);
  assert.ok(Math.abs(after.fx - before.fx) < 0.01, `по горизонтали ${before.fx} → ${after.fx}`);
  assert.ok(Math.abs(after.fy - before.fy) < 0.01, `по вертикали ${before.fy} → ${after.fy}`);
  assert.equal(await page.$eval(`${RESUME} .rs-page`, (p) => getComputedStyle(p).cursor), "grab");

  const pt2 = await pointOnPage();
  await page.mouse.click(pt2.x, pt2.y);
  assert.equal(await zoom(), "fit");
  const g2 = await geo();
  assert.ok(g2.scrollWidth <= g2.clientWidth);
});

test("перетаскивание в large прокручивает и не возвращает fit", async () => {
  await fresh();
  const pt = await pointOnPage(0.2, 0.2);
  await page.mouse.click(pt.x, pt.y);
  assert.equal(await zoom(), "large");
  await page.$eval(`${RESUME} .rs-viewer`, (v) => {
    v.scrollLeft = 0;
    v.scrollTop = 0;
  });
  const start = await pointOnPage(0.8, 0.8);
  const before = await geo();
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 100, start.y - 100, { steps: 5 });
  assert.equal(
    await page.$eval(`${RESUME} .rs-viewer`, (v) => v.classList.contains("rs-dragging")),
    true,
    "во время перетаскивания курсор «grabbing»"
  );
  await page.mouse.move(start.x - 200, start.y - 200, { steps: 5 });
  await page.mouse.up();
  const after = await geo();
  assert.equal(await zoom(), "large");
  assert.ok(after.scrollLeft > before.scrollLeft, `scrollLeft ${before.scrollLeft} → ${after.scrollLeft}`);
  assert.ok(after.scrollTop > before.scrollTop, `scrollTop ${before.scrollTop} → ${after.scrollTop}`);
  assert.equal(
    await page.$eval(`${RESUME} .rs-viewer`, (v) => v.classList.contains("rs-dragging")),
    false
  );
});

test("кнопка «Масштаб» переключает режим", async () => {
  await fresh();
  await page.click(`${RESUME} [data-rs-action="zoom"]`);
  assert.equal(await zoom(), "large");
  const g = await geo();
  assert.ok(g.pageWidth > g.clientWidth);
  await page.click(`${RESUME} [data-rs-action="zoom"]`);
  assert.equal(await zoom(), "fit");
});

test("меню «Вид → Крупно/По ширине» переключает режим", async () => {
  await fresh();
  await clickMenu("Вид");
  await page.waitForSelector(`${RESUME} .window-tooltip [data-rs-zoom="large"]`, { timeout: 5000 });
  assert.equal(await text('.window-tooltip [data-rs-zoom="large"]'), "Крупно");
  await page.click(`${RESUME} .window-tooltip [data-rs-zoom="large"] .drop-down__text`);
  assert.equal(await zoom(), "large");
  await page.waitForFunction((sel) => !document.querySelector(`${sel} .window-tooltip`), {}, RESUME);

  await clickMenu("Вид");
  await page.waitForSelector(`${RESUME} .window-tooltip [data-rs-zoom="fit"]`, { timeout: 5000 });
  assert.equal(await text('.window-tooltip [data-rs-zoom="fit"]'), "По ширине");
  await page.click(`${RESUME} .window-tooltip [data-rs-zoom="fit"] .drop-down__text`);
  assert.equal(await zoom(), "fit");
});

test("меню «Файл»: «Сохранить» ведёт на PDF, «Закрыть» закрывает окно", async () => {
  await fresh();
  await clickMenu("Файл");
  await page.waitForSelector(`${RESUME} .window-tooltip a[download]`, { timeout: 5000 });
  const save = await page.$eval(`${RESUME} .window-tooltip a[download]`, (a) => ({
    href: a.getAttribute("href"),
    download: a.getAttribute("download"),
    text: a.textContent.trim(),
  }));
  assert.deepEqual(save, {
    href: "/Assets/Docs/resume.pdf",
    download: "Резюме Атанов Роман.pdf",
    text: "Сохранить",
  });
  const close = await page.evaluateHandle(
    (sel) =>
      [...document.querySelectorAll(`${sel} .window-tooltip .drop-down__text`)].find(
        (e) => e.textContent.trim() === "Закрыть"
      ),
    RESUME
  );
  await close.asElement().click();
  await page.waitForFunction(() => !document.getElementById("window-Resume"), { timeout: 3000 });
});

test("развернуть окно в fit → страница становится шире, горизонтальной прокрутки нет", async () => {
  await fresh();
  const before = await geo();
  await page.evaluate(() => maximazeWindow("Resume"));
  try {
    const after = await geo();
    assert.ok(after.pageWidth > before.pageWidth, `страница ${before.pageWidth} → ${after.pageWidth}`);
    assert.ok(after.scrollWidth <= after.clientWidth);
    assert.equal(await zoom(), "fit");
  } finally {
    await page.evaluate(() => maximazeWindow("Resume"));
  }
});

test("pages.json 404 → .rs-error «Не удалось загрузить резюме», «Сохранить» всё ещё ссылка на PDF", async () => {
  if (await page.$(RESUME)) await closeResume(page);
  const handler = (req) => {
    if (req.isInterceptResolutionHandled()) return;
    if (req.url().includes("/Assets/Images/Resume/pages.json")) req.respond({ status: 404, body: "" });
    else req.continue();
  };
  await page.setRequestInterception(true);
  page.on("request", handler);
  try {
    await page.click('.icon[data-app="Resume"]', { count: 2 });
    await page.waitForSelector(`${RESUME} .rs-error`, { timeout: 5000 });
    assert.equal(await text(".rs-error"), "Не удалось загрузить резюме");
    assert.equal(await page.$(`${RESUME} .rs-page`), null);
    const save = await page.$eval(`${RESUME} [data-rs-action="save"]`, (a) => [a.tagName, a.getAttribute("href")]);
    assert.deepEqual(save, ["A", "/Assets/Docs/resume.pdf"]);
  } finally {
    page.off("request", handler);
    await page.setRequestInterception(false);
    await closeResume(page);
  }
});

test("закрыть и открыть снова → fit, scrollTop 0", async () => {
  await fresh();
  await page.click(`${RESUME} [data-rs-action="zoom"]`);
  await page.$eval(`${RESUME} .rs-viewer`, (v) => (v.scrollTop = 500));
  assert.ok((await geo()).scrollTop > 0);
  await fresh();
  assert.equal(await zoom(), "fit");
  assert.equal((await geo()).scrollTop, 0);
});

test("строка состояния: «Щёлкните, чтобы увеличить, затем перетащите»", async () => {
  await fresh();
  assert.equal(await text(".rs-status"), "Щёлкните, чтобы увеличить, затем перетащите");
});

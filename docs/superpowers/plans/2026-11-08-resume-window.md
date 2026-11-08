# Окно «Моё резюме» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Иконка «Моё резюме» на рабочем столе открывает XP-окно, где резюме читается постранично (картинки из PDF), с масштабом, скачиванием PDF и кнопкой Telegram.

**Architecture:** Скрипт `npm run resume` один раз рендерит `Assets/Docs/resume.pdf` в WebP-картинки и `pages.json` через pdf.js в headless Chrome. Окно `Open_Windows/Resume/` по схеме остальных окон (`openWindow("Resume")` + `window.ResumeWindow.init(win)`) читает `pages.json` и показывает страницы. «Пуск → Резюме» и «Обо мне → Моё резюме» открывают то же окно.

**Tech Stack:** статический HTML/CSS/JS, puppeteer-core + локальный Chrome, `pdfjs-dist` (devDependency, только скрипт), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-08-resume-window-design.md`

## Global Constraints

- Тексты UI на русском, без длинных тире (`—`).
- Внутреннее имя окна `Resume`, отображаемое «Моё резюме» (`appDisplayNames`).
- PDF: `/Assets/Docs/resume.pdf`. Картинки: `/Assets/Images/Resume/page-N.webp` (N с 1). Манифест: `/Assets/Images/Resume/pages.json`.
- Telegram: `https://t.me/atanov_roman`, `target="_blank" rel="noreferrer"`.
- `pdfjs-dist` не подключается страницами сайта, только скриптом.
- Пути в коде от корня сайта (`/…`), как везде в проекте; сервер для проверки: `npx http-server . -p 3000 -c-1`.
- Никаких установщиков, требующих прав администратора.

## Review Focus

1. Окно развернули/растянули в режиме «по ширине»: страницы подстраиваются под новую ширину, горизонтальной прокрутки нет. → тест в Task 2.
2. `pages.json` не загрузился (404/битый): в окне сообщение «Не удалось загрузить резюме», кнопка «Сохранить» всё равно ведёт на PDF. → тест в Task 2.
3. Перетаскивание увеличенной страницы не считается щелчком (не возвращает «по ширине»). → тест в Task 2.
4. После замены PDF браузер не показывает старые картинки из кэша: `src` содержит `?v=<version>`, `pages.json` грузится с `cache: "no-cache"`. → тест в Task 1 (version меняется при другом PDF) и Task 2 (src содержит `?v=`).
5. Закрыть и открыть окно снова: снова режим «по ширине», прокрутка в начале. → тест в Task 2.

---

### Task 1: Скрипт `npm run resume` (PDF → картинки + pages.json)

**Files:**
- Create: `scripts/build-resume.mjs`, `scripts/collapse-blank.mjs`
- Create (результат запуска, коммитится): `Assets/Docs/resume.pdf` (копия `C:\Users\atanov.r\Downloads\Атанов Роман Романович (1).pdf`), `Assets/Images/Resume/page-1.webp … page-5.webp`, `Assets/Images/Resume/pages.json`
- Modify: `package.json` (script `"resume": "node scripts/build-resume.mjs"`, devDependency `pdfjs-dist`), `tests/helpers/harness.mjs` (экспортировать `startServer(root = ROOT)` и `CHROME`)
- Test: `tests/build-resume.test.mjs`

**Interfaces:**
- Produces: `collapseBlankRun(blankRows: boolean[], minRun: number, keep: number): { cutFrom: number, cutTo: number } | null` в `scripts/collapse-blank.mjs` — находит самую длинную серию подряд идущих пустых строк длиной ≥ `minRun`, не касающуюся ни верхнего, ни нижнего края (только между контентом сверху и снизу, колонтитул остаётся), и возвращает диапазон строк `[cutFrom, cutTo)` для вырезания так, чтобы от серии остались её первые `keep` строк; `null`, если такой серии нет.
- Produces: `buildResume({ pdf: string, outDir: string, scale?: number = 2 }): Promise<Manifest>` (экспорт из `scripts/build-resume.mjs`; при запуске как CLI берёт `pdf`/`outDir` из `process.argv[2..3]`, по умолчанию `Assets/Docs/resume.pdf` и `Assets/Images/Resume`).
- Produces: `Manifest = { version: string, pages: { src: string, width: number, height: number }[] }`; `src` = `/Assets/Images/Resume/page-N.webp?v=<version>`; `version` = первые 10 hex-символов sha256 от байтов PDF; `width/height` — размеры картинки в пикселях.

- [ ] **Step 1: Тесты**

```js
// tests/build-resume.test.mjs
test("collapseBlankRun: вырезает длинную пустую серию между текстом и колонтитулом", () => {
  const rows = [...Array(10).fill(false), ...Array(100).fill(true), ...Array(5).fill(false), ...Array(10).fill(true)];
  assert.deepEqual(collapseBlankRun(rows, 50, 20), { cutFrom: 30, cutTo: 110 });
});
test("collapseBlankRun: короткие серии и пустота у краёв не трогаются", () => {
  assert.equal(collapseBlankRun([...Array(40).fill(true), false, ...Array(40).fill(true)], 30, 10), null);
  assert.equal(collapseBlankRun([false, ...Array(20).fill(true), false], 30, 10), null);
});
test("buildResume на настоящем PDF: 5 страниц, файлы есть, последняя ниже первой", async () => {
  const out = await mkdtemp(join(tmpdir(), "resume-"));
  const m = await buildResume({ pdf: "Assets/Docs/resume.pdf", outDir: out });
  assert.equal(m.pages.length, 5);
  assert.match(m.version, /^[0-9a-f]{10}$/);
  assert.equal(m.pages[0].src, `/Assets/Images/Resume/page-1.webp?v=${m.version}`);
  assert.ok(m.pages[0].width >= 1100);                       // 595pt × 2
  assert.ok(m.pages[4].height < m.pages[0].height * 0.6);    // пустой низ стр. 5 вырезан
  for (let i = 1; i <= 5; i++) assert.ok((await stat(join(out, `page-${i}.webp`))).size > 1000);
  assert.deepEqual(JSON.parse(await readFile(join(out, "pages.json"), "utf8")), m);
});
test("другой PDF → другой version", async () => { /* копия PDF с дописанным байтом в tmp → version отличается */ });
```

- [ ] **Step 2:** `npm test -- tests/build-resume.test.mjs` → FAIL (модулей нет).

- [ ] **Step 3: Реализация.** `npm i -D pdfjs-dist@4` (ESM-сборка `build/pdf.min.mjs` + `build/pdf.worker.min.mjs`). Скопировать PDF в `Assets/Docs/resume.pdf`. `buildResume`: поднять `startServer()` из harness (корень репо, PDF отдаётся по его пути относительно корня — для tmp-PDF из теста сервер с `root` = папка PDF), открыть пустую страницу в Chrome (`CHROME`), в ней `import("/node_modules/pdfjs-dist/build/pdf.min.mjs")`, `GlobalWorkerOptions.workerSrc` на worker, отрендерить каждую страницу в canvas с `scale`, получить карту пустых строк (строка пустая, если у всех пикселей каждый канал ≥ 250) и для последней страницы применить `collapseBlankRun(rows, height*0.25, 48*scale)` (вырезать диапазон: собрать новый canvas из двух кусков), вернуть `toDataURL("image/webp", 0.9)`; в Node записать файлы и `pages.json` (JSON с отступом 2). Перед записью удалить старые `page-*.webp` в `outDir`.

- [ ] **Step 4:** `npm test -- tests/build-resume.test.mjs` → PASS. Затем `npm run resume` и открыть `Assets/Images/Resume/page-1.webp` и `page-5.webp` глазами: текст чёткий, на 5-й нет большой пустоты, колонтитул на месте.

- [ ] **Step 5: Commit** — `feat: npm run resume renders the resume PDF into page images` (вместе с `Assets/Docs/resume.pdf`, картинками, `pages.json`, `package.json`, `package-lock.json`).

---

### Task 2: Окно «Моё резюме» и иконка на рабочем столе

**Files:**
- Create: `Open_Windows/Resume/Resume.html`, `Open_Windows/Resume/Resume.css`, `Open_Windows/Resume/resume.js`, `Open_Windows/Resume/Tooltip/File.html`, `Open_Windows/Resume/Tooltip/View.html`
- Create: `Assets/Windows XP High Resolution Icon Pack avec MAOSX/Windows XP High Resolution Icon Pack/Windows XP Icons/Resume.png` (128×128, прозрачный фон, из `/Assets/Images/Icons/pdf-icon.svg` одноразовым скриншотом puppeteer с `omitBackground: true`; нужен заголовку окна и панели задач, они берут `Icons/<appName>.png`)
- Modify: `Bureau/Bureau.js` (`appDisplayNames["Resume"] = "Моё резюме"`; после загрузки HTML окна: `if (appName === "Resume" && window.ResumeWindow) window.ResumeWindow.init(windowElement);` рядом с GitHub/About Me), `Bureau/Bureau.html` (`<script src="/Open_Windows/Resume/resume.js?v=1">`; иконка `<div class="icon" data-app="Resume" ondblclick="openWindow('Resume')">` с `Resume.png` и подписью «Моё резюме», сразу после «Обо мне»; поднять `?v=` у `Bureau.js`)
- Modify: `tests/helpers/harness.mjs` (`RESUME = '[id="window-Resume"]'`, `openResume(page)`, `closeResume(page)` по образцу About Me; ждать `${RESUME} .rs-page img`)
- Test: `tests/resume.test.mjs`

**Interfaces:**
- Consumes: `Manifest` из Task 1 по адресу `/Assets/Images/Resume/pages.json`.
- Produces: `window.ResumeWindow = { init(win: HTMLElement): void, setZoom(win, mode: "fit" | "large"): void }`; состояние `win._rs = { zoom: "fit" | "large" }`.
- Produces DOM: `.rs-root`; меню `.drop_down_label` «Файл», «Вид», «Справка» (последняя с классом `rs-disabled`, без выпадающего меню); кнопки `[data-rs-action="zoom"]` «Масштаб», `a[data-rs-action="save"][href="/Assets/Docs/resume.pdf"][download="Резюме Атанов Роман.pdf"]` «Сохранить», `[data-rs-action="print"].function_bar_button--disable` «Печать», `a[data-rs-action="contact"][href="https://t.me/atanov_roman"][target="_blank"]` «Связаться со мной»; область `.rs-viewer` (серый фон, прокрутка) с `.rs-page` × N (`<img>` + белый лист с тенью), атрибут `.rs-viewer[data-zoom="fit"|"large"]`; `.rs-error` с текстом «Не удалось загрузить резюме»; строка состояния `.rs-status` «Щёлкните, чтобы увеличить, затем перетащите».
- Иконки кнопок из пака: `Magnifier.png`, `Save.png`, `Printer.png`, `Email.png`. Разметка панели — классами `computer_toolbar`/`function_bar` как в `Open_Windows/About Me/About Me.html`.
- Меню: `Tooltip/File.html` — «Сохранить» (ссылка на PDF с `download`), «Закрыть» (закрытие подключает `Bureau.js` по тексту «Закрыть»); `Tooltip/View.html` — «По ширине» (`[data-rs-zoom="fit"]`), «Крупно» (`[data-rs-zoom="large"]`), обработка делегированным кликом в `init`. Разметка выпадающих меню — по образцу `Open_Windows/About Me/Tooltip/*.html`.

- [ ] **Step 1: Тесты** (`tests/resume.test.mjs`, стенд `startHarness`, внешние ссылки перехватываются как в `start-menu.test.mjs`)

```js
test("иконка «Моё резюме» есть, картинка загружается, все иконки видны на 1366×768")
test("двойной клик: окно «Моё резюме», кнопка в панели задач, иконка заголовка загружена")
test("страниц столько же, сколько в pages.json, src содержит ?v=") // fetch pages.json в тесте, сравнить length и src
test("панель: Масштаб, Сохранить (download → /Assets/Docs/resume.pdf), Печать неактивна, Связаться → t.me/atanov_roman")
test("«Справка» неактивна: щелчок не открывает меню")
test("в режиме «по ширине» нет горизонтальной прокрутки и страница уже области просмотра")
  // viewer.scrollWidth <= viewer.clientWidth; page.width <= viewer.clientWidth
test("щелчок по странице → large (страница шире области), повторный щелчок → fit")
test("перетаскивание в large прокручивает и не возвращает fit")
  // mouse down на странице, move на 200px влево/вверх, up → data-zoom === "large", scrollLeft вырос
test("кнопка «Масштаб» и меню «Вид → Крупно/По ширине» переключают режим")
test("развернуть окно в fit → страница становится шире, горизонтальной прокрутки нет")
test("pages.json 404 → .rs-error «Не удалось загрузить резюме», «Сохранить» всё ещё ссылка на PDF") // request interception
test("закрыть и открыть снова → fit, scrollTop 0")
test("строка состояния: «Щёлкните, чтобы увеличить, затем перетащите»")
```

- [ ] **Step 2:** `npm test -- tests/resume.test.mjs` → FAIL (иконки нет).

- [ ] **Step 3: Реализация.** `init`: `fetch("/Assets/Images/Resume/pages.json", { cache: "no-cache" })` → отрисовать страницы (`img.width/height` из манифеста, `loading="lazy"` для всех кроме первой) либо `.rs-error`. Режим fit — ширина страниц через CSS (`width: calc(100% - 40px); max-width` = натуральная ширина / 2), поэтому реакция на размер окна бесплатна; large — ширина = натуральная ширина картинки. Щелчок отличается от перетаскивания порогом 4px. При переходе в large по щелчку прокрутить так, чтобы точка под курсором осталась под курсором. Курсор: `zoom-in` в fit, `grab`/`grabbing` в large. Текст вставлять через `textContent`.

- [ ] **Step 4:** `npm test` (все файлы) → PASS. Глазами в `npx http-server . -p 3000 -c-1`: окно похоже на макет Figma `699:4339` в стиле окна «Обо мне».

- [ ] **Step 5: Commit** — `feat: Resume window with page viewer, zoom, save and contact`.

---

### Task 3: «Пуск → Резюме» и «Обо мне → Моё резюме» открывают окно

**Files:**
- Modify: `Start_Menu/Base/Start_Menu.html` (заглушку `<div class="ItemMenu ItemMenu--disabled" title="Скоро">` заменить на `<a class="ItemMenu" data-open-window="Resume" href="#">` с иконкой `Resume.png`, подпись «Резюме»; убрать устаревший комментарий)
- Modify: `Open_Windows/About Me/about-me.js` (щелчок по `[data-am-action="resume"]` → `openWindow("Resume")`; удалить проверку файла, `makeResumeLink`, `onResumeClick`, страницу `resume-missing` и `renderResumeMissing`), `Open_Windows/About Me/About Me.html` (удалить блок `.am-resume-missing`), `Open_Windows/About Me/about-me-data.js` (удалить поле `resume` и его описание в комментарии); поднять `?v=` у изменённых скриптов в `Bureau/Bureau.html`
- Test: `tests/start-menu.test.mjs`, `tests/about-me.test.mjs`

**Interfaces:**
- Consumes: `openWindow("Resume")` и `RESUME`/`closeResume` из Task 2; обработчик `data-open-window` уже есть в `Bureau/Bureau.html`.

- [ ] **Step 1: Тесты.** В `start-menu.test.mjs` тест «Резюме пока неактивно…» заменить на `test("«Резюме» открывает окно «Моё резюме» и закрывает меню")` (пункт без `title`, opacity 1, щелчок → `[id="window-Resume"]`, `menuOpen() === false`), обновить комментарий в начале файла. В `about-me.test.mjs` оба теста резюме заменить на `test("«Моё резюме» открывает окно резюме, новых вкладок нет")` (кнопка — не ссылка, щелчок → `[id="window-Resume"]`, `browser.pages().length` не вырос).

- [ ] **Step 2:** `npm test -- tests/start-menu.test.mjs tests/about-me.test.mjs` → FAIL на новых тестах.

- [ ] **Step 3:** Внести изменения из списка Files.

- [ ] **Step 4:** `npm test` → все PASS; `grep -rn "resume-missing\|Файл резюме пока не добавлен\|Скоро" Open_Windows Start_Menu Bureau` → пусто.

- [ ] **Step 5: Commit** — `feat: Start menu and About Me open the Resume window`. Затем в README добавить раздел «Как заменить резюме» (положить PDF в `Assets/Docs/resume.pdf`, `npm run resume`, закоммитить `Assets/Docs` и `Assets/Images/Resume`) — отдельный commit `docs: how to replace the resume`.

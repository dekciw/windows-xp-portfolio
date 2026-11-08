# Окно «Обо мне» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Иконка «Обо мне» на рабочем столе открывает окно в стиле XP «Панели управления» с 7 плитками-разделами; клик по плитке открывает страницу раздела внутри окна с навигацией «Назад/Вперёд/Вверх».

**Architecture:** Новое окно по схеме проекта: `Open_Windows/About Me/{About Me.html, About Me.css}` подгружает `openWindow()` из `Bureau/Bureau.js`. Контент — объект `window.ABOUT_ME_DATA` в `about-me-data.js`; рендер и навигация — `window.AboutMe` в `about-me.js`, вызываются из `openWindow` после вставки HTML. Шапка (меню, кнопки, адрес) переиспользует разметку и классы «Мой компьютер» (через `@import` его CSS).

**Tech Stack:** чистые HTML/CSS/JS (без сборки); тесты — `node:test` + `puppeteer-core` с локальным Chrome и встроенным статическим сервером на `node:http`.

**Spec:** `docs/superpowers/specs/2026-11-08-about-me-window-design.md`

## Global Constraints

- Внутреннее имя приложения `About Me`; отображаемое — `Обо мне` (через `appDisplayNames`).
- Шрифты: Tahoma 11px (текст), Tahoma Bold 11px белым (подписи плиток), Arial Bold 11px (заголовки карточек боковой панели), Trebuchet MS Bold 30px `rgba(255,255,255,0.66)` (заголовок области).
- Цвета по макету: область `#6375d6`; боковая панель — градиент `#7ba2e7 → #6b85dc`, ширина 230px; primary-карточка — заголовок градиент `#0049b5 → #295dce`, тело `#eff3ff`; обычная — заголовок `white → #c6d3f7`, тело `#d6dff7`; ссылки `#215dc6`; водяной знак 290px, opacity 0.1, правый нижний угол.
- Плитки (порядок и id): `about` Обо мне · `experience` Опыт работы · `skills` Навыки · `education` Образование · `projects` Проекты · `contacts` Контакты · `resume` Резюме (PDF).
- Пути к иконкам — `/Assets/Windows XP High Resolution Icon Pack avec MAOSX/Windows XP High Resolution Icon Pack/Windows XP Icons/<Name>.png`.
- Заглушки контента помечены текстом `[заполните]`.
- Резюме: `/Assets/Docs/resume.pdf`, новая вкладка; если файла нет — сообщение в окне «Файл резюме пока не добавлен».
- Не трогать `jspaint-master/`, `SpaceCadetPinball-master/`, данные в других окнах.

## Review Focus

- Повторный двойной клик по иконке при открытом окне — окно одно, состояние не сбрасывается и не дублируется (тест в Task 1).
- Закрыть и снова открыть окно — открывается главная (плитки), история пуста (тест в Task 3).
- Развернуть окно / сузить до ~500px — плитки переносятся, без горизонтальной прокрутки области (тест в Task 2).
- Длинный текст раздела — прокручивается внутри области, шапка и боковая панель на месте (тест в Task 3).
- Нет файла `resume.pdf` — без 404-вкладки, показано сообщение (тест в Task 3).

---

### Task 1: Тестовый стенд, иконка на рабочем столе и пустое окно «Обо мне»

**Files:**
- Create: `package.json` (`"type": "module"`, script `"test": "node --test tests/"`, devDependency `puppeteer-core@^23`)
- Create: `tests/helpers/harness.mjs`
- Create: `tests/about-me.test.mjs`
- Create: `Open_Windows/About Me/About Me.html`, `Open_Windows/About Me/About Me.css`
- Create: `Open_Windows/About Me/Tooltip/*`, `Open_Windows/About Me/Sub_Tooltip/*` — копии из `Open_Windows/My Computer/`
- Create: `.../Windows XP Icons/About Me.png` — копия `User Accounts.png`
- Modify: `Bureau/Bureau.html` (иконка на рабочем столе после «Мой компьютер», строка ~126)
- Modify: `Bureau/Bureau.js:23-32` (`appDisplayNames["About Me"] = "Обо мне"`)

**Interfaces:**
- Produces: `startHarness(): Promise<{page, browser, close()}>` — поднимает статический сервер (корень репо, свободный порт, без переписывания URL), запускает Chrome (`process.env.CHROME_PATH` ‖ `C:/Program Files/Google/Chrome/Application/chrome.exe`), открывает `/Bureau/Bureau.html`, ждёт `typeof openWindow === 'function'`, глушит `Audio.prototype.play`.
- Produces: `openAboutMe(page): Promise<void>` — двойной клик по `.icon[data-app="About Me"]`, ждёт `#window-About\\ Me .am-root`.
- Produces: DOM `#window-About Me` с корнем `.am-root` внутри `.window-content`.

- [ ] **Step 1: Тесты**

```js
test('иконка «Обо мне» есть на рабочем столе', async () => {
  const label = await page.$eval('.icon[data-app="About Me"] span', e => e.textContent);
  assert.equal(label, 'Обо мне');
});
test('двойной клик открывает окно с заголовком и кнопкой в панели задач', async () => {
  await openAboutMe(page);
  assert.equal(await page.$eval('[id="window-About Me"] .window-header-title', e => e.textContent), 'Обо мне');
  assert.ok(await page.$('[id="taskbar-About Me"]'));
  assert.equal(await page.$eval('[id="window-About Me"] .window-header img', e => e.naturalWidth > 0), true);
});
test('повторный двойной клик не создаёт второе окно', async () => {
  await openAboutMe(page);
  assert.equal(await page.$$eval('[id="window-About Me"]', l => l.length), 1);
});
```

- [ ] **Step 2: Запуск** — `npm install && npm test` → FAIL (нет иконки `.icon[data-app="About Me"]`).
- [ ] **Step 3: Реализация** — иконка: `<div class="icon" data-app="About Me" ondblclick="openWindow('About Me')">` с `About Me.png` и подписью `Обо мне`; `About Me.html` пока `<div class="am-root"></div>`; `About Me.css` начинается с `@import url("/Open_Windows/My Computer/My Computer.css");`.
- [ ] **Step 4: Запуск** — `npm test` → PASS (3 теста).
- [ ] **Step 5: Commit** — `feat: desktop icon and empty "About Me" window + e2e harness`

### Task 2: Главный экран по макету (шапка, боковая панель, плитки)

**Files:**
- Modify: `Open_Windows/About Me/About Me.html`, `About Me.css`
- Create: `Open_Windows/About Me/about-me-data.js`, `Open_Windows/About Me/about-me.js`
- Modify: `Bureau/Bureau.html:62-66` (подключить оба скрипта после `Bureau.js`)
- Modify: `Bureau/Bureau.js` — в `.then((htmlContent) => …)` после вставки: `if (appName === "About Me" && window.AboutMe) AboutMe.init(windowElement);`
- Test: `tests/about-me.test.mjs`

**Interfaces:**
- Produces: `window.ABOUT_ME_DATA = { home: { heading: string }, sidebar: { links: {label, href, icon}[] }, sections: Section[] }`, где `Section = { id, title, icon, heading, paragraphs?: string[], items?: {title, subtitle?, period?, text?}[], href?: string }` (у `resume` есть `href`, у прочих — `paragraphs` и/или `items`).
- Produces: `window.AboutMe = { init(win: HTMLElement): void, show(win, id: string|null): void, back(win): void, forward(win): void, up(win): void }`. Состояние — в `win._am = { history: (string|null)[], index: number }`.
- Produces DOM: `.am-home` (главная), `.am-tile[data-section=<id>]` ×7, `.am-sidebar`, `.am-heading`, `.am-watermark`, кнопки `[data-am-nav="back"|"forward"|"up"]` (это кнопки панели «Назад/Вперёд/Вверх» в разметке «Мой компьютер»), `.address_bar_content_text`.

- [ ] **Step 1: Тесты**

```js
test('главная: заголовок и 7 плиток в порядке спецификации', async () => {
  assert.equal(await page.$eval('[id="window-About Me"] .am-heading', e => e.textContent.trim()), 'Выберите раздел');
  assert.deepEqual(await page.$$eval('[id="window-About Me"] .am-tile', l => l.map(t => t.dataset.section)),
    ['about','experience','skills','education','projects','contacts','resume']);
});
test('стили по макету', async () => {
  const s = await page.$eval('[id="window-About Me"] .am-tile .am-tile-label', e => getComputedStyle(e));
  // fontFamily содержит Tahoma, fontWeight 700, fontSize 11px, color rgb(255, 255, 255)
  // .am-heading: Trebuchet MS, 30px; .am-home background rgb(99, 117, 214); .am-sidebar width 230px
});
test('все иконки плиток загрузились', async () => { /* every img.naturalWidth > 0 */ });
test('адрес на главной — «Обо мне», «Назад» неактивна', async () => { /* .address_bar_content_text === 'Обо мне'; back имеет класс function_bar_button--disable */ });
test('окно 500px шириной — без горизонтальной прокрутки области', async () => {
  // win.style.width = '500px'; .am-home scrollWidth <= clientWidth
});
```

- [ ] **Step 2: Запуск** — `npm test` → FAIL (нет `.am-heading`).
- [ ] **Step 3: Реализация** — `about-me-data.js` с 7 разделами (иконки: about `User Accounts`, experience `Briefcase`, skills `Programs`, education `Certificate`, projects `My Documents`, contacts `Address Book`, resume `Generic Document`), заглушки `[заполните]`; `home.heading = 'Выберите раздел'`; sidebar: primary-карточка «Обо мне» со ссылкой «Скачать резюме», карточка «См. также»: GitHub (`https://github.com/dekciw`), «Написать письмо». HTML: шапка — копия `section.computer_toolbar`, `section.function_bar`, `section.address_bar` из `My Computer.html` (тексты на русском, адрес `Обо мне`, иконка адреса `About Me.png`), ниже `.am-body` = `.am-sidebar` + `.am-main` (в нём `.am-home` и `.am-page`). Плитки — CSS grid `repeat(auto-fill, minmax(211px, 1fr))`, gap 10px.
- [ ] **Step 4: Запуск** — `npm test` → PASS.
- [ ] **Step 5: Визуальная сверка** — скриншот окна (807×562) в scratchpad рядом со скриншотом Figma; расхождения в цветах/шрифтах/отступах исправить.
- [ ] **Step 6: Commit** — `feat: About Me home view per Figma Control Panel layout`

### Task 3: Страницы разделов и навигация

**Files:**
- Modify: `Open_Windows/About Me/about-me.js`, `About Me.css`
- Test: `tests/about-me.test.mjs`

**Interfaces:**
- Consumes: `AboutMe.show/back/forward/up`, DOM-хуки из Task 2.
- Produces: `.am-page[data-section=<id>]` с `.am-page-title` (= `section.heading`), абзацами `p` и списком `.am-item` (`.am-item-title`, `.am-item-meta`, `.am-item-text`); `.am-notice` для сообщения о резюме.

- [ ] **Step 1: Тесты**

```js
test('клик по плитке «Опыт работы» открывает страницу раздела', async () => {
  // click .am-tile[data-section=experience]; .am-home скрыт; .am-page[data-section=experience] виден;
  // адрес === 'Обо мне › Опыт работы'; «Назад» активна
});
test('Назад → главная, Вперёд → снова раздел, Вверх → главная', async () => {});
test('боковая панель на странице раздела ведёт в другие разделы', async () => {});
test('длинный текст прокручивается внутри .am-main, шапка на месте', async () => {
  // вставить 200 абзацев в data.sections[0] перед show; .am-main scrollHeight > clientHeight; .address_bar остаётся видимой
});
test('«Резюме (PDF)» без файла — сообщение, новая вкладка не открывается', async () => {
  // HEAD /Assets/Docs/resume.pdf → 404 ⇒ .am-notice содержит 'Файл резюме пока не добавлен'; browser.pages() не вырос
});
test('закрыть и открыть снова — главная, «Назад» неактивна', async () => {});
```

- [ ] **Step 2: Запуск** — `npm test` → FAIL.
- [ ] **Step 3: Реализация** — `show(win, id)` обрезает историю после `index`, пушит id, рендерит; `back/forward` двигают `index`; `up` = `show(win, null)`. Для `resume`: `fetch(href, {method:'HEAD'})` → ok ⇒ `window.open(href, '_blank')`, иначе `.am-notice`. Состояние живёт на элементе окна, поэтому закрытие (элемент удаляется) сбрасывает его само.
- [ ] **Step 4: Запуск** — `npm test` → PASS (все тесты Task 1–3).
- [ ] **Step 5: Commit** — `feat: About Me section pages with back/forward/up navigation`

### Task 4: Итоговая проверка

- [ ] **Step 1:** `npm test` — все PASS, вывод приложить.
- [ ] **Step 2:** Скриншоты главной и страницы раздела в scratchpad; сравнить с Figma; убедиться, что «Мой компьютер», Paint, Сапёр открываются как раньше (без ошибок в консоли).
- [ ] **Step 3:** Обновить README разделом «Как заполнить “Обо мне”» (файл `about-me-data.js`, куда положить `resume.pdf`, `npm test`). Commit — `docs: how to fill About Me content`.

# Страница проекта — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Щелчок по карточке «Мои проекты» открывает в том же окне страницу проекта (плеер-карусель, инфо, описание, комментарии) по дизайну и референсам.

**Architecture:** `my-projects.js` получает режим `win._mp.view = "grid" | "project"`, историю `win._mp.history/index` и рендер страницы в `<section class="mp-project" hidden>` рядом с `.mp-grid` внутри `.mp-main`. Код страницы — новый файл `Open_Windows/My Projects/my-projects-page.js` (`window.MyProjectsPage = { render(win, project), destroy(win) }`), стили — новый `my-project-page.css` (подключается из `My Projects.css` через `@import`). Медиа Burger Cheddar — в `Assets/Projects/media/burger-cheddar/`.

**Tech Stack:** vanilla JS/CSS; тесты `node --test` + puppeteer-core (`tests/helpers/harness.mjs`, стенд подменяет `HTMLMediaElement.prototype.play` → `window.__played`).

**Spec:** `docs/superpowers/specs/2026-11-15-project-page-design.md` (+ референсы в `docs/superpowers/specs/assets/2026-11-15-project-page/`).

## Global Constraints

- Все цвета через `--mp-*` в обеих темах (тёмные значения — из спеки; светлые: фон блоков `#f2f2f2`, рамка `#e5e5e5`, подписи `#606060`, текст `#0f0f0f`).
- Шрифт Roboto (уже подключён в окне).
- Адрес: `https://www.myprojects.com/<slug>`; строка состояния справа (`.mp-status-name` или существующий правый блок) — название проекта.
- Видео презентации грузится только на странице проекта, `preload="metadata"`.
- Комментарии Burger Cheddar в данных — `[]`; свои — `localStorage["mp-comments:<slug>"]`, реакции — `localStorage["mp-reactions:<slug>"]`; имя «@гость».
- Коммиты — только по команде пользователя; без Co-Authored-By Claude.
- Поднять `?v=` у скриптов окна в `Bureau/Bureau.html`; новый скрипт подключить там же.

## Review Focus

- Повторное открытие/закрытие окна во время проигрывания — видео остановлено, нет утечек слушателей `document` (Task 4: тест «закрытие окна на странице проекта — видео на паузе»).
- Переход проект → сетка во время проигрывания — видео ставится на паузу (Task 2: `destroy` вызывает pause; тест).
- Проект без `media`/`comments`/`tags` (остальные 12 позже) — страница не падает (Task 2: тест с минимальным проектом).
- Fullscreen API недоступен/отклонён — кнопка не ломает страницу (Task 3: `requestFullscreen` в try/catch, тест подменой).
- XSS через тексты комментария/данных — только `textContent` (Task 5: тест с `<img onerror>` в комментарии).

---

### Task 1: Медиа Burger Cheddar

**Files:** Create `Assets/Projects/media/burger-cheddar/{presentation.mp4, presentation-poster.jpg, hero.jpg, menu.jpg, order.jpg, why.jpg}`. Источник: `C:\Users\atanov.r\Project\projects\project\burger\presentation\burger-presentation.mp4` (66.4 с, 1920×1080, AAC), `...\burger-presentation-poster.jpg`, `...\burger\screenshots\screen-{hero,menu,order,why}.png` (1920×1080).

- [ ] **Step 1:** Скрипт в scratchpad (headless Chrome): картинки → canvas 1600×900 → JPEG 0.85; постер → JPEG 1280×720 0.85.
- [ ] **Step 2:** Видео → 1280×720, H.264 + AAC, цель ≤ 6 МБ: сначала `MediaRecorder` (`video/mp4;codecs=avc1.640028,mp4a.40.2`, `videoBitsPerSecond: 600_000`, `audioBitsPerSecond: 128_000`) с `video.captureStream()` при реальном проигрывании 1×; проверка: длительность 66.4 ± 0.5 с, разница кадров по секундам как у исходника (метрика `diff2.mjs` из прошлой задачи), звук есть (`mp4a` в файле, `webkitAudioDecodedByteCount > 0` при проигрывании). Если проверка не проходит — fallback: оригинал как есть (22 МБ) и сообщить пользователю.
- [ ] **Step 3:** Проверка: все файлы открываются в Chrome, размеры/вес записать в ledger.

### Task 2: Маршрут, история, оболочка страницы, инфо и описание

**Files:** Modify `Open_Windows/My Projects/my-projects.js`, `My Projects.html` (`<section class="mp-project" hidden></section>` в `.mp-main`), `my-projects-data.js` (поля `slug, tags, media, site, brief, role, desc, comments` у Burger Cheddar), `My Projects.css` (`@import "my-project-page.css"`), `Bureau/Bureau.html`. Create `Open_Windows/My Projects/my-projects-page.js`, `Open_Windows/My Projects/my-project-page.css`. Test: `tests/my-project-page.test.mjs`.

**Interfaces:** Produces `MyProjects.openProject(win, slug)`, `MyProjects.goBack(win)`, `MyProjects.goForward(win)`; `MyProjectsPage.render(win, project) -> void`, `MyProjectsPage.destroy(win) -> void` (пауза видео, снятие слушателей). Разметка: `.mp-project > .mp-player` (пустой до Task 3) + `.mp-info > .mp-meta-row > (.mp-avatar-lg, .mp-ptitle, .mp-pstats, .mp-dots, .mp-tags)` + `.mp-desc > .mp-desc-row[data-key=brief|role|desc] > (.mp-desc-label, .mp-desc-text)` + `.mp-desc-toggle` + `.mp-comments` (пустой до Task 5).

- [ ] **Step 1: Тесты** (`tests/my-project-page.test.mjs`, свой `fresh()` открывает окно и ждёт `css-window-My Projects`.sheet):
  - `щелчок по карточке открывает страницу проекта: адрес /burger-cheddar, сетка скрыта, название в строке состояния` — `.mp-project` не hidden, `.mp-grid` hidden, `.mp-address` = `https://www.myprojects.com/burger-cheddar`, правый блок строки состояния = `Burger Cheddar`.
  - `Enter на карточке тоже открывает`.
  - `Назад → сетка, Вперёд → снова проект; кнопки активны только когда есть куда` — классы `function_bar_button--disable` ↔ `function_bar_button` у `[data-mp-tool=back|forward]`.
  - `Домой / логотип / пункт меню / поиск возвращают к сетке`.
  - `инфо: аватар 40px, название Roboto Bold 26px −0.5px, статистика 14px #aaa, точки по числу media` (`rgb(170, 170, 170)`, `letter-spacing: -0.5px`, `.mp-dots button` = media.length, первая активна `rgb(255, 0, 0)`).
  - `метки видны только в широком окне` — развернуть окно (`maximazeWindow`) → `.mp-tags` display != none, 2 метки, первая фон `rgb(204, 0, 0)`; обычное окно → display none.
  - `описание: фон #1e1e1e, рамка #333, скругление 12px; подписи Задача/Роль/Описание 108px; свёрнуто — описание 3 строки и «Ещё», щелчок — «Свернуть» и полный текст` (`-webkit-line-clamp: 3` → высота текста ≤ 3×24+1 px; после щелчка > 72px).
  - `проект без media/tags/comments не падает` — подставить минимальный проект `{title, slug}` в данные и открыть.
  - `переход в сетку ставит видео на паузу` (появится в Task 4 — тест пишется там).
- [ ] **Step 2:** запустить → FAIL.
- [ ] **Step 3:** реализация: история `[{view:"grid", category, query} | {view:"project", slug}]`; `openProject` пушит, обрезая «вперёд»; `apply` рисует по текущей записи; щелчок/Enter по карточке → `openProject` (вместо «Проект скоро появится»; у карточки с `href` и без `slug` поведение прежнее); статистика через `viewsLabel/timeAgo`; описание — `textContent`.
- [ ] **Step 4:** тесты файла + `tests/my-projects.test.mjs` → PASS (тест «карточка-заглушка без ссылки…» обновить: у Burger Cheddar теперь `slug` → открывает страницу; проверку «Проект скоро появится» перенести на карточку без slug из `SAMPLE_PROJECTS`).

### Task 3: Карусель и слайды-картинки, полный экран

**Files:** `my-projects-page.js`, `my-project-page.css`; Test: `tests/my-project-page.test.mjs`.

**Interfaces:** Consumes `.mp-player`. Produces `.mp-player > .mp-track > .mp-slide[data-type=image|video]`, `.mp-arrow--prev/next`, `.mp-slide-fs` (кнопка полного экрана картинки), `MyProjectsPage.goTo(win, index)`.

- [ ] **Step 1: Тесты:** `плеер: чёрный, скругление 12px, белая рамка 1px, 16:9`; `стрелки: opacity 0.4, наведение → 1; › переходит на 2-й слайд, ‹ с первого — на последний; точки меняют активную`; `слайд-картинка: object-fit contain, при наведении градиент и кнопка 40px; щелчок — requestFullscreen на .mp-player` (подменить `Element.prototype.requestFullscreen`, записать вызов); `requestFullscreen бросает — страница жива`; `один слайд — стрелок нет`.
- [ ] **Step 2:** FAIL. **Step 3:** реализация (лента `translateX(-index*100%)`, transition 0.3s; уход со слайда-видео → pause). **Step 4:** PASS.

### Task 4: Видеослайд — плеер со своими элементами

**Files:** `my-projects-page.js`, `my-project-page.css`; Test: `tests/my-project-page.test.mjs`.

**Interfaces:** Produces `.mp-slide[data-type=video] > video.mp-pvideo` + `.mp-vposter` (постер, название `.mp-vtitle`, кнопка `.mp-bigplay` 68×48 `#f00` r14) + `.mp-vcontrols > (.mp-seek > .mp-seek-buffer, .mp-seek-played, .mp-seek-knob) + .mp-vrow > (.mp-vplay, .mp-vtime, a.mp-vsite, .mp-vfs)`.

- [ ] **Step 1: Тесты** (время/длительность подделывать `Object.defineProperty`, события диспатчить): `до запуска: постер, название 24px белое, красная кнопка 68×48`; `большая ▶ вызывает play() (в __played — presentation.mp4), на playing постер скрыт`; `время «0:07 / 1:06» при currentTime 7, duration 66.4`; `дорожка: проиграно красное, ширина = доля; щелчок по середине дорожки ставит currentTime ≈ duration/2`; `«Открыть сайт» — ссылка https://dekciw.github.io/BurgerCheddar/ target _blank`; `Пробел/K пауза, ←/→ ±5 с, F — requestFullscreen (фокус в плеере)`; `ended → снова постер`; `управление прячется через 2.5 с без движения при проигрывании (is-idle), движение мыши возвращает`; `закрытие окна на странице проекта — видео на паузе`; `переход в сетку — видео на паузе`.
- [ ] **Step 2:** FAIL. **Step 3:** реализация. **Step 4:** PASS; в реальном Chrome (скрипт без стенда): видео играет, звук декодируется (`webkitAudioDecodedByteCount > 0`), перемотка работает.

### Task 5: Комментарии

**Files:** `my-projects-page.js`, `my-project-page.css`; Test: `tests/my-project-page.test.mjs`.

**Interfaces:** Produces `.mp-comments > .mp-chead > (.mp-ccount, .mp-csort)` + `.mp-cadd > (.mp-cavatar, textarea.mp-cinput, button.mp-csend)` + `.mp-clist > .mp-comment > (.mp-cavatar, .mp-cuser, .mp-ctime, .mp-ctext, .mp-like, .mp-dislike)`.

- [ ] **Step 1: Тесты** (`localStorage` очищать перед каждым): `пусто: «0 комментариев», кнопка неактивна (#272727), поле с placeholder «Добавьте комментарий…»`; `ввод → кнопка красная; Enter отправляет: «1 комментарий», @гость, «только что», поле очищено`; `Shift+Enter — перенос строки, не отправка`; `комментарий сохраняется после закрытия и открытия окна`; `👍 ставит/снимает лайк (+1/−1), 👎 аналогично, взаимоисключение`; `сортировка: «Сначала популярные» ↔ «Сначала новые» меняет порядок (2 комментария с разными лайками через данные)`; `склонения: 1 комментарий, 2 комментария, 5 комментариев`; `XSS: текст <img src=x onerror=window.__xss=1> выводится как текст, __xss не установлен`.
- [ ] **Step 2:** FAIL. **Step 3:** реализация (только `textContent`). **Step 4:** PASS; `npm test` → всё PASS; скриншоты страницы в обычном и развёрнутом окне сверить с `ref-1…4` и Figma (`725:8293`, `733:9938`).

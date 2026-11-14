# Видео-превью карточки проекта — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Карточка Burger Cheddar: обложка в покое, видео по кругу при наведении/фокусе, красная дорожка прогресса.

**Architecture:** В `card(p)` (`Open_Windows/My Projects/my-projects.js`) при наличии `p.video` в `.mp-thumb` кладутся обложка `img`, `video.mp-thumb-video` и `.mp-progress > .mp-progress-bar`. Наведение/фокус ставит `src` (лениво), `currentTime = 0`, `play()`; событие `playing` → класс `is-playing` на `.mp-thumb` (CSS прячет обложку, показывает дорожку). Дорожка обновляется по `requestAnimationFrame` пока играет. Уход → `pause()`, сброс.

**Tech Stack:** vanilla JS/CSS; тесты `node --test` + puppeteer-core (`tests/helpers/harness.mjs`; стенд подменяет `HTMLMediaElement.prototype.play` и пишет адреса в `window.__played`).

**Spec:** `docs/superpowers/specs/2026-11-14-project-card-video-preview-design.md`

## Global Constraints

- Обложка: `/Assets/Projects/covers/BurgerCheddar.jpg`; видео: `/Assets/Projects/previews/BurgerCheddar.mp4` (копии из `C:\Users\atanov.r\Project\projects\presentations\`, без пережатия).
- Видео: `muted`, `loop`, `playsinline`, `preload="none"`; `src` не задан до первого наведения/фокуса.
- Дорожка: `#FF0000` (`rgb(255, 0, 0)`), высота 3px, внизу превью, только при `is-playing`.
- Карточки без `video` (картинка `thumb` или заглушка) работают как раньше.
- Данные: единственная карточка `{ title: "Burger Cheddar", category: "personal", views: 2300, date: "2026-10-08", thumb, video, href: "" }`.
- Коммитов нет до команды пользователя; без Co-Authored-By Claude.

## Review Focus

- Быстрое наведение-уход до загрузки видео: `playing` пришло после ухода — обложка не должна пропасть (Task 1: тест «уход до playing — обложка остаётся»).
- Повторное наведение: видео снова с 0, дорожка с 0 (Task 1: тест ухода проверяет `currentTime === 0` и ширину 0).
- Закрытие окна во время проигрывания — rAF-цикл не должен падать на удалённом элементе (Task 1: цикл останавливается, если элемент не в документе).
- Фокус с клавиатуры (Tab) — тот же запуск (Task 1: тест фокуса).
- Ошибка загрузки видео — обложка остаётся (покрыто: `is-playing` ставится только по `playing`).

---

### Task 1: Видео-превью карточки

**Files:**
- Create: `Assets/Projects/covers/BurgerCheddar.jpg`, `Assets/Projects/previews/BurgerCheddar.mp4`
- Modify: `Open_Windows/My Projects/my-projects-data.js` (projects + описание поля `video` в шапке), `Open_Windows/My Projects/my-projects.js` (`card(p)` + функция `attachPreview(thumb, video)`), `Open_Windows/My Projects/My Projects.css`, `Bureau/Bureau.html` (версии `?v=`)
- Test: `tests/my-projects.test.mjs`

**Interfaces:** Produces: в `.mp-card` с видео — `.mp-thumb > img.mp-thumb-cover`, `.mp-thumb > video.mp-thumb-video`, `.mp-thumb > .mp-progress > .mp-progress-bar`; класс `.mp-thumb.is-playing`.

- [ ] **Step 1: Тесты** (в `tests/my-projects.test.mjs`):
  - заменить тест «в данных пока одна карточка — «Калькулятор локеров»» → «… — «Burger Cheddar»», `titles()` = `["Burger Cheddar"]`.
  - `превью до наведения: обложка видна, видео не загружено` — `img.mp-thumb-cover` src оканчивается `/Assets/Projects/covers/BurgerCheddar.jpg`, видна (opacity 1); `video.mp-thumb-video`: `getAttribute("src") === null`, `preload === "none"`, `muted && loop`; ни одного запроса `previews/BurgerCheddar.mp4` в `requests`; `.mp-progress` скрыт (opacity 0 или display none).
  - `наведение: видео стартует с начала, после playing обложка скрыта, дорожка красная 3px растёт` — `page.hover(.mp-card)`; `window.__played` содержит `/Assets/Projects/previews/BurgerCheddar.mp4`; src выставлен; затем `video.dispatchEvent(new Event("playing"))` → `.mp-thumb.is-playing`, обложка opacity 0, `.mp-progress-bar` фон `rgb(255, 0, 0)`, `.mp-progress` высота `3px`; подменить время `Object.defineProperty(video,"currentTime",{value:4,configurable:true})`, `duration` 8 → через 100 мс ширина бара ≈ 50% ширины `.mp-progress` (±2px).
  - `уход курсора: пауза, сброс на 0, обложка вернулась` — `page.mouse.move(5,5)`; `is-playing` снят, `video.paused` (стенд: проверять что вызван `pause` через флаг — `video.__paused` из подмены `HTMLMediaElement.prototype.pause` в тесте) , ширина бара 0.
  - `уход до playing — обложка остаётся` — hover, сразу move away, затем `dispatchEvent("playing")` → `is-playing` нет.
  - `фокус с клавиатуры запускает превью` — `card.focus()` → `__played` пополнился.
- [ ] **Step 2:** `node --test --test-timeout=30000 tests/my-projects.test.mjs` → новые тесты FAIL.
- [ ] **Step 3:** Скопировать файлы; данные; в `card(p)`: если `p.video` — обложка `img.mp-thumb-cover` (src `p.thumb`, alt title, loading lazy), `video`, `.mp-progress`; `attachPreview(card, thumb, video, src)` вешает `mouseenter`/`focus` → start, `mouseleave`/`blur` → stop. `start`: флаг `active=true`; `if (!video.src) video.src = src`; `currentTime=0`; `play().catch(()=>{})`. `on playing`: если `active` — `is-playing` + rAF-цикл (ширина `currentTime/duration*100%`; стоп если `!active` или `!thumb.isConnected`). `stop`: `active=false`, снять класс, `pause()`, `currentTime=0`, ширина 0. CSS: видео и обложка `position:absolute; inset:0; width/height 100%; object-fit:cover`; обложка `transition: opacity .15s`, `.is-playing .mp-thumb-cover {opacity:0}`; `.mp-progress {position:absolute; left:0; right:0; bottom:0; height:3px; opacity:0}`, `.is-playing .mp-progress {opacity:1}`; `.mp-progress-bar {height:100%; width:0; background:#FF0000}`. Поднять `?v=` у обоих скриптов.
- [ ] **Step 4:** тесты файла → PASS; `npm test` → всё PASS; скриншот карточки до/после наведения в реальном Chrome (видео реально играет, `currentTime` растёт).
- [ ] **Step 5:** Коммит — только по команде пользователя.

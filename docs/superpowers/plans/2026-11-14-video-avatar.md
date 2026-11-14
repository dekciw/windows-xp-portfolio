# Видео-аватар пользователя — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить фото `guest-avatar.jpg` на зацикленное видео-аватар во всех 5 местах.

**Architecture:** Статический сайт без сборки. `<img>` аватара → `<video autoplay muted loop playsinline poster>`; CSS-правила аватара расширяются на `video`; hover-рамка в `Loader_Login.js` ищет `img, video`.

**Tech Stack:** HTML/CSS/vanilla JS; тесты — `node --test` + puppeteer-core (`tests/helpers/harness.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-14-video-avatar-design.md`

## Global Constraints

- Видео: `/Assets/Images/Profiles/guest-avatar.mp4` (копия `~/Downloads/kling_20261114_VIDEO_Use_the_up_5512_3 (1).mp4`).
- Постер: `/Assets/Images/Profiles/guest-avatar-poster.jpg` — первый кадр видео, 940×940.
- Атрибуты видео: `autoplay muted loop playsinline poster="…"`, без `controls`.
- `guest-avatar.jpg` удаляется; ссылок на него не остаётся.
- Размеры прежние: экран входа 70×70, рамка `2px solid white`, hover `#bfa304`; «Пуск» 42×42.
- Коммиты без Co-Authored-By Claude.

## Review Focus

- Видео ещё не загрузилось → виден постер, а не чёрный квадрат (покрыто: проверка `poster` в Task 1).
- `object-fit: cover` у видео на экране входа — иначе квадрат может «прыгнуть» при появлении формы пароля (Task 2: размер 70×70 после показа формы не проверяется — проверить глазами на скриншоте).
- Hover-подсветка рамки на видео (Task 2 тест).
- Экраны «Выход»/«Смена пользователя» используют тот же `Login_Screen.css` — покрываются статической проверкой Task 1.

---

### Task 1: Ассеты и разметка

**Files:**
- Create: `Assets/Images/Profiles/guest-avatar.mp4`, `Assets/Images/Profiles/guest-avatar-poster.jpg`
- Delete: `Assets/Images/Profiles/guest-avatar.jpg`
- Modify: `Loader_Login/Loader_Login.html:59`, `index.html:65`, `Start_Menu/Base/Start_Menu.html:4`, `Start_Menu/Log_Off/Transition/Login.html:39`, `Start_Menu/Log_Off/Transition/Switch_User.html:39`
- Test: `tests/video-avatar.test.mjs`

**Interfaces:** Produces: в каждом из 5 файлов элемент `<video>` на месте прежнего `<img>` (тот же `alt` → `aria-label`).

- [ ] **Step 1: Тест `аватар — видео во всех пяти местах`** (чтение файлов через `fs`): для каждого из 5 файлов — нет подстроки `guest-avatar.jpg`; есть `<video` с `src="/Assets/Images/Profiles/guest-avatar.mp4"`, `poster="/Assets/Images/Profiles/guest-avatar-poster.jpg"`, атрибутами `autoplay`, `muted`, `loop`, `playsinline`. Тест `файлы аватара`: mp4 и poster существуют, jpg — нет.
- [ ] **Step 2:** `node --test tests/video-avatar.test.mjs` → FAIL.
- [ ] **Step 3:** Скопировать видео; постер — первый кадр через headless Chrome (`<video>` → `canvas.drawImage` → `toDataURL('image/jpeg', 0.85)` → файл); удалить jpg; заменить 5 `<img>`.
- [ ] **Step 4:** тест → PASS.
- [ ] **Step 5:** Commit `feat: видео-аватар вместо фото пользователя`.

### Task 2: Стили и hover

**Files:**
- Modify: `Loader_Login/Login_Screen.css:187` (`.user > img` → `.user > img, .user > video`), `Start_Menu/Base/Start_Menu.css:83` (+ `.StartMenuHeader video`), `Loader_Login/Loader_Login.js:245` (`querySelector("img, video")`)
- Test: `tests/video-avatar.test.mjs`

- [ ] **Step 1: Тесты в браузере (`startHarness`)**: `экран входа: видео 70×70 с белой рамкой и жёлтой при наведении` — открыть `${base}/Loader_Login/Loader_Login.html`, снять `hidden` с `#login-screen`, `#guest-user > video`: `getBoundingClientRect` 70×70 (с учётом border-box ±4), `borderTopColor` `rgb(255, 255, 255)`; `page.hover('#guest-user')` → `rgb(191, 163, 4)`. `меню «Пуск»: видео 42×42` — открыть меню, `.StartMenuHeader video` ширина/высота контента 42.
- [ ] **Step 2:** тесты → FAIL.
- [ ] **Step 3:** правки CSS/JS как в Files.
- [ ] **Step 4:** `npm test` → всё PASS; скриншоты экрана входа и «Пуска» — проверить глазами.
- [ ] **Step 5:** Commit `style: оформление видео-аватара`.

# Окно «GitHub» (живая карточка) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Окно «LinkedIn» с чужим скриншотом заменяется окном «GitHub», которое рисует профиль и репозитории `dekciw` из GitHub API.

**Architecture:** Папка `Open_Windows/LinkedIn` переименовывается в `Open_Windows/GitHub` (рамка IE сохраняется), картинка в `.IE_content_inner` заменяется на `.gh-root`, который заполняет `window.GitHubWindow.init(win)` из `github.js` (вызов из `openWindow`, как у «Обо мне»). Данные — `fetch` к api.github.com с кэшем в `localStorage` на 1 час.

**Tech Stack:** HTML/CSS/JS без сборки; тесты `node:test` + `puppeteer-core`; ответы GitHub в тестах подменяются через обёртку `fetch` в стенде.

**Spec:** `docs/superpowers/specs/2026-11-08-github-window-design.md`

## Global Constraints

- Логин `dekciw` — одна константа `GITHUB_LOGIN` в `github.js`.
- Эндпоинты: `https://api.github.com/users/<login>` и `https://api.github.com/users/<login>/repos?sort=updated&per_page=100`.
- Кэш: ключ `gh-cache-v2`, TTL 3 600 000 мс; все обращения к `localStorage` в try/catch.
- Скрывать `fork: true` и репозиторий с именем, равным логину.
- Тексты: «Репозитории», «Открыть на GitHub», «Загрузка…», «Не удалось загрузить профиль GitHub», «обновлён <дата ru-RU>», «подписчиков», «подписок».
- Только `textContent`; ссылки наружу — `target="_blank" rel="noreferrer"`.
- Тесты не ходят в сеть: стенд подменяет `fetch` для `api.github.com`.

## Review Focus

- Ответ 403 (лимит) или сеть недоступна — сообщение и ссылка, без пустого окна (тест в Task 2).
- `description: null`, `language: null` — карточка без пустых строк/«null» (тест в Task 2).
- Повторное открытие в течение часа — без запроса (кэш); после истечения TTL — новый запрос (тест в Task 2).
- Узкое окно — одна колонка, без горизонтальной прокрутки (тест в Task 2).
- `localStorage` недоступен — карточка всё равно рисуется (тест в Task 2).

---

### Task 1: Окно «GitHub» вместо «LinkedIn»

**Files:** `git mv Open_Windows/LinkedIn Open_Windows/GitHub` (+ переименовать `.html/.css`); `Bureau/Bureau.js` (старт: `GitHub`; `appDisplayNames.GitHub`; хук `GitHubWindow.init`); `Bureau/Bureau.html` (скрипт `github.js`); иконка `…/Windows XP Icons/GitHub.png` (256px из `github-logo.svg`); удалить `Assets/Images/Profiles/{linkedin,github}-profile.png`; `tests/helpers/harness.mjs` (подмена fetch); `tests/fixtures/github.mjs`; `tests/github.test.mjs`.

**Interfaces:** Produces `window.GitHubWindow = { init(win) }`; DOM `.gh-root`; стенд: `window.__gh = { user, repos, status, calls }`.

- [ ] Тесты: при старте в панели задач «GitHub», окна «LinkedIn» нет; окно GitHub свёрнуто; адрес `https://github.com/dekciw`; в окне нет `linkedin`/`joris`; иконка загрузилась.
- [ ] RED → реализация → GREEN (`npm test`).

### Task 2: Живая карточка

**Files:** `Open_Windows/GitHub/github.js`, `GitHub.css`, `GitHub.html`; `tests/github.test.mjs`.

**Interfaces:** DOM `.gh-profile` (`.gh-avatar`, `.gh-name`, `.gh-login`, `.gh-bio`, `.gh-location`, `.gh-follow`, `a.gh-open`), `.gh-repos-title` (`Репозитории N`), `.gh-repo` ×N (`a.gh-repo-name`, `.gh-repo-desc?`, `.gh-repo-lang?`, `.gh-repo-stars`, `.gh-repo-updated`), `.gh-loading`, `.gh-error`.

- [ ] Тесты: профиль из фикстуры; репозитории по порядку, без форка и `dekciw/dekciw`; null-поля; загрузка; 403 → ошибка + ссылка; кэш (второе открытие без запроса) и TTL; без localStorage; узкое окно — 1 колонка, без горизонтальной прокрутки; ссылки `_blank`.
- [ ] RED → реализация → GREEN; скриншот против дизайна.

### Task 3: Итог

- [ ] `npm test` — всё зелёное; регрессия других окон; README (источник данных).

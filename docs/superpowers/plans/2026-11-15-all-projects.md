# Все проекты в «Моих проектах» - план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 13 карточек в окне «Мои проекты» (Burger Cheddar + 12 новых) с обложкой, превью и страницей проекта того же вида, что у Burger Cheddar.

**Architecture:** Код карточки и страницы не меняется. Добавляется скрипт сборки медиа (ffmpeg из `ffmpeg-static`) и записи в `my-projects-data.js`. Тесты, привязанные к «первой карточке», переводятся на поиск Burger Cheddar по slug.

**Tech Stack:** статический HTML/CSS/JS, Node 26 (ESM), `node --test` + puppeteer-core, `ffmpeg-static` (новая dev-зависимость).

**Spec:** `docs/superpowers/specs/2026-11-15-all-projects-design.md`

## Global Constraints
- Ветка: `feature/all-projects` от текущей `feature/my-projects`. В коммитах нет строк `Co-Authored-By` и упоминаний Claude. Автор - локальный git-конфиг репозитория (dekciw).
- В текстах сайта только короткий дефис « - », никакого «—».
- Разметку, CSS и поведение карточки и страницы проекта не менять. Исключение - только если без правки не обойтись, и тогда минимальной правкой.
- Видео-презентации: H.264 1280×720, AAC, `+faststart`, каждая ≤ 6 МБ (цель 3-5 МБ). Скриншоты: JPEG шириной 1600px, качество ~0.85 (ffmpeg `-q:v 3`). Постеры: JPEG шириной 1280px.
- Отзывы - реплики зрителей о том, что видно на сайте. Никаких рекомендаций от «заказчиков» или «работодателей».
- `npm test` зелёный после каждой задачи.

## Review Focus
1. **Проект без сайта (KabanesBot).** На странице нет «Открыть сайт», плеер и описание работают. Тест в Task 3.
2. **Пропущенный или опечатанный путь к медиа.** Битая обложка или серый плеер. Тест существования всех файлов в Task 3.
3. **Тяжёлое видео в репозитории.** Презентация больше 6 МБ. Проверка размера в Task 3.
4. **Тесты, которые молча тестируют не ту карточку,** когда Burger Cheddar перестаёт быть первым. Task 1 переводит их на поиск по slug до того, как меняется порядок.
5. **Фильтр раздела.** В «Лендингах» ровно 4 карточки, Burger Cheddar среди них. Тест в Task 3.

---

### Task 1: Тесты ищут Burger Cheddar по slug, а не «первую карточку»

**Files:**
- Modify: `tests/my-projects.test.mjs` (константа `CARD` около строки 125, тест «в данных пока одна карточка» около 115-120)
- Modify: `tests/my-project-page.test.mjs` (`CARD` строка 42, `openBurger`, все `projects[0]`)

**Interfaces:**
- Produces: в обоих файлах `const BURGER = \`${PROJECTS} .mp-card[data-mp-slug="burger-cheddar"]\``; данные - `projects.find((p) => p.slug === "burger-cheddar")`.

- [ ] **Step 1: Создать ветку:** `git checkout -b feature/all-projects`.
- [ ] **Step 2:** В тестах превью (`previewState`, `leaveCard`, `page.hover(CARD)`, `${CARD} video`) и в `openBurger()` выбирать карточку через `BURGER`. Каждый `window.MY_PROJECTS_DATA.projects[0]`, который означает Burger Cheddar (`my-project-page.test.mjs` строки 222, 316, 331), заменить на `find` по slug. Тесты, которые сами подменяют `projects[0]` своими данными (`withSampleProjects`, «карточка со ссылкой и картинкой»), не трогать: там первая карточка задаётся самим тестом.
- [ ] **Step 3:** Тест «в данных пока одна карточка» переименовать в «Burger Cheddar есть в данных и в сетке». Проверять `titles()` includes `"Burger Cheddar"`, без проверки точного списка (полный список проверит Task 3).
- [ ] **Step 4:** Запустить `npm test`. Ожидается: всё зелёное, число тестов прежнее.
- [ ] **Step 5: Commit:** `test: карточку Burger Cheddar ищем по slug`.

### Task 1b: Случайный порядок карточек

**Files:**
- Modify: `Open_Windows/My Projects/my-projects.js` (`init` около строки 443, `apply` около 404-422, обработчик кликов около 485-497)
- Modify: `tests/my-projects.test.mjs`, `tests/my-project-page.test.mjs` (выключение случайности в общей подготовке)

**Interfaces:**
- Produces: `MyProjects.random: () => number` (по умолчанию `Math.random`, тесты подменяют). `win._mp.order: string[]` - ключи проектов в текущем порядке (ключ `slug || title`). `function reshuffle(win): void` - тасование Фишера-Йетса исходного порядка `data().projects` через `MyProjects.random`.
- Перемешивают: `init` (открытие окна), `[data-mp-action="home"]` (кнопка «Домой» и логотип), щелчок по `.mp-nav[data-mp-category="all"]`. Не перемешивают: другие разделы, поиск, «Назад»/«Вперёд», возврат со страницы проекта.
- `apply` фильтрует проекты и выводит их в порядке `win._mp.order`. Проекты, которых нет в `order` (данные поменялись), идут в конце в исходном порядке.

- [ ] **Step 1: Подготовка тестов.** В обоих файлах, сразу после загрузки страницы (перед первым открытием окна), выполнить `page.evaluate(() => (MyProjects.random = () => 0.999999))`. Тасование с таким генератором сохраняет исходный порядок, поэтому существующие проверки порядка (`my-projects.test.mjs:110, 323, 348`) остаются верными.
- [ ] **Step 2: Failing tests** в `tests/my-projects.test.mjs`, блок «случайный порядок». Каждый тест подменяет `MyProjects.random` последовательностью, а в `finally` возвращает `() => 0.999999`. Работает на `withSampleProjects` (≥ 5 карточек):
  - `при открытии окна порядок перемешан`: `random = () => 0` → `titles()` ≠ исходному, но это тот же набор (сравнение отсортированных);
  - `«Домой», логотип и «Все» перемешивают заново`: после открытия запомнить порядок, сменить генератор на другой, по очереди нажать `[data-mp-tool="home"]`, `.mp-logo`, `.mp-nav[data-mp-category="all"]`, после каждого нажатия порядок отличается от предыдущего;
  - `раздел, поиск и «Назад» порядок не меняют`: после открытия сменить генератор; раздел `media` → `titles()` равно отфильтрованному текущему порядку; «Назад» → тот же порядок, что до раздела; поиск и очистка поиска → тот же порядок.
- [ ] **Step 3:** `node --test tests/my-projects.test.mjs`. Ожидается FAIL в трёх новых тестах.
- [ ] **Step 4:** Реализовать `MyProjects.random`, `reshuffle` и вызовы. «Все» в боковом меню вызывает `reshuffle`, а затем прежний `setCategory(win, "all")`.
- [ ] **Step 5:** `npm test`. Ожидается: всё зелёное.
- [ ] **Step 6: Commit:** `feat: карточки «Моих проектов» перемешиваются при открытии и по «дому»`.

### Task 2: Скрипт сборки медиа проектов

**Files:**
- Create: `scripts/build-project-media.mjs`
- Create: `tests/build-project-media.test.mjs`
- Modify: `package.json` (devDependency `ffmpeg-static`, скрипт `"project-media": "node scripts/build-project-media.mjs"`)
- Output: `Assets/Projects/covers/<Repo>.jpg`, `Assets/Projects/previews/<Repo>.mp4`, `Assets/Projects/media/<slug>/{presentation.mp4, presentation-poster.jpg, <shot>.jpg}`

**Interfaces:**
- Produces: `export const SRC_ROOT = "C:/Users/atanov.r/Project/projects"`. `export const PROJECT_MEDIA: Array<{ repo, slug, dir, prefix, poster?, shots: Array<[srcRelToDir, outName]> }>`. `export function jobsFor(entry, srcRoot, outRoot): Array<{ kind: "copy"|"video"|"poster"|"shot", from, to }>`. Если файл запущен напрямую, он выполняет все задания (`copy` - `fs.copyFile`, остальные - ffmpeg) и печатает размер каждой презентации.

Манифест (`dir` - относительно `SRC_ROOT`). Презентация: `<dir>/presentation/<prefix>-presentation.mp4`. Постер: `<dir>/presentation/<prefix>-poster.jpg`, кроме Burger: `burger-presentation-poster.jpg`. Обложка и превью копируются как есть из `presentations/covers/<repo>.jpg` и `presentations/previews/<repo>.mp4`.

| repo | slug | dir | prefix | shots (src → out) |
|---|---|---|---|---|
| BurgerCheddar | burger-cheddar | project/burger | burger | screenshots/screen-{hero,menu,order,why}.png → {hero,menu,order,why} |
| 2rism | 2rism | project/2rism | 2rism | assets/screen-{hero,destinations,hotels,activities}.png → same w/o `screen-` |
| ExploreNorway | explore-norway | project/norway | norway | assets/screen-slide-{1,2,3,5}.png → slide-{1,2,3,5} |
| DynamicIslandCSS | dynamic-island | dynamic-island | dynamic-island | assets/phone-{main,gold,deep-purple,silver}.png → {main,gold,deep-purple,silver} |
| PizzaChef | pizza-chef | project/pizza | pizza | screenshots/screen-{hero,menu,order}.png |
| MacaroonsShop | macaroons-shop | project/macaroons | macaroons | screenshots/screen-{hero,products,about,order}.png |
| TrendyCookies | trendy-cookies | project/cookies | cookies | screenshots/screen-{hero,products,about,order}.png |
| CoffeSun | coffe-sun | project/coffee-code | coffee-code | assets/screen-{hero,catalog,advantages,order}.png |
| StrongClubBarbershop | strong-club | project/barbershop | barbershop | screenshots/screen-{hero,about,masters,price}.png |
| FashionStore | fashion-store | project/fashion | fashion | assets/screen-{hero,arrivals,sale,app}.png |
| SuperCars | super-cars | project/cars-code | cars-code | screenshots/screen-{hero,catalog,order}.png |
| PrometConfigurator | promet-configurator | promet-lokers | promet-lokers | assets/how-1-series, how-2-model, how-3-params, kp-example .png → series, model, params, kp |
| KabanesBot | kabanes-bot | morningbot | morningbot | screenshots/bot-example.png → example |

Команды ffmpeg:
- видео: `-vf scale=1280:-2 -c:v libx264 -preset slow -crf <N> -c:a aac -b:a 96k -movflags +faststart`. Начать с CRF 28. Если ролик вышел больше 6 МБ, повторить для него с CRF +2.
- скриншот: `-vf scale=1600:-2 -q:v 3`;
- постер: `-vf scale=1280:-2 -q:v 3`.

- [ ] **Step 1: Failing test** `tests/build-project-media.test.mjs`:
  - `PROJECT_MEDIA` содержит 13 записей, slug уникальны;
  - `jobsFor(burger, "S", "O")` содержит `{kind:"copy", from:"S/presentations/covers/BurgerCheddar.jpg", to:"O/Assets/Projects/covers/BurgerCheddar.jpg"}`, `{kind:"video", from:"S/project/burger/presentation/burger-presentation.mp4", to:"O/Assets/Projects/media/burger-cheddar/presentation.mp4"}`, `{kind:"poster", from:"S/project/burger/presentation/burger-presentation-poster.jpg", …/presentation-poster.jpg}` и 4 задания `shot`, последнее `to` оканчивается на `/burger-cheddar/why.jpg`;
  - для `kabanes-bot` постер `S/morningbot/presentation/morningbot-poster.jpg`, ровно 1 `shot` → `example.jpg`;
  - все исходные файлы из `jobsFor(e, SRC_ROOT, …)` существуют на диске (тест пропускается через `{ skip }`, если `SRC_ROOT` нет).
- [ ] **Step 2:** Запустить `node --test tests/build-project-media.test.mjs`. Ожидается FAIL: модуль не найден.
- [ ] **Step 3:** `npm i -D ffmpeg-static`, затем реализовать скрипт. Импорт `ffmpeg-static` - только в ветке запуска, чтобы тесту не нужен был бинарник. Перед запуском: `export PATH="$LOCALAPPDATA/Programs/node-v26.13.0-win-x64:$PATH"`.
- [ ] **Step 4:** Запустить тест. Ожидается PASS.
- [ ] **Step 5:** `npm run project-media`. Ожидается: 13 строк с размером презентации, все ≤ 6 МБ. Открыть 2 ролика в браузере и убедиться, что есть звук и картинка не битая.
- [ ] **Step 6: Commit** скрипта, теста, `package.json`/lock и `Assets/Projects/**`: `feat: медиа всех проектов (видео 720p, скриншоты, обложки, превью)`.

### Task 3: Данные 12 новых проектов, разделы, порядок

**Files:**
- Modify: `Open_Windows/My Projects/my-projects-data.js`
- Modify: `tests/my-project-page.test.mjs` (строки 110 и 141: `data-mp-category="personal"` → `"media"`)
- Create: `tests/projects-data.test.mjs`

**Interfaces:**
- Consumes: пути из Task 2 (`/Assets/Projects/covers/<Repo>.jpg`, `/Assets/Projects/previews/<Repo>.mp4`, `/Assets/Projects/media/<slug>/…`).

Данные:
- Подписи `categories`: `media` → «Лендинги», `builds` → «Фреймворки», `personal` → «Личные», `client` → «Клиенты». `id` и `icon` прежние.
- Разделы: client - promet-configurator; personal - kabanes-bot, dynamic-island; builds - trendy-cookies, super-cars, fashion-store, coffe-sun, macaroons-shop, strong-club; media - burger-cheddar, pizza-chef, explore-norway, 2rism.
- Порядок массива: promet-configurator, burger-cheddar, coffe-sun, super-cars, trendy-cookies, strong-club, fashion-store, macaroons-shop, pizza-chef, explore-norway, 2rism, dynamic-island, kabanes-bot.
- Названия: «Промет: конфигуратор локеров», «Burger Cheddar», «CoffeSun», «Super Cars», «Trendy Cookies», «Strong Club Barbershop», «Fashion Store», «Macaroons Shop», «Pizza Chef», «Explore Norway», «2rism», «Dynamic Island», «Утренний Хрюк (KabanesBot)».
- `site` = `https://dekciw.github.io/<Repo>/`, у KabanesBot поля нет. `href: ""`.
- `media`: первый слайд - видео `{type:"video", src:".../presentation.mp4", poster:".../presentation-poster.jpg"}`, затем скриншоты в порядке из таблицы Task 2, у каждого `alt` по-русски.
- `brief`/`role`/`desc`: по README репозитория (`gh` нет, читать через `curl https://raw.githubusercontent.com/dekciw/<Repo>/HEAD/README.md`) и `note` из `presentations/videos.json`, в стиле Burger Cheddar. `desc`: первая строка - что это, дальше строки «Технология - что сделано».
- `views`/`date`: разные демо-значения, даты от 2026-06 до 2026-11-10, без совпадений.
- `comments`: 3-5 на проект, ники не повторяются между проектами больше двух раз, даты не раньше `date` проекта и не позже 2026-11-15, разный тон и длина. Отзывы Burger Cheddar остаются как есть.
- Burger Cheddar: `category: "media"`, остальное без изменений.

- [ ] **Step 1: Failing test** `tests/projects-data.test.mjs`. Данные загружаются в node через `vm` с `window = {}`. Проверки:
  - 13 проектов, slug из таблицы Task 2, порядок как выше (исходный порядок для перемешивания);
  - у каждого есть `title, category, views, date, thumb, video, slug, media, brief, role, desc, comments`, `category` ∈ id из `categories`;
  - каждый путь `thumb`, `video`, `media[].src`, `media[].poster` существует на диске (путь от корня репозитория);
  - `media[0].type === "video"`, у картинок есть `alt`;
  - размер каждой `presentation.mp4` ≤ 6 × 1024 × 1024;
  - `site` совпадает с `/^https:\/\/dekciw\.github\.io\/[A-Za-z0-9]+\/$/` у всех, кроме `kabanes-bot`, у которого `site` нет;
  - `comments.length` от 3 до 5, у каждого есть `user, date, text, likes, dislikes`, а `date >= project.date`;
  - ни в одной строке данных (`JSON.stringify`) нет символа «—»;
  - `categories.map(c => c.label)` равно `["Лендинги","Фреймворки","Личные","Клиенты"]`;
  - проектов с `category === "media"` ровно 4, среди них `burger-cheddar`.
- [ ] **Step 2:** Запустить `node --test tests/projects-data.test.mjs`. Ожидается FAIL: 1 проект вместо 13.
- [ ] **Step 3:** Заполнить данные, поправить в `my-project-page.test.mjs` категорию `personal` → `media`. Комментарий в начале `projects` («Пока одна карточка…») убрать.
- [ ] **Step 4: Тест страницы без сайта** (добавить в `tests/my-project-page.test.mjs`): открыть карточку `[data-mp-slug="kabanes-bot"]`, проверить, что `.mp-ptitle` = «Утренний Хрюк (KabanesBot)», `.mp-vsite` нет, а точек столько же, сколько `media.length`.
- [ ] **Step 5:** Запустить `npm test`. Ожидается: всё зелёное. Перед запуском проверить ссылки `site` запросом `curl -s -o /dev/null -w "%{http_code}"`, у всех должно быть 200.
- [ ] **Step 6: Commit:** `feat: все проекты в «Моих проектах»`.

### Task 4: Проверка глазами

- [ ] **Step 1:** `npx http-server . -p 3000 -c-1`, открыть `http://127.0.0.1:3000`. Скриншотами через puppeteer проверить: сетку из 13 карточек в узком и широком окне, наведение на 2 карточки (превью играет), страницы Промета, Dynamic Island и KabanesBot (плеер, описание, «Ещё», комментарии), раздел «Лендинги».
- [ ] **Step 2:** Если найдены ошибки, исправить их и прогнать `npm test`, затем отдельный коммит. Не пушить: пуш только по просьбе пользователя.

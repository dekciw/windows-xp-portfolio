// Окно «GitHub»: живой профиль и репозитории из GitHub API.
// Вызывается из openWindow() (Bureau/Bureau.js) после вставки GitHub.html.
(function () {
  const GITHUB_LOGIN = "dekciw";
  const PROFILE_URL = `https://github.com/${GITHUB_LOGIN}`;
  const API = `https://api.github.com/users/${GITHUB_LOGIN}`;
  // README профиля — из репозитория с именем логина; GitHub отдаёт его уже готовым HTML
  const README_API = `https://api.github.com/repos/${GITHUB_LOGIN}/${GITHUB_LOGIN}/readme`;
  const README_BASE = `https://github.com/${GITHUB_LOGIN}/${GITHUB_LOGIN}/blob/main/`;
  // График активности: открытый API GitHub его не отдаёт, берём из открытого сервиса
  const CONTRIB_API = `https://github-contributions-api.jogruber.de/v4/${GITHUB_LOGIN}?y=last`;
  const CACHE_KEY = "gh-cache-v2";
  const CACHE_TTL = 60 * 60 * 1000; // 1 час: у GitHub лимит 60 запросов в час для гостя

  // Цвета языков как на GitHub
  const LANG_COLORS = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Go: "#00ADD8",
    HTML: "#e34c26",
    CSS: "#563d7c",
    SCSS: "#c6538c",
    "C++": "#f34b7d",
    Java: "#b07219",
    Shell: "#89e051",
    Vue: "#41b883",
  };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function link(cls, href, text) {
    const a = el("a", cls, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noreferrer";
    return a;
  }

  // 1 подписчик, 3 подписчика, 5 подписчиков
  function plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  // ---------- данные ----------

  function readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (c && Date.now() - c.time < CACHE_TTL) return c;
    } catch (e) {
      /* localStorage недоступен или испорчен — просто идём в сеть */
    }
    return null;
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), ...data }));
    } catch (e) {
      /* без кэша тоже работает */
    }
  }

  async function getJSON(url) {
    const r = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error(`GitHub ${r.status}`);
    return r.json();
  }

  async function getReadmeHTML() {
    const r = await fetch(README_API, { headers: { Accept: "application/vnd.github.html" } });
    if (!r.ok) throw new Error(`README ${r.status}`);
    return r.text();
  }

  async function getContrib() {
    const r = await fetch(CONTRIB_API);
    if (!r.ok) throw new Error(`contrib ${r.status}`);
    return r.json();
  }

  // Профиль и репозитории обязательны; README и активность — по возможности
  // (если не ответили, их блок просто не показывается).
  async function loadData() {
    const cached = readCache();
    if (cached) return cached;
    const [user, repos, readme, contrib] = await Promise.all([
      getJSON(API),
      getJSON(`${API}/repos?sort=updated&per_page=100`),
      getReadmeHTML().catch(() => null),
      getContrib().catch(() => null),
    ]);
    const data = { user, repos, readme, contrib };
    writeCache(data);
    return data;
  }

  // ---------- README: очистка HTML ----------

  const DROP_TAGS = "script, style, iframe, object, embed, link, meta, form, input, button, textarea, select, frame, frameset, base";

  function safeUrl(url, base) {
    try {
      const u = new URL(url, base);
      return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:" ? u.href : null;
    } catch (e) {
      return null;
    }
  }

  // GitHub уже чистит README, но вставляем HTML внутрь сайта — перестраховываемся:
  // убираем исполняемое, ссылки и картинки — только http(s), ссылки в новой вкладке.
  function sanitizeReadme(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll(DROP_TAGS).forEach((e) => e.remove());
    doc.body.querySelectorAll("*").forEach((e) => {
      [...e.attributes].forEach((a) => {
        const name = a.name.toLowerCase();
        if (name.startsWith("on") || name === "style" || name === "srcdoc") e.removeAttribute(a.name);
      });
      if (e.tagName === "A") {
        const href = e.getAttribute("href");
        const safe = href && !href.startsWith("#") ? safeUrl(href, README_BASE) : null;
        if (safe) {
          e.setAttribute("href", safe);
          e.setAttribute("target", "_blank");
          e.setAttribute("rel", "noreferrer");
        } else {
          e.removeAttribute("href");
        }
      }
      if (e.tagName === "IMG") {
        const src = e.getAttribute("data-canonical-src") || e.getAttribute("src");
        const safe = src ? safeUrl(src, `https://raw.githubusercontent.com/${GITHUB_LOGIN}/${GITHUB_LOGIN}/main/`) : null;
        if (safe && !safe.startsWith("mailto:")) e.setAttribute("src", safe);
        else e.remove();
        e.removeAttribute("srcset");
        e.setAttribute("loading", "lazy");
      }
    });
    const frag = document.createDocumentFragment();
    [...doc.body.childNodes].forEach((n) => frag.appendChild(document.importNode(n, true)));
    return frag;
  }

  function renderReadme(html) {
    const box = el("section", "gh-readme");
    const head = el("div", "gh-readme-title");
    head.appendChild(el("span", "gh-readme-owner", GITHUB_LOGIN));
    head.appendChild(document.createTextNode(" / "));
    head.appendChild(el("span", "gh-readme-file", "README.md"));
    const body = el("div", "gh-readme-body");
    body.appendChild(sanitizeReadme(html));
    box.append(head, body);
    return box;
  }

  // ---------- активность ----------

  // 1 действие, 3 действия, 5 действий; число с пробелом-разделителем тысяч
  function actions(n) {
    return `${n.toLocaleString("ru-RU")} ${plural(n, "действие", "действия", "действий")}`;
  }

  const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

  function renderContrib(contrib) {
    const days = (contrib.contributions || []).slice(-371);
    if (!days.length) return null;
    const total =
      (contrib.total && (contrib.total.lastYear ?? Object.values(contrib.total)[0])) ??
      days.reduce((s, d) => s + d.count, 0);

    const box = el("section", "gh-contrib");
    box.appendChild(el("div", "gh-contrib-title", `${actions(total)} за последний год`));
    const card = el("div", "gh-contrib-card");
    const scroll = el("div", "gh-contrib-scroll");
    const grid = el("div", "gh-contrib-grid");

    // Неделя — столбец, с воскресенья (как на GitHub): в начале добиваем пустыми клетками
    const firstDow = new Date(days[0].date + "T00:00:00Z").getUTCDay();
    const cells = [...Array(firstDow).fill(null), ...days];
    const weeks = Math.ceil(cells.length / 7);
    grid.style.setProperty("--weeks", weeks);

    // подписи месяцев над первой неделей месяца
    const monthsRow = el("div", "gh-contrib-months");
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      const d = cells.slice(w * 7, w * 7 + 7).find(Boolean);
      const m = d ? new Date(d.date + "T00:00:00Z").getUTCMonth() : lastMonth;
      const label = el("span", "gh-contrib-month", m !== lastMonth && w < weeks - 1 ? MONTHS[m] : "");
      monthsRow.appendChild(label);
      lastMonth = m;
    }
    monthsRow.style.setProperty("--weeks", weeks);

    cells.forEach((d) => {
      const c = el("span", d ? "gh-day" : "gh-day gh-day--empty");
      if (d) {
        c.dataset.level = String(Math.max(0, Math.min(4, d.level | 0)));
        const date = new Date(d.date + "T00:00:00Z").toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        });
        c.title = d.count ? `${actions(d.count)}, ${date}` : `Нет действий, ${date}`;
      }
      grid.appendChild(c);
    });

    scroll.append(monthsRow, grid);
    const legend = el("div", "gh-contrib-legend");
    legend.appendChild(el("span", "", "Меньше"));
    for (let i = 0; i <= 4; i++) {
      const s = el("span", "gh-day");
      s.dataset.level = String(i);
      s.setAttribute("aria-hidden", "true");
      legend.appendChild(s);
    }
    legend.appendChild(el("span", "", "Больше"));
    card.append(scroll, legend);
    box.appendChild(card);
    // в узком окне график прокручивается — показываем сначала последние недели, как GitHub
    requestAnimationFrame(() => (scroll.scrollLeft = scroll.scrollWidth));
    return box;
  }

  // ---------- отрисовка ----------

  function renderProfile(u) {
    const p = el("aside", "gh-profile");
    const avatar = el("img", "gh-avatar");
    avatar.src = u.avatar_url;
    avatar.alt = "";
    p.appendChild(avatar);
    // Как на GitHub: есть имя — крупно имя, под ним логин; нет имени — логин один раз
    p.appendChild(el("div", "gh-name", u.name || u.login));
    if (u.name) p.appendChild(el("div", "gh-login", u.login));
    if (u.bio) p.appendChild(el("div", "gh-bio", u.bio));
    p.appendChild(link("gh-open", u.html_url || PROFILE_URL, "Открыть на GitHub"));
    if (u.location) p.appendChild(el("div", "gh-location", u.location));
    const followers = u.followers || 0;
    const following = u.following || 0;
    p.appendChild(
      el(
        "div",
        "gh-follow",
        `${followers} ${plural(followers, "подписчик", "подписчика", "подписчиков")} · ` +
          `${following} ${plural(following, "подписка", "подписки", "подписок")}`
      )
    );
    return p;
  }

  function renderRepo(r) {
    const card = el("div", "gh-repo");
    card.appendChild(link("gh-repo-name", r.html_url, r.name));
    if (r.description) card.appendChild(el("div", "gh-repo-desc", r.description));
    const meta = el("div", "gh-repo-meta");
    if (r.language) {
      const lang = el("span", "gh-repo-lang", r.language);
      lang.style.setProperty("--lang-color", LANG_COLORS[r.language] || "#8b949e");
      meta.appendChild(lang);
    }
    meta.appendChild(el("span", "gh-repo-stars", String(r.stargazers_count || 0)));
    const date = new Date(r.updated_at).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    meta.appendChild(el("span", "gh-repo-updated", `обновлён ${date}`));
    card.appendChild(meta);
    return card;
  }

  function render(root, { user, repos, readme, contrib }) {
    const list = (repos || [])
      .filter((r) => !r.fork && r.name.toLowerCase() !== GITHUB_LOGIN.toLowerCase())
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const page = el("div", "gh-page");
    page.appendChild(renderProfile(user));
    const main = el("section", "gh-main");
    if (readme) main.appendChild(renderReadme(readme));
    const title = el("div", "gh-repos-title", "Репозитории ");
    title.appendChild(el("span", "gh-count", String(list.length)));
    main.appendChild(title);
    const grid = el("div", "gh-repos");
    list.forEach((r) => grid.appendChild(renderRepo(r)));
    main.appendChild(grid);
    const activity = contrib ? renderContrib(contrib) : null;
    if (activity) main.appendChild(activity);
    page.appendChild(main);
    root.replaceChildren(page);
    root.dataset.state = "ready";
  }

  function renderError(root) {
    const box = el("div", "gh-error", "Не удалось загрузить профиль GitHub. ");
    box.appendChild(link("", PROFILE_URL, "Открыть github.com/" + GITHUB_LOGIN));
    root.replaceChildren(box);
    root.dataset.state = "error";
  }

  // Размер под рабочий стол (не больше удобного максимума) и положение по центру,
  // чтобы окно целиком помещалось и не уходило под панель задач.
  const MAX_W = 1000; // как у «Обо мне»: на 1366px не наезжает на второй столбец иконок
  const MAX_H = 760;
  const MARGIN = 20;
  function placeWindow(win) {
    const desk = document.getElementById("desktop");
    if (!desk) return;
    const d = desk.getBoundingClientRect();
    win.style.width = Math.min(MAX_W, d.width - 2 * MARGIN) + "px";
    win.style.height = Math.min(MAX_H, d.height - 2 * MARGIN) + "px";
    const left = d.left + window.scrollX + (d.width - win.offsetWidth) / 2;
    const top = d.top + window.scrollY + (d.height - win.offsetHeight) / 2;
    win.style.left = Math.max(d.left, Math.round(left)) + "px";
    win.style.top = Math.max(d.top, Math.round(top)) + "px";
  }

  async function init(win) {
    const root = win.querySelector(".gh-root");
    if (!root) return;
    placeWindow(win);
    root.replaceChildren(el("div", "gh-loading", "Загрузка…"));
    root.dataset.state = "loading";
    try {
      render(root, await loadData());
    } catch (e) {
      renderError(root);
    }
  }

  window.GitHubWindow = { init, _actions: actions };
})();

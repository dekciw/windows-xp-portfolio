// Окно «Мои проекты»: шапка с поиском, меню категорий, сетка карточек, светлая/тёмная тема.
// Контент — в my-projects-data.js. Вызывается из openWindow() (Bureau/Bureau.js).
(function () {
  const HOST = "https://www.myprojects.com";
  const THEME_KEY = "mp-theme";
  const ICONS_DIR =
    "/Assets/Windows XP High Resolution Icon Pack avec MAOSX/Windows XP High Resolution Icon Pack/Windows XP Icons/";

  // Значки меню категорий — из макета (Assets/Images/My Projects/nav-*.png).
  const NAV_ICON_DIR = "/Assets/Images/My Projects/";
  const NAV_ICON_NAMES = ["all", "media", "builds", "personal", "client"];

  // Одноцветные значки соцсетей для шапки (цвет из текста: белые в тёмной теме, чёрные в светлой).
  // Сеть без своего значка показывается картинкой из данных.
  const SOCIAL_GLYPHS = {
    telegram:
      '<circle cx="12" cy="12" r="11" fill="currentColor"/>' +
      '<path d="M5.4 11.6 17 7.1c.5-.2 1 .1.8.9l-2 9.4c-.1.6-.6.8-1.1.5l-3-2.2-1.5 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.6-5.1c.2-.2 0-.3-.3-.1l-6.9 4.4-3-.9c-.6-.2-.6-.6.2-.9z" style="fill: var(--mp-bg)"/>',
    instagram:
      '<rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
      '<circle cx="12" cy="12" r="4.4" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
      '<circle cx="17.4" cy="6.6" r="1.4" fill="currentColor"/>',
  };

  function socialGlyph(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "26");
    svg.setAttribute("height", "26");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = SOCIAL_GLYPHS[name];
    return svg;
  }

  const data = () => window.MY_PROJECTS_DATA || { categories: [], projects: [] };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Значок — маска из PNG: цвет берётся из текста, поэтому в светлой теме он тёмный.
  function navIcon(name) {
    const file = NAV_ICON_DIR + "nav-" + (NAV_ICON_NAMES.includes(name) ? name : "all") + ".png";
    const icon = el("span", "mp-nav-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.style.setProperty("--mp-icon", `url("${file}")`);
    icon.dataset.src = file;
    return icon;
  }

  // Склонение по числу: plural(5, ["день", "дня", "дней"]) → "дней"
  function plural(n, forms) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
  }

  // 1 просмотр, 845 просмотров, 2,3 тыс. просмотров, 46 тыс. просмотров, 1,2 млн просмотров
  function viewsLabel(n) {
    const short = (v) => (v < 10 ? String(Math.floor(v * 10) / 10).replace(".", ",") : String(Math.floor(v)));
    if (n >= 1e6) return `${short(n / 1e6)} млн просмотров`;
    if (n >= 1000) return `${short(n / 1000)} тыс. просмотров`;
    return `${n} ${plural(n, ["просмотр", "просмотра", "просмотров"])}`;
  }

  // Сколько времени прошло с даты публикации ("2026-10-12"): «вчера», «3 недели назад», «1 год назад».
  // now — для тестов; по умолчанию сегодняшняя дата.
  function timeAgo(date, now = new Date()) {
    const d = new Date(date + "T00:00:00");
    if (isNaN(d)) return "";
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((today - d) / 86400000);
    if (days <= 0) return "сегодня";
    if (days === 1) return "вчера";
    if (days < 7) return `${days} ${plural(days, ["день", "дня", "дней"])} назад`;
    if (days < 30) {
      const w = Math.floor(days / 7);
      return `${w} ${plural(w, ["неделю", "недели", "недель"])} назад`;
    }
    if (days < 365) {
      const m = Math.max(1, Math.floor(days / 30.44));
      return `${m} ${plural(m, ["месяц", "месяца", "месяцев"])} назад`;
    }
    const y = Math.floor(days / 365.25);
    return `${y} ${plural(y, ["год", "года", "лет"])} назад`;
  }

  // Серая строка под названием: «2,3 тыс. просмотров • 3 недели назад» (или своя строка meta).
  function metaLine(p) {
    const parts = [];
    if (p.views != null) parts.push(viewsLabel(p.views));
    if (p.date) parts.push(timeAgo(p.date));
    return parts.length ? parts.join(" • ") : p.meta || "";
  }

  function readTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
    } catch (e) {
      return "dark";
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* без хранилища тема просто не запомнится */
    }
  }

  // Размер под рабочий стол и положение по центру.
  // Под 2 карточки 347px + промежуток 16px + отступы ~16px по краям (как в макете),
  // полосу прокрутки 17px и небольшой запас на округления при масштабе экрана 125–150%.
  const MAX_W = 842;
  const MAX_H = 660;
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

  function renderSocial(win) {
    const nav = win.querySelector(".mp-social");
    const list = data().social || (window.ABOUT_ME_DATA && window.ABOUT_ME_DATA.social) || [];
    nav.replaceChildren();
    list.forEach((s) => {
      if (!s.href) return;
      const a = el("a");
      a.href = s.href;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.title = s.label;
      a.setAttribute("aria-label", s.label);
      const key = String(s.label || "").toLowerCase();
      if (SOCIAL_GLYPHS[key]) {
        a.appendChild(socialGlyph(key));
      } else {
        // Картинка-маска: значок одноцветный и меняет цвет при наведении, как остальные.
        const icon = el("span", "mp-social-icon");
        icon.setAttribute("aria-hidden", "true");
        icon.style.setProperty("--mp-icon", `url("${s.iconSrc || ICONS_DIR + s.icon + ".png"}")`);
        a.appendChild(icon);
      }
      nav.appendChild(a);
    });
  }

  function renderSidebar(win) {
    const nav = win.querySelector(".mp-sidebar");
    nav.replaceChildren();
    const cats = [{ id: "all", label: "Все", icon: "all" }].concat(data().categories || []);
    cats.forEach((c) => {
      const b = el("button", "mp-nav");
      b.type = "button";
      b.dataset.mpCategory = c.id;
      b.title = c.label;
      b.setAttribute("aria-label", c.label);
      b.appendChild(navIcon(c.icon || c.id));
      b.appendChild(el("span", "mp-nav-text", c.label));
      nav.appendChild(b);
    });
  }

  // Карточка со slug открывает страницу проекта в этом окне; без slug — ссылка href
  // в новой вкладке или заглушка «скоро».
  function card(p) {
    const link = p.href && !p.slug;
    const c = el(link ? "a" : "div", "mp-card");
    if (p.slug) c.dataset.mpSlug = p.slug;
    if (link) {
      c.href = p.href;
      c.target = "_blank";
      c.rel = "noreferrer";
    } else {
      c.setAttribute("role", "button");
      c.tabIndex = 0;
    }
    c.dataset.mpCategory = p.category || "";
    c.setAttribute("aria-label", `Открыть проект ${p.title}`);

    const thumb = el("div", "mp-thumb");
    if (p.video) {
      const cover = el("img", "mp-thumb-cover");
      if (p.thumb) cover.src = p.thumb;
      cover.alt = p.title;
      cover.loading = "lazy";
      const video = el("video", "mp-thumb-video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "none";
      video.setAttribute("aria-hidden", "true");
      const progress = el("div", "mp-progress");
      progress.appendChild(el("div", "mp-progress-bar"));
      thumb.append(video, cover, progress);
      attachPreview(c, thumb, video, p.video);
    } else if (p.thumb) {
      const img = el("img");
      img.src = p.thumb;
      img.alt = p.title;
      img.loading = "lazy";
      thumb.appendChild(img);
    } else {
      const ph = el("div", "mp-thumb-placeholder");
      if (p.color) ph.style.setProperty("--mp-card-color", p.color);
      const icon = el("img");
      icon.src = ICONS_DIR + "Folder Opened.png";
      icon.alt = "";
      ph.appendChild(icon);
      ph.appendChild(el("span", null, "Скоро здесь будет превью"));
      thumb.appendChild(ph);
    }
    c.appendChild(thumb);

    const info = el("div", "mp-info");
    const avatar = el("img", "mp-avatar");
    avatar.src = data().avatar || ICONS_DIR + "User Accounts.png";
    avatar.alt = "";
    info.appendChild(avatar);
    const details = el("div", "mp-details");
    details.appendChild(el("h3", "mp-title", p.title));
    const meta = metaLine(p);
    if (meta) details.appendChild(el("p", "mp-meta", meta));
    info.appendChild(details);
    c.appendChild(info);
    return c;
  }

  // Видео-превью: наведение/фокус — видео с начала по кругу (src ставится лениво, при первом
  // наведении); обложка прячется только на событии playing (без чёрного кадра); красная дорожка
  // показывает прогресс. Уход — пауза, сброс на начало, снова обложка.
  function attachPreview(card, thumb, video, src) {
    const bar = thumb.querySelector(".mp-progress-bar");
    let active = false;

    function tick() {
      if (!active || !thumb.isConnected) return;
      const d = video.duration;
      bar.style.width = d > 0 ? (video.currentTime / d) * 100 + "%" : "0%";
      requestAnimationFrame(tick);
    }
    function start() {
      if (active) return;
      active = true;
      if (!video.getAttribute("src")) video.src = src;
      try {
        video.currentTime = 0;
      } catch (e) {}
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    }
    function stop() {
      if (!active) return;
      active = false;
      thumb.classList.remove("is-playing");
      video.pause();
      try {
        video.currentTime = 0;
      } catch (e) {}
      bar.style.width = "0%";
    }
    video.addEventListener("playing", () => {
      if (!active) return;
      thumb.classList.add("is-playing");
      requestAnimationFrame(tick);
    });
    card.addEventListener("mouseenter", start);
    card.addEventListener("focus", start);
    // Не останавливаем только при клавиатурном фокусе: щелчок мышью тоже даёт фокус,
    // но после ухода курсора видео должно встать.
    card.addEventListener("mouseleave", () => {
      if (!card.matches(":focus-visible")) stop();
    });
    card.addEventListener("blur", () => {
      if (!card.matches(":hover")) stop();
    });
    // Сетка прячется (открыта страница проекта) — превью встаёт.
    card.addEventListener("mp-preview-stop", stop);
  }

  function slug(category) {
    return category && category !== "all" ? "/" + category : "";
  }

  function findProject(projectSlug) {
    return (data().projects || []).find((p) => p.slug && p.slug === projectSlug) || null;
  }

  // ---------- история: сетка ↔ страница проекта, как в браузере ----------
  // Запись истории: { view: "grid", category, query } | { view: "project", slug }.

  function current(win) {
    const st = win._mp;
    return st.history[st.index];
  }

  function push(win, entry) {
    const st = win._mp;
    st.history = st.history.slice(0, st.index + 1);
    st.history.push(entry);
    st.index = st.history.length - 1;
  }

  // Переход к сетке с категорией и поиском. В сетке — правка текущей записи (без лишних шагов
  // в истории на каждую букву поиска), со страницы проекта — новая запись. Как в браузере,
  // новый переход обрезает «вперёд».
  function showGrid(win, category, query) {
    const st = win._mp;
    const entry = current(win);
    if (entry.view === "grid") {
      if (entry.category === category && entry.query === query) return apply(win);
      entry.category = category;
      entry.query = query;
      st.history = st.history.slice(0, st.index + 1);
    } else {
      push(win, { view: "grid", category, query });
    }
    apply(win);
  }

  function openProject(win, projectSlug) {
    if (!findProject(projectSlug)) return;
    const entry = current(win);
    if (entry.view === "project" && entry.slug === projectSlug) return;
    push(win, { view: "project", slug: projectSlug });
    apply(win);
  }

  function goBack(win) {
    if (win._mp.index <= 0) return;
    const from = current(win);
    win._mp.index--;
    apply(win);
    focusCardOf(win, from);
  }

  function goForward(win) {
    if (win._mp.index >= win._mp.history.length - 1) return;
    const from = current(win);
    win._mp.index++;
    apply(win);
    focusCardOf(win, from);
  }

  // Со страницы проекта вернулись в сетку — фокус на карточку этого проекта (если она видна).
  function focusCardOf(win, from) {
    if (!from || from.view !== "project" || current(win).view === "project") return;
    const c = [...win.querySelectorAll(".mp-grid .mp-card")].find((n) => n.dataset.mpSlug === from.slug);
    if (c) c.focus();
  }

  function setToolEnabled(win, name, on) {
    const b = win.querySelector(`[data-mp-tool="${name}"]`);
    if (!b) return;
    b.classList.toggle("function_bar_button", on);
    b.classList.toggle("function_bar_button--disable", !on);
  }

  // Превью карточек в спрятанной сетке не должны играть.
  function stopPreviews(win) {
    win.querySelectorAll(".mp-grid .mp-card").forEach((c) => c.dispatchEvent(new Event("mp-preview-stop")));
  }

  // Рисует окно по текущей записи истории.
  function apply(win) {
    const st = win._mp;
    const entry = current(win);
    const project = entry.view === "project" ? findProject(entry.slug) : null;
    const grid = win.querySelector(".mp-grid");
    const section = win.querySelector(".mp-project");

    setToolEnabled(win, "back", st.index > 0);
    setToolEnabled(win, "forward", st.index < st.history.length - 1);

    if (project) {
      stopPreviews(win);
      grid.hidden = true;
      win.querySelector(".mp-empty").hidden = true;
      section.hidden = false;
      if (window.MyProjectsPage) window.MyProjectsPage.render(win, project);
      win.querySelectorAll(".mp-nav").forEach((b) => b.setAttribute("aria-current", "false"));
      win.querySelector(".mp-address").textContent = HOST + "/" + project.slug;
      win.querySelector(".mp-page").scrollTop = 0;
      // Фокус — на название открытой страницы (tabIndex −1), без прокрутки.
      const title = section.querySelector(".mp-ptitle");
      if (title) title.focus({ preventScroll: true });
      return;
    }

    if (!section.hidden || section.firstChild) {
      if (window.MyProjectsPage) window.MyProjectsPage.destroy(win);
      section.replaceChildren();
      section.hidden = true;
    }
    grid.hidden = false;

    // Запись сетки (или запись проекта, которого больше нет в данных) — сетка.
    st.category = entry.category || "all";
    st.query = entry.query || "";
    const input = win.querySelector(".mp-search-input");
    if (input.value !== st.query) input.value = st.query;

    const q = st.query.trim().toLowerCase();
    const list = (data().projects || []).filter((p) => {
      if (st.category !== "all" && p.category !== st.category) return false;
      if (!q) return true;
      return [p.title, p.meta, metaLine(p)].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    grid.replaceChildren(...list.map(card));
    win.querySelector(".mp-empty").hidden = list.length > 0;

    win.querySelectorAll(".mp-nav").forEach((b) => {
      b.setAttribute("aria-current", String(b.dataset.mpCategory === st.category));
    });
    const query = q ? "?q=" + encodeURIComponent(st.query.trim()) : "";
    win.querySelector(".mp-address").textContent = HOST + slug(st.category) + query;
    win.querySelector(".mp-page").scrollTop = 0;
  }

  function setCategory(win, category) {
    showGrid(win, category, win._mp.query);
  }

  function setTheme(win, theme) {
    win._mp.theme = theme;
    win.querySelector(".mp-page").dataset.theme = theme;
    saveTheme(theme);
  }

  function init(win) {
    win._mp = {
      category: "all",
      query: "",
      theme: readTheme(),
      history: [{ view: "grid", category: "all", query: "" }],
      index: 0,
    };
    placeWindow(win);
    const root = win.querySelector(".mp-root");
    const input = win.querySelector(".mp-search-input");

    // «Сервис» и «Справка» неактивны: щелчок и наведение не доходят до общего
    // обработчика меню в Bureau.js (он запросил бы несуществующие файлы меню).
    ["click", "mouseenter"].forEach((type) =>
      root.addEventListener(
        type,
        (e) => {
          if (e.target.closest && e.target.closest(".mp-disabled")) e.stopPropagation();
        },
        true
      )
    );

    renderSocial(win);
    renderSidebar(win);
    setTheme(win, win._mp.theme);
    apply(win);

    // Поиск всегда ведёт к сетке (со страницы проекта — новым шагом истории).
    win.querySelector(".mp-search").addEventListener("submit", (e) => {
      e.preventDefault();
      showGrid(win, win._mp.category, input.value);
    });
    input.addEventListener("input", () => showGrid(win, win._mp.category, input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && input.value) {
        e.stopPropagation();
        showGrid(win, win._mp.category, "");
      }
    });

    const tools = { back: goBack, forward: goForward };
    win.addEventListener("click", (e) => {
      const tool = e.target.closest("[data-mp-tool]");
      if (tool && tools[tool.dataset.mpTool]) return tools[tool.dataset.mpTool](win);

      const nav = e.target.closest(".mp-nav");
      if (nav) return setCategory(win, nav.dataset.mpCategory);

      if (e.target.closest('[data-mp-action="home"]')) {
        e.preventDefault();
        return showGrid(win, "all", "");
      }
      if (e.target.closest('[data-mp-action="theme"]')) {
        return setTheme(win, win._mp.theme === "dark" ? "light" : "dark");
      }
      // Пункты меню «Вид» вставляются Bureau.js при каждом открытии меню.
      const themeItem = e.target.closest("[data-mp-theme]");
      if (themeItem) return setTheme(win, themeItem.dataset.mpTheme);

      const c = e.target.closest(".mp-card");
      if (!c || c.tagName === "A") return;
      if (c.dataset.mpSlug) openProject(win, c.dataset.mpSlug);
    });

    win.querySelector(".mp-grid").addEventListener("keydown", (e) => {
      const c = e.target.closest(".mp-card");
      if (c && c.tagName !== "A" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        c.click();
      }
    });
  }

  window.MyProjects = {
    init,
    setCategory,
    setTheme,
    openProject,
    goBack,
    goForward,
    viewsLabel,
    plural,
    timeAgo,
    metaLine,
  };
})();

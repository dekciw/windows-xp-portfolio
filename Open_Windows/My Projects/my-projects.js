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

  // Склонение по числу: plural(5, ["элемент", "элемента", "элементов"]) → "элементов"
  function plural(n, forms) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
  }

  // 1 элемент, 2 элемента, 5 элементов
  function itemsLabel(n) {
    return `${n} ${plural(n, ["элемент", "элемента", "элементов"])}`;
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

  function card(p) {
    const c = el(p.href ? "a" : "div", "mp-card");
    if (p.href) {
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
    if (p.thumb) {
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
    if (p.items > 0) thumb.appendChild(el("span", "mp-badge", itemsLabel(p.items)));
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

  function slug(category) {
    return category && category !== "all" ? "/" + category : "";
  }

  // Показ карточек по категории и строке поиска.
  function apply(win) {
    const st = win._mp;
    const q = st.query.trim().toLowerCase();
    const list = (data().projects || []).filter((p) => {
      if (st.category !== "all" && p.category !== st.category) return false;
      if (!q) return true;
      return [p.title, p.meta, metaLine(p)].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    const grid = win.querySelector(".mp-grid");
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
    win._mp.category = category;
    apply(win);
  }

  function setTheme(win, theme) {
    win._mp.theme = theme;
    win.querySelector(".mp-page").dataset.theme = theme;
    saveTheme(theme);
  }

  function setStatus(win, text) {
    win.querySelector(".mp-status-text").textContent = text || "Готово";
  }

  function init(win) {
    win._mp = { category: "all", query: "", theme: readTheme() };
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

    win.querySelector(".mp-search").addEventListener("submit", (e) => {
      e.preventDefault();
      win._mp.query = input.value;
      apply(win);
    });
    input.addEventListener("input", () => {
      win._mp.query = input.value;
      apply(win);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && input.value) {
        e.stopPropagation();
        input.value = "";
        win._mp.query = "";
        apply(win);
      }
    });

    win.addEventListener("click", (e) => {
      const nav = e.target.closest(".mp-nav");
      if (nav) return setCategory(win, nav.dataset.mpCategory);

      if (e.target.closest('[data-mp-action="home"]')) {
        e.preventDefault();
        input.value = "";
        win._mp.query = "";
        return setCategory(win, "all");
      }
      if (e.target.closest('[data-mp-action="theme"]')) {
        return setTheme(win, win._mp.theme === "dark" ? "light" : "dark");
      }
      // Пункты меню «Вид» вставляются Bureau.js при каждом открытии меню.
      const themeItem = e.target.closest("[data-mp-theme]");
      if (themeItem) return setTheme(win, themeItem.dataset.mpTheme);

      const c = e.target.closest(".mp-card");
      if (c && c.tagName !== "A") setStatus(win, "Проект скоро появится");
    });

    win.querySelector(".mp-grid").addEventListener("keydown", (e) => {
      const c = e.target.closest(".mp-card");
      if (c && c.tagName !== "A" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        c.click();
      }
    });

    // Строка состояния, как в IE: адрес карточки под курсором.
    const grid = win.querySelector(".mp-grid");
    grid.addEventListener("mouseover", (e) => {
      const c = e.target.closest(".mp-card");
      if (c) setStatus(win, c.tagName === "A" ? c.href : "Проект скоро появится");
    });
    grid.addEventListener("mouseleave", () => setStatus(win));
  }

  window.MyProjects = { init, setCategory, setTheme, itemsLabel, viewsLabel, timeAgo };
})();

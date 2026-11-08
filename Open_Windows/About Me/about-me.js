// Окно «Обо мне»: страница-профиль, страница проектов, боковые карточки, навигация.
// Вызывается из openWindow() (Bureau/Bureau.js) после вставки About Me.html.
(function () {
  const ICONS =
    "/Assets/Windows XP High Resolution Icon Pack avec MAOSX/Windows XP High Resolution Icon Pack/Windows XP Icons/";
  const iconSrc = (row) => row.iconSrc || ICONS + row.icon + ".png";
  // Данные с подстраховкой: удалённый из about-me-data.js раздел считается пустым,
  // чтобы окно не открылось пустым из-за одной правки.
  const LISTS = ["social", "stack", "frameworks", "about", "experience", "education", "projects"];
  const data = () => {
    const d = window.ABOUT_ME_DATA || {};
    const out = {};
    LISTS.forEach((k) => (out[k] = Array.isArray(d[k]) ? d[k] : []));
    return out;
  };

  const PAGES = {
    profile: { address: "Обо мне" },
    projects: { address: "Обо мне › Мои проекты" },
  };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function img(src, cls) {
    const i = el("img", cls);
    i.src = src;
    i.alt = "";
    return i;
  }

  function setLink(a, href) {
    a.href = href;
    if (!href.startsWith("mailto:")) {
      a.target = "_blank";
      a.rel = "noreferrer";
    }
  }

  // ---------- боковая панель ----------

  // Свернуть/развернуть карточку. Анимация — в CSS (класс am-card--collapsed).
  function toggleCard(c) {
    const collapsed = c.classList.toggle("am-card--collapsed");
    c.querySelector(".am-card-header").setAttribute("aria-expanded", String(!collapsed));
    c.querySelector(".am-card-body").inert = collapsed;
  }

  // Карточка в стиле «Мой компьютер»: классы content_left_card* берут его оформление,
  // классы am-* — только для сворачивания и тестов.
  function card(id, title, rows) {
    const c = el("div", "am-card content_left_card");
    c.dataset.card = id;
    const head = el("div", "am-card-header content_left_card_header");
    head.setAttribute("role", "button");
    head.setAttribute("aria-expanded", "true");
    head.tabIndex = 0;
    head.appendChild(el("div", "am-card-header-text content_left_card_header_text", title));
    head.appendChild(img("/Assets/Images/Icons/start-menu-icon.png", "am-card-arrow content_left_card_header_img"));
    head.addEventListener("click", () => toggleCard(c));
    head.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleCard(c);
      }
    });
    const collapse = el("div", "am-card-collapse");
    const body = el("div", "am-card-body content_left_card_content");
    rows.forEach((r) => {
      const row = el(r.href ? "a" : "div", "am-link content_left_card_row");
      if (r.href) setLink(row, r.href);
      row.appendChild(img(iconSrc(r), "am-link-icon content_left_card_img"));
      row.appendChild(
        el("span", "am-link-text content_left_card_text" + (r.href ? " link" : ""), r.label)
      );
      body.appendChild(row);
    });
    collapse.appendChild(body);
    c.append(head, collapse);
    return c;
  }

  function renderSidebar(win) {
    const sb = win.querySelector(".am-sidebar");
    const d = data();
    sb.textContent = "";
    sb.append(
      card("social", "Соцсети", d.social),
      card("stack", "Стек технологий", d.stack),
      card("frameworks", "Фреймворки", d.frameworks)
    );
  }

  // ---------- страницы ----------

  function item(it) {
    const box = el("div", "am-item");
    const title = el(it.href ? "a" : "div", "am-item-title", it.title);
    if (it.href) setLink(title, it.href);
    box.appendChild(title);
    const meta = [it.subtitle, it.period].filter(Boolean).join(" · ");
    if (meta) box.appendChild(el("div", "am-item-meta", meta));
    if (it.text) box.appendChild(el("div", "am-item-text", it.text));
    return box;
  }

  function section(id, title, items) {
    const s = el("div", "am-section");
    s.dataset.section = id;
    s.appendChild(el("div", "am-section-title", title));
    items.forEach((it) => s.appendChild(item(it)));
    return s;
  }

  function renderProfile(win) {
    const p = win.querySelector(".am-profile");
    const d = data();
    p.textContent = "";
    p.appendChild(el("div", "am-title", "Обо мне"));
    d.about.forEach((a) => {
      const b = el("div", "am-about-block");
      if (a.image) b.appendChild(img(a.image, "am-about-img"));
      b.appendChild(el("p", "am-about-text", a.text));
      p.appendChild(b);
    });
    if (d.experience.length) p.appendChild(section("experience", "Опыт работы", d.experience));
    if (d.education.length) p.appendChild(section("education", "Образование", d.education));
  }

  function renderProjects(win) {
    const p = win.querySelector(".am-projects");
    p.textContent = "";
    p.appendChild(el("div", "am-title", "Мои проекты"));
    data().projects.forEach((it) => p.appendChild(item(it)));
  }

  // ---------- навигация ----------

  function render(win) {
    const st = win._am;
    const page = st.history[st.index];
    win.querySelector(".am-profile").hidden = page !== "profile";
    win.querySelector(".am-projects").hidden = page !== "projects";
    if (page === "projects") renderProjects(win);
    win.querySelector(".am-body").scrollTop = 0;
    win.querySelector(".address_bar_content_text").textContent = PAGES[page].address;
    setEnabled(win, "back", st.index > 0);
    setEnabled(win, "forward", st.index < st.history.length - 1);
    setEnabled(win, "up", page !== "profile");
  }

  function setEnabled(win, name, on) {
    const b = win.querySelector(`[data-am-nav="${name}"]`);
    b.classList.toggle("function_bar_button", on);
    b.classList.toggle("function_bar_button--disable", !on);
  }

  function navigate(win, page) {
    const st = win._am;
    if (st.history[st.index] === page) return;
    st.history = st.history.slice(0, st.index + 1);
    st.history.push(page);
    st.index = st.history.length - 1;
    render(win);
  }

  function show(win, page) {
    navigate(win, page);
  }

  function back(win) {
    if (win._am.index > 0) {
      win._am.index--;
      render(win);
    }
  }

  function forward(win) {
    if (win._am.index < win._am.history.length - 1) {
      win._am.index++;
      render(win);
    }
  }

  function up(win) {
    navigate(win, "profile");
  }

  // Размер под рабочий стол (но не больше удобного максимума) и положение по центру,
  // чтобы окно целиком помещалось и не уходило под панель задач.
  const MAX_W = 1000;
  const MAX_H = 720;
  const MARGIN = 20;
  function placeWindow(win) {
    const desk = document.getElementById("desktop");
    if (!desk) return;
    const d = desk.getBoundingClientRect();
    const w = Math.min(MAX_W, d.width - 2 * MARGIN);
    const h = Math.min(MAX_H, d.height - 2 * MARGIN);
    win.style.width = w + "px";
    win.style.height = h + "px";
    // style.width/height — без рамки окна; центрируем по фактическому внешнему размеру
    const left = d.left + window.scrollX + (d.width - win.offsetWidth) / 2;
    const top = d.top + window.scrollY + (d.height - win.offsetHeight) / 2;
    win.style.left = Math.max(d.left, Math.round(left)) + "px";
    win.style.top = Math.max(d.top, Math.round(top)) + "px";
  }

  function init(win) {
    const firstInit = !win._am;
    if (firstInit) placeWindow(win);
    win._am = { history: ["profile"], index: 0 };
    if (firstInit) {
      const actions = { back, forward, up };
      win.querySelectorAll("[data-am-nav]").forEach((b) =>
        b.addEventListener("click", () => actions[b.dataset.amNav](win))
      );
      win
        .querySelector('[data-am-action="projects"]')
        .addEventListener("click", () => navigate(win, "projects"));
      win
        .querySelector('[data-am-action="resume"]')
        .addEventListener("click", () => openWindow("Resume"));
    }
    renderSidebar(win);
    renderProfile(win);
    render(win);

  }

  window.AboutMe = { init, show, back, forward, up };
})();

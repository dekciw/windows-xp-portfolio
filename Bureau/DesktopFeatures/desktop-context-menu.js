// Контекстные меню в стиле Windows XP (правая кнопка мыши):
//  - пустое место рабочего стола: упорядочить значки, вставить, сброс, свернуть всё, CRT, полный экран;
//  - значок на рабочем столе: открыть, копировать, удалить (только ярлыки), закрепить;
//  - пункт меню «Пуск»: открыть, добавить на рабочий стол, копировать.
// «Копировать» кладёт ярлык во внутренний буфер, «Вставить» создаёт его на рабочем столе.
// Добавленные ярлыки живут до перезагрузки страницы (нигде не сохраняются).
(function () {
  "use strict";

  const CHECK_ICON = "/Assets/Images/Icons/tooltip-checkmark.png";
  // Раньше ярлыки сохранялись здесь - чистим, чтобы старые не всплывали.
  const LEGACY_STORAGE_KEY = "desktopShortcuts";
  // Какие функции может вызывать ярлык (берутся из ondblclick/onclick разметки).
  const ALLOWED_COMMANDS = ["openWindow", "openCalculator", "openRawWinamp", "launchWoW"];

  // «Упорядочить значки → По типу»: группы значков, внутри группы - по имени.
  const TYPE_ORDER = {
    "Мой компьютер": 0, "Корзина": 0,
    "Обо мне": 1, "Моё резюме": 1, "Мои проекты": 1, "Резюме": 1,
    "Internet Explorer": 2, "Интернет": 2, "Paint": 2, "Блокнот": 2, "Калькулятор": 2, "Winamp": 2,
    "Сапёр": 3, "Pinball": 3, "World of Warcraft": 3,
  };

  const SEP = { separator: true };

  // Звук удаления на рабочем столе, как в Windows XP при отправке в корзину.
  const recycleSound = new Audio("/Assets/Sounds/Windows XP Recycle.wav");
  recycleSound.preload = "auto";
  function playRecycleSound() {
    recycleSound.cloneNode().play().catch(() => {});
  }
  let menu = null;
  let iconsHidden = false;
  let clipboard = null; // скопированный ярлык

  // ---------- Ярлыки ----------

  function parseCommand(str) {
    const m = /^\s*(\w+)\(\s*(?:'([^']*)')?\s*\)\s*;?\s*$/.exec(str || "");
    if (!m || !ALLOWED_COMMANDS.includes(m[1])) return null;
    return { fn: m[1], arg: m[2] === undefined ? null : m[2] };
  }

  function sanitize(d) {
    if (!d || typeof d.label !== "string" || !d.label.trim()) return null;
    const icon = typeof d.icon === "string" && d.icon.startsWith("/") ? d.icon : "";
    const href = typeof d.href === "string" && /^https:\/\//.test(d.href) ? d.href : null;
    const cmd = d.cmd && ALLOWED_COMMANDS.includes(d.cmd.fn)
      ? { fn: d.cmd.fn, arg: typeof d.cmd.arg === "string" ? d.cmd.arg : null }
      : null;
    if (!href && !cmd) return null;
    return { label: d.label.trim(), icon, href, cmd };
  }

  const targetKey = (d) => (d.href ? `href:${d.href}` : `cmd:${d.cmd.fn}:${d.cmd.arg || ""}`);

  function fromDesktopIcon(el) {
    if (el._shortcut) return el._shortcut;
    return sanitize({
      label: el.querySelector("span")?.textContent || "",
      icon: el.querySelector("img")?.getAttribute("src") || "",
      cmd: parseCommand(el.getAttribute("ondblclick")),
    });
  }

  function fromStartItem(el) {
    let cmd = parseCommand(el.getAttribute("onclick"));
    if (!cmd && el.dataset.openWindow) cmd = { fn: "openWindow", arg: el.dataset.openWindow };
    const href = el.tagName === "A" ? el.getAttribute("href") : null;
    return sanitize({
      label: el.querySelector(".MenuItemTxt")?.textContent || "",
      icon: el.querySelector(".MenuItemImg")?.getAttribute("src") || "",
      cmd,
      href,
    });
  }

  function run(d) {
    if (!d) return;
    if (d.href) {
      // Ссылка на сайт (закреплённый пункт «Пуска») - сначала диалог «Открыть ссылку».
      if (window.XPLinkConfirm) window.XPLinkConfirm.open(d.href, d.label || d.href);
      else window.open(d.href, "_blank", "noopener,noreferrer");
      return;
    }
    const { fn, arg } = d.cmd;
    if (fn === "openWindow" && typeof bringWindowToFront === "function") bringWindowToFront(arg);
    else if (typeof window[fn] === "function") window[fn](arg === null ? undefined : arg);
  }

  const desktopEl = () => document.getElementById("desktop");
  const allIcons = () => (window.DesktopIcons ? window.DesktopIcons.list() : []);
  const iconName = (icon) => (icon.querySelector("span")?.textContent || "").trim();
  const isShortcut = (icon) => !!icon._shortcut;

  function uniqueLabel(label) {
    const names = new Set(allIcons().map(iconName));
    if (!names.has(label)) return label;
    let n = 2;
    while (names.has(`${label} (${n})`)) n++;
    return `${label} (${n})`;
  }

  function createShortcut(d, clientX, clientY) {
    if (!window.DesktopIcons) return null;
    const el = document.createElement("div");
    el.className = "icon icon--shortcut";
    el._shortcut = d;
    el.dataset.shortcut = targetKey(d);
    const img = document.createElement("img");
    img.src = d.icon;
    img.alt = d.label;
    const span = document.createElement("span");
    span.textContent = d.label;
    el.append(img, span);
    el.addEventListener("dblclick", () => run(d));
    window.DesktopIcons.add(el, clientX, clientY);
    return el;
  }

  // Выделение - через общий механизм (Selection.js), чтобы щелчок по пустому месту и рамка
  // снимали его как обычно; без него - напрямую классом.
  function selectOnly(icon) {
    if (window.desktopSelection) return window.desktopSelection.selectOnly(icon);
    document.querySelectorAll("#desktop .icon.selected").forEach((i) => {
      if (i !== icon) i.classList.remove("selected");
    });
    if (icon) icon.classList.add("selected");
  }

  function addToDesktop(d) {
    const existing = allIcons().find((i) => {
      const di = fromDesktopIcon(i);
      return di && targetKey(di) === targetKey(d);
    });
    if (existing) {
      selectOnly(existing);
      return existing;
    }
    const el = createShortcut({ ...d, label: uniqueLabel(d.label) });
    return el;
  }

  function paste(clientX, clientY) {
    if (!clipboard) return null;
    const el = createShortcut({ ...clipboard, label: uniqueLabel(clipboard.label) }, clientX, clientY);
    return el;
  }

  // ---------- Действия ----------

  const byName = (a, b) => iconName(a).localeCompare(iconName(b), "ru");
  const appWindows = () => Array.from(document.querySelectorAll('.window[id^="window-"]'));

  function setIconsHidden(hidden) {
    iconsHidden = hidden;
    const desktop = desktopEl();
    if (desktop) desktop.classList.toggle("desktop--icons-hidden", hidden);
  }

  const actions = {
    arrangeByName() {
      window.DesktopIcons?.arrange(byName);
    },
    arrangeByType() {
      window.DesktopIcons?.arrange((a, b) => {
        const ta = TYPE_ORDER[iconName(a)] ?? 9;
        const tb = TYPE_ORDER[iconName(b)] ?? 9;
        return ta - tb || byName(a, b);
      });
    },
    toggleIcons() {
      setIconsHidden(!iconsHidden);
    },
    // Закрыть все окна, убрать добавленные ярлыки, вернуть значки на исходные места.
    resetDesktop() {
      appWindows().forEach((w) => {
        if (typeof closeWindow === "function") closeWindow(w.id.slice("window-".length));
        else w.remove();
      });
      setIconsHidden(false);
      selectOnly(null);
      window.DesktopIcons?.reset();
    },
    // Свернуть все окна: «Обо мне», «Мой компьютер», «Мои проекты» и т. д.
    // Вернуть окно можно кнопкой на панели задач.
    showDesktop() {
      const highlight = () => typeof updateTaskbarHighlight === "function" && updateTaskbarHighlight();
      const anim = window.XPWindowMinimize;
      let first = true;
      appWindows().forEach((w) => {
        if (anim) anim.settle(w);
        if (w.style.display === "none") return;
        w.classList.add("window-inactive");
        if (!anim) {
          w.style.display = "none";
          return;
        }
        // Каждое окно улетает в свою кнопку панели задач; звук «Minimize» - один на всех.
        const button = document.getElementById("taskbar-" + w.id.slice("window-".length));
        anim.minimize(w, button, { sound: first, onHidden: highlight });
        first = false;
      });
      highlight();
    },
    refresh() {
      window.location.reload();
    },
    toggleCrt() {
      window.CRTEffect?.toggle();
    },
    toggleFullscreen() {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      else document.documentElement.requestFullscreen?.().catch(() => {});
    },
  };

  // ---------- Наборы пунктов ----------

  function desktopItems(x, y) {
    return [
      {
        label: "Упорядочить значки",
        submenu: [
          { label: "По имени", id: "arrangeByName", run: actions.arrangeByName },
          { label: "По типу", id: "arrangeByType", run: actions.arrangeByType },
          SEP,
          { label: "Отображать значки рабочего стола", id: "toggleIcons", run: actions.toggleIcons, checked: !iconsHidden },
        ],
      },
      SEP,
      { label: "Вставить", id: "paste", disabled: !clipboard, run: () => paste(x, y) },
      SEP,
      { label: "Сбросить рабочий стол", id: "resetDesktop", run: actions.resetDesktop },
      { label: "Показать рабочий стол", id: "showDesktop", run: actions.showDesktop },
      SEP,
      { label: "Обновить страницу", id: "refresh", run: actions.refresh },
      {
        label: "CRT-эффект",
        id: "toggleCrt",
        run: actions.toggleCrt,
        checked: !!window.CRTEffect?.isEnabled(),
        disabled: !window.CRTEffect,
      },
      { label: "Полный экран", id: "toggleFullscreen", run: actions.toggleFullscreen, checked: !!document.fullscreenElement },
    ];
  }

  function iconItems(icon) {
    const d = fromDesktopIcon(icon);
    const locked = icon.dataset.locked === "true";
    return [
      { label: "Открыть", id: "open", disabled: !d, run: () => run(d) },
      SEP,
      { label: "Копировать", id: "copy", disabled: !d, run: () => (clipboard = d) },
      {
        label: "Удалить",
        id: "delete",
        disabled: !isShortcut(icon),
        run: () => {
          window.DesktopIcons.remove(icon);
          playRecycleSound();
        },
      },
      SEP,
      {
        label: "Закрепить",
        id: "lock",
        checked: locked,
        run: () => {
          if (locked) delete icon.dataset.locked;
          else icon.dataset.locked = "true";
        },
      },
    ];
  }

  function startItems(item) {
    const d = fromStartItem(item);
    const closeStart = () => document.getElementById("StartMenu")?.remove();
    return [
      { label: "Открыть", id: "open", run: () => { closeStart(); run(d); } },
      SEP,
      { label: "Добавить на рабочий стол", id: "addToDesktop", run: () => { closeStart(); addToDesktop(d); } },
      { label: "Копировать", id: "copy", run: () => (clipboard = d) },
    ];
  }

  // ---------- Отрисовка меню ----------

  // ---------- Системное меню окна (правый щелчок по заголовку или кнопке на панели задач) ----------

  const appWindow = (app) => document.getElementById(`window-${app}`);
  const isMinimized = (w) => w.style.display === "none";
  const isMaximized = (w) => w.dataset.maximized === "true";
  // У Калькулятора и Сапёра кнопка «Развернуть» отключена (Bureau.js) - и пункт тоже.
  const canMaximize = (w) => {
    const b = w.querySelector(".window-header-buttons .header-button:not(.header-button--minimize):not(.header-button--close)");
    return !!b && !b.disabled;
  };

  // Свёрнутое окно - вернуть (со звуком и анимацией) и поднять наверх.
  function restoreFromTaskbar(app) {
    if (typeof bringWindowToFront === "function") bringWindowToFront(app);
  }

  const windowActions = {
    restore(app) {
      const w = appWindow(app);
      if (!w) return;
      if (isMinimized(w)) restoreFromTaskbar(app);
      else if (isMaximized(w)) maximazeWindow(app);
    },
    minimize(app) {
      const w = appWindow(app);
      if (!w || isMinimized(w)) return;
      // toggleWindow сворачивает только активное верхнее окно (иначе поднимает его), а щелчок
      // по пункту меню делает окна неактивными - сначала делаем окно активным и верхним.
      restoreFromTaskbar(app);
      toggleWindow(app);
    },
    maximize(app) {
      const w = appWindow(app);
      if (!w) return;
      if (isMinimized(w)) restoreFromTaskbar(app);
      if (!isMaximized(w)) maximazeWindow(app);
    },
    close(app) {
      closeWindow(app);
    },
  };

  function windowItems(app) {
    const w = appWindow(app);
    const min = isMinimized(w);
    const max = isMaximized(w);
    return [
      { label: "Восстановить", id: "restore", disabled: !min && !max, run: () => windowActions.restore(app) },
      { label: "Свернуть", id: "minimize", disabled: min, run: () => windowActions.minimize(app) },
      { label: "Развернуть", id: "maximize", disabled: !canMaximize(w) || (max && !min), run: () => windowActions.maximize(app) },
      SEP,
      { label: "Закрыть", id: "close", run: () => windowActions.close(app) },
    ];
  }

  function buildList(list, isSub) {
    const el = document.createElement("div");
    el.className = "dcm" + (isSub ? " dcm--sub" : "");
    // Колонка под галочки - только если в этом меню есть отмеченный пункт (иначе слева пусто).
    if (!list.some((i) => i.checked)) el.classList.add("dcm--no-checks");
    el.setAttribute("role", "menu");
    list.forEach((item) => {
      if (item.separator) {
        const sep = document.createElement("div");
        sep.className = "dcm-sep";
        sep.setAttribute("role", "separator");
        el.appendChild(sep);
        return;
      }
      const row = document.createElement("div");
      row.className = "dcm-item";
      row.setAttribute("role", "menuitem");
      row._item = item;
      if (item.disabled) {
        row.classList.add("dcm-item--disabled");
        row.setAttribute("aria-disabled", "true");
      }
      if (item.checked !== undefined) {
        row.setAttribute("role", "menuitemcheckbox");
        row.setAttribute("aria-checked", String(!!item.checked));
      }
      if (item.id) row.dataset.action = item.id;

      const icon = document.createElement("span");
      icon.className = "dcm-icon";
      if (item.checked) {
        const img = document.createElement("img");
        img.src = CHECK_ICON;
        img.alt = "";
        img.className = "dcm-check";
        icon.appendChild(img);
      }
      const label = document.createElement("span");
      label.className = "dcm-label";
      label.textContent = item.label;
      const arrow = document.createElement("span");
      arrow.className = "dcm-arrow";
      row.append(icon, label, arrow);

      if (item.submenu) {
        row.classList.add("dcm-item--parent");
        row.setAttribute("aria-haspopup", "menu");
        row.appendChild(buildList(item.submenu, true));
      }
      el.appendChild(row);
    });
    return el;
  }

  function clampInto(el, x, y) {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.max(0, Math.min(x, vw - r.width - 2))}px`;
    el.style.top = `${Math.max(0, Math.min(y, vh - r.height - 2))}px`;
  }

  function openSub(row) {
    if (!menu) return;
    menu.querySelectorAll(".dcm-item--open").forEach((r) => {
      if (r !== row) r.classList.remove("dcm-item--open");
    });
    if (!row.classList.contains("dcm-item--parent")) return;
    row.classList.add("dcm-item--open");
    const sub = row.querySelector(".dcm--sub");
    const rr = row.getBoundingClientRect();
    const sr = sub.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    // Справа, а если не помещается - слева от пункта.
    const x = rr.right + sr.width - 2 <= vw ? rr.right - 2 : rr.left - sr.width + 2;
    clampInto(sub, x, rr.top - 3);
  }

  function close() {
    if (menu) menu.remove();
    menu = null;
  }

  function show(list, x, y, kind) {
    close();
    menu = buildList(list, false);
    menu.classList.add("dcm--root");
    menu.dataset.kind = kind;
    document.body.appendChild(menu);
    clampInto(menu, x, y);

    menu.addEventListener("mouseover", (e) => {
      const row = e.target.closest(".dcm-item");
      if (row && row.parentElement === menu) openSub(row);
    });
    menu.addEventListener("click", (e) => {
      const row = e.target.closest(".dcm-item");
      if (!row || row.classList.contains("dcm-item--disabled")) return;
      if (row.classList.contains("dcm-item--parent")) {
        openSub(row);
        return;
      }
      const item = row._item;
      close();
      if (item && item.run) item.run();
    });
    menu.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // ---------- Где какое меню ----------

  document.addEventListener("contextmenu", (e) => {
    const t = e.target;
    if (!(t instanceof Element) || t.closest(".dcm")) return;

    const startItem = t.closest("#StartMenu .ItemMenu");
    if (startItem) {
      e.preventDefault();
      // Только пункты, которые что-то открывают.
      if (fromStartItem(startItem)) show(startItems(startItem), e.clientX, e.clientY, "start");
      else close();
      return;
    }

    // Заголовок окна или его кнопка на панели задач - системное меню окна.
    const header = t.closest(".window > .window-header, .window > .window-header-background");
    const taskItem = t.closest("#taskbar .taskbar-item");
    const winEl = header ? header.parentElement : null;
    const app = winEl && winEl.id.startsWith("window-")
      ? winEl.id.slice("window-".length)
      : taskItem && taskItem.id.startsWith("taskbar-")
        ? taskItem.id.slice("taskbar-".length)
        : null;
    if (app && appWindow(app)) {
      e.preventDefault();
      // Щелчок по заголовку видимого окна делает его активным, как в XP.
      if (header && !isMinimized(appWindow(app)) && typeof bringWindowToFront === "function") bringWindowToFront(app);
      show(windowItems(app), e.clientX, e.clientY, "window");
      return;
    }

    const icon = t.closest("#desktop .icon");
    if (icon) {
      e.preventDefault();
      selectOnly(icon);
      show(iconItems(icon), e.clientX, e.clientY, "icon");
      return;
    }

    if (!t.closest("#main-content")) return;
    if (t.closest(".window, #webamp, #StartMenu, .footer_original, .footer, #taskbar")) return;
    e.preventDefault();
    show(desktopItems(e.clientX, e.clientY), e.clientX, e.clientY, "desktop");
  });

  document.addEventListener("mousedown", (e) => {
    if (menu && !menu.contains(e.target)) close();
  }, true);
  document.addEventListener("keydown", (e) => {
    if (menu && e.key === "Escape") close();
  });
  window.addEventListener("resize", close);
  window.addEventListener("blur", close);

  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    /* хранилище недоступно - и так ничего не сохранено */
  }

  window.DesktopContextMenu = {
    close,
    actions,
    windowActions,
    getClipboard: () => clipboard,
  };
})();

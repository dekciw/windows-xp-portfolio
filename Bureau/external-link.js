// Переход на другой сайт - только после подтверждения, как в Windows XP:
// диалог «Открыть ссылку» со звуком «Windows XP Exclamation»; «Открыть в новой вкладке»
// открывает сайт, «Отмена» / крестик / Esc - нет.
// Ловит щелчки по всем ссылкам на чужие сайты на странице («Открыть сайт» в «Моих проектах»,
// соцсети в «Пуске», «Обо мне», «Моём компьютере», окне GitHub...). Для переходов из кода -
// XPLinkConfirm.open(url, name).
(function () {
  const sound = new Audio("/Assets/Sounds/Windows XP Exclamation.wav");
  sound.preload = "auto";

  let current = null; // открытый диалог: { root, close }

  // Ссылка на другой сайт (http/https, чужой адрес) - её и подтверждаем.
  function externalUrl(a) {
    const raw = a.getAttribute("href");
    if (!raw) return null;
    let url;
    try {
      url = new URL(raw, location.href);
    } catch (e) {
      return null;
    }
    if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) return null;
    return url.href;
  }

  // Как назвать ссылку в вопросе: data-link-name, подпись, alt картинки или адрес сайта.
  function linkName(a, url) {
    const text = (a.textContent || "").replace(/\s+/g, " ").trim();
    const img = a.querySelector("img[alt]");
    return (
      a.dataset.linkName ||
      a.getAttribute("aria-label") ||
      text ||
      (img && img.alt) ||
      new URL(url).hostname.replace(/^www\./, "")
    );
  }

  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function open(url, name) {
    if (current) current.close();
    const copy = sound.cloneNode();
    copy.play().catch(() => {});

    // Подложка ловит щелчки мимо диалога (как модальное окно в XP).
    const root = el("div", "xp-link-overlay");
    const dlg = el("div", "xp-link-dialog");
    dlg.setAttribute("role", "alertdialog");
    dlg.setAttribute("aria-modal", "true");

    // Шапка - те же классы, что у окон (Open_Window.css): синий градиент и красный крестик.
    const headerBg = el("div", "window-header-background");
    const header = el("header", "window-header xp-link-dialog__header");
    const title = el("div", "window-header-title", "Открыть ссылку");
    title.id = "xp-link-dialog-title";
    const buttons = el("div", "window-header-buttons");
    const closeBtn = el("button", "header-button header-button--close");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Закрыть");
    buttons.appendChild(closeBtn);
    header.append(title, buttons);
    dlg.setAttribute("aria-labelledby", title.id);

    const body = el("div", "xp-link-dialog__body");
    const text = el("p", "xp-link-dialog__text", `Вы уверены, что хотите открыть «${name}»?`);
    const row = el("div", "xp-link-dialog__buttons");
    const cancel = el("button", "xp-button xp-link-dialog__cancel", "Отмена");
    const ok = el("button", "xp-button xp-link-dialog__ok", "Открыть в новой вкладке");
    cancel.type = ok.type = "button";
    row.append(cancel, ok);
    body.append(text, row);

    dlg.append(headerBg, header, body);
    root.appendChild(dlg);
    document.body.appendChild(root);

    const previousFocus = document.activeElement;
    function close() {
      document.removeEventListener("keydown", onKey, true);
      root.remove();
      if (current && current.root === root) current = null;
      if (previousFocus && previousFocus.focus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    }
    function go() {
      close();
      window.open(url, "_blank", "noopener,noreferrer");
    }
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === "Tab") {
        // Фокус не уходит из диалога: Отмена ↔ Открыть.
        e.preventDefault();
        (document.activeElement === ok ? cancel : ok).focus();
      }
    }

    ok.addEventListener("click", go);
    cancel.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", onKey, true);
    // Щелчок мимо диалога - ничего не делает, но и не проходит к окнам под ним.
    root.addEventListener("mousedown", (e) => {
      if (!dlg.contains(e.target)) e.preventDefault();
    });

    ok.focus(); // кнопка по умолчанию - Enter открывает сайт
    current = { root, close };
  }

  // Все щелчки по ссылкам на чужие сайты - через диалог. preventDefault без stopPropagation:
  // остальные обработчики (например, закрытие меню «Пуск») срабатывают как обычно.
  function intercept(e) {
    if (e.defaultPrevented) return;
    if (e.type === "auxclick" && e.button !== 1) return; // колесо мыши - тоже переход
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.closest(".xp-link-dialog")) return;
    const url = externalUrl(a);
    if (!url) return;
    e.preventDefault();
    open(url, linkName(a, url));
  }
  document.addEventListener("click", intercept);
  document.addEventListener("auxclick", intercept);

  window.XPLinkConfirm = { open };
})();

// Окно «Моё резюме»: страницы резюме картинками (pages.json из npm run resume),
// режимы «по ширине» (fit) и «крупно» (large), перетаскивание в крупном режиме.
// Вызывается из openWindow() (Bureau/Bureau.js) после вставки Resume.html.
(function () {
  const MANIFEST = "/Assets/Images/Resume/pages.json";
  const DRAG_THRESHOLD = 4; // px: меньше — щелчок, больше — перетаскивание

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Размер под рабочий стол (не больше листа с полями) и положение по центру.
  const MAX_W = 600;
  const MAX_H = 720;
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

  function renderPages(viewer, manifest) {
    manifest.pages.forEach((p, i) => {
      const sheet = el("div", "rs-page");
      // натуральная ширина картинки: в large — как есть, в fit — не шире половины
      sheet.style.setProperty("--rs-w", p.width + "px");
      const img = el("img");
      img.src = p.src;
      img.width = p.width;
      img.height = p.height;
      img.alt = `Резюме, страница ${i + 1}`;
      img.draggable = false;
      if (i > 0) img.loading = "lazy";
      sheet.appendChild(img);
      viewer.appendChild(sheet);
    });
  }

  function renderError(viewer) {
    viewer.replaceChildren(el("div", "rs-error", "Не удалось загрузить резюме"));
  }

  // anchor = { page, clientX, clientY }: точка страницы под курсором остаётся под курсором.
  // Без anchor — сохраняется вертикальная позиция, по горизонтали — середина.
  function setZoom(win, mode, anchor) {
    const viewer = win.querySelector(".rs-viewer");
    if (!viewer || (mode !== "fit" && mode !== "large")) return;
    if (!win._rs) win._rs = { zoom: "fit" };
    let fx, fy, fracY;
    if (anchor) {
      const r = anchor.page.getBoundingClientRect();
      fx = (anchor.clientX - r.left) / r.width;
      fy = (anchor.clientY - r.top) / r.height;
    } else {
      fracY = viewer.scrollHeight ? viewer.scrollTop / viewer.scrollHeight : 0;
    }
    win._rs.zoom = mode;
    viewer.dataset.zoom = mode;
    if (anchor) {
      const r = anchor.page.getBoundingClientRect();
      viewer.scrollLeft += r.left + fx * r.width - anchor.clientX;
      viewer.scrollTop += r.top + fy * r.height - anchor.clientY;
    } else {
      viewer.scrollTop = fracY * viewer.scrollHeight;
      viewer.scrollLeft = (viewer.scrollWidth - viewer.clientWidth) / 2;
    }
  }

  // Щелчок по странице переключает масштаб, перетаскивание в large прокручивает.
  function bindViewer(win, viewer) {
    viewer.addEventListener("mousedown", (e) => {
      const sheet = e.target.closest(".rs-page");
      if (e.button !== 0 || !sheet) return;
      e.preventDefault();
      const start = {
        x: e.clientX,
        y: e.clientY,
        left: viewer.scrollLeft,
        top: viewer.scrollTop,
      };
      let moved = false;
      const onMove = (m) => {
        const dx = m.clientX - start.x;
        const dy = m.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        moved = true;
        if (win._rs.zoom !== "large") return;
        viewer.classList.add("rs-dragging");
        viewer.scrollLeft = start.left - dx;
        viewer.scrollTop = start.top - dy;
      };
      const onUp = (u) => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        viewer.classList.remove("rs-dragging");
        if (moved) return;
        const next = win._rs.zoom === "fit" ? "large" : "fit";
        setZoom(win, next, { page: sheet, clientX: u.clientX, clientY: u.clientY });
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function init(win) {
    win._rs = { zoom: "fit" };
    placeWindow(win);
    const root = win.querySelector(".rs-root");
    const viewer = win.querySelector(".rs-viewer");
    viewer.dataset.zoom = "fit";

    // «Справка» неактивна: щелчок и наведение не доходят до общего обработчика меню
    // в Bureau.js (он запросил бы несуществующий Tooltip/Help.html).
    ["click", "mouseenter"].forEach((type) =>
      root.addEventListener(
        type,
        (e) => {
          if (e.target.closest && e.target.closest(".rs-disabled")) e.stopPropagation();
        },
        true
      )
    );

    win
      .querySelector('[data-rs-action="zoom"]')
      .addEventListener("click", () => setZoom(win, win._rs.zoom === "fit" ? "large" : "fit"));

    // Пункты меню «Вид» вставляются Bureau.js в окно при каждом открытии меню.
    win.addEventListener("click", (e) => {
      const item = e.target.closest("[data-rs-zoom]");
      if (item) setZoom(win, item.dataset.rsZoom);
    });

    bindViewer(win, viewer);

    fetch(MANIFEST, { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`${MANIFEST}: ${r.status}`);
        return r.json();
      })
      .then((m) => {
        if (!m || !Array.isArray(m.pages) || m.pages.length === 0) throw new Error("пустой pages.json");
        renderPages(viewer, m);
      })
      .catch(() => renderError(viewer));
  }

  window.ResumeWindow = { init, setZoom };
})();

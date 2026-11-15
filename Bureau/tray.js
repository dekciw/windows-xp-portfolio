// Трей панели задач как в Windows XP:
//  - видны только три значка, остальные спрятаны за стрелкой «‹»; щелчок по стрелке
//    плавно выдвигает их левее неё, стрелка поворачивается в «›», повторный щелчок прячет;
//  - подсказки в стиле XP для значков с атрибутом data-xp-tip (кремовый фон, чёрная рамка).
(function () {
  const SLIDE_MS = 250;
  const TIP_DELAY = 400; // как в XP: подсказка не сразу, а когда мышь задержалась
  const TIP_GAP = 6; // зазор между подсказкой и значком, px
  const TIP_SHOW = "Показать скрытые значки";
  const TIP_HIDE = "Скрыть";
  const IMG_LEFT = "/Assets/Images/Tray/chevron-left.png";
  const IMG_RIGHT = "/Assets/Images/Tray/chevron-right.png";
  new Image().src = IMG_RIGHT; // заранее, чтобы при первом щелчке картинка сменилась без мигания

  // ---------- скрытые значки ----------

  function setExpanded(open) {
    const chevron = document.getElementById("tray-chevron");
    const box = document.getElementById("tray-hidden");
    if (!chevron || !box) return;
    const inner = box.firstElementChild;
    const from = box.getBoundingClientRect().width;
    const to = open ? inner.scrollWidth : 0;

    chevron.setAttribute("aria-expanded", String(open));
    chevron.dataset.xpTip = open ? TIP_HIDE : TIP_SHOW;
    // «‹» - есть скрытые значки, «›» - спрятать их (картинки из макета Figma).
    chevron.querySelector(".tray-chevron__img").src = open ? IMG_RIGHT : IMG_LEFT;
    box.setAttribute("aria-hidden", String(!open));
    box.classList.toggle("tray-hidden--open", open);
    box.style.width = to + "px";

    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && from !== to) {
      box.animate([{ width: from + "px" }, { width: to + "px" }], { duration: SLIDE_MS, easing: "ease-out" });
    }
  }

  function toggle() {
    const chevron = document.getElementById("tray-chevron");
    setExpanded(chevron.getAttribute("aria-expanded") !== "true");
  }

  // ---------- подсказки ----------

  let tip = null;
  let tipFor = null;
  let timer = null;

  function showTip(el) {
    hideTip();
    tip = document.createElement("div");
    tip.className = "xp-tray-tip";
    tip.textContent = el.dataset.xpTip;
    document.body.appendChild(tip);
    tipFor = el;
    // Над значком, по центру, но не за краем экрана.
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const left = Math.min(Math.max(4, r.left + r.width / 2 - w / 2), innerWidth - w - 4);
    tip.style.left = left + "px";
    tip.style.top = r.top - tip.offsetHeight - TIP_GAP + "px";
  }

  function hideTip() {
    clearTimeout(timer);
    timer = null;
    if (tip) tip.remove();
    tip = null;
    tipFor = null;
  }

  function init() {
    const footer = document.getElementById("Desktop_Footer");
    if (!footer) return;

    footer.addEventListener("mouseover", (e) => {
      const el = e.target.closest("[data-xp-tip]");
      // Переход между частями того же значка (например, внутри SVG стрелки) - не сбрасываем.
      if (!el || el.contains(e.relatedTarget)) return;
      hideTip();
      timer = setTimeout(() => showTip(el), TIP_DELAY);
    });
    footer.addEventListener("mouseout", (e) => {
      const el = e.target.closest("[data-xp-tip]");
      if (el && !el.contains(e.relatedTarget)) hideTip();
    });
    footer.addEventListener("click", (e) => {
      if (e.target.closest("[data-xp-tip]")) hideTip();
    });

    const chevron = document.getElementById("tray-chevron");
    if (chevron) chevron.addEventListener("click", toggle);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.XPTray = { setExpanded, toggle };
})();

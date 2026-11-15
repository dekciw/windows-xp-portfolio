// Сворачивание и разворачивание окон как в Windows XP: окно сжимается и «улетает»
// в свою кнопку на панели задач (звук «Windows XP Minimize»), а при разворачивании
// вылетает из неё обратно на своё место (звук «Windows XP Restore»).
// Используют toggleWindow / bringWindowToFront (Bureau.js), «Свернуть все окна»
// (desktop-context-menu.js) и Winamp.
(function () {
  const MINIMIZE_MS = 250;
  const RESTORE_MS = 250;
  // Сворачивание разгоняется к кнопке, разворачивание тормозит у своего места.
  const EASE_IN = "cubic-bezier(0.55, 0, 0.85, 0.35)";
  const EASE_OUT = "cubic-bezier(0.15, 0.65, 0.45, 1)";

  const sounds = {
    minimize: new Audio("/Assets/Sounds/Windows XP Minimize.wav"),
    restore: new Audio("/Assets/Sounds/Windows XP Restore.wav"),
  };
  Object.values(sounds).forEach((a) => (a.preload = "auto"));

  // Копия звука - чтобы быстрые повторные клики не обрывали предыдущий.
  function playSound(name) {
    const a = sounds[name].cloneNode();
    a.play().catch(() => {});
  }

  function animationsOff() {
    if (window.__noWindowAnimation) return true; // выключатель для тестов
    return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  // Трансформация, которая кладёт окно (его текущий прямоугольник) на кнопку панели задач.
  function toButton(win, button) {
    if (!button) return null;
    const w = win.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    if (!w.width || !w.height || !b.width) return null;
    return `translate(${b.left - w.left}px, ${b.top - w.top}px) scale(${b.width / w.width}, ${b.height / w.height})`;
  }

  // Довести незаконченную анимацию до конца сразу (повторный клик во время анимации).
  function settle(win) {
    const run = win && win._xpMinRun;
    if (!run) return;
    win._xpMinRun = null;
    run.animation.cancel();
    run.done();
  }

  function animate(win, keyframes, duration, easing, done) {
    win.style.pointerEvents = "none";
    const animation = win.animate(keyframes, { duration, easing });
    const run = {
      animation,
      done: () => {
        win.style.pointerEvents = "";
        done();
      },
    };
    win._xpMinRun = run;
    animation.onfinish = () => {
      if (win._xpMinRun !== run) return;
      win._xpMinRun = null;
      run.done();
    };
  }

  // Свернуть: звук, полёт в кнопку, затем display: none. onHidden - когда окно скрыто.
  function minimize(win, button, { sound = true, onHidden } = {}) {
    settle(win);
    if (sound) playSound("minimize");
    const hide = () => {
      delete win.dataset.minimizing;
      win.style.display = "none";
      if (onHidden) onHidden();
    };
    const to = !animationsOff() && toButton(win, button);
    if (!to) return hide();
    // Пока летит в кнопку - уже не активное окно (updateTaskbarHighlight его пропускает).
    win.dataset.minimizing = "1";
    animate(
      win,
      [
        { transformOrigin: "0 0", transform: "none", opacity: 1 },
        { transformOrigin: "0 0", transform: to, opacity: 0.4 },
      ],
      MINIMIZE_MS,
      EASE_IN,
      hide
    );
  }

  // Развернуть: окно снова видно и вылетает из кнопки на своё место.
  function restore(win, button, { sound = true, display = "" } = {}) {
    settle(win);
    if (sound) playSound("restore");
    if (display) win.style.display = display;
    else win.style.removeProperty("display");
    const from = !animationsOff() && toButton(win, button);
    if (!from) return;
    animate(
      win,
      [
        { transformOrigin: "0 0", transform: from, opacity: 0.4 },
        { transformOrigin: "0 0", transform: "none", opacity: 1 },
      ],
      RESTORE_MS,
      EASE_OUT,
      () => {}
    );
  }

  window.XPWindowMinimize = { minimize, restore, settle, playSound };
})();

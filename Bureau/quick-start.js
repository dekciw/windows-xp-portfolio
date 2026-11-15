// Значок «Quick Start» в трее (стена с глобусом): по щелчку открываются «Обо мне»,
// «Мои проекты», «Моё резюме» и GitHub. Подсказку при наведении рисует tray.js (data-xp-tip).
(function () {
  // Порядок открытия; последнее окно оказывается сверху.
  const APPS = ["About Me", "Resume", "GitHub", "My Projects"];

  function openAll() {
    let soundPlayed = false; // звук открытия - один на все окна, а не четыре наложением
    let restoreSoundPlayed = false;
    for (const app of APPS) {
      let win = document.getElementById(`window-${app}`);
      if (!win) {
        openWindow(app, { silent: soundPlayed });
        soundPlayed = true;
        win = document.getElementById(`window-${app}`);
        if (!win) continue;
      } else {
        window.XPWindowMinimize.settle(win);
        if (win.style.display === "none") {
          window.XPWindowMinimize.restore(win, document.getElementById(`taskbar-${app}`), {
            sound: !restoreSoundPlayed,
          });
          restoreSoundPlayed = true;
        }
      }
      win.classList.remove("window-inactive");
      zIndexCounter++;
      win.style.zIndex = zIndexCounter;
    }
    updateTaskbarHighlight();
  }

  function init() {
    const icon = document.getElementById("quick-start-toggle");
    if (icon) icon.addEventListener("click", openAll);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.QuickStart = { openAll };
})();

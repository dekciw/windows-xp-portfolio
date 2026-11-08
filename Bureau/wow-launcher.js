// World of Warcraft: запускается как настоящая полноэкранная игра.
// Двойной клик → песочные часы → чёрный экран → экран входа WoW на весь монитор.
// Выход: кнопка Quit / Esc внутри игры (вызывают closeWoW) или выход из полноэкранного режима.

const WOW_LAUNCH_DELAY_MS = 1000;
const WOW_FADE_MS = 400;
const WOW_SRC = "/WoW/index.html";

// "idle" | "launching" | "open" | "closing"
let wowState = "idle";
let wowTimer = null;
let wowRequestedFullscreen = false;

function launchWoW() {
  if (wowState !== "idle") return;
  wowState = "launching";

  // requestFullscreen разрешён только прямо в ответ на действие пользователя — вызываем сразу.
  wowRequestedFullscreen = false;
  const root = document.documentElement;
  if (typeof root.requestFullscreen === "function") {
    wowRequestedFullscreen = true;
    try {
      Promise.resolve(root.requestFullscreen()).catch(() => {
        wowRequestedFullscreen = false;
      });
    } catch {
      wowRequestedFullscreen = false;
    }
  }

  document.body.classList.add("wow-launching");
  wowTimer = setTimeout(openWoWOverlay, WOW_LAUNCH_DELAY_MS);
}

function openWoWOverlay() {
  wowTimer = null;
  wowState = "open";

  const overlay = document.createElement("div");
  overlay.id = "wow-overlay";
  const frame = document.createElement("iframe");
  frame.id = "wow-frame";
  frame.title = "World of Warcraft";
  frame.setAttribute("allow", "autoplay; fullscreen");
  frame.setAttribute("src", WOW_SRC);
  frame.addEventListener("load", () => {
    overlay.classList.add("wow-visible");
    frame.focus(); // Esc внутри игры работает и без полноэкранного режима
  });
  overlay.appendChild(frame);
  document.body.appendChild(overlay);
  document.body.classList.remove("wow-launching");
}

function closeWoW() {
  if (wowState === "idle" || wowState === "closing") return;
  clearTimeout(wowTimer);
  wowTimer = null;
  document.body.classList.remove("wow-launching");

  if (wowRequestedFullscreen && document.fullscreenElement && typeof document.exitFullscreen === "function") {
    Promise.resolve(document.exitFullscreen()).catch(() => {});
  }
  wowRequestedFullscreen = false;

  const overlay = document.getElementById("wow-overlay");
  if (!overlay) {
    wowState = "idle";
    return;
  }
  // Затемнение, затем удаление iframe — вместе с ним останавливаются видео и музыка.
  wowState = "closing";
  overlay.classList.remove("wow-visible");
  setTimeout(() => {
    overlay.remove();
    wowState = "idle";
  }, WOW_FADE_MS);
}

// Esc на рабочем столе (пока iframe не получил фокус или полноэкранный режим недоступен):
// отменяет запуск или закрывает игру.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && (wowState === "launching" || wowState === "open")) closeWoW();
});

// Пользователь сам вышел из полноэкранного режима (Esc) — игра закрывается, как настоящая.
document.addEventListener("fullscreenchange", () => {
  if (!wowRequestedFullscreen || document.fullscreenElement) return;
  if (wowState === "launching" || wowState === "open") closeWoW();
});

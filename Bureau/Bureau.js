let startMenuHTML = "";
let openWindowHTML = "";
let openLogOffHTML = "";
let turnOffComputerHTML = "";

let zIndexCounter = 1;
const savedZ = localStorage.getItem("zIndexCounter");
if (savedZ !== null) {
  zIndexCounter = parseInt(savedZ, 10);
}

let isResizingGlobal = false;

let currentTooltipContainer = null;
let currentLabel = null;

let recentlyClosedStartMenu = false;

let hoverTooltipMouseEnterHandler = null;
let hoverTooltipMouseLeaveHandler = null;

// Маппинг английских названий приложений на русские для отображения
const appDisplayNames = {
  "My Computer": "Мой компьютер",
  "About Me": "Обо мне",
  "Resume": "Моё резюме",
  "My Projects": "Мои проекты",
  "GitHub": "GitHub",
  "Recycle Bin (empty)": "Корзина",
  "Recycle Bin (full)": "Корзина (полная)",
  "Internet Explorer": "Internet Explorer",
  "Notepad": "Блокнот",
  "Paint": "Paint",
  "Minesweeper": "Сапёр",
  "Calculator": "Калькулятор",
};

async function loadHTML(filePath) {
  const res = await fetch(filePath);
  if (!res.ok) throw new Error(`Loading error : ${filePath}`);
  return await res.text();
}

loadHTML("/Start_Menu/Base/Start_Menu.html").then(
  (html) => (startMenuHTML = html)
);
loadHTML("/Open_Windows/Base/Open_Window.html").then(
  (html) => (openWindowHTML = html)
);
loadHTML("/Start_Menu/Log_Off/Base/Log_Off.html").then(
  (html) => (openLogOffHTML = html)
);
loadHTML("/Start_Menu/Turn_Off_Computer/Turn_Off_Computer.html").then(
  (html) => (turnOffComputerHTML = html)
);

function playSoundOnPage(path, defaultSoundPath, onLoadCallback) {
  if (window.location.pathname.endsWith(path)) {
    window.addEventListener("load", function () {
      let soundPath = defaultSoundPath;

      if (
        path === "/Bureau/Bureau.html" &&
        localStorage.getItem("fromSwitchUser") === "1"
      ) {
        soundPath = "/Assets/Sounds/Resume_Users.mp3";
        localStorage.removeItem("fromSwitchUser");
      }

      const guestUser = document.getElementById("guest-user");
      if (guestUser && guestUser.querySelector("#loaded")) {
        soundPath = "/Assets/Sounds/Resume_Users.mp3";
      }

      const audio = new Audio(soundPath);
      audio.play().catch((error) => console.error("Audio error:", error));
      if (typeof onLoadCallback === "function") {
        onLoadCallback();
      }
    });
  }
}

playSoundOnPage(
  "/Bureau/Bureau.html",
  "/Assets/Sounds/windows-xp-startup.mp3",
  function () {
    // После загрузки рабочего стола сразу показываем окно GitHub поверх остальных
    // (размер и положение по центру задаёт GitHubWindow.init).
    // Без звука открытия: в этот момент уже звучит мелодия запуска Windows.
    openWindow("GitHub", { silent: true });
    const gh = document.getElementById("window-GitHub");
    if (gh) {
      zIndexCounter++;
      gh.style.zIndex = zIndexCounter;
      updateTaskbarHighlight("GitHub", true);
    }
  }
);

playSoundOnPage(
  "/Start_Menu/Log_Off/Transition/Switch_User.html",
  "/Assets/Sounds/Switch_Users.mp3"
);

// Предзагрузка звука навигации
const navigationSound = new Audio("/Assets/Sounds/Windows Navigation Start.wav");
navigationSound.volume = 1.0;
navigationSound.preload = "auto";

// Функция воспроизведения звука при открытии окна
function playNavigationSound() {
  // Клонируем звук для мгновенного воспроизведения
  const soundClone = navigationSound.cloneNode();
  soundClone.volume = 1.0;
  soundClone.play().catch((error) => console.error("Navigation sound error:", error));
}

document.addEventListener("DOMContentLoaded", () => {
  updateTaskbarVisibility();

  function updateClock() {
    // Как в России: 24 часа без AM/PM - 09:04, 18:53, 23:59.
    let now = new Date().toLocaleTimeString("ru-RU", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    document.getElementById("footer-time").textContent = now;
  }

  updateClock();
  setInterval(updateClock, 52000);

  const startBtn = document.getElementById("start-button");
  startBtn.addEventListener("mouseenter", () => {
    startBtn.src = "/Assets/Images/Buttons/start-button-hover.png";
  });

  startBtn.addEventListener("mouseleave", () => {
    startBtn.src = "/Assets/Images/Buttons/start-button-normal.png";
  });

  startBtn.addEventListener("mousedown", () => {
    startBtn.src = "/Assets/Images/Buttons/start-button-click.png";
  });

  startBtn.addEventListener("mouseup", () => {
    const isHovering = startBtn.matches(":hover");
    startBtn.src = isHovering
      ? "/Assets/Images/Buttons/start-button-hover.png"
      : "/Assets/Images/Buttons/start-button-normal.png";
  });
});

document.addEventListener("click", function (event) {
  const menu = document.getElementById("StartMenu");
  const startMenuBtn = document.querySelector(".footer__start_menu");

  if (
    menu &&
    !menu.contains(event.target) &&
    !startMenuBtn.contains(event.target)
  ) {
    menu.remove();
  }
});

// options.silent — открыть без звука (автооткрытие при загрузке, восстановление окон).
// options.restore — окно восстанавливается после перезагрузки: позицию не менять (см. scatterWindow).
function openWindow(appName, options = {}) {
  let windowTooltipContainer = null;
  let windowCurrentLabel = null;

  createTaskbar();
  injectStyle("bureau-styles", "/Open_Windows/Base/Open_Window.css");
  injectStyle("taskbar-styles", "/Bureau/Taskbar/Taskbar.css");
  injectStyle(`window-${appName}`, `/Open_Windows/${appName}/${appName}.css`);

  let taskbar = document.getElementById("taskbar");

  if (document.getElementById(`window-${appName}`)) return;

  // Звук открытия — для любого нового окна (уже открытое выше не звучит повторно).
  if (!options.silent) {
    playNavigationSound();
  }

  let windowElement = document.createElement("div");
  windowElement.id = `window-${appName}`;
  windowElement.classList.add("window");

  // Используем русское название для отображения, если оно есть
  const displayName = appDisplayNames[appName] || appName;
  let personalizedHTML = openWindowHTML.replace(/\$\{appName\}/g, displayName);
  // Восстанавливаем английское название для путей к файлам (иконка и обработчики)
  personalizedHTML = personalizedHTML.replace(
    new RegExp(`Icons/${displayName}\\.png`, 'g'),
    `Icons/${appName}.png`
  );
  personalizedHTML = personalizedHTML.replace(
    new RegExp(`toggleWindow\\('${displayName}'\\)`, 'g'),
    `toggleWindow('${appName}')`
  );
  personalizedHTML = personalizedHTML.replace(
    new RegExp(`maximazeWindow\\('${displayName}'\\)`, 'g'),
    `maximazeWindow('${appName}')`
  );
  personalizedHTML = personalizedHTML.replace(
    new RegExp(`closeWindow\\('${displayName}'\\)`, 'g'),
    `closeWindow('${appName}')`
  );
  windowElement.innerHTML = personalizedHTML;

  if (appName === "Minesweeper" || appName === "Calculator") {
    const maximazeButton = windowElement.querySelector(
      ".header-button--maximaze"
    );
    if (maximazeButton) {
      maximazeButton.removeAttribute("onclick");
      maximazeButton.disabled = true;
      maximazeButton.style.opacity = "0.5";
      maximazeButton.style.pointerEvents = "none";
      windowElement.style.width = "auto";
      windowElement.style.height = "auto";
    }
  } else {
    makeResizable(windowElement);
    const header = windowElement.querySelector(".window-header");
    if (header) {
      header.setAttribute("ondblclick", `maximazeWindow('${appName}')`);
    }
  }

  if (appName === "Space Cadet Pinball") {
    // Cache la fenêtre au départ
    windowElement.style.visibility = "hidden";
    windowElement.style.opacity = "0";
  } else {
    // Окно невидимо, пока не пришли его HTML и стили и оно не встало на своё место:
    // иначе на долю секунды мелькает пустая синяя рамка, которая потом прыгает (revealWindow).
    windowElement.style.visibility = "hidden";
  }

  fetch(`/Open_Windows/${appName}/${appName}.html`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Fichier introuvable");
      }
      return response.text();
    })
    .then((htmlContent) => {
      const contentContainer = windowElement.querySelector(".window-content");
      if (contentContainer) {
        contentContainer.innerHTML = htmlContent;
      } else {
        windowElement.innerHTML = htmlContent;
      }

      if (appName === "GitHub" && window.GitHubWindow) {
        window.GitHubWindow.init(windowElement);
      }
      if (appName === "About Me" && window.AboutMe) {
        window.AboutMe.init(windowElement);
      }
      if (appName === "Resume" && window.ResumeWindow) window.ResumeWindow.init(windowElement);
      if (appName === "My Projects" && window.MyProjects) window.MyProjects.init(windowElement);
      if (appName === "Calculator" && window.XPCalculator) window.XPCalculator.init(windowElement);
      // Новое окно - на своё место, а не поверх предыдущих (восстановленные окна не трогаем).
      if (!options.restore) scatterWindow(windowElement);
      revealWindow(appName, windowElement);

      const labelDivs = windowElement.querySelectorAll(
        ".drop_down_label, .Minesweeper_drop_down_label"
      );

      // Маппинг русских названий меню на английские имена файлов
      const menuFileMapping = {
        "Файл": "File",
        "Правка": "Edit",
        "Вид": "View",
        "Избранное": "Favorites",
        "Сервис": "Tools",
        "Справка": "Help",
        "Формат": "Format",
      };

      labelDivs.forEach((labelDiv) => {
        labelDiv.addEventListener("click", function () {
          if (windowTooltipContainer && windowTooltipContainer.parentNode) {
            windowTooltipContainer.removeAttribute("data-tooltip-initialized");
            windowTooltipContainer.parentNode.removeChild(
              windowTooltipContainer
            );
            windowTooltipContainer = null;
          }
          windowCurrentLabel = labelDiv;

          const fileName = labelDiv.textContent.trim();
          const fileToFetch = menuFileMapping[fileName] || fileName;
          fetch(`/Open_Windows/${appName}/Tooltip/${fileToFetch}.html`)
            .then((response) => response.text())
            .then((htmlContent) => {
              const container = document.createElement("div");
              container.className = "window-tooltip";
              container.innerHTML = htmlContent;
              observeMinesweeperTooltipLoad();
              observeSecondaryTooltipRows(appName);
              labelDiv.parentNode.insertBefore(container, labelDiv.nextSibling);
              windowTooltipContainer = container;

              const closeDivs = container.querySelectorAll(".drop-down__text");
              closeDivs.forEach((div) => {
                const txt = div.textContent.trim().toLowerCase();
                if (txt === "close" || txt === "exit" || txt === "закрыть") {
                  div.setAttribute("onclick", `closeWindow('${appName}')`);
                }
              });
            })
            .catch((err) => {
              console.error("Erreur de chargement du fichier HTML:", err);
            });
        });

        labelDiv.addEventListener("mouseenter", function () {
          if (!windowTooltipContainer) return;
          if (windowCurrentLabel === labelDiv) return;

          if (windowTooltipContainer && windowTooltipContainer.parentNode) {
            windowTooltipContainer.removeAttribute("data-tooltip-initialized");
            windowTooltipContainer.parentNode.removeChild(
              windowTooltipContainer
            );
            windowTooltipContainer = null;
          }
          windowCurrentLabel = labelDiv;

          const fileName = labelDiv.textContent.trim();
          const fileToFetch = menuFileMapping[fileName] || fileName;
          fetch(`/Open_Windows/${appName}/Tooltip/${fileToFetch}.html`)
            .then((response) => response.text())
            .then((htmlContent) => {
              const container = document.createElement("div");
              container.className = "window-tooltip";
              container.innerHTML = htmlContent;
              observeMinesweeperTooltipLoad();
              observeSecondaryTooltipRows(appName);
              labelDiv.parentNode.insertBefore(container, labelDiv.nextSibling);
              windowTooltipContainer = container;

              const closeDivs = container.querySelectorAll(".drop-down__text");
              closeDivs.forEach((div) => {
                const txt = div.textContent.trim().toLowerCase();
                if (txt === "close" || txt === "exit" || txt === "закрыть") {
                  div.setAttribute("onclick", `closeWindow('${appName}')`);
                }
              });
            })
            .catch((err) => {
              console.error("Erreur de chargement du fichier HTML:", err);
            });
        });
      });

      windowElement.addEventListener("mousedown", function (event) {
        const isOnLabel = Array.from(labelDivs).some((label) =>
          label.contains(event.target)
        );
        const isOnTooltip =
          windowTooltipContainer &&
          windowTooltipContainer.contains(event.target);

        if (!isOnLabel && !isOnTooltip && windowTooltipContainer) {
          if (windowTooltipContainer && windowTooltipContainer.parentNode) {
            windowTooltipContainer.removeAttribute("data-tooltip-initialized");
            windowTooltipContainer.parentNode.removeChild(
              windowTooltipContainer
            );
            windowTooltipContainer = null;
            windowCurrentLabel = null;
          }
        }
      });
    })
    .catch((error) => {
      console.error("Erreur de chargement :", error);
      revealWindow(appName, windowElement);
    });

  document.body.appendChild(windowElement);
  windowElement.style.top = "115px";
  windowElement.style.left = "115px";
  // Новое окно открывается поверх уже открытых (как в Windows)
  zIndexCounter++;
  windowElement.style.zIndex = zIndexCounter;
  makeDraggable(windowElement);

  if (!document.getElementById(`taskbar-${appName}`)) {
    let taskbarItem = document.createElement("div");
    taskbarItem.id = `taskbar-${appName}`;
    taskbarItem.classList.add("taskbar-item");
    const displayName = appDisplayNames[appName] || appName;
    taskbarItem.innerHTML = `<img src="/Assets/Windows XP High Resolution Icon Pack avec MAOSX/Windows XP High Resolution Icon Pack/Windows XP Icons/${appName}.png" width="16"> <span>${displayName}</span>`;
    // Только левая кнопка: правая открывает меню окна (desktop-context-menu.js), как в XP.
    taskbarItem.onmousedown = (e) => {
      if (e && e.button !== 0) return;
      toggleWindow(appName);
    };
    taskbar.appendChild(taskbarItem);
  }

  window.addEventListener("mousedown", function (event) {
    const windowEl = windowElement;
    if (!windowEl) return;

    const isInWindow = windowEl.contains(event.target);
    const isInTooltip =
      windowTooltipContainer && windowTooltipContainer.contains(event.target);

    if (!isInWindow && !isInTooltip && windowTooltipContainer) {
      windowTooltipContainer.removeAttribute("data-tooltip-initialized");
      windowTooltipContainer.remove();
      windowTooltipContainer = null;
      windowCurrentLabel = null;
    }
  });
}

// Куда ставить новое окно. Первое - по центру рабочего стола, следующие - по «слотам»
// в разных частях свободного места (доли от запаса по ширине и высоте), пропуская
// занятые. Если места нет (окно почти во весь экран) - лесенкой от последнего окна.
const WINDOW_SLOTS = [
  [0.5, 0.5], [0.06, 0.06], [0.94, 0.18], [0.28, 0.78], [0.78, 0.92],
  [0.12, 0.45], [0.88, 0.58], [0.55, 0.08], [0.04, 0.94], [0.46, 0.96],
];
function scatterWindow(win) {
  const desk = document.getElementById("desktop");
  if (!desk || !win.isConnected) return;
  const d = desk.getBoundingClientRect();
  const w = win.offsetWidth;
  const h = win.offsetHeight;
  const roomX = Math.max(0, d.width - w);
  const roomY = Math.max(0, d.height - h);
  const others = Array.from(document.querySelectorAll(".window")).filter(
    (o) => o !== win && o.style.display !== "none" && o.dataset.maximized !== "true"
  );
  const pos = (o) => [parseFloat(o.style.left) || 0, parseFloat(o.style.top) || 0];
  const taken = (x, y) =>
    others.some((o) => {
      const [ox, oy] = pos(o);
      return Math.abs(ox - x) < 48 && Math.abs(oy - y) < 48;
    });

  let left = null;
  let top = null;
  const start = others.length % WINDOW_SLOTS.length;
  for (let i = 0; i < WINDOW_SLOTS.length; i++) {
    const [fx, fy] = WINDOW_SLOTS[(start + i) % WINDOW_SLOTS.length];
    const x = d.left + window.scrollX + Math.round(roomX * fx);
    const y = d.top + window.scrollY + Math.round(roomY * fy);
    if (!taken(x, y)) {
      left = x;
      top = y;
      break;
    }
  }
  if (left === null) {
    // Лесенка: на 30px правее и ниже самого верхнего окна, но заголовок остаётся на экране.
    const topWin = others.reduce((a, b) =>
      (parseInt(b.style.zIndex, 10) || 0) > (parseInt(a.style.zIndex, 10) || 0) ? b : a
    );
    const [tx, ty] = pos(topWin);
    left = tx + 30;
    top = ty + 30;
    if (left > d.right - 200) left = d.left + 10;
    if (top > d.bottom - 100) top = d.top + 10;
  }
  win.style.left = left + "px";
  win.style.top = top + "px";
}

function observeSecondaryTooltipRows(appName) {
  const windowElement = document.getElementById(`window-${appName}`);
  if (!windowElement) return;
  const observer = new MutationObserver(() => {
    const tooltipWindows = Array.from(
      windowElement.querySelectorAll(
        ".window-tooltip:not([data-tooltip-initialized])"
      )
    ).filter((el) => el.offsetParent !== null);

    if (tooltipWindows.length > 0) {
    } else {
    }

    tooltipWindows.forEach((tooltipWindow) => {
      tooltipWindow.setAttribute("data-tooltip-initialized", "true");

      const dropDownRows = tooltipWindow.querySelectorAll(".drop-down__row");
      let windowSecondTooltip = null;
      let windowSecondCurrentRow = null;

      dropDownRows.forEach((row) => {
        row.addEventListener("mouseenter", function () {
          const textDiv = row.querySelector(".drop-down__text");
          if (!textDiv) return;

          const fileName = textDiv.textContent.trim();
          if (windowSecondCurrentRow === row) return;

          if (windowSecondTooltip?.parentNode) {
            windowSecondTooltip.parentNode.removeChild(windowSecondTooltip);
            windowSecondTooltip = null;
          }

          windowSecondCurrentRow = row;

          const allowedTooltips = [
            "Encoding",
            "Explorer Bar",
            "Панель обозревателя",
            "Go to",
            "Переход к папке",
            "Mail and News",
            "New",
            "Send",
            "Text Size",
            "Toolbars",
            "Панели инструментов",
            "Arrange Icons by",
            "Упорядочить значки",
            "Links",
            "Ссылки",
            "Pop-up Blocker",
          ];

          // Маппинг русских названий на английские имена файлов
          const tooltipFileMapping = {
            "Панель обозревателя": "Explorer bar",
            "Переход к папке": "Go to",
            "Переход": "Go To",
            "Панели инструментов": "Toolbars",
            "Упорядочить значки": "Arrange Icons by",
            "Ссылки": "Links",
            "Кодировка": "Encoding",
            "Размер шрифта": "Text Size",
            "Почта и новости": "Mail and News",
            "Блокирование всплывающих окон": "Pop-up Blocker",
            "Создать": "New",
            "Отправить": "Send",
          };

          if (!allowedTooltips.includes(fileName)) return;

          if (allowedTooltips.includes(fileName)) {
            const fileToFetch = tooltipFileMapping[fileName] || fileName;
            fetch(`/Open_Windows/${appName}/Sub_Tooltip/${fileToFetch}.html`)
              .then((response) => {
                if (!response.ok) {
                  if (response.status === 404) return null;
                  throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.text();
              })
              .then((htmlContent) => {
                const container = document.createElement("div");
                container.className = "window-Sub_tooltip";
                container.innerHTML = htmlContent;

                const tooltipWindow = row.closest(".window-tooltip");
                if (!tooltipWindow) return;

                const reference = row.querySelector(".drop-down__text");
                const rect = reference.getBoundingClientRect();

                const referenceRect = reference.getBoundingClientRect();
                const parentRect = tooltipWindow.getBoundingClientRect();

                const offsetX = referenceRect.left - parentRect.left;
                const offsetY = referenceRect.bottom - parentRect.top + 5;

                container.style.position = "absolute";
                container.style.left = `${offsetX + 110}px`;
                container.style.top = `${offsetY - 5}px`;

                tooltipWindow.appendChild(container);
                windowSecondTooltip = container;
              })
              .catch(() => {});
          }
        });
      });
    });
  });

  observer.observe(windowElement, {
    childList: true,
    subtree: true,
  });
}

function updateCheckmarkInTooltip() {
  const selectedLevel = localStorage.getItem("SelectedLevel");
  if (!selectedLevel) return;

  const minesweeperMenu = document.querySelector(".Minesweeper_drop_down");
  if (!minesweeperMenu) return;

  const rows = minesweeperMenu.querySelectorAll(".drop-down__row");

  rows.forEach((row) => {
    const checkContainer = row.querySelector(".drop-down__check");
    const textContainer = row.querySelector(".drop-down__text");

    if (!checkContainer || !textContainer) return;

    checkContainer.innerHTML = "";

    const levelText = textContainer.textContent.trim().toLowerCase();
    const selectedText = selectedLevel.trim().toLowerCase();

    if (levelText === selectedText) {
      const img = document.createElement("img");
      img.src = "/Assets/Images/Icons/tooltip-checkmark.png";
      img.alt = "Check Mark";
      checkContainer.appendChild(img);
    }
  });
}

function observeMinesweeperTooltipLoad() {
  const observer = new MutationObserver(() => {
    const tooltip = document.querySelector(".Minesweeper_drop_down");
    if (tooltip) {
      updateCheckmarkInTooltip();
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function openRawWinamp() {
  if (document.getElementById("app") || document.getElementById("webamp")) {
    return;
  }
  const winampDiv = document.createElement("div");
  winampDiv.id = "app";
  winampDiv.style.position = "absolute";
  winampDiv.style.left = "0";
  winampDiv.style.top = "0";
  document.body.appendChild(winampDiv);

  const script = document.createElement("script");
  script.src = "https://unpkg.com/webamp@latest/built/webamp.bundle.min.js";
  script.onload = () => {
    if (typeof Webamp === "undefined") {
      console.error("Webamp is not loaded!");
      return;
    }
    const webamp = new Webamp({
      initialTracks: [
        {
          metaData: {
            artist: "Ленинград",
            title: "Мамба Хуямба",
          },
          url: "/Assets/Sounds/Ленинград - Мамба Хуямба.mp3",
        },
        {
          metaData: {
            artist: "Леонид Агутин & Отпетые мошенники",
            title: "Граница",
          },
          url: "/Assets/Sounds/Леонид Агутин & Отпетые мошенники - Граница.mp3",
        },
        {
          metaData: {
            artist: "Михаил Круг",
            title: "Владимирский централ",
          },
          url: "/Assets/Sounds/Михаил Круг - Владимирский централ.mp3",
        },
        {
          metaData: {
            artist: "Руки Вверх",
            title: "Крошка моя я по тебе скучаю",
          },
          url: "/Assets/Sounds/Руки Вверх - Крошка моя я по тебе скучаю.mp3",
        },
      ],
    });
    webamp.renderWhenReady(winampDiv).then(() => {
      const observer = new MutationObserver(() => {
        const webampDiv = document.getElementById("webamp");
        if (webampDiv) {
          observer.disconnect();

          const classObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.attributeName === "class") {
                if (webampDiv.classList.contains("window-inactive")) {
                  webampDiv.classList.remove("window-inactive");
                }
                const inactiveChildren =
                  webampDiv.querySelectorAll(".window-inactive");
                inactiveChildren.forEach((el) => {
                  el.classList.remove("window-inactive");
                  el.style.setProperty("background-color", "none", "important");
                });
                webampDiv.style.setProperty(
                  "background-color",
                  "",
                  "important"
                );
              }
            });
          });

          classObserver.observe(webampDiv, { attributes: true, subtree: true });

          zIndexCounter++;
          webampDiv.style.zIndex = zIndexCounter.toString();
          webampDiv.classList.add("window", "no-bg");

          updateTaskbarHighlight();

          const windowEl = document.querySelector("#webamp .window");

          const styleObserver = new MutationObserver(() => {
            windowEl.style.setProperty("width", "0", "important");
            windowEl.style.setProperty("height", "0", "important");
          });

          styleObserver.observe(windowEl, {
            attributes: true,
            attributeFilter: ["style"],
          });

          webampDiv.addEventListener("mousedown", () => {
            zIndexCounter++;
            webampDiv.style.zIndex = zIndexCounter.toString();
            updateTaskbarHighlight();
          });
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });

    webamp.onClose(() => {
      if (taskbarItem) taskbarItem.remove();
      if (winampDiv.parentNode) winampDiv.parentNode.removeChild(winampDiv);
      if (script.parentNode) script.parentNode.removeChild(script);
      const webampContainer = document.getElementById("webamp");
      if (webampContainer && webampContainer.parentNode) {
        webampContainer.parentNode.removeChild(webampContainer);
      }
    });

    setTimeout(() => {
      const closeBtn = document.getElementById("close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          if (winampDiv.parentNode) winampDiv.parentNode.removeChild(winampDiv);
          if (script.parentNode) script.parentNode.removeChild(script);
          const webampContainer = document.getElementById("webamp");
          if (webampContainer && webampContainer.parentNode) {
            webampContainer.parentNode.removeChild(webampContainer);
            updateTaskbarHighlight();
          }
        });
      }
    }, 1150);
  };

  setTimeout(() => {
    const minimizeBtn = document.querySelector("#webamp #minimize");
    if (minimizeBtn) {
      minimizeBtn.addEventListener("click", () => {
        const win = document.getElementById("webamp");
        if (win) {
          window.XPWindowMinimize.minimize(win, document.getElementById("taskbar-Winamp"), {
            onHidden: updateTaskbarHighlight,
          });
        }
        updateTaskbarHighlight();
      });
    }
  }, 1000);

  winampDiv.appendChild(script);

  let taskbarItem = document.getElementById("taskbar-Winamp");

  if (!document.getElementById(`taskbar-Winamp`)) {
    taskbarItem = document.createElement("div");
    taskbarItem.id = `taskbar-Winamp`;
    taskbarItem.classList.add("taskbar-item");
    taskbarItem.innerHTML = `<img src="/Assets/Images/Logos/winamp-logo.png" width="16"> <span>Winamp</span>`;
    taskbarItem.onmousedown = (e) => {
      if (e && e.button !== 0) return; // правая кнопка не сворачивает/разворачивает
      const winampWindow = document.getElementById("webamp");
      if (!winampWindow) return;

      window.XPWindowMinimize.settle(winampWindow);
      const winampZ = parseInt(winampWindow.style.zIndex || "0", 10);

      if (
        winampWindow.style.display === "none" ||
        getComputedStyle(winampWindow).display === "none"
      ) {
        zIndexCounter++;
        winampWindow.style.zIndex = zIndexCounter;
        window.XPWindowMinimize.restore(winampWindow, taskbarItem, { display: "block" });
        updateTaskbarHighlight();
      } else if (winampZ < zIndexCounter) {
        zIndexCounter++;
        winampWindow.style.zIndex = zIndexCounter;
        updateTaskbarHighlight();
      } else if (winampZ >= zIndexCounter) {
        window.XPWindowMinimize.minimize(winampWindow, taskbarItem, { onHidden: updateTaskbarHighlight });
        updateTaskbarHighlight();
      }
    };
    taskbar.appendChild(taskbarItem);
  }
}

function waitForGameToLoad() {
  console.log("waitForGameToLoad started");

  const iframe = document.getElementById("pinball-frame");
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  const observer = new MutationObserver(() => {
    checkGameReady();
  });

  const styleObserver = new MutationObserver(() => {
    checkGameReady();
  });

  function checkGameReady() {
    try {
      const canvas = iframeDoc.querySelector("canvas.emscripten#canvas");
      const statusElement = iframeDoc.querySelector("#status");

      console.log(
        `Canvas found: ${!!canvas}, Status element found: ${!!statusElement}`
      );

      if (canvas) {
        console.log(
          `Canvas display: ${canvas.style.display}, Width: ${canvas.width}, Height: ${canvas.height}`
        );
      }

      const isGameLoaded =
        statusElement &&
        (statusElement.innerHTML === "" ||
          statusElement.style.display === "none") &&
        canvas &&
        canvas.style.display !== "none" &&
        (canvas.width > 0 || canvas.clientWidth > 0);

      console.log(`Game loaded: ${isGameLoaded}`);

      if (isGameLoaded) {
        // Arrête les observers
        observer.disconnect();
        styleObserver.disconnect();

        const finalWidth = canvas.width || canvas.clientWidth || 600;
        const finalHeight = canvas.height || canvas.clientHeight || 440;

        console.log(`Final canvas dimensions: ${finalWidth}x${finalHeight}`);

        // Redimensionne la fenêtre
        applyCanvasDimensionsToWindow(finalWidth, finalHeight);
        resizeWindow(finalWidth, finalHeight);

        // Affiche la fenêtre après redimensionnement
        setTimeout(() => {
          showWindow();
          hideLoading();
        }, 100);

        return;
      }

      if (canvas && !canvas.dataset.observed) {
        canvas.dataset.observed = "true";
        styleObserver.observe(canvas, {
          attributes: true,
          attributeFilter: ["style", "width", "height"],
        });
      }
    } catch (e) {
      console.error("Error accessing iframe:", e);
      observer.disconnect();
      styleObserver.disconnect();

      // Utilise les dimensions par défaut et affiche la fenêtre
      applyCanvasDimensionsToWindow(600, 440);
      resizeWindow(600, 440);
      setTimeout(() => {
        showWindow();
        hideLoading();
      }, 100);
    }
  }

  // Démarre l'observation
  observer.observe(iframeDoc.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style"],
  });

  checkGameReady();

  // Fallback
  const fallbackTimeout = setTimeout(() => {
    observer.disconnect();
    styleObserver.disconnect();
    console.log("Fallback: using default dimensions");
    applyCanvasDimensionsToWindow(600, 440);
    resizeWindow(600, 440);
    showWindow();
    hideLoading();
  }, 30000);

  const originalDisconnect = observer.disconnect;
  observer.disconnect = function () {
    clearTimeout(fallbackTimeout);
    originalDisconnect.call(this);
  };
}

function showWindow() {
  const windowElement = window.parent.document.getElementById(
    "window-Space Cadet Pinball"
  );
  const iframe = document.getElementById("pinball-frame");

  if (windowElement) {
    windowElement.style.visibility = "visible";
    windowElement.style.opacity = "1";

    console.log("Window is now visible");
  }

  if (iframe) {
    iframe.style.visibility = "visible";
  }
}

function hideLoading() {
  const loading = document.getElementById("loading");
  if (loading) {
    loading.style.opacity = "0";
    setTimeout(() => {
      loading.style.display = "none";
    }, 300);
  }
}

function applyCanvasDimensionsToWindow(canvasWidth, canvasHeight) {
  const headerHeight = 30;
  const borderWidth = 3;
  const totalWidth = canvasWidth + borderWidth;
  const totalHeight = canvasHeight + headerHeight;

  // Supprime les styles existants
  const existingStyles = window.parent.document.querySelectorAll(
    "style[data-pinball-resize]"
  );
  existingStyles.forEach((style) => style.remove());

  // Applique le nouveau style
  const style = document.createElement("style");
  style.setAttribute("data-pinball-resize", "true");
  style.textContent = `
    #window-Space\\ Cadet\\ Pinball.window {
      width: ${totalWidth}px !important;
      height: ${totalHeight}px !important;
      min-width: ${totalWidth}px !important;
      min-height: ${totalHeight}px !important;
      max-width: ${totalWidth}px !important;
      max-height: ${totalHeight}px !important;
    }
    #window-Space\\ Cadet\\ Pinball {
      height: ${canvasHeight}px !important;
      overflow: hidden !important;
    }
  `;
  window.parent.document.head.appendChild(style);

  console.log(
    `Canvas dimensions applied to CSS: ${canvasWidth}x${canvasHeight} -> Window: ${totalWidth}x${totalHeight}`
  );

  // Application immédiate des styles inline (sans setTimeout)
  applyInlineStyles(canvasWidth, canvasHeight, totalWidth, totalHeight);
}

function applyInlineStyles(canvasWidth, canvasHeight, totalWidth, totalHeight) {
  const windowElement = window.parent.document.getElementById(
    "window-Space Cadet Pinball"
  );

  if (windowElement) {
    windowElement.style.setProperty("width", `${totalWidth}px`, "important");
    windowElement.style.setProperty("height", `${totalHeight}px`, "important");
    console.log(
      `Inline styles applied to window: ${totalWidth}x${totalHeight}`
    );
  }
}

function resizeWindow(canvasWidth, canvasHeight) {
  let windowElement = window.parent.document.getElementById(
    "window-Space Cadet Pinball"
  );

  if (!windowElement) {
    windowElement = window.parent.document.querySelector(
      '[data-app-name="Space Cadet Pinball"]'
    );
  }

  if (windowElement) {
    const headerHeight = 30;
    const borderWidth = 3;
    const totalWidth = canvasWidth + borderWidth;
    const totalHeight = canvasHeight + headerHeight;

    windowElement.style.width = totalWidth + "px";
    windowElement.style.height = totalHeight + "px";

    console.log(
      `Window resized to: ${totalWidth}x${totalHeight} (canvas: ${canvasWidth}x${canvasHeight})`
    );
  } else {
    console.warn("Could not find window elements");
  }
}

function openSimpleModal(
  id,
  htmlContent,
  cssHref = "/Start_Menu/Log_Off/Base/Log_Off.css"
) {
  injectStyle("Log_Off-styles", cssHref);

  const modalDiv = document.createElement("div");
  modalDiv.id = id;
  modalDiv.innerHTML = htmlContent;
  modalDiv.style.position = "fixed";
  modalDiv.style.zIndex = "99999";
  modalDiv.style.left = "0";
  modalDiv.style.top = "0";
  modalDiv.style.width = "100vw";
  modalDiv.style.height = "100vh";

  document.body.appendChild(modalDiv);

  Array.from(document.body.children).forEach((child) => {
    if (child.id !== id) {
      child.classList.add("modal-open");
    }
  });

  const closeBtn = modalDiv.querySelector(".footer__button");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      Array.from(document.body.children).forEach((child) => {
        child.classList.remove("modal-open");
      });
      document.body.classList.remove("modal-open");
      modalDiv.remove();
    });
  }
}

function openLogOff() {
  openSimpleModal("Log_Off", openLogOffHTML);
}

function turnOffComputer() {
  openSimpleModal("Turn_Off_Computer", turnOffComputerHTML);
}
window.turnOffComputer = turnOffComputer;

function switchUser() {
  injectStyle("Switch_User-styles", "/Loader_Login/Login_Screen.css");

  const windows = Array.from(document.querySelectorAll('[id^="window-"]'));
  const windowStates = windows.map((win) => ({
    appName: win.id.replace("window-", ""),
    left: win.style.left,
    top: win.style.top,
    width: win.style.width,
    height: win.style.height,
    display: win.style.display,
    zIndex: win.style.zIndex,
  }));

  localStorage.setItem("openWindows", JSON.stringify(windowStates));
  localStorage.setItem("zIndexCounter", zIndexCounter);
  window.location.href = "/Start_Menu/Log_Off/Transition/Switch_User.html";
}

function logOff() {
  let icones = document.getElementById("desktop");
  let taskbarHidden = document.getElementById("Desktop_Footer");
  let logOff = document.getElementById("Log_Off");

  let step = 0;
  const interval = setInterval(() => {
    switch (step) {
      case 0:
        Array.from(document.body.children).forEach((child) => {
          child.classList.remove("modal-open");
        });
        document.body.classList.remove("modal-open");
        break;
      case 1:
        if (logOff) logOff.style.display = "none";
        if (icones) icones.style.display = "none";
        break;
      case 2:
        if (taskbarHidden) taskbarHidden.style.display = "none";
        break;
      case 3:
        clearInterval(interval);
        window.location.href = "/Start_Menu/Log_Off/Transition/Login.html";
        return;
    }
    step++;
  }, 250);
}

function PowerState(event) {
  const icones = document.getElementById("desktop");
  const taskbarHidden = document.getElementById("Desktop_Footer");
  const turnOffComputer = document.getElementById("Turn_Off_Computer");

  const targetId = event?.target?.id;

  localStorage.setItem("powerAction", targetId);

  let step = 0;
  const interval = setInterval(() => {
    switch (step) {
      case 0:
        Array.from(document.body.children).forEach((child) =>
          child.classList.remove("modal-open")
        );
        document.body.classList.remove("modal-open");
        break;
      case 1:
        if (turnOffComputer) turnOffComputer.style.display = "none";
        if (icones) icones.style.display = "none";
        break;
      case 2:
        if (taskbarHidden) taskbarHidden.style.display = "none";
        break;
      case 3:
        clearInterval(interval);
        window.location.href =
          "/Start_Menu/Turn_Off_Computer/Shut_Down/Shut_Down.html";
        break;
    }
    step++;
  }, 250);
}

function closeWindow(appName) {
  let windowElement = document.getElementById(`window-${appName}`);
  let taskbarItem = document.getElementById(`taskbar-${appName}`);

  if (windowElement) windowElement.remove();
  if (taskbarItem) taskbarItem.remove();

  const styleLink = document.getElementById(`css-window-${appName}`);
  if (styleLink && styleLink.tagName === "LINK") styleLink.remove();

  updateTaskbarVisibility();
}

// Открывает окно, если его нет; иначе показывает (из свёрнутого), поднимает наверх и подсвечивает в панели задач.
function bringWindowToFront(appName) {
  openWindow(appName);
  const win = document.getElementById(`window-${appName}`);
  if (!win) return;
  window.XPWindowMinimize.settle(win);
  if (win.style.display === "none") {
    // Было свёрнуто - разворачиваем со звуком и анимацией из кнопки панели задач.
    window.XPWindowMinimize.restore(win, document.getElementById(`taskbar-${appName}`));
  }
  win.classList.remove("window-inactive");
  zIndexCounter++;
  win.style.zIndex = zIndexCounter;
  updateTaskbarHighlight(appName, true);
}

function toggleWindow(appName) {
  const windowElement = document.getElementById(`window-${appName}`);
  const taskbarItem = document.getElementById(`taskbar-${appName}`);

  if (!windowElement || !taskbarItem) return;

  // Клик во время анимации сворачивания/разворачивания - сначала доводим её до конца.
  window.XPWindowMinimize.settle(windowElement);

  const isHidden = windowElement.style.display === "none";
  const isInactive = windowElement.classList.contains("window-inactive");

  if (isInactive && !isHidden) {
    return;
  }

  const isOnTop = parseInt(windowElement.style.zIndex) === zIndexCounter;

  if (isHidden) {
    windowElement.classList.remove("window-inactive");
    zIndexCounter++;
    windowElement.style.zIndex = zIndexCounter;
    // Звук «Restore» и вылет окна из кнопки панели задач (Bureau/window-minimize.js).
    window.XPWindowMinimize.restore(windowElement, taskbarItem);

    updateTaskbarHighlight(appName, true);
  } else {
    if (isOnTop) {
      windowElement.classList.add("window-inactive");
      // Звук «Minimize» и полёт окна в кнопку панели задач; скрывается в конце анимации.
      window.XPWindowMinimize.minimize(windowElement, taskbarItem, {
        onHidden: () => updateTaskbarHighlight(appName, false),
      });

      updateTaskbarHighlight(appName, false);
    } else {
      zIndexCounter++;
      windowElement.style.zIndex = zIndexCounter;

      updateTaskbarHighlight(appName, true);
    }
  }
}

function maximazeWindow(appName) {
  const windowElement = document.getElementById(`window-${appName}`);
  const taskbarItem = document.getElementById(`taskbar-${appName}`);

  if (!windowElement || !taskbarItem) return;

  const footerHeight = 35;

  const maxWidth = document.documentElement.clientWidth;
  const maxHeight = document.documentElement.clientHeight - footerHeight;

  const isMaximized = windowElement.dataset.maximized === "true";

  const maximizeButton = windowElement.querySelector(
    ".header-button--maximaze, .header_button--maximized"
  );

  if (!isMaximized) {
    // Запоминаем размер как он задан (style), а не offsetWidth: тот включает рамку окна
    // (padding 3px), и после «Восстановить» окно росло на 6px при каждом развороте.
    windowElement.dataset.originalWidth = windowElement.style.width;
    windowElement.dataset.originalHeight = windowElement.style.height;
    windowElement.dataset.originalLeft = windowElement.style.left;
    windowElement.dataset.originalTop = windowElement.style.top;

    windowElement.style.left = "0px";
    windowElement.style.top = "0px";
    windowElement.style.width = `${maxWidth}px`;
    windowElement.style.height = `${maxHeight}px`;

    windowElement.dataset.maximized = "true";

    windowElement.style.zIndex = zIndexCounter;

    maximizeButton.classList.remove("header-button--maximaze");
    maximizeButton.classList.remove("header_button--maximaze");
    maximizeButton.classList.add("header-button--maximized");
    maximizeButton.classList.add("header_button--maximized");

    updateTaskbarHighlight(appName, true);
  } else {
    windowElement.style.width = windowElement.dataset.originalWidth || "";
    windowElement.style.height = windowElement.dataset.originalHeight || "";
    windowElement.style.left = windowElement.dataset.originalLeft;
    windowElement.style.top = windowElement.dataset.originalTop;

    windowElement.dataset.maximized = "false";

    windowElement.style.zIndex = zIndexCounter;

    maximizeButton.classList.remove("header-button--maximized");
    maximizeButton.classList.remove("header_button--maximized");
    maximizeButton.classList.add("header-button--maximaze");
    maximizeButton.classList.add("header_button--maximaze");

    updateTaskbarHighlight(appName, false);
  }
}

function makeDraggable(element) {
  let header = element.querySelector(".window-header");

  let offsetX = 0,
    offsetY = 0,
    isDragging = false;

  header.addEventListener("mousedown", (e) => {
    if (isResizingGlobal) return;

    isDragging = true;
    offsetX = e.clientX - element.offsetLeft;
    offsetY = e.clientY - element.offsetTop;

    element.style.zIndex = zIndexCounter;

    updateTaskbarHighlight();

    document.addEventListener("mousemove", moveWindow);
    document.addEventListener("mouseup", () => {
      isDragging = false;
      document.removeEventListener("mousemove", moveWindow);
    });
  });

  function moveWindow(e) {
    if (isDragging) {
      let newX = e.clientX - offsetX;
      let newY = e.clientY - offsetY;

      let screenWidth = window.innerWidth;
      let screenHeight = window.innerHeight;
      let windowWidth = element.offsetWidth;
      let windowHeight = element.offsetHeight;

      newX = Math.max(0, Math.min(screenWidth - windowWidth, newX));
      newY = Math.max(0, Math.min(screenHeight - windowHeight, newY));

      element.style.left = `${newX}px`;
      element.style.top = `${newY}px`;
    }
  }
  element.addEventListener("mousedown", () => {
    zIndexCounter++;
    element.style.zIndex = zIndexCounter;
    updateTaskbarHighlight();
  });
}

function makeResizable(windowElement) {
  const minWidth = 150;
  const minHeight = 115;
  let isResizing = false;
  let startX,
    startY,
    startWidth,
    startHeight,
    startTop,
    startLeft,
    resizeDir = "";
  let iframe;
  let frameW = 0,
    frameH = 0;
  // Зона захвата края: синяя рамка окна = 3px padding, берём с запасом.
  const borderSize = 4;

  // Какой край под курсором: "", "n", "s", "e", "w", "ne", "nw", "se", "sw".
  function edgeAt(e) {
    const rect = windowElement.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    let dir = "";
    if (y >= rect.top && y <= rect.top + borderSize) dir += "n";
    if (y >= rect.bottom - borderSize && y <= rect.bottom) dir += "s";
    if (x >= rect.right - borderSize && x <= rect.right) dir += "e";
    if (x >= rect.left && x <= rect.left + borderSize) dir += "w";
    return dir;
  }

  // Направление -> XP-курсор (см. data-xp-resize в Bureau.css).
  function cursorKind(dir) {
    if (dir === "ne" || dir === "sw") return "nesw";
    if (dir === "nw" || dir === "se") return "nwse";
    if (dir === "e" || dir === "w") return "ew";
    if (dir === "n" || dir === "s") return "ns";
    return "";
  }

  function setCursor(el, kind) {
    if (kind) el.dataset.xpResize = kind;
    else delete el.dataset.xpResize;
  }

  windowElement.addEventListener("mousedown", (e) => {
    if (windowElement.dataset.maximized === "true") return;
    const rect = windowElement.getBoundingClientRect();
    resizeDir = edgeAt(e);

    if (resizeDir !== "") {
      // Курсор держится на всей странице, пока тянем, даже если мышь ушла с рамки.
      setCursor(document.documentElement, cursorKind(resizeDir));
      isResizing = true;
      isResizingGlobal = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      startTop = rect.top;
      startLeft = rect.left;
      // style.width/height задают content-box, а rect - вместе с рамкой (padding).
      // Без поправки окно прыгало на 6px при каждом захвате края.
      const cs = getComputedStyle(windowElement);
      frameW = rect.width - parseFloat(cs.width);
      frameH = rect.height - parseFloat(cs.height);

      iframe = windowElement.querySelector("iframe");
      if (iframe) iframe.style.pointerEvents = "none";

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      e.preventDefault();
    }
  });

  windowElement.addEventListener("mousemove", (e) => {
    if (isResizing) return;
    const kind = windowElement.dataset.maximized === "true"
      ? ""
      : cursorKind(edgeAt(e));
    setCursor(windowElement, kind);
  });

  windowElement.addEventListener("mouseleave", () => {
    if (!isResizing) setCursor(windowElement, "");
  });

  function onMouseMove(e) {
    if (!isResizing) return;

    let dx = e.clientX - startX;
    let dy = e.clientY - startY;

    if (resizeDir.includes("e")) {
      let newWidth = startWidth + dx;
      if (newWidth < minWidth) {
        newWidth = minWidth;
      }
      windowElement.style.width = newWidth - frameW + "px";
    }

    if (resizeDir.includes("s")) {
      let newHeight = startHeight + dy;
      if (newHeight < minHeight) {
        newHeight = minHeight;
      }
      windowElement.style.height = newHeight - frameH + "px";
    }

    if (resizeDir.includes("w")) {
      let newWidth = startWidth - dx;
      let newLeft = startLeft + dx;

      if (newWidth < minWidth) {
        newLeft -= minWidth - newWidth;
        newWidth = minWidth;
      }

      windowElement.style.width = newWidth - frameW + "px";
      windowElement.style.left = newLeft + "px";
    }

    if (resizeDir.includes("n")) {
      let newHeight = startHeight - dy;
      let newTop = startTop + dy;

      if (newHeight < minHeight) {
        newTop -= minHeight - newHeight;
        newHeight = minHeight;
      }

      windowElement.style.height = newHeight - frameH + "px";
      windowElement.style.top = newTop + "px";
    }
  }

  function onMouseUp() {
    isResizing = false;
    isResizingGlobal = false;
    setCursor(document.documentElement, "");
    setCursor(windowElement, "");
    if (iframe) iframe.style.pointerEvents = "auto";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }
}

function updateTaskbarHighlight() {
  // Сворачиваемое окно (летит в кнопку, window-minimize.js) уже не считается открытым.
  const windows = Array.from(document.querySelectorAll(".window")).filter(
    (win) => win.style.display !== "none" && !win.dataset.minimizing
  );

  const webampDiv = document.getElementById("webamp");
  if (
    webampDiv &&
    webampDiv.style.display !== "none" &&
    !webampDiv.dataset.minimizing &&
    !windows.includes(webampDiv)
  ) {
    windows.push(webampDiv);
  }

  let topWindow = null;
  let maxZ = -1;
  windows.forEach((win) => {
    const z = parseInt(win.style.zIndex || 0, 10);
    if (z > maxZ) {
      maxZ = z;
      topWindow = win;
    }
  });

  document.querySelectorAll(".taskbar-item").forEach((item) => {
    item.style.backgroundColor = "";
    item.style.boxShadow = "";
  });

  windows.forEach((win) => {
    const isTop = win === topWindow;
    const headerBg =
      win.querySelector && win.querySelector(".window-header-background");
    const headerButtons =
      win.querySelector && win.querySelector(".window-header-buttons");

    if (isTop) {
      win.classList.remove("window-inactive");
      win.style.backgroundColor = "";
      if (headerBg) headerBg.style.background = "";
      if (headerButtons) headerButtons.style.opacity = "1";
    } else {
      win.classList.add("window-inactive");
      if (headerBg) {
        headerBg.style.background =
          "linear-gradient(rgb(118, 151, 231) 0%, rgb(126, 158, 227) 3%, rgb(148, 175, 232) 6%, rgb(151, 180, 233) 8%, rgb(130, 165, 228) 14%, rgb(124, 159, 226) 17%, rgb(121, 150, 222) 25%, rgb(123, 153, 225) 56%, rgb(130, 169, 233) 81%, rgb(128, 165, 231) 89%, rgb(123, 150, 225) 94%, rgb(122, 147, 223) 97%, rgb(171, 186, 227) 115%)";
      }
      if (headerButtons) headerButtons.style.opacity = "0.4";
    }
  });

  if (topWindow) {
    let topAppId;
    if (topWindow.id === "webamp") {
      topAppId = "Winamp";
    } else {
      topAppId = topWindow.id.replace("window-", "");
    }
    const taskbarItem = document.getElementById(`taskbar-${topAppId}`);
    if (taskbarItem) {
      taskbarItem.style.backgroundColor = "rgba(26, 80, 183, 1)";
      taskbarItem.style.boxShadow =
        "rgba(0, 0, 0, 0.2) 0px 0px 1px 1px inset, rgba(0, 0, 0, 0.7) 1px 0px 1px inset";
    }
  }

  if (!updateTaskbarHighlight._blurListenerAdded) {
    document.addEventListener("mousedown", (event) => {
      const windows = Array.from(document.querySelectorAll(".window")).filter(
        (win) => win.style.display !== "none"
      );
      const webampDiv = document.getElementById("webamp");
      if (
        webampDiv &&
        webampDiv.style.display !== "none" &&
        !windows.includes(webampDiv)
      ) {
        windows.push(webampDiv);
      }

      let clickedOnWindow = null;
      let clickedOnTaskbar = null;

      windows.forEach((win) => {
        let appId;
        if (win.id === "webamp") {
          appId = "Winamp";
        } else {
          appId = win.id.replace("window-", "");
        }
        const taskbarItem = document.getElementById(`taskbar-${appId}`);
        if (win.contains(event.target)) {
          clickedOnWindow = win;
        }
        if (taskbarItem && taskbarItem.contains(event.target)) {
          clickedOnTaskbar = win;
        }
      });

      if (!clickedOnWindow && !clickedOnTaskbar) {
        windows.forEach((win) => {
          win.classList.add("window-inactive");
          const headerBg =
            win.querySelector && win.querySelector(".window-header-background");
          const headerButtons =
            win.querySelector && win.querySelector(".window-header-buttons");
          if (headerBg) {
            headerBg.style.background =
              "linear-gradient(rgb(118, 151, 231) 0%, rgb(126, 158, 227) 3%, rgb(148, 175, 232) 6%, rgb(151, 180, 233) 8%, rgb(130, 165, 228) 14%, rgb(124, 159, 226) 17%, rgb(121, 150, 222) 25%, rgb(123, 153, 225) 56%, rgb(130, 169, 233) 81%, rgb(128, 165, 231) 89%, rgb(123, 150, 225) 94%, rgb(122, 147, 223) 97%, rgb(171, 186, 227) 115%)";
          }
          if (headerButtons) headerButtons.style.opacity = "0.4";
        });
        document.querySelectorAll(".taskbar-item").forEach((item) => {
          item.style.backgroundColor = "";
          item.style.boxShadow = "";
        });
      } else {
        const win = clickedOnWindow || clickedOnTaskbar;
        if (win && win.classList.contains("window-inactive")) {
          win.classList.remove("window-inactive");
          zIndexCounter++;
          win.style.zIndex = zIndexCounter;
          updateTaskbarHighlight();
        }
      }
    });
    updateTaskbarHighlight._blurListenerAdded = true;
  }
}

function createTaskbar() {
  if (!document.getElementById("taskbar")) {
    let taskbar = document.createElement("div");
    taskbar.id = "taskbar";

    let start_menu = document.querySelector(".footer__start_menu");

    start_menu.insertAdjacentElement("afterend", taskbar);
  }
}

function updateTaskbarVisibility() {
  let taskbar = document.getElementById("taskbar");
  if (taskbar && taskbar.children.length === 0) {
    taskbar.remove();
  }
}

function openStartMenu() {
  if (recentlyClosedStartMenu) return;
  injectStyle("StartMenu-styles", "/Start_Menu/Base/Start_Menu.css");

  if (!startMenuHTML) return;

  const container = document.querySelector(".footer__start_menu");
  if (!container) return;

  const existingMenu = container.querySelector("#StartMenu");
  if (existingMenu) {
    existingMenu.remove();
    recentlyClosedStartMenu = true;
    setTimeout(() => {
      recentlyClosedStartMenu = false;
    }, 115);
    return;
  }

  const StartMenu = document.createElement("div");
  StartMenu.id = "StartMenu";
  StartMenu.innerHTML = startMenuHTML;

  setTimeout(() => {
    container.appendChild(StartMenu);
    // Видео из innerHTML (собрано вне документа) не стартует по autoplay — запускаем явно.
    StartMenu.querySelectorAll("video[autoplay]").forEach((v) => v.play().catch(() => {}));
    attachHoverTooltip();

    document.addEventListener("mousedown", handleOutsideClick);
  }, 10);

  function handleOutsideClick(e) {
    setTimeout(() => {
      const startMenu = document.getElementById("StartMenu");
      if (startMenu && !startMenu.contains(e.target)) {
        startMenu.remove();
        document.removeEventListener("mousedown", handleOutsideClick);

        recentlyClosedStartMenu = true;
        setTimeout(() => {
          recentlyClosedStartMenu = false;
        }, 115);
      }
    }, 0);
  }
}

function attachHoverTooltip() {
  injectStyle(
    "hover-info-styles",
    "/Start_Menu/All_Programs/Tooltip/tooltip.css"
  );
  let tooltipHierarchy = [];

  const menu =
    document.querySelector(".AllProgMenu") ||
    document.querySelector(".ItemMenu");

  if (!menu) return;

  const createTooltip = (content, parent) => {
    let level = 0;

    const tooltip = document.createElement("div");
    tooltip.className = "hover-info";
    tooltip.innerHTML = content;

    const infoitm = parent.closest(".hover-infoitm");
    const tooltipParent = parent.closest(".hover-info");

    if (infoitm && tooltipParent) {
      const rectInfoitm = infoitm.getBoundingClientRect();
      const rectTooltip = tooltipParent.getBoundingClientRect();

      const ecart = rectTooltip.bottom - rectInfoitm.bottom;

      //console.log("Écart (info - itm) :", ecart);
    }

    const rect = parent.getBoundingClientRect();
    console.log("Parent Rect:", rect);

    tooltip.style.visibility = "hidden";
    tooltip.style.position = "absolute";
    document.body.appendChild(tooltip);

    const parentTooltip = parent.closest(".hover-info");
    const specificTooltip = parent.closest(".hover-infotxt");

    if (parentTooltip && parentTooltip.dataset.level) {
      level = parseInt(parentTooltip.dataset.level, 10) + 1;
    }

    tooltip.dataset.level = level.toString();

    let tooltipName = "";
    const infotxt = parent.querySelector(".hover-infotxt");
    if (infotxt) {
      tooltipName = infotxt.textContent.trim();
    }

    if (level === 0) {
      tooltip.style.visibility = "";
      tooltip.style.left = `${rect.right}px`;
      tooltip.style.top = `${405 - rect.height}px`;
    } else if (tooltipName === "Accessories" || tooltipName === "Стандартные") {
      tooltip.style.visibility = "";
      tooltip.style.left = `${rect.right - 112}px`;
      tooltip.style.top = `${rect.height - 30}px`;
    } else if (tooltipName === "Games" || tooltipName === "Игры") {
      tooltip.style.visibility = "";
      tooltip.style.left = `${rect.right - 112}px`;
      tooltip.style.top = `${rect.height - 22}px`;
    } else if (tooltipName === "Startup" || tooltipName === "Автозагрузка") {
      tooltip.style.visibility = "";
      tooltip.style.left = `${rect.right - 112}px`;
      tooltip.style.top = `${rect.height - 3}px`;
    } else if (tooltipName === "Accessibility" || tooltipName === "Специальные возможности") {
      tooltip.style.visibility = "";
      tooltip.style.left = `${rect.right - 329}px`;
      tooltip.style.top = `${rect.height + 90}px`;
    } else if (tooltipName === "Communication" || tooltipName === "Связь") {
      tooltip.style.visibility = "";
      tooltip.style.left = `${rect.right - 329}px`;
      tooltip.style.top = `${rect.height + 90}px`;
    } else if (tooltipName === "Entertainement" || tooltipName === "Развлечения") {
      tooltip.style.visibility = "";
      tooltip.style.left = `${rect.right - 329}px`;
      tooltip.style.top = `${rect.height + 44}px`;
    } else if (tooltipName === "System Tools" || tooltipName === "Служебные") {
      tooltip.style.visibility = "";
      tooltip.style.left = `${rect.right - 329}px`;
      tooltip.style.top = `${rect.height + 182}px`;
    }

    const itemMenu = parent.closest(".ItemMenu");
    if (itemMenu && itemMenu.id === "Connect To") {
      tooltip.style.left = `${rect.right + 48}px`;
      tooltip.style.top = `${rect.height + 256}px`;
    }

    tooltip.style.zIndex = 9999;

    if (parent.classList.contains("AllProgTxt")) {
      parent.appendChild(tooltip);
    } else if (parent.classList.contains("hover-infotxt")) {
      parent.appendChild(tooltip);
    } else if (specificTooltip) {
      specificTooltip.appendChild(tooltip);
    } else {
      parent.appendChild(tooltip);
    }
    return tooltip;
  };

  const closeAllTooltips = () => {
    tooltipHierarchy.forEach((t) => t.remove());
    tooltipHierarchy = [];
  };

  const isMouseOverAnyTooltip = () => {
    return (
      tooltipHierarchy.some((t) => t.matches(":hover")) ||
      menu.matches(":hover") ||
      document.querySelector(".ItemMenu:hover") ||
      document.querySelector(".hover-infoitm:hover") ||
      document.querySelector(".hover-infotxt:hover")
    );
  };
  const scheduleTooltipClose = () => {
    if (!isMouseOverAnyTooltip()) {
      closeAllTooltips();
    }
  };

  const handleMouseEnter = async (e) => {
    const target = e.target.closest(".AllProgMenu, .ItemMenu, .hover-infoitm");
    if (!target) return;

    let contentFile = null;

    const textElement = target.querySelector(".hover-infotxt");
    const allowedTexts = [
      "Accessories",
      "Games",
      "Startup",
      "Accessibility",
      "Communication",
      "Entertainement",
      "System Tools",
    ];

    // Маппинг русских названий вложенных меню на английские имена файлов
    const subTooltipFileMapping = {
      "Стандартные": "Accessories",
      "Игры": "Games",
      "Автозагрузка": "Startup",
      "Специальные возможности": "Accessibility",
      "Связь": "Communication",
      "Развлечения": "Entertainement",
      "Служебные": "System Tools",
    };

    if (textElement) {
      const text = textElement.textContent.trim();
      const fileToFetch = subTooltipFileMapping[text] || text;
      if (allowedTexts.includes(fileToFetch)) {
        contentFile = `/Start_Menu/All_Programs/Sub_Tooltip/${fileToFetch}.html`;
      }
    }

    if (!contentFile) {
      const textTest = target.querySelector(".AllProgTxt");
      if (textTest) {
        const text = textTest.textContent.trim();
        if (text === "All Programs" || text === "Все программы") {
          contentFile = "/Start_Menu/All_Programs/Tooltip/Tooltip.html";
        }
      }
    }

    if (!contentFile) {
      let itemMenu = null;
      if (
        target.classList &&
        target.classList.contains("ItemMenu") &&
        target.id === "Connect To"
      ) {
        itemMenu = target;
        contentFile = `/Start_Menu/Tooltip/${itemMenu.id}.html`;
      }
      if (!itemMenu) return;
    }

    if (!contentFile) return;

    if (!target.dataset.tooltipId) {
      target.dataset.tooltipId = `tt-${Date.now()}-${Math.random().toString(
        36
      )}`;
    }

    const existing = tooltipHierarchy.find(
      (t) =>
        t.dataset.parent === target.dataset.tooltipId &&
        t.dataset.file === contentFile
    );
    if (existing) return;

    const content = await loadHTML(contentFile);
    const tooltip = createTooltip(content, target);

    attachTooltipListeners(tooltip);

    const text = textElement ? textElement.textContent.trim() : "";
    if (allowedTexts.includes(text)) {
      target.addEventListener("mouseleave", function onLeave() {
        tooltip.remove();
        tooltipHierarchy = tooltipHierarchy.filter((t) => t !== tooltip);
        target.removeEventListener("mouseleave", onLeave);
      });
    }

    const currentLevel = parseInt(tooltip.dataset.level, 10);

    tooltipHierarchy = tooltipHierarchy.filter((t) => {
      const tooltipLevel = parseInt(t.dataset.level, 10);
      if (tooltipLevel === currentLevel && t !== tooltip) {
        t.remove();
        return false;
      }
      return true;
    });

    tooltip.dataset.parent = target.dataset.tooltipId;
    tooltip.dataset.file = contentFile;

    tooltipHierarchy.push(tooltip);
  };

  let lastActiveLevel = null;

  const attachTooltipListeners = (tooltip) => {
    tooltip.addEventListener("mouseenter", (e) => {
      const currentLevel = parseInt(e.currentTarget.dataset.level, 10);

      if (lastActiveLevel !== null && currentLevel < lastActiveLevel) {
        setTimeout(() => {
          tooltipHierarchy = tooltipHierarchy.filter((t) => {
            const tooltipLevel = parseInt(t.dataset.level, 10);
            if (tooltipLevel > currentLevel) {
              t.remove();
              return false;
            }
            return true;
          });
        }, 250);
      }
    });

    tooltip.addEventListener("mouseleave", (e) => {
      const leavingLevel = parseInt(e.currentTarget.dataset.level, 10);
      lastActiveLevel = leavingLevel;
    });
  };

  if (hoverTooltipMouseEnterHandler) {
    document.body.removeEventListener(
      "mouseenter",
      hoverTooltipMouseEnterHandler,
      true
    );
  }
  if (hoverTooltipMouseLeaveHandler) {
    document.body.removeEventListener(
      "mouseleave",
      hoverTooltipMouseLeaveHandler,
      true
    );
  }

  hoverTooltipMouseEnterHandler = function (e) {
    if (e.target.closest(".AllProgMenu, .ItemMenu, .hover-infoitm")) {
      handleMouseEnter(e);
    }
  };
  hoverTooltipMouseLeaveHandler = function () {
    scheduleTooltipClose();
  };

  document.body.addEventListener(
    "mouseenter",
    hoverTooltipMouseEnterHandler,
    true
  );
  document.body.addEventListener(
    "mouseleave",
    hoverTooltipMouseLeaveHandler,
    true
  );
}

function injectStyle(id, href) {
  const cssId = `css-${id}`;
  if (!document.getElementById(cssId)) {
    const link = document.createElement("link");
    link.id = cssId;
    link.rel = "stylesheet";
    link.href = href;
    // Отметка «стили пришли» (с @import внутри - тоже): её ждёт whenStyleReady.
    const done = () => (link.dataset.ready = "1");
    link.addEventListener("load", done);
    link.addEventListener("error", done);
    document.head.appendChild(link);
  }
}

// Промис: стили, подключённые injectStyle(id), загружены. Не дольше maxMs - окно
// не должно остаться невидимым, если файл стилей завис.
function whenStyleReady(id, maxMs = 1500) {
  const link = document.getElementById(`css-${id}`);
  if (!link || link.dataset.ready) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    link.addEventListener("load", done, { once: true });
    link.addEventListener("error", done, { once: true });
    setTimeout(done, maxMs);
  });
}

// Показать окно, когда в нём есть содержимое и его стили загружены, - сразу целиком и на
// своём месте; с этого же момента в адресной строке идёт «загрузка страницы».
function revealWindow(appName, windowElement) {
  if (appName === "Space Cadet Pinball") return; // Pinball показывает себя сам (showWindow)
  whenStyleReady(`window-${appName}`).then(() => {
    windowElement.style.visibility = "";
    if (window.playAddressLoading) window.playAddressLoading(appName, windowElement);
  });
}

document.addEventListener("mousedown", function (event) {
  document.querySelectorAll(".window").forEach((windowEl) => {
    const labelDivs = windowEl.querySelectorAll(".drop_down_label");
    let tooltip = windowEl.querySelector(
      ".tooltip, .window-tooltip, .hover-info"
    );
    if (!tooltip) return;

    const isOnLabel = Array.from(labelDivs).some((label) =>
      label.contains(event.target)
    );
    const isOnTooltip = tooltip.contains(event.target);

    if (!isOnLabel && !isOnTooltip) {
      tooltip.parentNode.removeChild(tooltip);
    }
  });
});

document.addEventListener("click", function (event) {
  const tooltip = event.target.closest(".window-tooltip");
  if (tooltip) {
    tooltip.remove();
  }
});

setTimeout(() => {
  const windowStates = JSON.parse(localStorage.getItem("openWindows") || "[]");
  windowStates.forEach(
    ({ appName, left, top, width, height, display, zIndex }) => {
      openWindow(appName, { silent: true, restore: true }); // восстановление окон — без звука и на прежнем месте

      const win = document.getElementById(`window-${appName}`);
      if (win) {
        win.classList.add("window-inactive");
        if (left) win.style.left = left;
        if (top) win.style.top = top;
        if (width) win.style.width = width;
        if (height) win.style.height = height;
        if (display) win.style.display = display;
        if (zIndex) win.style.zIndex = zIndex;
      }
    }
  );
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
  }
  localStorage.removeItem("openWindows");
  localStorage.removeItem("zIndexCounter");
}, 200);

function writeDateTime() {
  const textarea = document.querySelector(".write");
  const now = new Date();

  const dateOptions = { year: "numeric", month: "2-digit", day: "2-digit" };
  const timeOptions = { hour: "2-digit", minute: "2-digit" };

  // По-русски: 18:53 15.11.2026
  const dateStr = now.toLocaleDateString("ru-RU", dateOptions);
  const timeStr = now.toLocaleTimeString("ru-RU", { ...timeOptions, hour12: false });

  textarea.value += `${timeStr} ${dateStr} \n`;
}

function openCalculator() {
  openWindow('Calculator');
}

// Логика инженерного калькулятора - /Open_Windows/Calculator/Calculator.js (window.XPCalculator).

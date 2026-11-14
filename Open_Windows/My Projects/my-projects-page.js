// Страница проекта в окне «Мои проекты» (как видео на YouTube): плеер, название, точки слайдов,
// метки, описание и комментарии. Маршрут и история — в my-projects.js (MyProjects.openProject).
// Текст из данных попадает в страницу только через textContent.
(function () {
  const ICONS_DIR =
    "/Assets/Windows XP High Resolution Icon Pack avec MAOSX/Windows XP High Resolution Icon Pack/Windows XP Icons/";
  const DESC_ROWS = [
    ["brief", "Задача:"],
    ["role", "Роль:"],
    ["desc", "Описание:"],
  ];
  const DESC_LINES = 3; // свёрнутое «Описание» — не больше 3 строк

  const data = () => window.MY_PROJECTS_DATA || {};

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Состояние страницы окна: функции снятия слушателей (их вызывает destroy).
  function state(win) {
    if (!win._mpPage) win._mpPage = { cleanups: [] };
    return win._mpPage;
  }

  // Слушатель, который снимется в destroy.
  function listen(win, target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    state(win).cleanups.push(() => target.removeEventListener(type, fn, opts));
  }

  function statsLine(p) {
    const mp = window.MyProjects;
    if (mp && mp.metaLine) return mp.metaLine(p);
    return p.meta || "";
  }

  function renderDots(win, media) {
    const dots = el("div", "mp-dots");
    dots.setAttribute("role", "group");
    dots.setAttribute("aria-label", "Слайды");
    media.forEach((m, i) => {
      const b = el("button", "mp-dot");
      b.type = "button";
      b.dataset.index = String(i);
      b.setAttribute("aria-label", `Слайд ${i + 1} из ${media.length}`);
      dots.appendChild(b);
    });
    setActiveDot(dots, 0);
    listen(win, dots, "click", (e) => {
      const b = e.target.closest(".mp-dot");
      if (!b) return;
      const i = Number(b.dataset.index);
      // Карусель (если уже есть) сама переключит слайд и точки.
      if (window.MyProjectsPage.goTo) window.MyProjectsPage.goTo(win, i);
      else setActiveDot(dots, i);
    });
    return dots;
  }

  function setActiveDot(dots, index) {
    [...dots.children].forEach((b, i) => {
      b.classList.toggle("is-active", i === index);
      if (i === index) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  // Иконка 24×24: контур (по умолчанию) или заливка (filled); opts — толщина и концы линии.
  function svgIcon(size, pathD, filled, opts = {}) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", pathD);
    if (filled) {
      path.setAttribute("fill", "currentColor");
    } else {
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", opts.width || "2");
      path.setAttribute("stroke-linecap", opts.cap || "round");
      path.setAttribute("stroke-linejoin", opts.join || "round");
    }
    svg.appendChild(path);
    return svg;
  }

  const ICON_PLAY = "M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z";
  // Иконки из макета пользователя (Figma 771:7276): заливка currentColor, чтобы краснеть при наведении.
  // view — кадр вокруг рисунка исходного SVG (исходные viewBox 44×44 / 52×44 с полями под тень).
  // «Пауза» и «без звука» в макете нет — дорисованы в стиле набора.
  const YT = {
    play: { view: "11.5 10 24 24", d: ["M21.3333 15.7333L17.26 13.3267C16.26 12.74 15 13.46 15 14.62V29.3733C15 30.5333 16.26 31.2533 17.26 30.6667L21.3333 28.2667V15.7333ZM21.3333 15.7333V28.2667L32 22L21.3333 15.7333Z"] },
    pause: { view: "10 10 24 24", d: ["M15.5 14h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V15a1 1 0 0 1 1-1zM25.5 14h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V15a1 1 0 0 1 1-1z"] },
    volume: { view: "10 10 24 24", d: ["M21.6 12.08L21.48 12.14L13.91 16.68C13.02 17.21 12.28 17.97 11.77 18.87C11.26 19.77 11 20.79 11 21.83V22.16L11.01 22.56C11.07 23.52 11.37 24.46 11.87 25.29C12.38 26.12 13.08 26.81 13.91 27.31L21.48 31.85C21.63 31.94 21.8 31.99 21.98 31.99C22.16 32 22.33 31.95 22.49 31.87C22.64 31.78 22.77 31.65 22.86 31.5C22.95 31.35 23 31.17 23 31V13C22.99 12.83 22.95 12.67 22.87 12.52C22.8 12.37 22.68 12.25 22.54 12.16C22.41 12.07 22.25 12.01 22.08 12C21.92 11.98 21.75 12.01 21.6 12.08Z", "M25.53 17.05C25.35 17.22 25.25 17.45 25.24 17.7C25.23 17.95 25.31 18.19 25.46 18.38L25.53 18.46L25.7 18.64C26.09 19.06 26.39 19.55 26.61 20.08L26.7 20.31C26.9 20.85 27 21.42 27 22L26.99 22.24C26.96 22.73 26.87 23.22 26.7 23.68L26.61 23.91C26.36 24.51 25.99 25.07 25.53 25.53C25.35 25.72 25.25 25.97 25.26 26.23C25.26 26.49 25.37 26.74 25.55 26.92C25.73 27.11 25.98 27.21 26.24 27.22C26.5 27.22 26.76 27.12 26.95 26.95C27.6 26.29 28.11 25.52 28.46 24.67L28.59 24.35C28.82 23.71 28.95 23.03 28.99 22.34L29 22C28.99 21.19 28.86 20.39 28.59 19.64L28.46 19.32C28.15 18.57 27.72 17.89 27.18 17.3L26.95 17.05L26.87 16.98C26.68 16.82 26.43 16.74 26.19 16.75C25.94 16.77 25.71 16.87 25.53 17.05Z", "M28.36 14.22C28.18 14.39 28.08 14.62 28.07 14.87C28.05 15.12 28.13 15.36 28.29 15.56L28.36 15.63L28.66 15.95C29.36 16.72 29.91 17.6 30.31 18.55L30.47 18.96C30.82 19.94 31 20.96 31 21.99L30.98 22.44C30.94 23.32 30.77 24.19 30.47 25.03L30.31 25.44C29.86 26.53 29.19 27.52 28.36 28.36C28.17 28.55 28.07 28.8 28.07 29.07C28.07 29.33 28.17 29.59 28.36 29.77C28.55 29.96 28.8 30.07 29.07 30.07C29.33 30.07 29.59 29.96 29.77 29.77C30.79 28.75 31.61 27.54 32.16 26.2L32.35 25.7C32.72 24.68 32.93 23.62 32.98 22.54L33 22C32.99 20.73 32.78 19.48 32.35 18.29L32.16 17.79C31.67 16.62 30.99 15.54 30.15 14.61L29.77 14.22L29.7 14.15C29.51 13.99 29.26 13.91 29.02 13.93C28.77 13.94 28.53 14.04 28.36 14.22Z"] },
    muted: { view: "10 10 24 24", d: ["M21.6 12.08L21.48 12.14L13.91 16.68C13.02 17.21 12.28 17.97 11.77 18.87C11.26 19.77 11 20.79 11 21.83V22.16L11.01 22.56C11.07 23.52 11.37 24.46 11.87 25.29C12.38 26.12 13.08 26.81 13.91 27.31L21.48 31.85C21.63 31.94 21.8 31.99 21.98 31.99C22.16 32 22.33 31.95 22.49 31.87C22.64 31.78 22.77 31.65 22.86 31.5C22.95 31.35 23 31.17 23 31V13C22.99 12.83 22.95 12.67 22.87 12.52C22.8 12.37 22.68 12.25 22.54 12.16C22.41 12.07 22.25 12.01 22.08 12C21.92 11.98 21.75 12.01 21.6 12.08Z", "M26.29 18.29a1 1 0 0 1 1.42 0L29.5 20.09l1.79-1.8a1 1 0 1 1 1.42 1.42L30.91 21.5l1.8 1.79a1 1 0 0 1-1.42 1.42L29.5 22.91l-1.79 1.8a1 1 0 0 1-1.42-1.42l1.8-1.79-1.8-1.79a1 1 0 0 1 0-1.42z"] },
    fullscreen: { view: "14 10 24 24", d: ["M24 13H17V20C17 20.26 17.1 20.51 17.29 20.7C17.48 20.89 17.73 21 18 21C18.26 21 18.51 20.89 18.7 20.7C18.89 20.51 19 20.26 19 20V16.41L23.29 20.7L23.36 20.77C23.56 20.92 23.8 21 24.04 20.99C24.29 20.98 24.52 20.87 24.7 20.7C24.87 20.52 24.98 20.29 24.99 20.04C25 19.8 24.92 19.56 24.77 19.36L24.7 19.29L20.41 15H24C24.26 15 24.51 14.89 24.7 14.7C24.89 14.51 25 14.26 25 14C25 13.73 24.89 13.48 24.7 13.29C24.51 13.1 24.26 13 24 13ZM34 23C33.73 23 33.48 23.1 33.29 23.29C33.1 23.48 33 23.73 33 24V27.58L28.7 23.29L28.63 23.22C28.43 23.07 28.19 22.99 27.95 23C27.7 23.01 27.47 23.12 27.29 23.29C27.12 23.47 27.01 23.7 27 23.95C26.99 24.19 27.07 24.43 27.22 24.63L27.29 24.7L31.58 29H28C27.73 29 27.48 29.1 27.29 29.29C27.1 29.48 27 29.73 27 30C27 30.26 27.1 30.51 27.29 30.7C27.48 30.89 27.73 31 28 31H35V24C35 23.73 34.89 23.48 34.7 23.29C34.51 23.1 34.26 23 34 23Z"] },
  };
  function ytIcon(name, size) {
    const icon = YT[name];
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", icon.view);
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("aria-hidden", "true");
    svg.dataset.icon = name;
    icon.d.forEach((d) => {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", "currentColor");
      svg.appendChild(p);
    });
    return svg;
  }

  const ICON_EXTERNAL = "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5";
  const IDLE_MS = 2500; // без движения мыши во время проигрывания управление прячется
  const SEEK_STEP = 5; // ←/→ — на 5 секунд

  // 66.4 → «1:06»; час и больше — «1:02:03».
  function formatTime(sec) {
    const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
  }

  // Полный экран на элементе плеера; браузер может отказать (бросить или отклонить промис).
  function requestPlayerFullscreen(player) {
    try {
      const r = player.requestFullscreen && player.requestFullscreen();
      if (r && typeof r.catch === "function") r.catch(() => {});
    } catch (e) {}
  }

  function toggleFullscreen(player) {
    if (document.fullscreenElement === player) {
      try {
        const r = document.exitFullscreen();
        if (r && typeof r.catch === "function") r.catch(() => {});
      } catch (e) {}
    } else requestPlayerFullscreen(player);
  }

  function iconButton(cls, label, size, pathD, filled) {
    const b = el("button", cls);
    b.type = "button";
    b.setAttribute("aria-label", label);
    if (pathD) b.appendChild(svgIcon(size, pathD, filled));
    return b;
  }

  function renderSlide(m, i, p) {
    const type = m && m.type === "video" ? "video" : "image";
    const slide = el("div", "mp-slide");
    slide.dataset.type = type;
    slide.dataset.index = String(i);
    if (type === "video") {
      renderVideoSlide(slide, m, p);
      return slide;
    }
    const img = el("img", "mp-slide-img");
    img.alt = (m && m.alt) || p.title || "";
    img.draggable = false;
    if (m && m.src) img.src = m.src;
    slide.appendChild(img);
    const slideFs = iconButton("mp-slide-fs", "Полный экран", 0);
    slideFs.appendChild(ytIcon("fullscreen", 24));
    slide.appendChild(slideFs);
    return slide;
  }

  // Видеослайд (как встроенный плеер YouTube): <video> без родного управления, поверх — постер
  // с названием и большой ▶, снизу — своя дорожка и ряд кнопок. Звук включён, без автозапуска;
  // файл не качается целиком до нажатия ▶ (preload="metadata").
  function renderVideoSlide(slide, m, p) {
    const video = el("video", "mp-pvideo");
    video.preload = "metadata";
    video.playsInline = true;
    if (m && m.src) video.src = m.src;
    video.setAttribute("aria-label", `Видео: ${p.title || ""}`);
    slide.appendChild(video);

    const poster = el("div", "mp-vposter");
    const img = el("img", "mp-slide-img");
    img.alt = "";
    img.draggable = false;
    if (m && m.poster) img.src = m.poster;
    poster.appendChild(img);
    poster.appendChild(el("div", "mp-vtitle", p.title || ""));
    poster.appendChild(iconButton("mp-bigplay", "Смотреть", 28, ICON_PLAY, true));
    slide.appendChild(poster);

    const controls = el("div", "mp-vcontrols");
    const seek = el("div", "mp-seek");
    seek.tabIndex = 0;
    seek.setAttribute("role", "slider");
    seek.setAttribute("aria-label", "Перемотка");
    seek.setAttribute("aria-valuemin", "0");
    seek.append(el("div", "mp-seek-buffer"), el("div", "mp-seek-played"), el("div", "mp-seek-knob"), el("div", "mp-seek-tip"));
    controls.appendChild(seek);

    const row = el("div", "mp-vrow");
    const play = iconButton("mp-vplay", "Смотреть", 0);
    play.append(ytIcon("play", 28), ytIcon("pause", 28));
    play.firstChild.classList.add("mp-vplay-play");
    play.lastChild.classList.add("mp-vplay-pause");
    row.appendChild(play);

    // Громкость (макет): «таблетка» с кнопкой звука и ползунком 64px.
    const vol = el("div", "mp-vvol");
    const mute = iconButton("mp-vmute", "Отключить звук", 0);
    mute.dataset.state = "on";
    mute.append(ytIcon("volume", 24), ytIcon("muted", 24));
    const slider = el("div", "mp-vslider");
    slider.tabIndex = 0;
    slider.setAttribute("role", "slider");
    slider.setAttribute("aria-label", "Громкость");
    slider.setAttribute("aria-valuemin", "0");
    slider.setAttribute("aria-valuemax", "100");
    slider.append(el("div", "mp-vslider-fill"), el("div", "mp-vslider-knob"));
    vol.append(mute, slider);
    row.appendChild(vol);
    row.appendChild(el("span", "mp-vtime", "0:00 / 0:00"));
    if (p.site) {
      const a = el("a", "mp-vsite");
      a.href = p.site;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.appendChild(svgIcon(20, ICON_EXTERNAL));
      a.appendChild(el("span", null, "Открыть сайт"));
      row.appendChild(a);
    }
    const fsBtn = iconButton("mp-vfs", "Полный экран", 0);
    fsBtn.appendChild(ytIcon("fullscreen", 24));
    row.appendChild(fsBtn);
    controls.appendChild(row);
    slide.appendChild(controls);
  }

  // Поведение видеослайда: кнопки, дорожка, время, скрытие управления.
  function setupVideo(win, player, slide) {
    const v = slide.querySelector("video.mp-pvideo");
    const seek = slide.querySelector(".mp-seek");
    const played = slide.querySelector(".mp-seek-played");
    const buffer = slide.querySelector(".mp-seek-buffer");
    const knob = slide.querySelector(".mp-seek-knob");
    const time = slide.querySelector(".mp-vtime");
    const playBtn = slide.querySelector(".mp-vplay");
    const st = state(win);

    const duration = () => (Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0);
    const pct = (x) => `${Math.min(1, Math.max(0, x)) * 100}%`;

    function update() {
      const d = duration();
      const t = Number(v.currentTime) || 0;
      played.style.width = knob.style.left = pct(d ? t / d : 0);
      time.textContent = `${formatTime(t)} / ${formatTime(d)}`;
      seek.setAttribute("aria-valuemax", String(Math.floor(d)));
      seek.setAttribute("aria-valuenow", String(Math.floor(t)));
      seek.setAttribute("aria-valuetext", `${formatTime(t)} из ${formatTime(d)}`);
    }
    function updateBuffer() {
      const d = duration();
      const b = v.buffered;
      const t = Number(v.currentTime) || 0;
      let end = 0;
      if (d && b) {
        for (let k = 0; k < b.length; k++) {
          if (b.start(k) <= t + 0.5 && b.end(k) >= t) end = b.end(k);
        }
      }
      buffer.style.width = pct(d ? end / d : 0);
    }

    // Видео не запустилось (play() отклонён или ошибка файла) — снова постер с ▶.
    function reset() {
      setPlaying(false);
      slide.classList.remove("is-started");
    }
    function startPlay() {
      try {
        const r = v.play();
        if (r && typeof r.catch === "function") r.catch(() => v.paused && reset());
      } catch (e) {
        reset();
      }
    }
    function toggle() {
      if (v.paused || v.ended) startPlay();
      else v.pause();
    }
    function seekTo(sec) {
      const d = duration();
      if (!d) return;
      v.currentTime = Math.min(d, Math.max(0, sec));
      update();
      updateBuffer();
    }

    // Скрытие управления: 2.5 с без движения мыши во время проигрывания.
    let idleTimer = 0;
    function wake() {
      slide.classList.remove("is-idle");
      clearTimeout(idleTimer);
      if (slide.classList.contains("is-playing")) {
        idleTimer = setTimeout(() => slide.classList.add("is-idle"), IDLE_MS);
      }
    }
    st.cleanups.push(() => clearTimeout(idleTimer));

    function setPlaying(on) {
      slide.classList.toggle("is-playing", on);
      playBtn.setAttribute("aria-label", on ? "Пауза" : "Смотреть");
      if (on) slide.classList.add("is-started");
      wake();
    }

    listen(win, v, "loadedmetadata", () => (update(), updateBuffer()));
    listen(win, v, "durationchange", update);
    listen(win, v, "timeupdate", () => (update(), updateBuffer()));
    listen(win, v, "progress", updateBuffer);
    listen(win, v, "play", () => setPlaying(true));
    listen(win, v, "playing", () => setPlaying(true));
    listen(win, v, "pause", () => setPlaying(false));
    // Конец — снова постер с ▶ (без перехода к следующему слайду).
    listen(win, v, "ended", () => {
      setPlaying(false);
      slide.classList.remove("is-started");
    });

    listen(win, v, "error", reset);

    // Постер с большой ▶ прячется — фокус с неё переносим на ▶ в ряду управления,
    // иначе он упадёт на body и клавиши плеера перестанут работать.
    const poster = slide.querySelector(".mp-vposter");
    listen(win, poster, "click", () => {
      startPlay();
      if (poster.contains(document.activeElement)) playBtn.focus({ preventScroll: true });
    });
    listen(win, v, "click", toggle);
    listen(win, v, "dblclick", () => toggleFullscreen(player));
    listen(win, playBtn, "click", toggle);
    listen(win, slide.querySelector(".mp-vfs"), "click", () => toggleFullscreen(player));

    // Дорожка: щелчок и перетаскивание.
    let dragging = false;
    const seekAt = (e) => {
      const r = seek.getBoundingClientRect();
      if (r.width > 0) seekTo(((e.clientX - r.left) / r.width) * duration());
    };
    listen(win, seek, "pointerdown", (e) => {
      if (e.button !== 0) return;
      dragging = true;
      seek.classList.add("is-dragging");
      try {
        seek.setPointerCapture(e.pointerId);
      } catch (err) {}
      seekAt(e);
    });
    listen(win, seek, "pointermove", (e) => dragging && seekAt(e));
    const stopDrag = () => {
      dragging = false;
      seek.classList.remove("is-dragging");
    };
    listen(win, seek, "pointerup", stopDrag);
    listen(win, seek, "pointercancel", stopDrag);

    // Подсказка времени над дорожкой под курсором (как на YouTube).
    const tip = seek.querySelector(".mp-seek-tip");
    listen(win, seek, "pointermove", (e) => {
      const r = seek.getBoundingClientRect();
      if (!r.width) return;
      const x = Math.min(r.width, Math.max(0, e.clientX - r.left));
      tip.textContent = formatTime((x / r.width) * duration());
      tip.style.left = x + "px";
    });

    // Громкость: кнопка — выкл/вкл, ползунок — щелчок/перетаскивание/стрелки, M — выкл/вкл.
    const muteBtn = slide.querySelector(".mp-vmute");
    const vslider = slide.querySelector(".mp-vslider");
    const vfill = slide.querySelector(".mp-vslider-fill");
    const vknob = slide.querySelector(".mp-vslider-knob");
    let lastVolume = 1;
    function updateVolume() {
      const level = v.muted ? 0 : v.volume;
      vfill.style.width = vknob.style.left = pct(level);
      const off = v.muted || v.volume === 0;
      muteBtn.dataset.state = off ? "off" : "on";
      muteBtn.setAttribute("aria-label", off ? "Включить звук" : "Отключить звук");
      vslider.setAttribute("aria-valuenow", String(Math.round(level * 100)));
    }
    function setVolume(x) {
      const val = Math.round(Math.min(1, Math.max(0, x)) * 100) / 100;
      v.volume = val;
      v.muted = val === 0;
      if (val > 0) lastVolume = val;
      updateVolume();
    }
    function toggleMute() {
      if (v.muted || v.volume === 0) {
        if (v.volume === 0) v.volume = lastVolume || 1;
        v.muted = false;
      } else {
        v.muted = true;
      }
      updateVolume();
    }
    listen(win, muteBtn, "click", toggleMute);
    let vdrag = false;
    const volumeAt = (e) => {
      const r = vslider.getBoundingClientRect();
      if (!r.width) return;
      const ratio = (e.clientX - r.left) / r.width;
      setVolume(ratio < 0.05 ? 0 : ratio);
    };
    listen(win, vslider, "pointerdown", (e) => {
      if (e.button !== 0) return;
      vdrag = true;
      try {
        vslider.setPointerCapture(e.pointerId);
      } catch (err) {}
      volumeAt(e);
    });
    listen(win, vslider, "pointermove", (e) => vdrag && volumeAt(e));
    listen(win, vslider, "pointerup", () => (vdrag = false));
    listen(win, vslider, "pointercancel", () => (vdrag = false));
    listen(win, vslider, "keydown", (e) => {
      const step = { ArrowLeft: -0.1, ArrowDown: -0.1, ArrowRight: 0.1, ArrowUp: 0.1 }[e.key];
      if (step === undefined) return;
      e.preventDefault();
      e.stopPropagation(); // стрелки на ползунке — громкость, а не перемотка
      setVolume((v.muted ? 0 : v.volume) + step);
    });
    listen(win, v, "volumechange", updateVolume);
    updateVolume();

    listen(win, player, "pointermove", wake);
    listen(win, player, "pointerdown", wake);
    listen(win, player, "keydown", wake);

    update();
    return { toggle, toggleMute, seekBy: (s) => seekTo((Number(v.currentTime) || 0) + s) };
  }

  // Клавиши плеера — только когда фокус внутри него: Пробел/K — пауза, ←/→ — ±5 с, M — звук, F — полный экран.
  // Сам плеер принимает фокус (tabIndex -1): щелчок мышью по видео или картинке ставит фокус
  // в плеер, и клавиши работают и без Tab.
  function setupPlayerKeys(win, player, videos) {
    player.tabIndex = -1;
    listen(win, player, "pointerdown", (e) => {
      const f = e.target.closest("button, a[href], input, textarea, select, [tabindex]");
      if (!f || f === player) player.focus({ preventScroll: true });
    });
    listen(win, player, "keydown", (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen(player);
        return;
      }
      const slide = player.querySelector(".mp-slide.is-current");
      const ctl = slide && videos.get(slide);
      if (!ctl) return;
      if (e.code === "Space" || e.code === "KeyK") {
        // Пробел на кнопке нажимает саму кнопку — не переключаем второй раз.
        if (e.code === "Space" && e.target.closest("button")) return;
        e.preventDefault();
        ctl.toggle();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        ctl.toggleMute();
      } else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        ctl.seekBy(e.code === "ArrowLeft" ? -SEEK_STEP : SEEK_STEP);
      }
    });
  }

  // Высота плеера ограничена видимой высотой страницы (CSS: --mp-player-max): в развёрнутом
  // окне под плеером целиком видна строка названия (аватар, название, статистика).
  // Запас — не меньше 126px (по макету): шапка и отступ над плеером + строка под ним.
  const PLAYER_RESERVE_MIN = 126;
  const PLAYER_RESERVE_GAP = 8; // воздух под строкой названия
  function watchPageHeight(win, section) {
    const pg = win.querySelector(".mp-page");
    const player = section.querySelector(".mp-player");
    const row = section.querySelector(".mp-meta-row");
    if (!pg || !player) return;
    const set = () => {
      if (section.hidden || !pg.clientHeight) return; // окно свёрнуто или страница скрыта
      const p = player.getBoundingClientRect();
      const above = p.top - (pg.getBoundingClientRect().top + pg.clientTop) + pg.scrollTop;
      const below = row ? row.getBoundingClientRect().bottom - p.bottom + PLAYER_RESERVE_GAP : 0;
      const reserve = Math.max(PLAYER_RESERVE_MIN, Math.ceil(above + below));
      section.style.setProperty("--mp-player-max", pg.clientHeight - reserve + "px");
    };
    set();
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(set);
      ro.observe(pg);
      if (row) ro.observe(row); // название может переноситься на вторую строку
      state(win).cleanups.push(() => ro.disconnect());
    }
  }

  // Bureau.closeWindow убирает окно из DOM без destroy: следим за этим сами,
  // чтобы видео не продолжало играть в отсоединённом окне.
  function watchRemoval(win) {
    const parent = win.parentNode;
    if (!parent || typeof MutationObserver !== "function") return;
    const mo = new MutationObserver(() => {
      if (!win.isConnected) destroy(win);
    });
    mo.observe(parent, { childList: true });
    state(win).cleanups.push(() => mo.disconnect());
  }

  // Карусель: лента слайдов, стрелки по бокам (по кругу), переход сдвигом ленты.
  function renderCarousel(win, player, p) {
    const media = Array.isArray(p.media) ? p.media : [];
    const st = state(win);
    st.index = 0;
    st.count = media.length;
    if (!media.length) return;
    const track = el("div", "mp-track");
    media.forEach((m, i) => track.appendChild(renderSlide(m, i, p)));
    player.appendChild(track);
    if (media.length > 1) {
      const prev = el("button", "mp-arrow mp-arrow--prev");
      const next = el("button", "mp-arrow mp-arrow--next");
      prev.type = next.type = "button";
      prev.setAttribute("aria-label", "Предыдущий слайд");
      next.setAttribute("aria-label", "Следующий слайд");
      // Компактный шеврон с квадратными концами — как на референсе.
      const chevron = { width: "3", cap: "square", join: "miter" };
      prev.appendChild(svgIcon(30, "M15 4.5L7.5 12l7.5 7.5", false, chevron));
      next.appendChild(svgIcon(30, "M9 4.5l7.5 7.5L9 19.5", false, chevron));
      player.appendChild(prev);
      player.appendChild(next);
      listen(win, prev, "click", () => goTo(win, st.index - 1));
      listen(win, next, "click", () => goTo(win, st.index + 1));
    }
    listen(win, player, "click", (e) => {
      if (e.target.closest(".mp-slide-fs")) requestPlayerFullscreen(player);
    });
    const videos = new Map();
    track.querySelectorAll('.mp-slide[data-type="video"]').forEach((s) => videos.set(s, setupVideo(win, player, s)));
    setupPlayerKeys(win, player, videos);
    goTo(win, 0, true);
  }

  // Показать слайд index (по кругу); видео в слайде, который покидаем, ставится на паузу.
  function goTo(win, index, initial) {
    const st = state(win);
    const track = win.querySelector(".mp-project .mp-track");
    if (!track || !st.count) return;
    const i = ((Math.round(Number(index)) || 0) % st.count + st.count) % st.count;
    const slides = [...track.children];
    if (!initial && i !== st.index) {
      const leaving = slides[st.index];
      if (leaving) {
        leaving.querySelectorAll("video").forEach((v) => {
          try {
            v.pause();
          } catch (e) {}
        });
      }
    }
    st.index = i;
    track.style.transform = `translateX(${-i * 100}%)`;
    slides.forEach((s, k) => {
      s.classList.toggle("is-current", k === i);
      s.setAttribute("aria-hidden", k === i ? "false" : "true");
      s.inert = k !== i;
    });
    const dots = win.querySelector(".mp-project .mp-dots");
    if (dots) setActiveDot(dots, i);
  }

  function renderInfo(win, p) {
    const info = el("div", "mp-info");
    const row = el("div", "mp-meta-row");

    const avatar = el("img", "mp-avatar-lg");
    avatar.src = data().avatar || ICONS_DIR + "User Accounts.png";
    avatar.alt = "";
    row.appendChild(avatar);
    const title = el("h1", "mp-ptitle", p.title || "");
    title.tabIndex = -1; // сюда ставится фокус при открытии страницы (my-projects.js)
    row.appendChild(title);
    row.appendChild(el("p", "mp-pstats", statsLine(p)));

    row.appendChild(renderDots(win, Array.isArray(p.media) ? p.media : []));
    info.appendChild(row);

    const desc = renderDesc(win, p);
    if (desc) info.appendChild(desc);
    return info;
  }

  // Описание: строки «Задача / Роль / Описание»; «Описание» свёрнуто до 3 строк
  // с кнопкой «Ещё» (если не помещается) — развёрнутое с кнопкой «Свернуть».
  function renderDesc(win, p) {
    const rows = DESC_ROWS.filter(([key]) => p[key]);
    if (!rows.length) return null;
    const box = el("div", "mp-desc is-collapsed");
    rows.forEach(([key, label]) => {
      const row = el("div", "mp-desc-row");
      row.dataset.key = key;
      row.appendChild(el("span", "mp-desc-label", label));
      row.appendChild(el("div", "mp-desc-text", String(p[key])));
      box.appendChild(row);
    });

    const toggle = el("button", "mp-desc-toggle", "Ещё");
    toggle.type = "button";
    toggle.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    box.appendChild(toggle);

    const text = box.querySelector('.mp-desc-row[data-key="desc"] .mp-desc-text');
    if (!text) return box;

    const lineHeight = () => parseFloat(getComputedStyle(text).lineHeight) || 24;
    // Кнопка нужна, только если текст длиннее 3 строк.
    const update = () => {
      const collapsed = box.classList.contains("is-collapsed");
      const long = collapsed
        ? text.scrollHeight > text.clientHeight + 1
        : text.getBoundingClientRect().height > DESC_LINES * lineHeight() + 1;
      toggle.hidden = !long;
    };
    listen(win, toggle, "click", () => {
      const collapsed = box.classList.toggle("is-collapsed");
      toggle.textContent = collapsed ? "Ещё" : "Свернуть";
      toggle.setAttribute("aria-expanded", String(!collapsed));
      update();
    });
    // Ширина окна и загрузка шрифта меняют число строк — пересчитываем.
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(update);
      ro.observe(text);
      state(win).cleanups.push(() => ro.disconnect());
    }
    requestAnimationFrame(update);
    return box;
  }

  // ---------- комментарии ----------
  // Свои комментарии и реакции живут в localStorage (по slug проекта) и видны только этому
  // посетителю. Комментарии из данных проекта (p.comments) — только для чтения; реакции на них
  // тоже сохраняются. Весь текст — через textContent.
  const GUEST = "@гость";
  // Свои комментарии живут только в памяти страницы: переживают закрытие окна, исчезают после обновления.
  const sessionComments = new Map();
  const MAX_COMMENT = 2000;
  const MIN_INPUT_H = 32;
  const MAX_INPUT_H = 120;
  // Большой палец из макета пользователя (Figma 770:7261): контур = силуэт + внутренний вырез;
  // нажатый — сплошной силуэт.
  const LIKE_VIEW = "-1.6 -1.17 18 18";
  const LIKE_OUTER = "M6.248 0.00955037L7.027 0.13955C7.42705 0.206248 7.80943 0.35337 8.15102 0.572025C8.4926 0.79068 8.78631 1.07633 9.01438 1.4117C9.24244 1.74707 9.40014 2.12521 9.47794 2.52326C9.55574 2.9213 9.55201 3.33099 9.467 3.72755L9 5.90555H12.046C12.5552 5.90587 13.0542 6.04763 13.4875 6.31503C13.9208 6.58243 14.2712 6.96494 14.4998 7.41991C14.7284 7.87487 14.8261 8.38439 14.782 8.89163C14.7378 9.39886 14.5537 9.88387 14.25 10.2926L14.265 10.3586C14.3748 10.8321 14.3622 11.3258 14.2284 11.7931C14.0945 12.2604 13.8439 12.6859 13.5 13.0295V13.0625C13.5 13.2895 13.463 13.5146 13.391 13.7305L13.311 13.9405C13.0952 14.449 12.7345 14.8827 12.274 15.1876C11.8134 15.4926 11.2734 15.6553 10.721 15.6556H8.016L7.722 15.6506C6.35384 15.606 5.01386 15.2499 3.804 14.6096L3.548 14.4676L3.344 14.3516C3.17451 14.2544 2.98769 14.1912 2.794 14.1656L2.602 14.1556H1.125L1.009 14.1496C0.751843 14.1227 0.511775 14.0081 0.329128 13.8251C0.146481 13.6421 0.0323823 13.4018 0.00600004 13.1446L0 13.0306V8.53055C0 7.91055 0.504 7.40655 1.125 7.40655H2.467C2.60242 7.40643 2.73529 7.36965 2.85149 7.3001C2.96769 7.23055 3.0629 7.13084 3.127 7.01155L3.175 6.90455L5.415 0.50155C5.47362 0.334595 5.58938 0.193741 5.74181 0.10389C5.89425 0.0140389 6.07354 -0.0190226 6.248 0.0105504V0.00955037Z";
  const LIKE_HOLE = "M4.59 7.39855C4.43598 7.83881 4.14894 8.22031 3.7686 8.4903C3.38826 8.76028 2.93342 8.90539 2.467 8.90555H1.5V12.6545H2.6C3.12259 12.6542 3.63622 12.7904 4.09 13.0496L4.292 13.1656C5.42598 13.8141 6.70965 14.1554 8.016 14.1556H10.719C11.285 14.1556 11.789 13.7926 11.967 13.2556C11.988 13.1934 11.9988 13.1282 11.999 13.0625V12.4075L12.439 11.9685C12.6028 11.8049 12.722 11.6022 12.7856 11.3797C12.8491 11.1571 12.8547 10.9219 12.802 10.6966L12.788 10.6315L12.631 9.95655L13.044 9.40055C13.1826 9.21509 13.2668 8.99474 13.2873 8.76413C13.3079 8.53353 13.2638 8.30177 13.1602 8.09476C13.0565 7.88775 12.8973 7.71365 12.7004 7.59194C12.5034 7.47022 12.2765 7.40569 12.045 7.40555H9C8.7763 7.40543 8.55545 7.35532 8.35361 7.25886C8.15177 7.16241 7.97405 7.02207 7.83343 6.84809C7.69281 6.67411 7.59285 6.4709 7.54087 6.25332C7.48889 6.03575 7.4862 5.8093 7.533 5.59055L8 3.41255C8.04251 3.21427 8.04437 3.00943 8.00547 2.8104C7.96657 2.61138 7.88772 2.42231 7.77369 2.25463C7.65965 2.08694 7.5128 1.94411 7.34201 1.83479C7.17121 1.72546 6.98003 1.6519 6.78 1.61855L6.623 1.59255L4.59 7.39855Z";
  function likeIcon(filled) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", LIKE_VIEW);
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("data-icon", "thumb");
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", filled ? LIKE_OUTER : LIKE_OUTER + LIKE_HOLE);
    p.setAttribute("fill", "currentColor");
    p.setAttribute("fill-rule", "evenodd");
    svg.appendChild(p);
    return svg;
  }
  const ICON_SORT = "M3 6h18M3 12h12M3 18h6";
  // Три мелкие точки (горизонтально) — меню своего комментария (референс).
  function moreIcon() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("aria-hidden", "true");
    [7, 12, 17].forEach((cx) => {
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", String(cx));
      c.setAttribute("cy", "12");
      c.setAttribute("r", "1.25");
      c.setAttribute("fill", "currentColor");
      svg.appendChild(c);
    });
    return svg;
  }

  function readJson(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }
  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  const plural = (n, forms) => {
    const mp = window.MyProjects;
    if (mp && mp.plural) return mp.plural(n, forms);
    return n === 1 ? forms[0] : forms[2];
  };

  // Время комментария: свой (ts в мс) — «только что», «5 минут назад», «2 часа назад», дальше по дате;
  // из данных (date «ГГГГ-ММ-ДД») — как в карточках.
  function commentTime(c) {
    const mp = window.MyProjects;
    if (c.ts) {
      const min = Math.floor((Date.now() - c.ts) / 60000);
      if (min < 1) return "только что";
      if (min < 60) return `${min} ${plural(min, ["минуту", "минуты", "минут"])} назад`;
      const h = Math.floor(min / 60);
      if (h < 24) return `${h} ${plural(h, ["час", "часа", "часов"])} назад`;
      const d = new Date(c.ts);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return mp && mp.timeAgo ? mp.timeAgo(iso) : "";
    }
    return c.date && mp && mp.timeAgo ? mp.timeAgo(String(c.date)) : "";
  }

  const commentStamp = (c) => c.ts || Date.parse(String(c.date) + "T00:00:00") || 0;

  // Аватар-силуэт: кружок-контур, голова и плечи; цвет — currentColor (--mp-text).
  function commentAvatar() {
    const wrap = el("span", "mp-cavatar");
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("width", "32");
    svg.setAttribute("height", "32");
    svg.setAttribute("aria-hidden", "true");
    const mk = (tag, attrs) => {
      const n = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
      svg.appendChild(n);
    };
    mk("circle", { cx: "16", cy: "16", r: "15", fill: "none", stroke: "currentColor", "stroke-width": "2" });
    mk("circle", { cx: "16", cy: "12.5", r: "5", fill: "currentColor" });
    mk("path", { d: "M6.2 25.6c1.2-4.4 5.2-6.9 9.8-6.9s8.6 2.5 9.8 6.9A14 14 0 0 1 16 30a14 14 0 0 1-9.8-4.4z", fill: "currentColor" });
    wrap.appendChild(svg);
    return wrap;
  }

  function renderComments(win, p) {
    const slug = p.slug || "";
    const storeKey = `mp-comments:${slug}`;
    const reactKey = `mp-reactions:${slug}`;
    const base = (Array.isArray(p.comments) ? p.comments : [])
      .filter((c) => c && typeof c.text === "string")
      .map((c, i) => ({
        id: "d" + i,
        user: String(c.user || ""),
        date: c.date,
        text: c.text,
        likes: Number(c.likes) || 0,
        dislikes: Number(c.dislikes) || 0,
      }));
    // Старые версии хранили свои комментарии в localStorage — убираем, чтобы они не всплывали.
    try {
      localStorage.removeItem(storeKey);
    } catch (e) {}
    if (!sessionComments.has(slug)) sessionComments.set(slug, []);
    const mine = sessionComments.get(slug);
    let reactions = readJson(reactKey, {});
    if (!reactions || typeof reactions !== "object" || Array.isArray(reactions)) reactions = {};
    let sort = "new";
    const SORTS = [
      ["new", "Сначала новые"],
      ["popular", "Сначала популярные"],
    ];

    const box = el("div", "mp-comments");
    const head = el("div", "mp-chead");
    const count = el("h2", "mp-ccount");
    // «Сортировка» открывает выпадающее меню (как на референсе): выбранный пункт красный.
    const sortWrap = el("div", "mp-csort-wrap");
    const sortBtn = el("button", "mp-csort");
    sortBtn.type = "button";
    sortBtn.setAttribute("aria-haspopup", "menu");
    sortBtn.setAttribute("aria-expanded", "false");
    sortBtn.appendChild(svgIcon(16, ICON_SORT));
    sortBtn.appendChild(el("span", null, "Сортировка"));
    const sortMenu = el("div", "mp-csort-menu");
    sortMenu.setAttribute("role", "menu");
    sortMenu.hidden = true;
    SORTS.forEach(([key, label]) => {
      const it = el("button", "mp-csort-item", label);
      it.type = "button";
      it.dataset.sort = key;
      it.setAttribute("role", "menuitemradio");
      sortMenu.appendChild(it);
    });
    sortWrap.append(sortBtn, sortMenu);
    head.append(count, sortWrap);

    const add = el("div", "mp-cadd");
    const input = el("textarea", "mp-cinput");
    input.rows = 1;
    input.maxLength = MAX_COMMENT;
    input.placeholder = "Добавьте комментарий…";
    input.setAttribute("aria-label", "Добавьте комментарий");
    const send = el("button", "mp-csend", "Отправить");
    send.type = "button";
    send.disabled = true;
    add.append(commentAvatar(), input, send);

    const list = el("div", "mp-clist");
    box.append(head, add, list);

    const all = () => base.concat(mine);
    const reactionOf = (c) => (reactions[c.id] === "like" || reactions[c.id] === "dislike" ? reactions[c.id] : "");
    const likesOf = (c) => c.likes + (reactionOf(c) === "like" ? 1 : 0);
    const dislikesOf = (c) => c.dislikes + (reactionOf(c) === "dislike" ? 1 : 0);

    function reactBtn(cls, label, n, on, flip) {
      const b = el("button", cls);
      b.type = "button";
      b.setAttribute("aria-label", label);
      b.setAttribute("aria-pressed", String(on));
      b.classList.toggle("is-on", on);
      const svg = likeIcon(on);
      if (flip) svg.classList.add("is-flip");
      b.appendChild(svg);
      b.appendChild(el("span", "mp-rcount", String(n)));
      return b;
    }

    function renderItem(c) {
      const item = el("div", "mp-comment");
      item.dataset.id = c.id;
      const body = el("div", "mp-cbody");
      const line = el("div", "mp-cline");
      line.append(el("span", "mp-cuser", c.user), el("span", "mp-ctime", commentTime(c)));
      const r = reactionOf(c);
      const actions = el("div", "mp-cactions");
      actions.append(
        reactBtn("mp-like", "Нравится", likesOf(c), r === "like", false),
        reactBtn("mp-dislike", "Не нравится", dislikesOf(c), r === "dislike", true)
      );
      body.append(line, el("div", "mp-ctext", c.text), actions);
      item.append(commentAvatar(), body);
      // Свой комментарий: «⋯» справа, в меню — «Удалить».
      if (c.user === GUEST && mine.includes(c)) {
        item.classList.add("is-mine");
        const more = el("div", "mp-cmore-wrap");
        const btn = el("button", "mp-cmore");
        btn.type = "button";
        btn.setAttribute("aria-label", "Действия с комментарием");
        btn.setAttribute("aria-haspopup", "menu");
        btn.setAttribute("aria-expanded", "false");
        btn.appendChild(moreIcon());
        const menu = el("div", "mp-cmore-menu");
        menu.setAttribute("role", "menu");
        menu.hidden = true;
        const del = el("button", "mp-cdelete", "Удалить");
        del.type = "button";
        del.setAttribute("role", "menuitem");
        menu.appendChild(del);
        more.append(btn, menu);
        item.appendChild(more);
      }
      return item;
    }

    function refresh() {
      const items = all();
      count.textContent = `${items.length} ${plural(items.length, ["комментарий", "комментария", "комментариев"])}`;
      const order = items.map((c, i) => ({ c, i }));
      order.sort((a, b) => {
        if (sort === "popular") {
          const d = likesOf(b.c) - likesOf(a.c);
          if (d) return d;
        }
        return commentStamp(b.c) - commentStamp(a.c) || b.i - a.i;
      });
      list.replaceChildren(...order.map((o) => renderItem(o.c)));
      const label = SORTS.find(([k]) => k === sort)[1];
      sortBtn.title = label;
      sortBtn.setAttribute("aria-label", `Сортировка: ${label}`);
      sortMenu.querySelectorAll(".mp-csort-item").forEach((it) => {
        it.setAttribute("aria-checked", String(it.dataset.sort === sort));
      });
    }

    // byKeyboard — меню открыто с клавиатуры: тогда фокус на выбранный пункт (мышью — без фокуса и подчёркивания).
    function setMenu(open, byKeyboard) {
      sortMenu.hidden = !open;
      sortBtn.setAttribute("aria-expanded", String(open));
      if (open && byKeyboard) {
        const cur = sortMenu.querySelector('[aria-checked="true"]') || sortMenu.firstChild;
        if (cur) cur.focus({ preventScroll: true });
      }
    }

    function sync() {
      send.disabled = !input.value.trim();
      input.style.height = "auto";
      // border-box: к scrollHeight добавляем нижнюю границу; не меньше 32px и не больше 120px.
      const border = input.offsetHeight - input.clientHeight;
      const want = Math.max(MIN_INPUT_H, Math.ceil(input.scrollHeight + border));
      input.style.height = Math.min(want, MAX_INPUT_H) + "px";
      input.style.overflowY = want > MAX_INPUT_H ? "auto" : "hidden";
    }

    function submit() {
      const text = input.value.trim();
      if (!text) return;
      const ts = Date.now();
      mine.push({ id: `u${ts}-${Math.random().toString(36).slice(2, 7)}`, user: GUEST, ts, text, likes: 0, dislikes: 0 });
      input.value = "";
      sync();
      refresh();
    }

    function react(id, kind) {
      if (reactions[id] === kind) delete reactions[id];
      else reactions[id] = kind;
      writeJson(reactKey, reactions);
      refresh();
      // Список перестроен — возвращаем фокус на ту же кнопку того же комментария.
      const again = [...list.querySelectorAll(".mp-comment")].find((n) => n.dataset.id === id);
      const btn = again && again.querySelector(kind === "like" ? ".mp-like" : ".mp-dislike");
      if (btn) btn.focus();
    }

    listen(win, input, "input", sync);
    listen(win, input, "keydown", (e) => {
      // Печать в поле не должна доходить до других обработчиков клавиш (плеер, окно).
      e.stopPropagation();
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        submit();
      }
    });
    listen(win, send, "click", submit);
    listen(win, sortBtn, "click", (e) => setMenu(sortMenu.hidden, e.detail === 0));
    listen(win, sortMenu, "click", (e) => {
      const it = e.target.closest(".mp-csort-item");
      if (!it) return;
      sort = it.dataset.sort;
      setMenu(false);
      refresh();
      sortBtn.focus({ preventScroll: true });
    });
    listen(win, sortWrap, "keydown", (e) => {
      if (e.key === "Escape" && !sortMenu.hidden) {
        e.stopPropagation();
        setMenu(false);
        sortBtn.focus({ preventScroll: true });
      }
    });
    // Щелчок мимо меню закрывает его (слушатель на окне — снимается в destroy).
    listen(win, win, "pointerdown", (e) => {
      if (!sortMenu.hidden && !sortWrap.contains(e.target)) setMenu(false);
      if (!e.target.closest(".mp-cmore-wrap")) closeMoreMenus();
    });
    listen(win, list, "keydown", (e) => {
      if (e.key !== "Escape") return;
      const open = list.querySelector(".mp-cmore-menu:not([hidden])");
      if (!open) return;
      e.stopPropagation();
      closeMoreMenus();
      open.parentElement.querySelector(".mp-cmore").focus({ preventScroll: true });
    });
    function closeMoreMenus(except) {
      list.querySelectorAll(".mp-cmore-menu").forEach((m) => {
        if (m === except) return;
        m.hidden = true;
        m.parentElement.querySelector(".mp-cmore").setAttribute("aria-expanded", "false");
      });
    }
    function removeComment(id) {
      const i = mine.findIndex((c) => c.id === id);
      if (i < 0) return;
      mine.splice(i, 1);
      if (reactions[id]) {
        delete reactions[id];
        writeJson(reactKey, reactions);
      }
      refresh();
    }
    listen(win, list, "click", (e) => {
      const moreBtn = e.target.closest(".mp-cmore");
      if (moreBtn) {
        const menu = moreBtn.parentElement.querySelector(".mp-cmore-menu");
        const open = menu.hidden;
        closeMoreMenus(menu);
        menu.hidden = !open;
        moreBtn.setAttribute("aria-expanded", String(open));
        if (open && e.detail === 0) menu.querySelector(".mp-cdelete").focus({ preventScroll: true });
        return;
      }
      const delBtn = e.target.closest(".mp-cdelete");
      if (delBtn) {
        const item = delBtn.closest(".mp-comment");
        if (item) removeComment(item.dataset.id);
        return;
      }
      const b = e.target.closest(".mp-like, .mp-dislike");
      const item = b && b.closest(".mp-comment");
      if (item) react(item.dataset.id, b.classList.contains("mp-like") ? "like" : "dislike");
    });

    sync();
    refresh();
    return box;
  }

  function render(win, project) {
    const section = win.querySelector(".mp-project");
    if (!section) return;
    destroy(win);
    const p = project || {};
    const player = el("div", "mp-player");
    const comments = renderComments(win, p);
    section.replaceChildren(player, renderInfo(win, p), comments);
    renderCarousel(win, player, p); // после renderInfo: нужны точки
    watchPageHeight(win, section);
    watchRemoval(win);
    section.dataset.slug = p.slug || "";
  }

  // Уход со страницы: видео на паузу (и обрыв загрузки файла плеера — иначе браузер держит
  // соединение с недокачанным видео), слушатели страницы снимаются.
  function destroy(win) {
    const section = win.querySelector(".mp-project");
    if (section) {
      section.querySelectorAll("video").forEach((v) => {
        try {
          v.pause();
          if (v.classList.contains("mp-pvideo")) {
            v.removeAttribute("src");
            v.load();
          }
        } catch (e) {}
      });
    }
    const st = state(win);
    const cleanups = st.cleanups.splice(0);
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });
  }

  // clearSessionComments — сброс своих комментариев (как после обновления страницы); нужен тестам.
  const clearSessionComments = () => sessionComments.clear();
  window.MyProjectsPage = { render, destroy, goTo, listen, setActiveDot, clearSessionComments };
})();

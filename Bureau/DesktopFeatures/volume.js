/*
 * Общая громкость Atanov XP (как регулятор Volume в трее Windows XP).
 *
 * Подключается ПЕРВЫМ скриптом на каждой странице со звуком (и в iframe игр),
 * чтобы перехватить звук до того, как его создаст код страницы:
 *  - <audio>/<video>/new Audio(): свойство volume подменено - код страницы
 *    видит и задаёт «свою» громкость, а реально звучит своя × общая;
 *  - Web Audio (Winamp, Pinball): ctx.destination отдаёт GainNode с общей
 *    громкостью, подключённый к настоящему выходу.
 * Состояние - sessionStorage xpVolume (0..1) и xpMuted ("1"/"0"): живёт в
 * пределах визита, а каждый новый заход на сайт (экран загрузки #loader)
 * начинается с громкости 100% без Mute. Другие документы (iframe игр)
 * узнают об изменении через событие storage.
 *
 * Если на странице есть #volume-toggle (значок в трее), щелчок по нему
 * открывает окошко с вертикальным ползунком Volume и флажком Mute.
 */
(function () {
  "use strict";
  if (window.XPVolume) return;

  const KEY_VOLUME = "xpVolume";
  const KEY_MUTED = "xpMuted";
  const ICONS =
    "/Assets/Windows XP High Resolution Icon Pack avec MAOSX/Windows XP High Resolution Icon Pack/Windows XP Icons/";
  const ICON_VOLUME = ICONS + "Volume.png";
  const ICON_MUTE = ICONS + "Mute.png";
  const GAP = 7; // зазор между окошком Volume и панелью задач, px

  // ---------- состояние ----------

  function load(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
  function save(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* приватный режим */
    }
  }
  function clamp01(v) {
    v = Number(v);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
  }

  const state = { volume: 1, muted: false };
  function readState() {
    const v = load(KEY_VOLUME);
    state.volume = v === null ? 1 : clamp01(v);
    state.muted = load(KEY_MUTED) === "1";
  }
  readState();

  const master = () => (state.muted ? 0 : state.volume);

  // ---------- <audio> / <video> ----------

  const proto = window.HTMLMediaElement && HTMLMediaElement.prototype;
  const volDesc = proto && Object.getOwnPropertyDescriptor(proto, "volume");
  const own = new WeakMap(); // элемент → громкость, заданная кодом страницы
  const tracked = new Set(); // WeakRef на элементы, которые надо пересчитать

  function nativeGet(el) {
    return volDesc.get.call(el);
  }
  function nativeSet(el, v) {
    volDesc.set.call(el, v);
  }
  function track(el) {
    if (!own.has(el)) {
      own.set(el, nativeGet(el));
      tracked.add(typeof WeakRef === "function" ? new WeakRef(el) : { deref: () => el });
    }
  }
  function applyTo(el) {
    track(el);
    nativeSet(el, own.get(el) * master());
  }

  if (volDesc && volDesc.get && volDesc.set) {
    Object.defineProperty(proto, "volume", {
      configurable: true,
      enumerable: volDesc.enumerable,
      get() {
        return own.has(this) ? own.get(this) : nativeGet(this);
      },
      set(v) {
        nativeSet(this, v); // та же проверка диапазона, что у браузера
        track(this);
        own.set(this, v);
        nativeSet(this, v * master());
      },
    });

    const play = proto.play;
    proto.play = function () {
      applyTo(this);
      return play.apply(this, arguments);
    };
  }

  // ---------- Web Audio ----------

  const gains = new Set(); // WeakRef на GainNode общей громкости
  const Base = window.BaseAudioContext || window.AudioContext || window.webkitAudioContext;
  const destDesc = Base && Object.getOwnPropertyDescriptor(Base.prototype, "destination");
  if (destDesc && destDesc.get) {
    const nodes = new WeakMap();
    Object.defineProperty(Base.prototype, "destination", {
      configurable: true,
      enumerable: destDesc.enumerable,
      get() {
        const real = destDesc.get.call(this);
        const Offline = window.OfflineAudioContext;
        if (Offline && this instanceof Offline) return real;
        let g = nodes.get(this);
        if (!g) {
          g = this.createGain();
          g.gain.value = master();
          g.connect(real);
          // Код, читающий параметры выхода, получает их от настоящего выхода.
          try {
            Object.defineProperty(g, "maxChannelCount", { get: () => real.maxChannelCount });
          } catch {
            /* не критично */
          }
          nodes.set(this, g);
          gains.add(typeof WeakRef === "function" ? new WeakRef(g) : { deref: () => g });
        }
        return g;
      },
    });
  }

  // ---------- применение ----------

  function applyAll() {
    const m = master();
    for (const ref of tracked) {
      const el = ref.deref();
      if (!el) tracked.delete(ref);
      else nativeSet(el, own.get(el) * m);
    }
    if (document.querySelectorAll) {
      document.querySelectorAll("audio, video").forEach((el) => applyTo(el));
    }
    for (const ref of gains) {
      const g = ref.deref();
      if (!g) gains.delete(ref);
      else g.gain.value = m;
    }
    listeners.forEach((fn) => fn(state));
  }

  const listeners = new Set();

  // Последняя ненулевая громкость: к ней возвращаемся, если снять Mute на нуле.
  const KEY_LAST = "xpVolumeLast";
  let lastVolume = clamp01(load(KEY_LAST) ?? (state.volume || 1)) || 1;

  function rememberVolume(v) {
    if (v > 0) {
      lastVolume = v;
      save(KEY_LAST, String(v));
    }
  }

  // Ползунок в ноль включает Mute, поднятие с нуля - выключает.
  // remember: false - промежуточные значения при перетаскивании не запоминаются.
  function setVolume(v, { remember = true } = {}) {
    const next = Math.round(clamp01(v) * 100) / 100;
    if (next > 0) {
      if (remember) rememberVolume(next);
      if (state.muted) {
        state.muted = false;
        save(KEY_MUTED, "0");
      }
    } else if (!state.muted) {
      state.muted = true;
      save(KEY_MUTED, "1");
    }
    state.volume = next;
    save(KEY_VOLUME, String(next));
    applyAll();
  }
  function setMuted(m) {
    state.muted = !!m;
    save(KEY_MUTED, state.muted ? "1" : "0");
    if (!state.muted && state.volume === 0) {
      state.volume = lastVolume;
      save(KEY_VOLUME, String(lastVolume));
    }
    applyAll();
  }

  // Изменение из другого документа (рабочий стол → iframe игры и обратно).
  window.addEventListener("storage", (e) => {
    if (e.key === KEY_VOLUME || e.key === KEY_MUTED || e.key === null) {
      readState();
      applyAll();
    }
  });

  window.XPVolume = {
    getVolume: () => state.volume,
    setVolume,
    isMuted: () => state.muted,
    setMuted,
    nativeVolume: (el) => nativeGet(el),
    onChange: (fn) => listeners.add(fn),
  };

  // ---------- значок в трее и окошко Volume ----------

  const CSS = `
    #volume-popup {
      position: fixed;
      z-index: 2147482000;
      width: 72px;
      height: 158px;
      box-sizing: border-box;
      padding: 8px 0 0;
      background: #f1efe2;
      border: 1px solid #808080;
      border-top-color: #fff;
      border-left-color: #fff;
      box-shadow: 1px 1px 0 #404040, 3px 3px 4px rgba(0, 0, 0, 0.35);
      font: 11px Tahoma, "Segoe UI", sans-serif;
      color: #000;
      user-select: none;
      display: none;
      flex-direction: column;
      align-items: center;
    }
    #volume-popup.open { display: flex; }
    #volume-popup .xp-vol-title { margin-bottom: 6px; }
    #volume-popup .xp-vol-track {
      position: relative;
      width: 4px;
      height: 92px;
      margin: 6px 0 10px;
      border-radius: 2px;
      background: #fff;
      border: 1px solid #9d9da1;
      border-right-color: #e3e3e0;
      border-bottom-color: #e3e3e0;
      box-shadow: inset 1px 1px 0 #b0b0ac;
      cursor: pointer;
    }
    #volume-popup .xp-vol-track::before {
      content: "";
      position: absolute;
      left: -10px;
      right: -10px;
      top: -6px;
      bottom: -6px;
    }
    #volume-popup .xp-vol-thumb {
      position: absolute;
      left: 50%;
      width: 22px;
      height: 11px;
      margin: -6px 0 0 -11px;
      box-sizing: border-box;
      border: 1px solid #7a8a99;
      border-radius: 2px;
      background: linear-gradient(#fff, #f3f3ef 45%, #dcdcd4);
      box-shadow: inset 2px 0 0 #21a121, inset -2px 0 0 #21a121, inset 3px 0 0 #8fe48f, inset -3px 0 0 #8fe48f;
      cursor: pointer;
      outline: none;
    }
    #volume-popup .xp-vol-thumb:hover,
    #volume-popup .xp-vol-thumb.dragging {
      box-shadow: inset 2px 0 0 #e68b2c, inset -2px 0 0 #e68b2c, inset 3px 0 0 #f8b33c, inset -3px 0 0 #f8b33c;
    }
    #volume-popup .xp-vol-thumb:focus-visible { outline: 1px dotted #000; outline-offset: 1px; }
    #volume-popup .xp-vol-mute {
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      outline: none;
    }
    #volume-popup .xp-vol-box {
      width: 13px;
      height: 13px;
      box-sizing: border-box;
      border: 1px solid #1c5180;
      background: linear-gradient(135deg, #dcdcd7, #fff);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #volume-popup .xp-vol-mute:hover .xp-vol-box {
      box-shadow: inset 0 0 0 1px #fbc761, inset 0 0 0 2px #f6d8a1;
    }
    #volume-popup .xp-vol-mute:focus-visible span:last-child { outline: 1px dotted #000; }
    #volume-popup .xp-vol-box svg { display: none; }
    #volume-popup .xp-vol-mute[aria-checked="true"] .xp-vol-box svg { display: block; }
  `;

  const TICK =
    '<svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true"><path d="M1 4.5 3.5 7 8 1.5" fill="none" stroke="#21a121" stroke-width="2"/></svg>';

  function initTray() {
    const icon = document.getElementById("volume-toggle");
    if (!icon) return;

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    const popup = document.createElement("div");
    popup.id = "volume-popup";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", "Volume");
    popup.innerHTML = `
      <div class="xp-vol-title">Volume</div>
      <div class="xp-vol-track">
        <div class="xp-vol-thumb" role="slider" tabindex="0" aria-label="Volume"
             aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <div class="xp-vol-mute" role="checkbox" tabindex="0" aria-checked="false">
        <span class="xp-vol-box">${TICK}</span><span>Mute</span>
      </div>`;
    document.body.appendChild(popup);

    const track = popup.querySelector(".xp-vol-track");
    const thumb = popup.querySelector(".xp-vol-thumb");
    const mute = popup.querySelector(".xp-vol-mute");

    function render() {
      thumb.style.top = `${(1 - state.volume) * 100}%`;
      thumb.setAttribute("aria-valuenow", String(Math.round(state.volume * 100)));
      mute.setAttribute("aria-checked", String(state.muted));
      icon.src = state.muted ? ICON_MUTE : ICON_VOLUME;
      icon.title = state.muted ? "Звук выключен" : `Громкость: ${Math.round(state.volume * 100)}%`;
      icon.alt = state.muted ? "Звук выключен" : "Громкость";
    }
    listeners.add(render);
    render();

    function place() {
      const r = icon.getBoundingClientRect();
      const w = popup.offsetWidth;
      const left = Math.min(window.innerWidth - w - 2, Math.max(2, r.left + r.width / 2 - w / 2));
      const footer = icon.closest("footer");
      const top = footer ? footer.getBoundingClientRect().top : r.top;
      popup.style.left = `${left}px`;
      popup.style.top = "";
      popup.style.bottom = `${window.innerHeight - top + GAP}px`;
    }
    function open() {
      popup.classList.add("open");
      place();
      thumb.focus({ preventScroll: true });
    }
    function close() {
      popup.classList.remove("open");
    }

    icon.style.cursor = "pointer";
    icon.setAttribute("role", "button");
    icon.setAttribute("tabindex", "0");
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      popup.classList.contains("open") ? close() : open();
    });
    icon.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        popup.classList.contains("open") ? close() : open();
      }
    });
    document.addEventListener("mousedown", (e) => {
      if (popup.classList.contains("open") && !popup.contains(e.target) && e.target !== icon) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && popup.classList.contains("open")) close();
    });
    window.addEventListener("resize", () => popup.classList.contains("open") && place());

    // Ползунок: перетаскивание и щелчок по дорожке.
    function fromPointer(clientY) {
      const r = track.getBoundingClientRect();
      setVolume(1 - (clientY - r.top) / r.height, { remember: false });
    }
    function startDrag(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      thumb.classList.add("dragging");
      thumb.focus({ preventScroll: true });
      fromPointer(e.clientY);
      const move = (ev) => fromPointer(ev.clientY);
      const up = () => {
        thumb.classList.remove("dragging");
        rememberVolume(state.volume);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }
    track.addEventListener("pointerdown", startDrag);

    thumb.addEventListener("keydown", (e) => {
      const steps = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.2, PageDown: -0.2 };
      if (e.key in steps) setVolume(state.volume + steps[e.key]);
      else if (e.key === "Home") setVolume(1);
      else if (e.key === "End") setVolume(0);
      else return;
      e.preventDefault();
    });
    popup.addEventListener("wheel", (e) => {
      e.preventDefault();
      setVolume(state.volume + (e.deltaY < 0 ? 0.05 : -0.05));
    }, { passive: false });

    mute.addEventListener("click", () => setMuted(!state.muted));
    mute.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setMuted(!state.muted);
      }
    });
  }

  // Экран загрузки = новый заход на сайт: звук на максимум.
  function resetOnBoot() {
    if (!document.getElementById("loader")) return;
    rememberVolume(1);
    state.volume = 1;
    state.muted = false;
    save(KEY_VOLUME, "1");
    save(KEY_MUTED, "0");
    applyAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      resetOnBoot();
      initTray();
    });
  } else {
    resetOnBoot();
    initTray();
  }
})();

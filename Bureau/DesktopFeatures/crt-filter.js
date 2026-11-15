/*!
 * CRT-эффект для Atanov XP.
 *
 * Шейдер - по мотивам CRTFilterWebGL (https://github.com/Ichiaka/CRTFilter),
 * Copyright (c) 2025 Aka, лицензия MIT.
 *
 * Оригинал обрабатывает пиксели одного <canvas>. Сайт - это HTML (окна, iframe,
 * видео), поэтому здесь шейдер рисует прозрачный слой поверх страницы: строки
 * развёртки, бегущую полосу обратного хода, полосы потери сигнала, шум,
 * мерцание, затемнение к краям. Цвет (яркость, контраст,
 * обесцвечивание) правит backdrop-filter того же слоя. Клики проходят насквозь.
 *
 * Поведение:
 *  - по умолчанию эффект выключен;
 *  - на рабочем столе щит в трее (#crt-toggle) и пункт «CRT-эффект» в меню
 *    рабочего стола включают/выключают его;
 *  - выбор хранится в localStorage["crtEffect.v2"] ("on" / "off") и действует
 *    на всех экранах (экраны входа показывают эффект, только если его включили).
 */
(function () {
  "use strict";

  const STORAGE_KEY = "crtEffect.v2";
  // Прежний ключ: экран входа сам записывал туда "on" - сбрасываем, чтобы у всех эффект стал выключен.
  const LEGACY_KEY = "crtEffect";
  const ICONS =
    "/Assets/Windows XP High Resolution Icon Pack avec MAOSX/Windows XP High Resolution Icon Pack/Windows XP Icons/";
  const ICON_ON = ICONS + "Security - Ok.png";
  const ICON_OFF = ICONS + "Security Error.png";
  const TITLE_ON = "CRT-эффект включён - щёлкните, чтобы выключить";
  const TITLE_OFF = "CRT-эффект выключен - щёлкните, чтобы включить";

  // Значения близки к настройкам по умолчанию CRTFilter, но мягче:
  // поверх текста портфолио эффект должен оставаться читаемым.
  const CONFIG = {
    scanlineIntensity: 0.08, // глубина строк развёртки
    scanlinePeriod: 3, // шаг строк, css-пиксели
    signalLoss: 0.01, // полосы потери сигнала
    retrace: 0.025, // яркость бегущей полосы обратного хода
    staticNoise: 0.02, // шум
    flicker: 0, // мерцание (выключено)
    vignette: 0.15, // затемнение к краям
    backdrop: "saturate(0.95) contrast(1.02)",
  };

  const VERTEX = `
    attribute vec2 a_position;
    void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
  `;

  const FRAGMENT = `
    precision mediump float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform float u_dpr;
    uniform float u_scan;
    uniform float u_scanPeriod;
    uniform float u_signalLoss;
    uniform float u_retrace;
    uniform float u_noise;
    uniform float u_flicker;
    uniform float u_vignette;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 frag = gl_FragCoord.xy;
      vec2 uv = frag / u_res;
      float y = frag.y / u_dpr;
      float t = u_time;

      float dark = 0.0;
      float light = 0.0;

      // Строки развёртки.
      dark += u_scan * (0.5 + 0.5 * sin(y * 6.2831853 / u_scanPeriod));

      // Потеря сигнала (VHS/UHF), как u_signalLoss в оригинале.
      dark += u_signalLoss * abs(sin(uv.y * 50.0 + t * 10.0));

      // Полоса обратного хода луча: мягкая светлая полоса сверху вниз.
      float pos = 1.0 - fract(t * 0.11);
      float d = uv.y - pos;
      light += u_retrace * exp(-d * d * 900.0);

      // Статический шум.
      float n = rand(floor(frag / u_dpr) + fract(t * 7.0)) - 0.5;
      light += max(n, 0.0) * u_noise;
      dark += max(-n, 0.0) * u_noise;

      // Виньетка с учётом «выпуклости» экрана.
      vec2 c = uv - 0.5;
      dark += smoothstep(0.16, 0.55, dot(c, c) * 1.6) * u_vignette;

      // Мерцание.
      float flick = 1.0 + u_flicker * sin(t * 60.0);
      dark = clamp(dark * flick, 0.0, 1.0);
      light = clamp(light * flick, 0.0, 1.0);

      // Премультиплицированный цвет: светлое поверх тёмного.
      gl_FragColor = vec4(vec3(light), max(dark, light));
    }
  `;

  // ---------- состояние ----------

  function readState() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function writeState(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* приватный режим - просто не запоминаем */
    }
  }

  // ---------- слой ----------

  let overlay = null;
  let renderer = null;

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function createRenderer(canvas) {
    const gl =
      canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false }) ||
      canvas.getContext("experimental-webgl");
    if (!gl) return null;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("CRT shader:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("CRT program:", gl.getProgramInfoLog(program));
      return null;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name) => gl.getUniformLocation(program, name);
    gl.uniform1f(u("u_scan"), CONFIG.scanlineIntensity);
    gl.uniform1f(u("u_scanPeriod"), CONFIG.scanlinePeriod);
    gl.uniform1f(u("u_signalLoss"), CONFIG.signalLoss);
    gl.uniform1f(u("u_retrace"), CONFIG.retrace);
    gl.uniform1f(u("u_noise"), CONFIG.staticNoise);
    gl.uniform1f(u("u_flicker"), CONFIG.flicker);
    gl.uniform1f(u("u_vignette"), CONFIG.vignette);
    const uRes = u("u_res");
    const uTime = u("u_time");
    const uDpr = u("u_dpr");

    let frame = null;
    const still = reducedMotion();

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(window.innerWidth * dpr));
      const h = Math.max(1, Math.round(window.innerHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uDpr, dpr);
    }

    function draw() {
      resize();
      gl.uniform1f(uTime, still ? 0 : performance.now() / 1000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = still ? null : requestAnimationFrame(draw);
    }

    function onResize() {
      if (still) draw();
    }

    return {
      start() {
        window.addEventListener("resize", onResize);
        draw();
      },
      stop() {
        window.removeEventListener("resize", onResize);
        if (frame) cancelAnimationFrame(frame);
        frame = null;
        const lose = gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
      },
    };
  }

  function mount() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = "crt-overlay";
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483000",
      pointerEvents: "none",
      backdropFilter: CONFIG.backdrop,
      webkitBackdropFilter: CONFIG.backdrop,
    });

    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    renderer = createRenderer(canvas);
    if (renderer) {
      renderer.start();
    } else {
      // Без WebGL - статичная замена на CSS: строки развёртки и виньетка.
      canvas.remove();
      overlay.style.background =
        "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 1px, rgba(0,0,0,0.08) 2px 3px)," +
        "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.15) 100%)";
    }
  }

  function unmount() {
    if (renderer) renderer.stop();
    renderer = null;
    if (overlay) overlay.remove();
    overlay = null;
  }

  // ---------- переключатель в трее ----------

  function syncToggle() {
    const icon = document.getElementById("crt-toggle");
    if (!icon) return;
    const on = isEnabled();
    icon.src = on ? ICON_ON : ICON_OFF;
    icon.title = on ? TITLE_ON : TITLE_OFF;
    icon.alt = on ? "CRT-эффект включён" : "CRT-эффект выключен";
    icon.setAttribute("aria-pressed", String(on));
  }

  function bindToggle() {
    const icon = document.getElementById("crt-toggle");
    if (!icon) return;
    icon.setAttribute("role", "button");
    icon.setAttribute("tabindex", "0");
    icon.style.cursor = "pointer";
    icon.addEventListener("click", toggle);
    icon.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
    syncToggle();
  }

  // ---------- API ----------

  function isEnabled() {
    return readState() === "on";
  }

  function setEnabled(on) {
    writeState(on ? "on" : "off");
    if (on) mount();
    else unmount();
    syncToggle();
  }

  function toggle() {
    setEnabled(!isEnabled());
  }

  window.CRTEffect = { enable: () => setEnabled(true), disable: () => setEnabled(false), toggle, isEnabled };

  // ---------- запуск ----------

  // Экран входа показывает эффект только когда тот включён (во время загрузки - никогда).
  function watchLoginScreen(loginScreen) {
    const check = () => {
      if (loginScreen.classList.contains("hidden")) return false;
      if (isEnabled()) mount();
      return true;
    };
    if (check()) return;
    const observer = new MutationObserver(() => {
      if (check()) observer.disconnect();
    });
    observer.observe(loginScreen, { attributes: true, attributeFilter: ["class"] });
  }

  function init() {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* хранилище недоступно */
    }
    const loginScreen = document.getElementById("login-screen");
    if (loginScreen) {
      watchLoginScreen(loginScreen);
    } else if (isEnabled()) {
      mount();
    }
    bindToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

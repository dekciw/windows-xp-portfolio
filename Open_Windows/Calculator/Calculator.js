// Инженерный калькулятор Windows XP (окно «Калькулятор»).
// openWindow('Calculator') подгружает Calculator.html и вызывает XPCalculator.init(windowElement).
(function () {
  "use strict";

  const ERR_DIV0 = "Деление на ноль невозможно.";
  const ERR_INVALID = "Недопустимые входные данные для функции.";
  const ERR_OVERFLOW = "Переполнение.";

  // Приоритет бинарных операций (как в инженерном режиме XP): 2 + 3 * 4 = 14.
  const PRECEDENCE = { or: 1, xor: 2, and: 3, lsh: 4, rsh: 4, "+": 5, "-": 5, "*": 6, "/": 6, mod: 6, pow: 7, root: 7 };
  const BINARY_KEYS = { "+": "+", "-": "-", "*": "*", "/": "/", mod: "mod", and: "and", or: "or", xor: "xor", lsh: "lsh", pow: "pow" };
  const MAX_DIGITS = { 10: 32, 16: 16, 8: 22, 2: 64 };
  const NON_DEC_DISABLED = [".", "fe", "dms", "exp", "sin", "cos", "tan", "pi"];
  const STATS_KEYS = ["ave", "sum", "s", "dat"];

  class CalcError extends Error {}
  const fail = (msg) => {
    throw new CalcError(msg);
  };

  const toBig = (x) => BigInt.asIntN(64, BigInt(Math.trunc(x)));
  const fromBig = (b) => Number(BigInt.asIntN(64, b));

  function checked(x) {
    if (Number.isNaN(x)) fail(ERR_INVALID);
    if (!Number.isFinite(x)) fail(ERR_OVERFLOW);
    return Object.is(x, -0) ? 0 : x;
  }

  function applyBinary(a, op, b) {
    switch (op) {
      case "+": return checked(a + b);
      case "-": return checked(a - b);
      case "*": return checked(a * b);
      case "/":
        if (b === 0) fail(a === 0 ? ERR_INVALID : ERR_DIV0);
        return checked(a / b);
      case "mod":
        if (b === 0) fail(ERR_DIV0);
        return checked(a % b);
      case "pow": return checked(Math.pow(a, b));
      case "root": {
        if (b === 0) fail(ERR_INVALID);
        if (a < 0 && Number.isInteger(b) && Math.abs(b) % 2 === 1) return checked(-Math.pow(-a, 1 / b));
        return checked(Math.pow(a, 1 / b));
      }
      case "and": return fromBig(toBig(a) & toBig(b));
      case "or": return fromBig(toBig(a) | toBig(b));
      case "xor": return fromBig(toBig(a) ^ toBig(b));
      case "lsh":
      case "rsh": {
        const n = Math.trunc(b);
        if (n < 0 || n > 63) fail(ERR_INVALID);
        return fromBig(op === "lsh" ? toBig(a) << BigInt(n) : toBig(a) >> BigInt(n));
      }
    }
    return b;
  }

  // Гамма-функция (Ланцош) — для n! от дробных чисел, как в XP.
  function gamma(z) {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    z -= 1;
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  function factorial(x) {
    if (Number.isInteger(x)) {
      if (x < 0) fail(ERR_INVALID);
      if (x > 170) fail(ERR_OVERFLOW);
      let r = 1;
      for (let i = 2; i <= x; i++) r *= i;
      return r;
    }
    if (x < 0 && Number.isInteger(x + 1)) fail(ERR_INVALID);
    return checked(gamma(x + 1));
  }

  // Число -> строка дисплея в десятичной системе (запятая, как в русской XP: «125,»).
  function formatDec(v, fe) {
    if (Object.is(v, -0)) v = 0;
    if (v === 0) return fe ? "0,e+0" : "0,";
    const sign = v < 0 ? "-" : "";
    const a = Math.abs(v);
    let digits;
    let e;
    if (Number.isInteger(a) && a < 1e16) {
      digits = String(a);
      e = digits.length - 1;
    } else {
      const [m, ex] = a.toExponential(14).split("e");
      digits = m.replace(".", "");
      e = parseInt(ex, 10);
    }
    digits = digits.replace(/0+$/, "") || "0";
    if (fe || e >= 32 || (e < 0 && digits.length - e > 32)) {
      return `${sign}${digits[0]},${digits.slice(1)}e${e < 0 ? "-" : "+"}${Math.abs(e)}`;
    }
    if (e >= 0) {
      const padded = digits.padEnd(e + 1, "0");
      return `${sign}${padded.slice(0, e + 1)},${padded.slice(e + 1)}`;
    }
    return `${sign}0,${"0".repeat(-e - 1)}${digits}`;
  }

  function formatValue(v, base, fe) {
    if (base === 10) return formatDec(v, fe);
    return BigInt.asUintN(64, BigInt(Math.trunc(v))).toString(base).toUpperCase();
  }

  function createEngine() {
    const s = {
      base: 10,
      angle: "deg",
      inv: false,
      hyp: false,
      fe: false,
      entry: null, // { mant, neg, exp, expNeg } — число, которое сейчас набирается
      value: 0, // последний результат
      frames: [[]], // стек незавершённых операций; новый кадр на каждую «(»
      justOp: false, // только что нажата бинарная операция
      lastBin: null, // для повторного «=»
      memory: 0,
      statsOn: false,
      data: [],
      error: null,
    };

    const newEntry = () => ({ mant: "", neg: false, exp: null, expNeg: false });

    function entryValue(en) {
      if (s.base === 10) {
        const str = `${en.neg ? "-" : ""}${en.mant || "0"}${en.exp !== null ? `e${en.expNeg ? "-" : ""}${en.exp || "0"}` : ""}`;
        return checked(Number(str));
      }
      const prefix = { 16: "0x", 8: "0o", 2: "0b" }[s.base];
      const n = fromBig(BigInt(prefix + (en.mant || "0")));
      return en.neg ? fromBig(-toBig(n)) : n;
    }

    const current = () => (s.entry ? entryValue(s.entry) : s.value);

    function normalize(x) {
      return s.base === 10 ? x : fromBig(toBig(x));
    }

    function setResult(x) {
      s.value = normalize(checked(x));
      s.entry = null;
      s.justOp = false;
    }

    function resetAll() {
      s.entry = null;
      s.value = 0;
      s.frames = [[]];
      s.justOp = false;
      s.lastBin = null;
      s.error = null;
    }

    function reduceFrame(frame, x, minPrec) {
      while (frame.length) {
        const top = frame[frame.length - 1];
        if (PRECEDENCE[top.op] < minPrec) break;
        x = normalize(applyBinary(top.v, top.op, x));
        frame.pop();
      }
      return x;
    }

    const toRad = (x) => (s.angle === "deg" ? (x * Math.PI) / 180 : s.angle === "grad" ? (x * Math.PI) / 200 : x);
    const fromRad = (r) => (s.angle === "deg" ? (r * 180) / Math.PI : s.angle === "grad" ? (r * 200) / Math.PI : r);
    // sin(180°) в double = 1.2e-16: прижимаем такие «шумы» к нулю.
    const snap = (res, r) => (Math.abs(r) >= 1 && Math.abs(res) < 1e-15 * Math.abs(r) ? 0 : res);

    function trig(fn, x) {
      if (s.hyp) {
        if (!s.inv) return { sin: Math.sinh, cos: Math.cosh, tan: Math.tanh }[fn](x);
        if (fn === "cos" && x < 1) fail(ERR_INVALID);
        if (fn === "tan" && Math.abs(x) >= 1) fail(ERR_INVALID);
        return { sin: Math.asinh, cos: Math.acosh, tan: Math.atanh }[fn](x);
      }
      if (s.inv) {
        if (fn !== "tan" && Math.abs(x) > 1) fail(ERR_INVALID);
        return fromRad({ sin: Math.asin, cos: Math.acos, tan: Math.atan }[fn](x));
      }
      const r = toRad(x);
      if (fn === "sin") return snap(Math.sin(r), r);
      if (fn === "cos") return snap(Math.cos(r), r);
      if (snap(Math.cos(r), r) === 0) fail(ERR_INVALID);
      return snap(Math.sin(r), r) / Math.cos(r);
    }

    function dms(x) {
      const sign = x < 0 ? -1 : 1;
      const a = Math.abs(x);
      const d = Math.floor(a);
      if (s.inv) {
        const rest = (a - d) * 100;
        const m = Math.floor(rest + 1e-9);
        const sec = (rest - m) * 100;
        return sign * (d + m / 60 + sec / 3600);
      }
      const mf = (a - d) * 60;
      const m = Math.floor(mf + 1e-9);
      const sec = (mf - m) * 60;
      return sign * (d + m / 100 + sec / 10000);
    }

    function stat(kind) {
      const n = s.data.length;
      if (!n) return 0;
      const sum = s.data.reduce((acc, v) => acc + v, 0);
      const sumSq = s.data.reduce((acc, v) => acc + v * v, 0);
      if (kind === "sum") return s.inv ? sumSq : sum;
      if (kind === "ave") return s.inv ? sumSq / n : sum / n;
      const mean = sum / n;
      const dev = s.data.reduce((acc, v) => acc + (v - mean) ** 2, 0);
      const div = s.inv ? n : n - 1;
      return div > 0 ? Math.sqrt(dev / div) : 0;
    }

    // Унарные функции: результат заменяет текущее число. Inv/Hyp сбрасываются (как в XP).
    const UNARY = {
      sin: (x) => trig("sin", x),
      cos: (x) => trig("cos", x),
      tan: (x) => trig("tan", x),
      sqr: (x) => {
        if (!s.inv) return x * x;
        if (x < 0) fail(ERR_INVALID);
        return Math.sqrt(x);
      },
      cube: (x) => (s.inv ? Math.cbrt(x) : x * x * x),
      ln: (x) => {
        if (s.inv) return Math.exp(x);
        if (x <= 0) fail(ERR_INVALID);
        return Math.log(x);
      },
      log: (x) => {
        if (s.inv) return Math.pow(10, x);
        if (x <= 0) fail(ERR_INVALID);
        return Math.log10(x);
      },
      fact: factorial,
      inv: (x) => {
        if (x === 0) fail(ERR_DIV0);
        return 1 / x;
      },
      dms,
      int: (x) => (s.inv ? x - Math.trunc(x) : Math.trunc(x)),
      not: (x) => fromBig(~toBig(x)),
      pi: () => (s.inv ? 2 * Math.PI : Math.PI),
      ave: () => stat("ave"),
      sum: () => stat("sum"),
      s: () => stat("s"),
    };

    function clearMods() {
      s.inv = false;
      s.hyp = false;
    }

    function digit(d) {
      if (!s.entry) {
        s.entry = newEntry();
        s.justOp = false;
      }
      const en = s.entry;
      if (en.exp !== null) {
        if (en.exp.length < 4) en.exp = (en.exp + d).replace(/^0+(?=\d)/, "");
        return;
      }
      const count = en.mant.replace(".", "").replace(/^0+/, "").length;
      if (count >= MAX_DIGITS[s.base]) return;
      en.mant = en.mant === "0" ? d : en.mant + d;
    }

    function binary(op) {
      if (s.justOp) {
        const frame = s.frames[s.frames.length - 1];
        if (frame.length) {
          frame[frame.length - 1].op = op;
          return;
        }
      }
      const frame = s.frames[s.frames.length - 1];
      const prec = PRECEDENCE[op];
      // Возведение в степень правоассоциативно: 2^3^2 = 2^9.
      const x = reduceFrame(frame, current(), op === "pow" || op === "root" ? prec + 1 : prec);
      frame.push({ v: x, op });
      s.value = x;
      s.entry = null;
      s.justOp = true;
    }

    function equals() {
      let x = current();
      const outer = s.frames.length === 1 ? s.frames[0] : null;
      if (outer && outer.length) {
        s.lastBin = { op: outer[outer.length - 1].op, rhs: x };
      }
      const hadOps = s.frames.some((f) => f.length);
      while (s.frames.length) {
        x = reduceFrame(s.frames.pop(), x, -Infinity);
      }
      s.frames = [[]];
      if (!hadOps && s.lastBin) x = normalize(applyBinary(x, s.lastBin.op, s.lastBin.rhs));
      setResult(x);
    }

    function press(key) {
      if (s.error) {
        if (key === "clear" || key === "ce") {
          resetAll();
          return;
        }
        if (/^[0-9A-F]$/.test(key) || key === ".") resetAll();
        else return;
      }
      try {
        handle(key);
      } catch (err) {
        if (!(err instanceof CalcError)) throw err;
        resetAll();
        s.error = err.message;
        clearMods();
      }
    }

    function handle(key) {
      if (/^[0-9A-F]$/.test(key)) {
        if (parseInt(key, 16) < s.base) digit(key);
        return;
      }
      if (BINARY_KEYS[key]) {
        let op = BINARY_KEYS[key];
        if (op === "pow" && s.inv) op = "root";
        if (op === "lsh" && s.inv) op = "rsh";
        if (key === "pow" || key === "lsh") clearMods();
        binary(op);
        return;
      }
      if (UNARY[key]) {
        if (NON_DEC_DISABLED.includes(key) && s.base !== 10) return;
        if (STATS_KEYS.includes(key) && !s.statsOn) return;
        const x = key === "pi" ? 0 : current();
        const r = UNARY[key](x);
        clearMods();
        setResult(r);
        return;
      }
      switch (key) {
        case "=": equals(); break;
        case "clear": resetAll(); break;
        case "ce": s.entry = newEntry(); s.justOp = false; break;
        case "back": {
          const en = s.entry;
          if (!en) break;
          if (en.exp !== null) {
            if (en.exp.length) en.exp = en.exp.slice(0, -1);
            else en.exp = null;
          } else {
            en.mant = en.mant.slice(0, -1);
            if (en.mant === "" || en.mant === "-") en.neg = false;
          }
          break;
        }
        case ".": {
          if (s.base !== 10) break;
          if (!s.entry) {
            s.entry = newEntry();
            s.justOp = false;
          }
          if (s.entry.exp === null && !s.entry.mant.includes(".")) s.entry.mant = (s.entry.mant || "0") + ".";
          break;
        }
        case "neg":
          if (s.entry) {
            if (s.entry.exp !== null) s.entry.expNeg = !s.entry.expNeg;
            else s.entry.neg = !s.entry.neg;
          } else {
            setResult(-s.value);
          }
          break;
        case "exp": {
          if (s.base !== 10) break;
          if (!s.entry) {
            const v = s.value;
            s.entry = newEntry();
            if (v !== 0 && Math.abs(v) < 1e16 && Number.isInteger(v)) {
              s.entry.mant = String(Math.abs(v));
              s.entry.neg = v < 0;
            }
            s.justOp = false;
          }
          if (s.entry.exp === null) s.entry.exp = "";
          break;
        }
        case "fe": if (s.base === 10) s.fe = !s.fe; break;
        case "(":
          s.frames.push([]);
          s.entry = null;
          s.justOp = false;
          break;
        case ")": {
          if (s.frames.length < 2) break;
          const x = reduceFrame(s.frames.pop(), current(), -Infinity);
          setResult(x);
          break;
        }
        case "mc": s.memory = 0; break;
        case "mr": setResult(s.memory); break;
        case "ms": s.memory = current(); s.entry = null; s.value = s.memory; break;
        case "m+": s.memory = checked(s.memory + current()); s.value = current(); s.entry = null; break;
        case "sta":
          s.statsOn = !s.statsOn;
          if (!s.statsOn) s.data = [];
          break;
        case "dat":
          if (!s.statsOn) break;
          s.data.push(current());
          s.value = current();
          s.entry = null;
          break;
      }
    }

    function setBase(base) {
      if (s.error) resetAll();
      let x = 0;
      try {
        x = current();
      } catch (err) {
        x = 0;
      }
      s.base = base;
      s.entry = null;
      s.value = normalize(x);
      if (base !== 10) s.fe = false;
    }

    function display() {
      if (s.error) return s.error;
      const en = s.entry;
      if (!en) return formatValue(s.value, s.base, s.fe);
      if (s.base !== 10) return en.neg ? formatValue(entryValue(en), s.base) : en.mant || "0";
      let text = `${en.neg ? "-" : ""}${(en.mant || "0").replace(".", ",")}`;
      if (!en.mant.includes(".")) text += ",";
      if (en.exp !== null) text += `e${en.expNeg ? "-" : "+"}${en.exp || "0"}`;
      return text;
    }

    return {
      state: s,
      press,
      setBase,
      setAngle: (a) => {
        s.angle = a;
      },
      display,
      parenDepth: () => s.frames.length - 1,
    };
  }

  // ---------- Окно ----------

  let instance = null;

  function render(inst) {
    const { win, engine } = inst;
    const s = engine.state;
    const displayEl = win.querySelector(".calc-display");
    displayEl.value = engine.display();
    displayEl.classList.toggle("is-error", !!s.error);

    const depth = engine.parenDepth();
    win.querySelector(".calc-indicator--paren").textContent = depth ? `(=${depth}` : "";
    win.querySelector(".calc-indicator--mem").textContent = s.memory !== 0 ? "M" : "";

    win.querySelectorAll(".calc-btn[data-key]").forEach((btn) => {
      const key = btn.dataset.key;
      let disabled = false;
      if (/^[0-9A-F]$/.test(key)) disabled = parseInt(key, 16) >= s.base;
      else if (NON_DEC_DISABLED.includes(key)) disabled = s.base !== 10;
      else if (STATS_KEYS.includes(key)) disabled = !s.statsOn;
      btn.disabled = disabled;
      if (key === "sta") btn.classList.toggle("is-on", s.statsOn);
    });

    win.querySelectorAll('input[name="calc-angle"]').forEach((r) => {
      r.disabled = s.base !== 10;
      r.checked = r.value === s.angle;
    });
    win.querySelectorAll('input[name="calc-base"]').forEach((r) => {
      r.checked = Number(r.value) === s.base;
    });
    win.querySelector('input[data-mod="inv"]').checked = s.inv;
    win.querySelector('input[data-mod="hyp"]').checked = s.hyp;
  }

  // Окно фиксированного размера; если экран меньше окна — уменьшаем его целиком
  // и не даём уехать за край экрана.
  function fit(win) {
    if (!win.isConnected) return;
    const w = win.offsetWidth;
    const h = win.offsetHeight;
    if (!w || !h) return;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight - 35; // панель задач
    const scale = Math.min(1, (vw - 8) / w, (vh - 8) / h);
    win.style.transform = scale < 1 ? `scale(${scale})` : "";
    const left = parseFloat(win.style.left) || 0;
    const top = parseFloat(win.style.top) || 0;
    const maxLeft = Math.max(0, vw - w * scale - 4);
    const maxTop = Math.max(0, vh - h * scale - 4);
    if (left > maxLeft) win.style.left = `${maxLeft}px`;
    if (top > maxTop) win.style.top = `${maxTop}px`;
  }

  function init(win) {
    const engine = createEngine();
    const inst = { win, engine };
    instance = inst;

    win.addEventListener("click", (e) => {
      const btn = e.target.closest(".calc-btn[data-key]");
      if (!btn || btn.disabled || !win.contains(btn)) return;
      engine.press(btn.dataset.key);
      render(inst);
    });

    win.addEventListener("change", (e) => {
      const t = e.target;
      if (t.name === "calc-base") engine.setBase(Number(t.value));
      else if (t.name === "calc-angle") engine.setAngle(t.value);
      else if (t.dataset && t.dataset.mod) engine.state[t.dataset.mod] = t.checked;
      render(inst);
    });

    render(inst);
    fit(win);
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(() => {
        if (!win.isConnected) ro.disconnect();
        else fit(win);
      });
      ro.observe(win);
    }
    return inst;
  }

  window.addEventListener("resize", () => {
    if (instance && instance.win.isConnected) fit(instance.win);
  });

  // ---------- Клавиатура ----------
  const KEYMAP = {
    "+": "+", "-": "-", "*": "*", "/": "/", "=": "=", Enter: "=",
    Escape: "clear", Delete: "ce", Backspace: "back", ".": ".", ",": ".",
    "(": "(", ")": ")", "%": "mod", "^": "pow", "!": "fact", "&": "and", "|": "or", "<": "lsh", "~": "not",
    n: "ln", l: "log", s: "sin", o: "cos", t: "tan", p: "pi", r: "inv", "@": "sqr", "#": "cube",
    x: "exp", v: "fe", m: "dms", ";": "int",
  };

  function isActive(win) {
    if (!win.isConnected || win.style.display === "none") return false;
    let topZ = -Infinity;
    let top = null;
    document.querySelectorAll(".window").forEach((w) => {
      if (w.style.display === "none") return;
      const z = parseInt(w.style.zIndex, 10) || 0;
      if (z >= topZ) {
        topZ = z;
        top = w;
      }
    });
    return top === win;
  }

  document.addEventListener("keydown", (e) => {
    if (!instance || e.ctrlKey || e.metaKey || e.altKey) return;
    const { win, engine } = instance;
    if (!isActive(win)) return;
    const target = e.target;
    if (target && target !== document.body && !win.contains(target) && target.matches("input, textarea, [contenteditable]")) return;

    let key = null;
    const k = e.key;
    if (/^[0-9]$/.test(k)) key = k;
    else if (/^[a-fA-F]$/.test(k) && engine.state.base === 16) key = k.toUpperCase();
    else if (k === "i" || k === "h") {
      const mod = k === "i" ? "inv" : "hyp";
      engine.state[mod] = !engine.state[mod];
      e.preventDefault();
      render(instance);
      return;
    } else key = KEYMAP[k] || null;
    if (!key) return;

    const btn = win.querySelector(`.calc-btn[data-key="${CSS.escape(key)}"]`);
    if (btn && btn.disabled) return;
    e.preventDefault();
    engine.press(key);
    render(instance);
    if (btn) {
      btn.classList.add("is-pressed");
      setTimeout(() => btn.classList.remove("is-pressed"), 100);
    }
  });

  window.XPCalculator = { init, createEngine, formatDec };
})();

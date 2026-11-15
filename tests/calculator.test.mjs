import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/harness.mjs";

// Инженерный калькулятор Windows XP: раскладка по скриншоту XP, вычисления, подгонка под экран.

const WIN = "#window-Calculator";
let h;

before(async () => {
  h = await startHarness();
  await h.page.evaluate(() => openCalculator());
  await h.page.waitForSelector(`${WIN} .calc-btn[data-key="pi"]`, { timeout: 5000 });
  await h.page.waitForFunction(
    (sel) => getComputedStyle(document.querySelector(`${sel} .calc-grid`)).display === "grid",
    {},
    WIN
  );
});
after(async () => h && (await h.close()));

// Нажимает кнопки по data-key и возвращает текст дисплея.
const press = (...keys) =>
  h.page.evaluate(
    (sel, keys) => {
      const win = document.querySelector(sel);
      for (const k of keys) {
        const btn = win.querySelector(`.calc-btn[data-key="${CSS.escape(k)}"]`);
        if (!btn) throw new Error(`нет кнопки ${k}`);
        btn.click();
      }
      return win.querySelector(".calc-display").value;
    },
    WIN,
    keys
  );
const reset = () => press("clear");
const setRadio = (name, value) =>
  h.page.evaluate(
    (sel, name, value) => {
      const r = document.querySelector(`${sel} input[name="${name}"][value="${value}"]`);
      r.click();
    },
    WIN,
    name,
    value
  );
const setMod = (mod) =>
  h.page.evaluate((sel, mod) => document.querySelector(`${sel} input[data-mod="${mod}"]`).click(), WIN, mod);

test("раскладка как в XP: 5 рядов по 14 колонок, все кнопки на месте, колонки выровнены", async () => {
  const info = await h.page.evaluate((sel) => {
    const win = document.querySelector(sel);
    const labels = [...win.querySelectorAll(".calc-btn")].map((b) => b.textContent.trim());
    const left = (k) => Math.round(win.querySelector(`.calc-btn[data-key="${k}"]`).getBoundingClientRect().left);
    const top = (k) => Math.round(win.querySelector(`.calc-btn[data-key="${k}"]`).getBoundingClientRect().top);
    return {
      labels,
      cols: [["sta", "dat"], ["fe", "tan"], ["mc", "pi"], ["7", "0"], ["and", "F"]].map(([a, b]) => left(a) === left(b)),
      rows: [["sta", "and"], ["dat", "F"], ["sin", "lsh"]].map(([a, b]) => top(a) === top(b)),
      width: Math.round(win.getBoundingClientRect().width),
      display: win.querySelector(".calc-display").value,
    };
  }, WIN);
  for (const l of ["Backspace", "CE", "C", "Sta", "Ave", "Sum", "s", "Dat", "F-E", "dms", "Exp", "ln", "sin", "x^y",
    "log", "cos", "x^3", "n!", "tg", "x^2", "1/x", "MC", "MR", "MS", "M+", "pi", "Mod", "And", "Or", "Xor", "Lsh",
    "Not", "Int", "+/-", ",", "=", "A", "F"]) {
    assert.ok(info.labels.includes(l), `кнопка ${l}`);
  }
  assert.equal(info.labels.length, 3 + 5 * 11);
  assert.deepEqual(info.cols, [true, true, true, true, true]);
  assert.deepEqual(info.rows, [true, true, true]);
  assert.ok(info.width > 440 && info.width < 520, `ширина окна ${info.width}`);
  assert.equal(info.display, "0,");
});

test("приоритет операций и скобки", async () => {
  await reset();
  assert.equal(await press("2", "+", "3", "*", "4", "="), "14,");
  await reset();
  assert.equal(await press("(", "2", "+", "3", ")", "*", "4", "="), "20,");
  await reset();
  assert.equal(await press("1", "0", "/", "4", "="), "2,5");
  await reset();
  assert.equal(await press("2", "pow", "1", "0", "="), "1024,");
  await reset();
  assert.equal(await press("1", "7", "mod", "5", "="), "2,");
  await reset();
  assert.equal(await press(".", "1", "+", ".", "2", "="), "0,3");
});

test("функции и Inv/Hyp", async () => {
  await reset();
  assert.equal(await press("3", "0", "sin"), "0,5");
  await reset();
  assert.equal(await press("1", "8", "0", "cos"), "-1,");
  await reset();
  assert.equal(await press("5", "fact"), "120,");
  await reset();
  await setMod("inv");
  assert.equal(await press("1", "6", "sqr"), "4,");
  const invAfter = await h.page.evaluate((sel) => document.querySelector(`${sel} input[data-mod="inv"]`).checked, WIN);
  assert.equal(invAfter, false, "Inv сбрасывается после функции");
  await reset();
  assert.equal(await press("1", "0", "0", "log"), "2,");
  await reset();
  assert.equal(await press("1", "inv"), "1,");
  await reset();
  assert.equal(await press("0", "inv"), "Деление на ноль невозможно.");
  assert.equal(await press("7"), "7,");
});

test("Hex/Bin: перевод, недоступные кнопки, логика", async () => {
  await reset();
  await press("2", "5", "5");
  await setRadio("calc-base", "16");
  const hex = await h.page.evaluate((sel) => {
    const w = document.querySelector(sel);
    return {
      value: w.querySelector(".calc-display").value,
      aEnabled: !w.querySelector('.calc-btn[data-key="A"]').disabled,
      sinDisabled: w.querySelector('.calc-btn[data-key="sin"]').disabled,
      angleDisabled: w.querySelector('input[name="calc-angle"]').disabled,
    };
  }, WIN);
  assert.deepEqual(hex, { value: "FF", aEnabled: true, sinDisabled: true, angleDisabled: true });
  assert.equal(await press("and", "F", "="), "F");
  await setRadio("calc-base", "2");
  assert.equal(await press("clear", "1", "0", "1", "lsh", "1", "="), "1010");
  await setRadio("calc-base", "10");
  assert.equal(await press("clear"), "0,");
});

test("память и статистика", async () => {
  await reset();
  await press("4", "2", "ms", "clear");
  const mem = await h.page.evaluate((sel) => document.querySelector(`${sel} .calc-indicator--mem`).textContent, WIN);
  assert.equal(mem, "M");
  assert.equal(await press("mr"), "42,");
  await press("mc");
  const disabledBefore = await h.page.evaluate((sel) => document.querySelector(`${sel} .calc-btn[data-key="ave"]`).disabled, WIN);
  assert.equal(disabledBefore, true);
  await press("sta", "clear", "2", "dat", "4", "dat");
  assert.equal(await press("ave"), "3,");
  assert.equal(await press("sum"), "6,");
  await press("sta");
});

test("клавиатура работает, когда окно калькулятора активно", async () => {
  await reset();
  // Окно GitHub открывается само с задержкой в той же точке и закрывает калькулятор -
  // дождёмся его и поднимем калькулятор, как кнопкой на панели задач.
  await h.page.waitForSelector('[id="window-GitHub"]', { timeout: 10000 }).catch(() => {});
  await h.page.evaluate(() => bringWindowToFront("Calculator"));
  await h.page.keyboard.type("12*3");
  await h.page.keyboard.press("Enter");
  assert.equal(await h.page.$eval(`${WIN} .calc-display`, (el) => el.value), "36,");
  await h.page.keyboard.press("Escape");
  assert.equal(await h.page.$eval(`${WIN} .calc-display`, (el) => el.value), "0,");
});

test("на маленьком экране окно уменьшается и целиком помещается", async () => {
  await h.page.setViewport({ width: 400, height: 700 });
  await h.page.waitForFunction((sel) => document.querySelector(sel).style.transform.includes("scale"), {}, WIN);
  const r = await h.page.evaluate((sel) => {
    const b = document.querySelector(sel).getBoundingClientRect();
    return { left: b.left, right: b.right, vw: document.documentElement.clientWidth };
  }, WIN);
  assert.ok(r.left >= 0 && r.right <= r.vw, JSON.stringify(r));
  await h.page.setViewport({ width: 1920, height: 1080 });
  await h.page.waitForFunction((sel) => document.querySelector(sel).style.transform === "", {}, WIN);
});

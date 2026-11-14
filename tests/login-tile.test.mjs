import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./helpers/harness.mjs";

// Плашка пользователя на экране выбора (макет Figma 754:7227):
// обычное состояние — прозрачная, рамка аватара белая, подпись тёмно-синяя;
// наведение/выбор — градиент 312×90, рамка аватара и подпись жёлтые (#fdbd32).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = [
  "Loader_Login/Loader_Login.html",
  "index.html",
  "Start_Menu/Log_Off/Transition/Login.html",
  "Start_Menu/Log_Off/Transition/Switch_User.html",
];
const YELLOW = "rgb(253, 189, 50)";

test("подпись «Full Stack Developer» под именем на всех экранах входа", () => {
  for (const p of PAGES) {
    const html = readFileSync(path.join(ROOT, p), "utf8");
    assert.match(html, /<span>Атанов Роман<\/span>\s*<p class="user-role">Full Stack Developer<\/p>/, p);
  }
});

test("надписи «Вход выполнен» нет ни на одном экране входа", () => {
  for (const p of PAGES) {
    assert.ok(!readFileSync(path.join(ROOT, p), "utf8").includes("Вход выполнен"), p);
  }
});

let h;
let p;
before(async () => {
  h = await startHarness();
  p = await h.browser.newPage();
  await p.setViewport({ width: 1366, height: 768 });
  await p.goto(`${h.base}/Loader_Login/Loader_Login.html`, { waitUntil: "domcontentloaded" });
  await p.evaluate(() => {
    document.getElementById("loader").style.display = "none";
    document.getElementById("login-screen").classList.remove("hidden");
  });
});
after(async () => h && (await h.close()));

const tile = () =>
  p.$eval("#guest-user", (u) => {
    const r = u.getBoundingClientRect();
    const bg = getComputedStyle(u, "::before");
    const av = getComputedStyle(u.querySelector("video"));
    const name = getComputedStyle(u.querySelector("span"));
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      bgImage: bg.backgroundImage,
      bgContent: bg.content,
      radius: bg.borderTopLeftRadius,
      avatarBorder: av.borderTopColor,
      role: getComputedStyle(u.querySelector(".user-role")).color,
      nameSize: name.fontSize,
    };
  });

// Плашки не тускнеют: ни когда курсор в колонке пользователей мимо плашек, ни после ухода с плашки.
test("плашки не затемняются, когда курсор в колонке, но не на плашке", async () => {
  const opacities = () =>
    p.$$eval(".user", (us) => us.map((u) => getComputedStyle(u).opacity));
  const list = await p.$eval("#user-list", (l) => {
    const r = l.getBoundingClientRect();
    return { x: r.right - 20, y: r.bottom - 20 };
  });
  await p.mouse.move(list.x, list.y);
  await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(await opacities(), ["1", "1"]);
  await p.hover("#guest-user");
  await p.mouse.move(list.x, list.y);
  await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(await opacities(), ["1", "1"]);
});

test("обычное состояние: без фона, белая рамка, тёмно-синяя подпись", async () => {
  await p.mouse.move(5, 5);
  const t = await tile();
  assert.ok(t.bgContent === "none" || t.bgImage === "none", `фон: ${t.bgImage}`);
  assert.equal(t.avatarBorder, "rgb(255, 255, 255)");
  assert.equal(t.role, "rgb(0, 48, 156)");
  assert.equal(t.nameSize, "26px");
});

test("наведение: градиент 312×90 со скруглением 6px, жёлтые рамка и подпись", async () => {
  await p.hover("#guest-user");
  await new Promise((r) => setTimeout(r, 450)); // glitch-анимация прозрачности
  const t = await tile();
  assert.match(t.bgImage, /linear-gradient\(90deg, rgb\(17, 63, 166\).*rgb\(25, 77, 184\) 40%.*rgb\(88, 124, 219\)/);
  assert.equal(t.radius, "6px");
  assert.equal(t.w, 312);
  assert.equal(t.h, 90);
  assert.equal(t.avatarBorder, YELLOW);
  assert.equal(t.role, YELLOW);
});

test("наведение: правый край плашки растворяется в фоне (маска до прозрачного)", async () => {
  await p.hover("#guest-user");
  const m = await p.$eval("#guest-user", (u) => {
    const s = getComputedStyle(u, "::before");
    return { mask: s.maskImage || s.webkitMaskImage, right: parseFloat(s.right) };
  });
  assert.match(m.mask, /linear-gradient\(90deg, .*(transparent|rgba\(0, 0, 0, 0\)) 100%\)/);
  assert.ok(m.right < 0, `подложка должна выходить за правый край плашки: right=${m.right}`);
});

test("выбор с клавиатуры: та же плашка у выбранного", async () => {
  await p.mouse.move(5, 5);
  await p.keyboard.press("ArrowDown");
  const t = await tile();
  assert.match(t.bgImage, /linear-gradient/);
  assert.equal(t.avatarBorder, YELLOW);
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(await p.$eval("#admin-user", (u) => getComputedStyle(u).opacity), "1");
});

test("шрифты по макету: подпись Tahoma Bold 13px, текст внизу Tahoma 14px/21px", async () => {
  const f = await p.evaluate(() => {
    const r = getComputedStyle(document.querySelector("#guest-user .user-role"));
    const t = getComputedStyle(document.getElementById("right-text"));
    return {
      role: [r.fontFamily.split(",")[0].trim(), r.fontWeight, r.fontSize],
      text: [t.fontFamily.split(",")[0].trim(), t.fontSize, t.lineHeight],
    };
  });
  assert.deepEqual(f.role, ["Tahoma", "700", "13px"]);
  assert.deepEqual(f.text, ["Tahoma", "14px", "21px"]);
});

test("«Смена пользователя»: подпись остаётся, имя 26px", async () => {
  const q = await h.browser.newPage();
  await q.goto(`${h.base}/Start_Menu/Log_Off/Transition/Switch_User.html`, { waitUntil: "load" });
  const r = await q.$eval("#guest-user", (u) => ({
    role: u.querySelector(".user-role")?.textContent,
    text: u.innerText,
    name: getComputedStyle(u.querySelector("span")).fontSize,
  }));
  await q.close();
  assert.equal(r.role, "Full Stack Developer");
  assert.ok(!r.text.includes("Вход выполнен") && !/запущен/.test(r.text), r.text);
  assert.equal(r.name, "26px");
});

test("надпись на заставке — Tahoma 14px/21px", async () => {
  const s = await p.$eval("#Microsoft", (e) => {
    const c = getComputedStyle(e);
    return [c.fontFamily.split(",")[0].trim(), c.fontSize, c.lineHeight];
  });
  assert.deepEqual(s, ["Tahoma", "14px", "21px"]);
});

test("Администратор с формой пароля: плашка растягивается под форму", async () => {
  await p.click("#admin-user");
  await p.waitForSelector("#admin-user .login-screen__password");
  const label = await p.$eval("#admin-user .login-screen__password p", (e) => {
    const c = getComputedStyle(e);
    return [e.textContent, c.fontFamily.split(",")[0].trim(), c.fontSize];
  });
  assert.deepEqual(label, ["Введите пароль", "Tahoma", "13px"]);
  const r = await p.$eval("#admin-user", (u) => {
    const b = u.getBoundingClientRect();
    const f = u.querySelector(".login-screen__password").getBoundingClientRect();
    return { right: b.right, bottom: b.bottom, fRight: f.right, fBottom: f.bottom, w: b.width };
  });
  assert.ok(r.w >= 312);
  assert.ok(r.fRight <= r.right && r.fBottom <= r.bottom, JSON.stringify(r));
});

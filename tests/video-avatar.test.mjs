import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./helpers/harness.mjs";

// Аватар пользователя — зацикленное видео без звука вместо фото, во всех местах.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VIDEO = "/Assets/Images/Profiles/guest-avatar.mp4";
const POSTER = "/Assets/Images/Profiles/guest-avatar-poster.jpg";
const PAGES = [
  "Loader_Login/Loader_Login.html",
  "index.html",
  "Start_Menu/Base/Start_Menu.html",
  "Start_Menu/Log_Off/Transition/Login.html",
  "Start_Menu/Log_Off/Transition/Switch_User.html",
];

test("аватар — видео во всех пяти местах", () => {
  for (const p of PAGES) {
    const html = readFileSync(path.join(ROOT, p), "utf8");
    assert.ok(!html.includes("guest-avatar.jpg"), `${p}: осталась ссылка на старое фото`);
    const tag = html.match(/<video\b[^>]*guest-avatar\.mp4[^>]*>/)?.[0];
    assert.ok(tag, `${p}: нет <video> с аватаром`);
    assert.ok(tag.includes(`src="${VIDEO}"`), `${p}: src`);
    assert.ok(tag.includes(`poster="${POSTER}"`), `${p}: poster`);
    for (const a of ["autoplay", "muted", "loop", "playsinline"]) {
      assert.match(tag, new RegExp(`\\s${a}[\\s/>]`), `${p}: нет атрибута ${a}`);
    }
  }
});

const ADMIN_VIDEO = "/Assets/Images/Profiles/admin-avatar.mp4";
const ADMIN_POSTER = "/Assets/Images/Profiles/admin-avatar-poster.jpg";
const LOGIN_PAGES = PAGES.filter((p) => !p.startsWith("Start_Menu/Base"));

test("аватар Администратора — видео на всех экранах входа, цветка нет", () => {
  for (const p of LOGIN_PAGES) {
    const html = readFileSync(path.join(ROOT, p), "utf8");
    assert.ok(!html.includes("flower-avatar.png"), `${p}: остался цветок`);
    const tag = html.match(/<video\b[^>]*admin-avatar\.mp4[^>]*>/)?.[0];
    assert.ok(tag, `${p}: нет <video> Администратора`);
    assert.ok(tag.includes(`src="${ADMIN_VIDEO}"`) && tag.includes(`poster="${ADMIN_POSTER}"`), p);
    for (const a of ["autoplay", "muted", "loop", "playsinline"]) {
      assert.match(tag, new RegExp(`\\s${a}[\\s/>]`), `${p}: нет атрибута ${a}`);
    }
  }
  assert.ok(existsSync(path.join(ROOT, ADMIN_VIDEO)) && existsSync(path.join(ROOT, ADMIN_POSTER)));
});

// Длительность MP4 из mvhd (version 0): timescale и duration.
function mp4Duration(file) {
  const buf = readFileSync(file);
  const i = buf.indexOf("mvhd");
  return buf.readUInt32BE(i + 20) / buf.readUInt32BE(i + 16);
}

// «Бумеранг»: ролик идёт вперёд, затем назад — исходник 6 с → 12 с, цикл без скачка.
test("видео-аватары зациклены туда-обратно: по 12 с", () => {
  for (const v of [VIDEO, ADMIN_VIDEO]) {
    const d = mp4Duration(path.join(ROOT, v));
    assert.ok(Math.abs(d - 12) < 0.1, `${v}: ${d} с`);
  }
});

// Видео не должно быть «статичной картинкой»: за секунду проигрывания кадр заметно меняется.
// Средняя разница RGB (сумма по каналам на пиксель) у исходников ~4–5; у застывшего ролика ~0.
test("видео-аватары реально анимированы (кадр меняется за секунду)", async () => {
  const p = await h.browser.newPage();
  await p.goto(`${h.base}/index.html`, { waitUntil: "domcontentloaded" });
  for (const src of [VIDEO, ADMIN_VIDEO]) {
    const diffs = await p.evaluate(async (src) => {
      const v = document.createElement("video");
      v.muted = true;
      v.autoplay = true; // стенд подменяет play(); родной autoplay не перехватывается
      // беззвучное автовидео вне экрана Chrome ставит на паузу — держим его в видимой области
      v.style.cssText = "position:fixed;left:0;top:0;width:140px;height:140px;z-index:2147483647";
      const c = document.createElement("canvas");
      c.width = c.height = 140;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const shots = [];
      let next = 0.2;
      await new Promise((res) => {
        const cb = (now, md) => {
          if (md.mediaTime >= next) {
            ctx.drawImage(v, 0, 0, 140, 140);
            shots.push(ctx.getImageData(0, 0, 140, 140).data);
            next += 1;
          }
          if (shots.length < 3) v.requestVideoFrameCallback(cb);
          else res();
        };
        v.requestVideoFrameCallback(cb);
        v.src = src;
        document.body.appendChild(v);
      });
      v.remove();
      const diff = (a, b) => {
        let s = 0;
        for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        return s / (a.length / 4);
      };
      return [diff(shots[0], shots[1]), diff(shots[1], shots[2])];
    }, src);
    assert.ok(Math.min(...diffs) > 1.5, `${src}: кадр почти не меняется (${diffs.map((d) => d.toFixed(2))})`);
  }
  await p.close();
});

test("файлы аватара: видео и постер есть, старого фото нет", () => {
  assert.ok(existsSync(path.join(ROOT, VIDEO)));
  assert.ok(existsSync(path.join(ROOT, POSTER)));
  assert.ok(!existsSync(path.join(ROOT, "Assets/Images/Profiles/guest-avatar.jpg")));
});

let h;
let page;
before(async () => {
  h = await startHarness();
  page = h.page;
});
after(async () => h && (await h.close()));

test("экран входа: видео 70×70, белая рамка, жёлтая (#fdbd32) при наведении", async () => {
  const p = await h.browser.newPage();
  await p.setViewport({ width: 1366, height: 768 });
  await p.goto(`${h.base}/Loader_Login/Loader_Login.html`, { waitUntil: "domcontentloaded" });
  await p.evaluate(() => {
    document.getElementById("loader").style.display = "none";
    document.getElementById("login-screen").classList.remove("hidden");
  });
  const box = () =>
    p.$eval("#guest-user > video", (v) => {
      const r = v.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), border: getComputedStyle(v).borderTopColor };
    });
  const b = await box();
  assert.ok(Math.abs(b.w - 70) <= 4 && Math.abs(b.h - 70) <= 4, `размер ${b.w}×${b.h}`);
  assert.equal(b.border, "rgb(255, 255, 255)");
  await p.hover("#guest-user");
  assert.equal((await box()).border, "rgb(253, 189, 50)");
  await p.close();
});

test("меню «Пуск»: видео-аватар 42×42", async () => {
  await page.bringToFront(); // после вкладки экрана входа страница рабочего стола в фоне
  await page.waitForSelector('[id="window-GitHub"]', { timeout: 10000 });
  await page.waitForFunction(() => !recentlyClosedStartMenu);
  await page.click("#start-button");
  await page.waitForSelector("#StartMenu .StartMenuHeader", { timeout: 5000 });
  const s = await page.$eval(".StartMenuHeader video", (v) => {
    const c = getComputedStyle(v);
    return [c.width, c.height];
  });
  assert.deepEqual(s, ["42px", "42px"]);
});

// Меню собирается через innerHTML вне документа — атрибут autoplay там не срабатывает,
// видео надо запустить явно (стенд подменяет play() и пишет адрес в window.__played).
test("меню «Пуск»: видео-аватар запускается", async () => {
  await page.waitForSelector("#StartMenu .StartMenuHeader video");
  const played = await page.evaluate(() => window.__played);
  assert.ok(
    played.some((src) => src.endsWith("/Assets/Images/Profiles/guest-avatar.mp4")),
    `play() не вызывался: ${JSON.stringify(played)}`
  );
});

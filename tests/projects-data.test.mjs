import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

// Данные окна «Мои проекты»: все проекты на месте, файлы медиа существуют, тексты без длинного тире.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {} };
vm.runInNewContext(readFileSync(resolve(ROOT, "Open_Windows/My Projects/my-projects-data.js"), "utf8"), ctx);
// Копия через JSON: массивы из другого vm-контекста не равны обычным для deepEqual.
const D = JSON.parse(JSON.stringify(ctx.window.MY_PROJECTS_DATA));
const P = D.projects;
const onDisk = (url) => resolve(ROOT, "." + url);

const ORDER = [
  "promet-configurator", "burger-cheddar", "coffe-sun", "super-cars", "trendy-cookies", "strong-club",
  "fashion-store", "macaroons-shop", "pizza-chef", "explore-norway", "2rism", "dynamic-island", "kabanes-bot",
];

test("13 проектов в исходном порядке", () => {
  assert.deepEqual(P.map((p) => p.slug), ORDER);
});

test("подписи разделов", () => {
  assert.deepEqual(D.categories.map((c) => c.label), ["Лендинги", "Фреймворки", "Личные", "Клиенты"]);
  assert.deepEqual(D.categories.map((c) => c.id), ["media", "builds", "personal", "client"]);
});

test("у каждого проекта все поля, раздел из списка", () => {
  const ids = D.categories.map((c) => c.id);
  for (const p of P) {
    for (const k of ["title", "category", "views", "date", "thumb", "video", "slug", "media", "brief", "role", "desc", "comments"]) {
      assert.ok(p[k] !== undefined && p[k] !== "", `${p.slug}: нет ${k}`);
    }
    assert.ok(ids.includes(p.category), `${p.slug}: раздел ${p.category}`);
  }
});

test("все файлы медиа существуют", () => {
  const missing = [];
  for (const p of P) {
    for (const url of [p.thumb, p.video, ...p.media.flatMap((m) => [m.src, m.poster].filter(Boolean))]) {
      if (!existsSync(onDisk(url))) missing.push(`${p.slug}: ${url}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("первый слайд - видео-презентация не больше 6 МБ, у картинок есть alt", () => {
  for (const p of P) {
    assert.equal(p.media[0].type, "video", p.slug);
    assert.ok(statSync(onDisk(p.media[0].src)).size <= 6 * 1024 * 1024, `${p.slug}: презентация больше 6 МБ`);
    for (const m of p.media.slice(1)) assert.ok(m.type === "image" && m.alt, `${p.slug}: ${m.src}`);
  }
});

test("ссылка на сайт - GitHub Pages; у KabanesBot сайта нет", () => {
  for (const p of P) {
    if (p.slug === "kabanes-bot") assert.equal(p.site, undefined);
    else assert.match(p.site, /^https:\/\/dekciw\.github\.io\/[A-Za-z0-9]+\/$/, p.slug);
  }
});

test("3-5 комментариев, не раньше даты проекта", () => {
  for (const p of P) {
    assert.ok(p.comments.length >= 3 && p.comments.length <= 5, `${p.slug}: ${p.comments.length}`);
    for (const c of p.comments) {
      for (const k of ["user", "date", "text", "likes", "dislikes"]) assert.ok(c[k] !== undefined, `${p.slug}: ${k}`);
      assert.ok(c.date >= p.date && c.date <= "2026-11-15", `${p.slug}: ${c.date}`);
    }
  }
});

test("в текстах нет длинного тире", () => {
  assert.ok(!JSON.stringify(D).includes("—"));
});

test("в «Лендингах» 4 проекта, Burger Cheddar среди них", () => {
  const media = P.filter((p) => p.category === "media").map((p) => p.slug);
  assert.equal(media.length, 4);
  assert.ok(media.includes("burger-cheddar"));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { PROJECT_MEDIA, SRC_ROOT, jobsFor } from "../scripts/build-project-media.mjs";

// Сборка медиа проектов: какие файлы откуда берутся и куда кладутся.

const bySlug = (s) => PROJECT_MEDIA.find((e) => e.slug === s);

test("в манифесте 13 проектов, slug уникальны", () => {
  assert.equal(PROJECT_MEDIA.length, 13);
  assert.equal(new Set(PROJECT_MEDIA.map((e) => e.slug)).size, 13);
});

test("Burger Cheddar: обложка, превью, видео, постер и 4 скриншота", () => {
  const jobs = jobsFor(bySlug("burger-cheddar"), "S", "O");
  assert.deepEqual(jobs.find((j) => j.to.endsWith("covers/BurgerCheddar.jpg")), {
    kind: "copy",
    from: "S/presentations/covers/BurgerCheddar.jpg",
    to: "O/Assets/Projects/covers/BurgerCheddar.jpg",
  });
  assert.deepEqual(jobs.find((j) => j.kind === "copy" && j.to.endsWith(".mp4")), {
    kind: "copy",
    from: "S/presentations/previews/BurgerCheddar.mp4",
    to: "O/Assets/Projects/previews/BurgerCheddar.mp4",
  });
  assert.deepEqual(jobs.find((j) => j.kind === "video"), {
    kind: "video",
    from: "S/project/burger/presentation/burger-presentation.mp4",
    to: "O/Assets/Projects/media/burger-cheddar/presentation.mp4",
  });
  assert.deepEqual(jobs.find((j) => j.kind === "poster"), {
    kind: "poster",
    from: "S/project/burger/presentation/burger-presentation-poster.jpg",
    to: "O/Assets/Projects/media/burger-cheddar/presentation-poster.jpg",
  });
  const shots = jobs.filter((j) => j.kind === "shot");
  assert.equal(shots.length, 4);
  assert.equal(shots[0].from, "S/project/burger/screenshots/screen-hero.png");
  assert.ok(shots[3].to.endsWith("/burger-cheddar/why.jpg"));
});

test("KabanesBot: постер morningbot-poster.jpg и один скриншот example.jpg", () => {
  const jobs = jobsFor(bySlug("kabanes-bot"), "S", "O");
  assert.equal(jobs.find((j) => j.kind === "poster").from, "S/morningbot/presentation/morningbot-poster.jpg");
  const shots = jobs.filter((j) => j.kind === "shot");
  assert.equal(shots.length, 1);
  assert.ok(shots[0].to.endsWith("/kabanes-bot/example.jpg"));
});

test("все исходные файлы на месте", { skip: !existsSync(SRC_ROOT) && "нет папки с исходниками" }, () => {
  const missing = PROJECT_MEDIA.flatMap((e) => jobsFor(e, SRC_ROOT, "O")).filter((j) => !existsSync(j.from));
  assert.deepEqual(missing.map((j) => j.from), []);
});

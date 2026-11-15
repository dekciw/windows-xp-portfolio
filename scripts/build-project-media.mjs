// Сборка медиа для окна «Мои проекты»: обложки и превью карточек (копируются как есть),
// видео-презентации (пережимаются в 720p), постеры и скриншоты для плеера страницы проекта.
//
// Запуск: npm run project-media
// Исходники - папка с материалами проектов (SRC_ROOT), результат - Assets/Projects/.
// Чтобы добавить проект: допишите запись в PROJECT_MEDIA и запустите скрипт ещё раз.

import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

export const SRC_ROOT = "C:/Users/atanov.r/Project/projects";
const OUT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..").replace(/\\/g, "/");

// Видео больше этого размера пережимается заново с CRF +2.
const MAX_VIDEO_BYTES = 6 * 1024 * 1024;

// repo   - имя на GitHub (так же названы обложка и превью в presentations/covers|previews)
// slug   - папка Assets/Projects/media/<slug>/ и адрес страницы проекта
// dir    - папка проекта внутри SRC_ROOT
// prefix - <dir>/presentation/<prefix>-presentation.mp4 и <prefix>-poster.jpg
// poster - имя постера, если оно не <prefix>-poster.jpg
// shots  - [путь внутри dir, имя JPEG без расширения], по порядку слайдов
const screens = (sub, names) => names.map((n) => [`${sub}/screen-${n}.png`, n]);

export const PROJECT_MEDIA = [
  { repo: "BurgerCheddar", slug: "burger-cheddar", dir: "project/burger", prefix: "burger",
    poster: "burger-presentation-poster.jpg", shots: screens("screenshots", ["hero", "menu", "order", "why"]) },
  { repo: "2rism", slug: "2rism", dir: "project/2rism", prefix: "2rism",
    shots: screens("assets", ["hero", "destinations", "hotels", "activities"]) },
  { repo: "ExploreNorway", slug: "explore-norway", dir: "project/norway", prefix: "norway",
    shots: screens("assets", ["slide-1", "slide-2", "slide-3", "slide-5"]) },
  { repo: "DynamicIslandCSS", slug: "dynamic-island", dir: "dynamic-island", prefix: "dynamic-island",
    shots: ["main", "gold", "deep-purple", "silver"].map((n) => [`assets/phone-${n}.png`, n]) },
  { repo: "PizzaChef", slug: "pizza-chef", dir: "project/pizza", prefix: "pizza",
    shots: screens("screenshots", ["hero", "menu", "order"]) },
  { repo: "MacaroonsShop", slug: "macaroons-shop", dir: "project/macaroons", prefix: "macaroons",
    shots: screens("screenshots", ["hero", "products", "about", "order"]) },
  { repo: "TrendyCookies", slug: "trendy-cookies", dir: "project/cookies", prefix: "cookies",
    shots: screens("screenshots", ["hero", "products", "about", "order"]) },
  { repo: "CoffeSun", slug: "coffe-sun", dir: "project/coffee-code", prefix: "coffee-code",
    shots: screens("assets", ["hero", "catalog", "advantages", "order"]) },
  { repo: "StrongClubBarbershop", slug: "strong-club", dir: "project/barbershop", prefix: "barbershop",
    shots: screens("screenshots", ["hero", "about", "masters", "price"]) },
  { repo: "FashionStore", slug: "fashion-store", dir: "project/fashion", prefix: "fashion",
    shots: screens("assets", ["hero", "arrivals", "sale", "app"]) },
  { repo: "SuperCars", slug: "super-cars", dir: "project/cars-code", prefix: "cars-code",
    shots: screens("screenshots", ["hero", "catalog", "order"]) },
  { repo: "PrometConfigurator", slug: "promet-configurator", dir: "promet-lokers", prefix: "promet-lokers",
    shots: [["assets/how-1-series.png", "series"], ["assets/how-2-model.png", "model"],
      ["assets/how-3-params.png", "params"], ["assets/kp-example.png", "kp"]] },
  { repo: "KabanesBot", slug: "kabanes-bot", dir: "morningbot", prefix: "morningbot",
    shots: [["screenshots/bot-example.png", "example"]] },
];

export function jobsFor(e, srcRoot, outRoot) {
  const src = `${srcRoot}/${e.dir}`;
  const media = `${outRoot}/Assets/Projects/media/${e.slug}`;
  return [
    { kind: "copy", from: `${srcRoot}/presentations/covers/${e.repo}.jpg`, to: `${outRoot}/Assets/Projects/covers/${e.repo}.jpg` },
    { kind: "copy", from: `${srcRoot}/presentations/previews/${e.repo}.mp4`, to: `${outRoot}/Assets/Projects/previews/${e.repo}.mp4` },
    { kind: "video", from: `${src}/presentation/${e.prefix}-presentation.mp4`, to: `${media}/presentation.mp4` },
    { kind: "poster", from: `${src}/presentation/${e.poster || `${e.prefix}-poster.jpg`}`, to: `${media}/presentation-poster.jpg` },
    ...e.shots.map(([from, name]) => ({ kind: "shot", from: `${src}/${from}`, to: `${media}/${name}.jpg` })),
  ];
}

function ffmpeg(bin, args) {
  const r = spawnSync(bin, ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg завершился с кодом ${r.status}: ${args.join(" ")}`);
}

const videoArgs = (from, to, crf) => [
  "-i", from, "-vf", "scale=1280:-2", "-c:v", "libx264", "-preset", "slow", "-crf", String(crf),
  "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", to,
];
const imageArgs = (from, to, width) => ["-i", from, "-vf", `scale=${width}:-2`, "-q:v", "3", to];

async function run() {
  const bin = (await import("ffmpeg-static")).default;
  const mb = (n) => (n / 1024 / 1024).toFixed(1) + " МБ";
  for (const e of PROJECT_MEDIA) {
    for (const j of jobsFor(e, SRC_ROOT, OUT_ROOT)) {
      await mkdir(dirname(j.to), { recursive: true });
      if (j.kind === "copy") await copyFile(j.from, j.to);
      else if (j.kind === "shot") ffmpeg(bin, imageArgs(j.from, j.to, 1600));
      else if (j.kind === "poster") ffmpeg(bin, imageArgs(j.from, j.to, 1280));
      else {
        let crf = 28;
        ffmpeg(bin, videoArgs(j.from, j.to, crf));
        while ((await stat(j.to)).size > MAX_VIDEO_BYTES && crf < 40) {
          crf += 2;
          ffmpeg(bin, videoArgs(j.from, j.to, crf));
        }
        console.log(`${e.slug}: ${mb((await stat(j.to)).size)} (CRF ${crf})`);
      }
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

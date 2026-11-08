// npm run resume: рендерит PDF резюме в Assets/Images/Resume/page-N.webp и pages.json.
// pdfjs-dist работает только здесь (в headless Chrome), на сайт он не попадает.
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { startServer, CHROME } from "../tests/helpers/harness.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Выполняется в странице: рендер всех страниц PDF в webp (data URL).
async function renderInPage(b64, scale) {
  const pdfjs = await import("/node_modules/pdfjs-dist/build/pdf.min.mjs");
  const { collapseBlankRun } = await import("/scripts/collapse-blank.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
  const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const doc = await pdfjs.getDocument({ data }).promise;
  const out = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const p = await doc.getPage(n);
    const vp = p.getViewport({ scale });
    let canvas = document.createElement("canvas");
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await p.render({ canvasContext: ctx, viewport: vp }).promise;
    if (n === doc.numPages) {
      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const rows = [];
      for (let y = 0; y < canvas.height; y++) {
        let blank = true;
        for (let x = 0, i = y * canvas.width * 4; x < canvas.width; x++, i += 4) {
          if (px[i] < 250 || px[i + 1] < 250 || px[i + 2] < 250) { blank = false; break; }
        }
        rows.push(blank);
      }
      const cut = collapseBlankRun(rows, canvas.height * 0.25, 48 * scale);
      if (cut) {
        const h = canvas.height - (cut.cutTo - cut.cutFrom);
        const c2 = document.createElement("canvas");
        c2.width = canvas.width;
        c2.height = h;
        const c2x = c2.getContext("2d");
        c2x.drawImage(canvas, 0, 0, canvas.width, cut.cutFrom, 0, 0, canvas.width, cut.cutFrom);
        c2x.drawImage(canvas, 0, cut.cutTo, canvas.width, canvas.height - cut.cutTo, 0, cut.cutFrom, canvas.width, canvas.height - cut.cutTo);
        canvas = c2;
      }
    }
    out.push({ url: canvas.toDataURL("image/webp", 0.9), width: canvas.width, height: canvas.height });
  }
  return out;
}

export async function buildResume({ pdf, outDir, scale = 2 }) {
  const bytes = await readFile(pdf);
  const version = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
  const server = await startServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  let rendered;
  try {
    const page = await browser.newPage();
    // Любая страница с нашего origin: нужна только для import() модулей.
    await page.goto(`http://127.0.0.1:${server.address().port}/package.json`);
    rendered = await page.evaluate(renderInPage, bytes.toString("base64"), scale);
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
  await mkdir(outDir, { recursive: true });
  for (const f of await readdir(outDir)) if (/^page-\d+\.webp$/.test(f)) await rm(path.join(outDir, f));
  const pages = [];
  for (let i = 0; i < rendered.length; i++) {
    const { url, width, height } = rendered[i];
    await writeFile(path.join(outDir, `page-${i + 1}.webp`), Buffer.from(url.split(",")[1], "base64"));
    pages.push({ src: `/Assets/Images/Resume/page-${i + 1}.webp?v=${version}`, width, height });
  }
  const manifest = { version, pages };
  await writeFile(path.join(outDir, "pages.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pdf = process.argv[2] || path.join(ROOT, "Assets/Docs/resume.pdf");
  const outDir = process.argv[3] || path.join(ROOT, "Assets/Images/Resume");
  const m = await buildResume({ pdf, outDir });
  console.log(`resume: ${m.pages.length} pages, version ${m.version}`);
}

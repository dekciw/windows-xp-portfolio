import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, stat, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collapseBlankRun } from "../scripts/collapse-blank.mjs";
import { buildResume } from "../scripts/build-resume.mjs";

test("collapseBlankRun: вырезает длинную пустую серию между текстом и колонтитулом", () => {
  const rows = [...Array(10).fill(false), ...Array(100).fill(true), ...Array(5).fill(false), ...Array(10).fill(true)];
  assert.deepEqual(collapseBlankRun(rows, 50, 20), { cutFrom: 30, cutTo: 110 });
});

test("collapseBlankRun: короткие серии и пустота у краёв не трогаются", () => {
  assert.equal(collapseBlankRun([...Array(40).fill(true), false, ...Array(40).fill(true)], 30, 10), null);
  assert.equal(collapseBlankRun([false, ...Array(20).fill(true), false], 30, 10), null);
});

test("buildResume на настоящем PDF: 5 страниц, файлы есть, последняя ниже первой", async () => {
  const out = await mkdtemp(join(tmpdir(), "resume-"));
  const m = await buildResume({ pdf: "Assets/Docs/resume.pdf", outDir: out });
  assert.equal(m.pages.length, 5);
  assert.match(m.version, /^[0-9a-f]{10}$/);
  assert.equal(m.pages[0].src, `/Assets/Images/Resume/page-1.webp?v=${m.version}`);
  assert.ok(m.pages[0].width >= 1100);
  assert.ok(m.pages[4].height < m.pages[0].height * 0.6);
  for (let i = 1; i <= 5; i++) assert.ok((await stat(join(out, `page-${i}.webp`))).size > 1000);
  assert.deepEqual(JSON.parse(await readFile(join(out, "pages.json"), "utf8")), m);
});

test("другой PDF → другой version", async () => {
  const dir = await mkdtemp(join(tmpdir(), "resume-pdf-"));
  const copy = join(dir, "copy.pdf");
  await writeFile(copy, Buffer.concat([await readFile("Assets/Docs/resume.pdf"), Buffer.from("\n")]));
  const a = await buildResume({ pdf: "Assets/Docs/resume.pdf", outDir: await mkdtemp(join(tmpdir(), "resume-")) });
  const b = await buildResume({ pdf: copy, outDir: await mkdtemp(join(tmpdir(), "resume-")) });
  assert.notEqual(a.version, b.version);
});

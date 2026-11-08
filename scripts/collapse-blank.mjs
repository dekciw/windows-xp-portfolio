// Ищет самую длинную серию пустых строк (длиной >= minRun), не касающуюся краёв,
// и возвращает диапазон [cutFrom, cutTo) для вырезания, оставляя первые keep строк серии.
// Модуль грузится и в Node (тесты), и в странице Chrome (build-resume.mjs).
export function collapseBlankRun(blankRows, minRun, keep) {
  let best = null;
  let i = 0;
  while (i < blankRows.length) {
    if (!blankRows[i]) { i++; continue; }
    let j = i;
    while (j < blankRows.length && blankRows[j]) j++;
    const len = j - i;
    if (i > 0 && j < blankRows.length && len >= minRun && (!best || len > best.len)) best = { from: i, to: j, len };
    i = j;
  }
  if (!best) return null;
  return { cutFrom: best.from + keep, cutTo: best.to };
}

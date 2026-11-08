# World of Warcraft Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "World of Warcraft" game to the Windows XP desktop. It launches the WoW login screen in real browser fullscreen and returns to the desktop on Quit or Esc.

**Architecture:** A trimmed copy of Xiexe/WoWLoginScreens goes in `WoW/`, with three expansions and a few patches. A new `Bureau/wow-launcher.js` provides `launchWoW()` and `closeWoW()`. They control fullscreen and a full-viewport overlay with `<iframe src="/WoW/index.html">` that sits above the taskbar. The desktop icon and the Start → Games item call `launchWoW()`.

**Tech Stack:** Vanilla JS/HTML/CSS, Fullscreen API. Tests use `node --test` with puppeteer-core through `tests/helpers/harness.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-08-wow-launcher-design.md`

## Global Constraints

- Expansions: exactly Vanilla, WrathOfTheLichKing and Shadowlands, in that order. The game starts on WrathOfTheLichKing (index 1).
- Video: `.mp4` only, no `.webm`/`.xmp`. Music: `.ogg`.
- Source page: github.com/Xiexe/WoWLoginScreens at `master`. Credit it in README acknowledgements.
- WoW page `<title>`: `World of Warcraft`.
- No XP window frame and no taskbar button for the game.
- Work on branch `feature/wow-launcher`. The project's commit style is `feat:` / `fix:` / `docs:` / `test:`.
- When a referenced script or CSS changes, bump its `?v=N` cache-buster in `Bureau/Bureau.html`.

## Review Focus

1. **Double launch.** Desktop double-click plus a second launch (icon again or Start menu) while the game is open or still loading → still exactly one overlay (Task 2 test `second launch is ignored`).
2. **Fullscreen refused or missing** (headless, iPhone Safari, rejected promise) → the overlay still opens in-page, with no unhandled rejection (Task 2 test `works without fullscreen`).
3. **Esc during the ~1 s hourglass phase**, before the iframe exists → nothing appears later. The pending timer is cancelled and the cursor is restored (Task 2 test `exit during launch delay cancels`).
4. **Quit when the page is opened directly** at `/WoW/index.html` with no launcher parent → it goes to `/` instead of throwing (Task 1 test `quit without launcher`).
5. **Sound after exit.** After close, no WoW iframe or audio remains in the DOM (Task 2 test `close removes overlay`).

---

### Task 1: Vendor and patch the WoW login page

**Files:**
- Create: `WoW/index.html`, `WoW/assets/css/styles.css`, `WoW/assets/js/audiohandler.js`, `WoW/assets/fonts/FRIZQT__.ttf`, `WoW/assets/img/ui/**` (all UI pngs + logos for the 3 expansions only), `WoW/assets/img/bg/{Vanilla,Wrathofthelichking,Shadowlands}.mp4`, `WoW/assets/audio/{Vanilla,WrathOfTheLichKing,Shadowlands}.ogg`, `WoW/assets/audio/ui/button_click.ogg`, `WoW/assets/audio/ui/button_click_big.ogg`
- Modify: `tests/helpers/harness.mjs` (TYPES: add `".ogg": "audio/ogg"`, `".mp4": "video/mp4"`)
- Test: `tests/wow-page.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: the page at `/WoW/index.html`. Its Quit button and its Escape key call `parent.closeWoW()` when `parent !== window && typeof parent.closeWoW === "function"`, and otherwise set `location.href = "/"`.

- [ ] **Step 1: Download the files.** Use `curl -L` from `https://raw.githubusercontent.com/Xiexe/WoWLoginScreens/master/<path>` into `WoW/`, keeping the repo's relative paths. Note the mp4 filename casing: `Wrathofthelichking.mp4`. Keep the source's file names and point `audiohandler.js` at them exactly.
- [ ] **Step 2: Write failing tests** in `tests/wow-page.test.mjs`. Use `startServer()` and puppeteer directly, and stub `HTMLMediaElement.prototype.play` like the harness does. Open `${base}/WoW/index.html`:
  - `three expansions, starts on Wrath`: `document.title === "World of Warcraft"`; `expansionMap` deep-equals `["Vanilla","WrathOfTheLichKing","Shadowlands"]`; `#buildVersion` text is `"Version 3.3.5 (12340) (Release)"`; the `#background source` src ends with `Wrathofthelichking.mp4`.
  - `logo click cycles and wraps`: three `manualChangeExpac()` calls bring `expansion` back to `1`.
  - `music starts without a click`: `window.__played` contains a URL ending `WrathOfTheLichKing.ogg` right after load.
  - `quit calls launcher`: load the page in an iframe of a test page that defines `window.closeWoW = () => (window.__closed = (window.__closed||0)+1)`. Clicking `#quitButton` sets `__closed === 1`, and dispatching `keydown` `Escape` in the iframe sets `2`.
  - `quit without launcher`: on the top-level page, clicking `#quitButton` navigates to `${base}/`.
  - `all referenced media exist`: for each expansion, HEAD requests for its `.mp4`, `.ogg` and logo `.png` return 200.
- [ ] **Step 3: Run** `node --test tests/wow-page.test.mjs`. Expected: FAIL (page missing).
- [ ] **Step 4: Patch the vendored files.**
  - `audiohandler.js`: trim `expansionMap`, `verMap`, `dateMap`, `buttonColorMap` and `copyMap` to indexes 0, 2 and 8 of the originals. Use `expansion = 1`, and wrap with `expansion > expansionMap.length - 1`. Switch the video to the single `.mp4` `<source>`, using a per-expansion file-name map for the casing. In `init()`, call `waitForInteractionToPlayAudio()` immediately and keep the click listener as fallback (the `audio.play()` rejection must be caught). Add `quitGame()` per the Produces line, plus a `keydown` Escape listener that calls it.
  - `index.html`: set the title, remove the `.webm` `<source>`, and make `#quitButton` `onclick="playButtonAudio(0); quitGame();"`.
- [ ] **Step 5: Run** `node --test tests/wow-page.test.mjs`. Expected: PASS. Then `npm test`. Expected: all pass.
- [ ] **Step 6: Commit** `feat: vendor WoW login screen (3 expansions) for the XP desktop`.

### Task 2: Fullscreen launcher

**Files:**
- Create: `Bureau/wow-launcher.js`, `Bureau/wow-launcher.css`
- Modify: `Bureau/Bureau.html` (add `<link>` and `<script src="/Bureau/wow-launcher.js?v=1">` after `Bureau.js`)
- Test: `tests/wow-launcher.test.mjs`

**Interfaces:**
- Consumes: `/WoW/index.html` (Task 1), which calls `parent.closeWoW()`.
- Produces: the globals `launchWoW(): void` and `closeWoW(): void`. The overlay element is `#wow-overlay`, containing `iframe#wow-frame`. While launching, the class `wow-launching` is on `<body>` (CSS sets the `wait` cursor). Timing constants are `WOW_LAUNCH_DELAY_MS = 1000` and `WOW_FADE_MS = 400`.

- [ ] **Step 1: Write failing tests** with `startHarness()`. Before each test, stub `document.documentElement.requestFullscreen` to `async () => { window.__fs = (window.__fs||0)+1; }`, define `document.fullscreenElement` with a getter on `window.__fsEl`, and stub `document.exitFullscreen` to `async () => { window.__exitFs = (window.__exitFs||0)+1; }`. Cases:
  - `launch requests fullscreen synchronously`: `launchWoW()` → `__fs === 1` before any await, and `body` has `wow-launching`.
  - `overlay appears after delay`: after ≤ 3 s, `#wow-overlay iframe#wow-frame` has src `/WoW/index.html`. The overlay's computed `z-index` is greater than the taskbar's, its rect covers `0,0` to the viewport size, and `wow-launching` is gone.
  - `second launch is ignored`: calling `launchWoW()` twice (once during the delay, once after it opens) still leaves exactly 1 `#wow-overlay` and `__fs === 1`.
  - `close removes overlay`: `closeWoW()` → within `WOW_FADE_MS + 500`, there is no `#wow-overlay` and no `#wow-frame`. `__exitFs === 1` when `__fsEl` was set.
  - `esc / fullscreenchange closes`: set `__fsEl = document.documentElement`, launch, wait for the overlay, then set `__fsEl = null` and dispatch `fullscreenchange` on `document` → the overlay is removed.
  - `exit during launch delay cancels`: launch, then dispatch `fullscreenchange` with `__fsEl = null` within 200 ms. After 1.5 s there is no `#wow-overlay` and no `wow-launching`.
  - `works without fullscreen`: make `requestFullscreen` reject (and in a second sub-case, `undefined`) → the overlay still appears, and no `PAGEERROR` is logged (collect `pageerror` into an array and assert it is empty).
  - `no taskbar button`: after launch, nothing in the taskbar contains the text `World of Warcraft`.
- [ ] **Step 2: Run** `node --test tests/wow-launcher.test.mjs`. Expected: FAIL (`launchWoW is not defined`).
- [ ] **Step 3: Implement** `wow-launcher.js` and the CSS. Overlay: `position:fixed; inset:0; background:#000; z-index` above every XP layer (use `2147483000`); opacity fades in once the iframe `load` fires. Only react to `fullscreenchange` when the launcher itself requested fullscreen and `document.fullscreenElement` becomes null. Guard all of this with a single state variable: `"idle" | "launching" | "open" | "closing"`.
- [ ] **Step 4: Run** `node --test tests/wow-launcher.test.mjs`. Expected: PASS. Then `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: fullscreen World of Warcraft launcher`.

### Task 3: Desktop icon, Start menu item, credits

**Files:**
- Create: `Assets/Images/Icons/wow-icon.svg` (an original, square, XP-style emblem: a gold "W" on a dark round shield. Do not copy Blizzard artwork)
- Modify: `Bureau/Bureau.html` (new `.icon` right after the Pinball icon), `Start_Menu/All_Programs/Sub_Tooltip/Games.html` (new `.hover-infoitm` after Pinball), `README.md` (acknowledgements line)
- Test: `tests/wow-launcher.test.mjs` (add cases)

**Interfaces:**
- Consumes: `launchWoW()` (Task 2).
- Produces: desktop icon `.icon[data-app="World of Warcraft"]` with `ondblclick="launchWoW()"`, `<img src="/Assets/Images/Icons/wow-icon.svg">` and the label `World of Warcraft`. A Games item with `onmousedown="launchWoW()"`, the same icon and the same label.

- [ ] **Step 1: Write failing tests:**
  - `desktop icon launches`: `.icon[data-app="World of Warcraft"]` exists, its `span` text is `World of Warcraft`, and `click({count:2})` → `#wow-overlay` appears.
  - `games menu item launches`: open Start → All Programs → Games (follow the pattern in `tests/start-menu.test.mjs`). An item with text `World of Warcraft` exists, and `mousedown` on it → `#wow-overlay` appears.
  - `icon file exists`: HEAD `/Assets/Images/Icons/wow-icon.svg` → 200.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Add the SVG, the markup and a README line under acknowledgements: `[WoWLoginScreens](https://github.com/Xiexe/WoWLoginScreens) by Xiexe — World of Warcraft login screen recreation; WoW media © Blizzard Entertainment.` Bump the `Bureau.html` cache-busters you touched.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Manual check.** Open the site in Chrome or Edge as you normally do, double-click the icon, and confirm: hourglass, then a black screen, then real fullscreen with music. Change the expansion via the logo. Quit returns to the desktop with sound stopped. Esc does the same.
- [ ] **Step 6: Commit** `feat: World of Warcraft icon on the desktop and in Games`.

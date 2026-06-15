<!-- GSD:project-start source:PROJECT.md -->

## Project

**Windows XP Portfolio**

An interactive web portfolio disguised as a Windows XP desktop environment. Users can explore projects, resume, and skills through familiar Windows XP interface elements — desktop icons, start menu, windows, and built-in applications. Built with vanilla JavaScript to showcase frontend development skills while delivering a nostalgic experience.

**Core Value:** **Authentic Windows XP experience that impresses both recruiters and GitHub community.**

If the interface doesn't feel genuinely like Windows XP (visually and interactively), the project fails its purpose. Everything else — games, portfolio content, technical demos — is secondary to nailing the nostalgic UX.

### Constraints

- **Tech Stack**: Must remain vanilla HTML/CSS/JS — no frameworks (demonstrates fundamental DOM skills)
- **Timeline**: None — personal project, progress at own pace
- **Authenticity**: Visual and interactive elements must match original Windows XP (sounds, animations, UI behavior)
- **Performance**: Lazy-load windows and assets to keep initial page load fast

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- HTML5 - Markup for all page structures (`index.html`, `Bureau/Bureau.html`, `Open_Windows/*/*.html`)
- CSS3 - Styling and layout (`Bureau/Bureau.css`, `Bureau/Taskbar.css`, various component-specific stylesheets)
- JavaScript (ES2022) - Client-side interactivity and application logic (`Bureau/Bureau.js`, `Loader_Login/Loader_Login.js`, game logic)
- Node.js - Build tooling and development utilities (used in jspaint-master and gsd-core)
- C++ - Space Cadet Pinball reverse-engineered game engine (`SpaceCadetPinball-master/`)
- TypeScript - Present in gsd-core project but not in main portfolio codebase

## Runtime

- Browser-based (Chromium, Firefox, Safari) - Primary portfolio execution
- Electron 19.0.10 - Desktop app wrapper for jspaint-master (`jspaint-master/package.json`)
- Node.js 22.x - Development environment (indicated by `gsd-core/.nvmrc`)
- npm - Primary package manager for Node.js projects
- Lockfile: Present (package-lock.json in jspaint-master and gsd-core)

## Frameworks

- No traditional SPA frameworks - Pure vanilla HTML/CSS/JS approach
- os-gui 0.7.3 - Windows XP-style UI component library (`jspaint-master/package.json`)
- 98.css - Retro CSS framework for Windows 98/XP styling (referenced in jspaint-master)
- Custom window manager system (`Bureau/Bureau.js`) - Handles draggable windows, z-index management, event handling
- Custom loader/login system (`Loader_Login/Loader_Login.js`)
- Desktop icon system with drag-and-drop support (`Bureau/desktop-icons-draggable.js`)
- Cypress 4.7.0 - E2E testing framework (`jspaint-master/package.json`)
- Vitest - Unit testing framework (configured in `gsd-core/vitest.config.ts`)
- Stryker - Mutation testing framework (`gsd-core/package.json`)
- Electron Forge 7.3.0 - Desktop app packaging and distribution (`jspaint-master/`)
- ESLint 9.4.0+ - Code linting with flat config (`jspaint-master/eslint.config.mjs`)
- Prettier - Code formatting (configured in jspaint-master)
- TypeScript 5.4.3+ - Type checking and transpilation (`jspaint-master/package.json`)
- RTLcss 4.1.1 - Right-to-left CSS transformation (`jspaint-master/`)

## Key Dependencies

- Webamp (unpkg CDN) - Web-based Winamp player recreation (`Bureau/Bureau.js` loads from `https://unpkg.com/webamp@latest/`)
- Electron Squirrel Startup 1.0.0 - Windows installer integration
- Wallpaper 4.4.2 - Desktop wallpaper manipulation
- argparse 2.0.1 - Command-line argument parsing
- lookpath 1.2.2 - Executable path resolution
- ws 8.20.1 - WebSocket library for agent communication (`gsd-core/`)
- @anthropic-ai/claude-agent-sdk 0.2.84 - Claude AI integration (`gsd-core/`)
- @electron-forge/maker-* packages - Cross-platform executable generation (Windows MSI, macOS DMG, Linux RPM/DEB)
- glob 10.3.10 - File pattern matching
- npm-run-all 4.1.5 - Task orchestration

## Configuration

- No .env file detected - Project uses static configuration
- Vercel deployment integration - Speed Insights and Web Analytics via `/_vercel/speed-insights/script.js` and `/_vercel/insights/script.js` (injected in `index.html`)
- localStorage - Client-side state persistence for UI state (`Bureau/Bureau.js`: z-index counter, login state)
- `jspaint-master/package.json` - ESLint flat config
- `jspaint-master/jsconfig.json` - ES2022 module resolution
- `gsd-core/tsconfig.json` - TypeScript configuration for core utilities
- `gsd-core/vitest.config.ts` - Test runner configuration
- `gsd-core/stryker.config.mjs` - Mutation testing configuration

## Platform Requirements

- Node.js >= 22.0.0 (`gsd-core/package.json`)
- npm >= 10.0.0
- Platform-specific builds: Windows (MSVC 2019+), Linux (GCC 10+/Clang 11+)
- SDL2 and SDL2_mixer for Pinball compilation
- Modern web browser with ES2022 JavaScript support
- Vercel hosting platform
- Electron for desktop deployments of jspaint-master

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- HTML files: PascalCase with spaces in directory names (e.g., `Bureau.html`, `My Computer.html`)
- CSS files: Match associated component name in PascalCase (e.g., `Bureau.css`, `Minesweeper.css`)
- JavaScript files: PascalCase for main modules (e.g., `Bureau.js`, `Loader_Login.js`), snake_case for utility files (e.g., `desktop-icons-draggable.js`)
- Image files: snake_case with descriptive names (e.g., `windows_xp_start_button_normal.png`)
- Declared functions use camelCase with descriptive names: `openWindow()`, `makeResizable()`, `updateTaskbarVisibility()`
- Event handlers often use `on` prefix: `onMouseMove()`, `onMouseUp()`
- Helper functions use simple descriptive names: `snapToGrid()`, `isCellOccupied()`, `findNearestFreeCell()`
- Functions may be exported to global scope via `window.functionName`: `window.turnOffComputer`
- Async functions use standard async/await pattern: `async function loadHTML(filePath)`
- camelCase for local and global variables: `startMenuHTML`, `zIndexCounter`, `draggedIcon`, `isDragging`
- ALL_CAPS for constants: `GRID_SIZE = 80`
- Boolean prefixes with `is` or `has`: `isResizingGlobal`, `isDragging`, `hasLoggedInAsGuest`
- Temporary state variables follow descriptor pattern: `windowTooltipContainer`, `windowCurrentLabel`
- Data attribute names use kebab-case: `data-grid-x`, `data-grid-y`, `data-level`, `data-tooltip-initialized`
- No TypeScript or JSDoc type annotations observed
- Classes not used; object literals used for translations: `appNameTranslations = {}`, `menuToFileMapping = {}`
- Constructor pattern appears in functions that return objects
- Configuration objects at module top: `appNameTranslations`, `menuToFileMapping` (`Bureau.js` lines 7-41)
- CSS class names use camelCase and descriptive compound names: `.BigRectangle`, `.OCD`, `.StartMenuHeader`, `.window-tooltip`
- Window element IDs follow pattern: `window-${appName}` (e.g., `window-Minesweeper`, `window-Notepad`)

## Code Style

- No linter configuration (`.eslintrc`, `.prettierrc`) found in root
- Indentation: 2 spaces (observed in `desktop-icons-draggable.js`, HTML files)
- Line length: No strict limit observed; varies from ~80 to 200+ characters
- Semicolons: Present and required at statement ends
- No linting tools configured or enforced
- console methods used without restriction: `console.log()`, `console.error()`, `console.warn()`
- Commented-out code present (e.g., `//console.log("Écart (info - itm) :", ecart);` in `Bureau.js` line 1586)
- Comments written in French, English, and Russian (mixed-language codebase)
- French comments: `// Cache la fenêtre au départ`, `// Redimensionne la fenêtre`
- Russian comments: `// Маппинг английских названий на русские`, `// Привязка к сетке`
- English comments: `// Ignore double click`, `// Store canvas dimensions`

## Import Organization

- No ES6 imports or CommonJS require used in main codebase
- HTML files load scripts via `<script>` tags: `<script src="/Loader_Login/Loader_Login.js"></script>`
- HTML templates loaded dynamically via fetch API: `loadHTML("/Start_Menu/Base/Start_Menu.html")`
- External libraries loaded in HTML (Vercel Web Analytics, custom Winamp library)
- Absolute root-relative paths used throughout: `/Start_Menu/`, `/Bureau/`, `/Open_Windows/`
- No relative paths with `./` or `../` observed
- Asset paths follow directory structure: `/Assets/Images/`, `/Assets/Sounds/`, `/Assets/minesweeper/`

## Error Handling

- Fetch API with `.then().catch()` chain: `Bureau.js` lines 216-269
- Try-catch blocks for DOM access and iframe operations: `Bureau.js` lines 719-774
- Graceful degradation with fallback: `Bureau.js` lines 799-802
- Silent error handling for audio: `audio.play().catch((error) => console.error("Audio error:", error));`

## Logging

- `console.log()` for general information: window state, timing, game status
- `console.error()` for error conditions: fetch failures, iframe access errors, audio playback issues
- `console.warn()` for warnings: `console.warn("Could not find window elements");` (`Bureau.js` line 921)
- Logging often includes context: `console.log("Window is now visible");`, `console.log("Game loaded: " + value);`
- Debug statements left in production code (e.g., `console.log("Parent Rect:", rect);`)
- Mixed approach: Some functions heavily instrumented with logging, others silent
- Performance tracking: `console.log("waitForGameToLoad started");` indicates feature-specific instrumentation
- Success emoji in `desktop-icons-draggable.js`: `console.log('✅ Desktop icons draggable with grid snap loaded');`

## Comments

- Block headers with ASCII decorators: `desktop-icons-draggable.js` lines 1-4
- Functional explanations above helper functions: `// Привязка к сетке`, `// Найти ближайшую свободную ячейку`
- Inline comments for non-obvious logic: `// Игнорировать двойной клик (он открывает приложение)`
- Comments above complex sections: `// Ограничения чтобы иконка не выходила за пределы рабочего стола`
- Not used; no function documentation headers observed
- No type annotations or parameter documentation
- Temporarily disabled code left in place: `//console.log("Écart (info - itm) :", ecart);` (`Bureau.js` line 1586)
- Approach: Comment out rather than delete (suggests iterative development or debugging)

## Function Design

- Small utility functions (20-50 lines): `snapToGrid()`, `isCellOccupied()`, `updateTimerDisplay()`
- Medium functions (50-200 lines): `openWindow()`, `makeDraggable()`, `makeResizable()`, `attachHoverTooltip()`
- Large functions (200+ lines): `createTaskbar()` (logic-heavy, handles complex DOM manipulation)
- Module initialization code mixed with function definitions at file level: `Bureau.js`
- Functions accept 1-3 parameters typically
- Fetch callbacks use response object and HTML content: `(response) => {}`, `(htmlContent) => {}`
- Event handlers receive event object: `(event) => {}`, `(e) => {}`
- Named parameters in mapping objects: `appName`, `filePath`, `onLoadCallback`
- Most functions return undefined (perform side effects on DOM)
- Some utility functions return objects: `findNearestFreeCell()` returns `{ gridX, gridY }`
- Fetch chains return promises for chaining
- Event listeners don't return meaningful values
- Defensive checks with early return: `if (!element) return;`
- Null coalescing with `||`: `const displayName = appNameTranslations[appName] || appName;`
- Safe property access: `parseInt(value, 10)`, `Math.round()`, `Math.min()`, `Math.max()`

## Module Design

- Functions exported to global scope: `window.turnOffComputer = turnOffComputer;` (`Bureau.js` line 969)
- Functions called via global scope: `onclick="turnOffComputer()"` (HTML attributes)
- Most functions scoped to `Bureau.js` globally (no namespacing)
- Specialized scripts load independently: `Loader_Login.js`, `Minesweeper.js`, `desktop-icons-draggable.js`
- Not used; each module is independent
- HTML files serve as layout/view templates, not JavaScript modules
- `Bureau.js` (~1935 lines): Main application logic, window management, event handling, UI updates
- `Loader_Login.js` (~365 lines): Authentication flow and boot sequence
- `desktop-icons-draggable.js` (~175 lines): Self-contained icon dragging system with grid snapping
- `Minesweeper.js` (~316 lines): Game-specific logic for minesweeper game state
- Module loads HTML via fetch: `loadHTML()` called at top level
- DOM-dependent code in `DOMContentLoaded` event handler: `document.addEventListener("DOMContentLoaded", () => {})`
- Game/feature-specific initialization tied to window opening: `openWindow(appName)` sets up event listeners

## DOM Manipulation Patterns

- `document.getElementById()` for known IDs
- `document.querySelector()` and `document.querySelectorAll()` for CSS selectors
- `element.closest()` for ancestor traversal
- Direct attribute access via `element.getAttribute()`, `element.setAttribute()`
- `element.innerHTML = template` for bulk HTML injection
- `element.textContent` for text-only updates
- `element.classList.add()`/`element.classList.remove()` for CSS classes
- `Object.assign(element.style, {...})` for bulk style updates (`Loader_Login.js` line 75)
- `addEventListener()` for dynamic event binding
- Inline event handlers in HTML: `onclick="functionName()"`, `ondblclick="functionName()"`
- Both patterns used interchangeably (mixing declarative and programmatic approaches)

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Loader & Login** | Boot animation, user login, transition to desktop | `Loader_Login/Loader_Login.js`, `Loader_Login/Loader.css`, `Loader_Login/Login_Screen.css` |
| **Desktop Shell** | Main container, icon management, window orchestration | `Bureau/Bureau.html`, `Bureau/Bureau.css` |
| **Window Manager** | Open/close/minimize/maximize/resize windows, z-index tracking | `Bureau/Bureau.js` (lines 164-1160) |
| **Menu System** | Dynamic start menu and application menus | `Start_Menu/Base/`, menu tooltips |
| **Application Windows** | Individual app UI (Minesweeper, Notepad, Paint, etc.) | `Open_Windows/{AppName}/` |
| **Taskbar** | Window list, switching, status indicators | `Bureau/Bureau.js` (lines 1493-1550), `Bureau/Taskbar.css` |
| **Desktop Interaction** | Icon dragging with grid snap, sound effects | `Bureau/desktop-icons-draggable.js` |

## Pattern Overview

- **No framework** - Pure HTML, CSS, JavaScript (vanilla)
- **Dynamic DOM manipulation** - Windows/menus created and destroyed on demand
- **Global state tracking** - `zIndexCounter`, `localStorage` for persistence
- **Async content loading** - HTML templates fetched and injected via `fetch()`
- **Event delegation** - Click handlers on dynamically created elements
- **CSS injection** - Stylesheets injected on window open via `injectStyle()`

## Layers

- Purpose: Render visual components (windows, menus, desktop icons)
- Location: `Bureau/*.css`, `Open_Windows/*/`, `Start_Menu/*/`
- Contains: HTML templates, CSS stylesheets, static assets
- Depends on: JavaScript event handlers from Bureau.js
- Used by: Window Manager, Application handlers
- Purpose: Handle window lifecycle, user interactions, state management
- Location: `Bureau/Bureau.js` (primary hub - 1935 lines)
- Contains: Window management functions, event listeners, DOM manipulation
- Depends on: HTML templates, CSS, browser APIs
- Used by: Everything else - start menu, windows, taskbar
- Purpose: Initialize application state and transitions
- Location: `Loader_Login/Loader_Login.js`, `index.html`
- Contains: Loader animation, login screen logic, redirect to desktop
- Depends on: CSS transitions, browser events
- Used by: Loads once at startup

## Data Flow

### Primary Request Path (Opening a Window)

### Menu/Tooltip Flow

### State Management

- `zIndexCounter` - Tracks window stacking order, persisted to `localStorage`
- `localStorage.SelectedLevel` - Minesweeper difficulty selection
- `localStorage.fromSwitchUser` - Flag for login transition
- `localStorage.powerAction` - Shutdown action type
- `dataset.maximized` - Boolean: is window fullscreen
- `dataset.originalWidth/Height/Left/Top` - Restore position on unmaximize
- `style.zIndex` - Current stacking order
- `style.display` - Visibility (none = minimized)
- `classList.window-inactive` - Hidden/minimized state indicator

## Key Abstractions

- Purpose: Represent an open application in the desktop environment
- Examples: `window-Minesweeper`, `window-Paint`, `window-Notepad`
- Pattern: DOM element with id `window-{appName}`, class `window`
- Methods: `openWindow()`, `closeWindow()`, `toggleWindow()`, `maximazeWindow()`
- Purpose: Context-sensitive dropdown menus attached to window menu bars
- Examples: File, Edit, View, Help menus with items
- Pattern: `.window-tooltip` div created on demand, positioned near label
- Related: Secondary tooltips (`.window-Sub_tooltip`) for submenus
- Purpose: Launcher for applications or special folders
- Examples: My Computer, Recycle Bin, Notepad, Paint
- Pattern: `.icon` div with image and label, `ondblclick` triggers `openWindow()`
- Interaction: Draggable via `desktop-icons-draggable.js` with grid snapping
- Purpose: Show open windows and allow window switching
- Pattern: `.taskbar-item` div with icon and label
- Behavior: Click toggles visibility/brings to front

## Entry Points

- Location: `index.html`
- Triggers: Page load
- Responsibilities: Display boot loader animation, show login screen
- Lifecycle: Loads assets, plays animation, redirects to `Loader_Login/Loader_Login.html` after ~5 seconds
- Location: `Bureau/Bureau.html`
- Triggers: User login (redirect from login screen)
- Responsibilities: Render desktop, manage all windows and menus
- Lifecycle: Loads `Bureau.js`, initializes icons, waits for user interaction
- Location: `Open_Windows/{AppName}/{AppName}.html`
- Triggers: User clicks icon or menu item
- Responsibilities: Render application UI
- Lifecycle: Fetched on demand, injected into window container

## Architectural Constraints

- **Single-threaded event loop** - All interactions serialized through browser event queue
- **Global state tracking** - `zIndexCounter`, `localStorage` as source of truth for window state
- **No component isolation** - All windows share global listeners and event handlers
- **Synchronous DOM updates** - No virtual DOM or batching; immediate DOM manipulation
- **Fetch-based templating** - HTML templates loaded at runtime via `fetch()`, no build-time processing
- **localStorage persistence** - Limited to key-value strings; only z-index and simple flags persisted
- **Circular menu system** - Menu loading can trigger nested fetches for secondary tooltips (depth 3: window → tooltip → sub-tooltip)

## Anti-Patterns

### Global Event Listener Proliferation

### Hardcoded Menu Mappings

### Fetch-Based Templating Without Caching

## Error Handling

- Failed fetches log to console but continue (e.g., `Bureau/Bureau.js:332-334`)
- Missing HTML files treated as 404 and ignored gracefully (e.g., `Bureau/Bureau.js:436-437`)
- Iframe access wrapped in try-catch for cross-origin restrictions (e.g., `Bureau/Bureau.js:773-786`)
- Timeout fallback for Pinball game load (e.g., `Bureau/Bureau.js:799-807`)

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

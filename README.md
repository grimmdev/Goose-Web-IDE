# Honk Web — Goose Language IDE

A standalone, free web-based IDE for the **Goose** programming language, hosting a client-side WebAssembly compiler, linter, and real-time WebGL graphics engine.

## Features

- **CodeMirror 6 Editor**: Syntax highlighting, autocompletion, diagnostic markers, bracket matching, and keyboard shortcuts.
- **Client-Side WebAssembly Compiler**: Fast sub-2ms JSON diagnostics and code execution via `goose_linter.js`.
- **Real-Time 60 FPS Viewport**: Interactive 2D/3D WebGL renderer supporting programmable in-code controls (`// @controls: dpad, button(...)`).
- **Programmable Presets**: Pre-loaded with Raymarching, Flappy Goose, 2D Top-Down Game Boy Adventure, and more.
- **Offline Single-File Bundle**: Compiles into a 100% self-contained `index.html` with inlined CSS, JS, and WebAssembly binaries.

## Getting Started

```bash
# Install dependencies
bun install
# or: npm install

# Start local development server (Vite on port 3000)
bun dev
# or: npm run dev

# Build single-file production bundle (dist/index.html)
bun run build
# or: npm run build
```

## Structure

```
Honk-Web/
├── src/               # React 19 IDE components, state, CodeMirror setup
├── wasm/
│   ├── dist/          # Compiled WebAssembly modules (goose_linter.js, goose_realtime.js)
│   └── src/           # C runtime & Goose sources
├── index.html         # Vite development entry point
├── build.cjs          # Single-file production bundler
├── vite.config.ts     # Vite dev server configuration
└── package.json       # Project dependencies and scripts
```


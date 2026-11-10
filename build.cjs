const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

async function build() {
  const rootDir = __dirname;
  const outDir = path.resolve(rootDir, "dist");
  const tempCssPath = path.resolve(outDir, "style.css");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("Compiling Tailwind CSS...");
  execSync("npx tailwindcss -i src/index.css -o dist/style.css --minify", {
    cwd: rootDir,
    stdio: "inherit",
  });

  const cssContent = fs.readFileSync(tempCssPath, "utf-8");

  console.log("Bundling React application with esbuild...");
  const result = await esbuild.build({
    entryPoints: [path.resolve(rootDir, "src/main.tsx")],
    bundle: true,
    write: false,
    minify: true,
    target: ["es2020"],
    loader: { ".css": "empty" },
    format: "iife",
    jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });

  const appJsContent = result.outputFiles[0].text;

  // Read WebAssembly module from @grimmdev/goose-wasm
  console.log("Embedding Goose WASM compiler from @grimmdev/goose-wasm...");
  let linterPath = path.resolve(rootDir, "node_modules/@grimmdev/goose-wasm/dist/goose_linter.js");
  if (!fs.existsSync(linterPath)) {
    linterPath = path.resolve(rootDir, "wasm/dist/goose_linter.js");
  }
  const linterJs = fs.readFileSync(linterPath, "utf-8");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>Honk Web — Goose Language IDE</title>
    <style>
${cssContent}
    </style>
    <script>
${linterJs}
    </script>
  </head>
  <body class="bg-black text-white antialiased select-none">
    <div id="root"></div>
    <script>
${appJsContent}
    </script>
  </body>
</html>`;

  fs.writeFileSync(path.resolve(outDir, "index.html"), html, "utf-8");
  console.log("✓ Built single-file production web bundle: dist/index.html");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});


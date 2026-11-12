import { DiagnosticItem } from "@/store/slices/diagnosticsSlice";
import { executeGoose } from "./gooseExecutor";
import gfxPackageCode from "@/packages/gfx.goose";
import audioPackageCode from "@/packages/audio.goose";
import uiPackageCode from "@/packages/ui.goose";
import physicsPackageCode from "@/packages/physics.goose";

export interface CompileResult {
  success: boolean;
  diagnostics: DiagnosticItem[];
  transpiledC: string;
  astDump: string;
  stdout: string;
  stderr: string;
  durationMs: number;
}

let linterModule: any = null;
let linterInitPromise: Promise<any> | null = null;

let currentStdoutHandler: ((text: string) => void) | null = null;
let currentStderrHandler: ((text: string) => void) | null = null;

function initVirtualPackages(mod: any) {
  function mkdirp(p: string) {
    const parts = p.split("/").filter(Boolean);
    let cur = "";
    for (const part of parts) {
      cur += "/" + part;
      try {
        mod.FS.mkdir(cur);
      } catch {}
    }
  }

  // Pre-populate blessed packages in GOOSE_HOME cache to prevent compiler from invoking git
  const gfxPkgDir = "/home/web_user/.goose/pkg/github.com/aardappel/goose_gfx/v1";
  mkdirp(gfxPkgDir);
  try {
    mod.FS.writeFile(gfxPkgDir + "/gfx.goose", gfxPackageCode);
    mod.FS.writeFile(gfxPkgDir + "/audio.goose", audioPackageCode);
    mod.FS.writeFile(gfxPkgDir + "/ui.goose", uiPackageCode);
  } catch {}

  const physicsPkgDir = "/home/web_user/.goose/pkg/github.com/aardappel/goose_physics/v1";
  mkdirp(physicsPkgDir);
  try {
    mod.FS.writeFile(physicsPkgDir + "/physics.goose", physicsPackageCode);
  } catch {}

  // Also pre-populate in /stdlib for direct lookups
  try {
    mod.FS.writeFile("/stdlib/gfx.goose", gfxPackageCode);
    mod.FS.writeFile("/stdlib/audio.goose", audioPackageCode);
    mod.FS.writeFile("/stdlib/ui.goose", uiPackageCode);
    mod.FS.writeFile("/stdlib/physics.goose", physicsPackageCode);
  } catch {}
}

export async function getLinterModule() {
  if (linterModule) return linterModule;
  if (!linterInitPromise) {
    linterInitPromise = new Promise((resolve, reject) => {
      const create = (window as any).createGooseLinter;
      if (!create) {
        return reject(new Error("createGooseLinter not found on window"));
      }
      create({
        noInitialRun: true,
        print: (text: string) => {
          if (currentStdoutHandler) currentStdoutHandler(text);
          else console.log("[goose stdout]", text);
        },
        printErr: (text: string) => {
          if (currentStderrHandler) currentStderrHandler(text);
          else console.warn("[goose stderr]", text);
        },
      })
        .then((mod: any) => {
          initVirtualPackages(mod);
          linterModule = mod;
          resolve(mod);
        })
        .catch(reject);
    });
  }
  return linterInitPromise;
}

export async function checkAndCompileGoose(source: string): Promise<CompileResult> {
  const t0 = performance.now();
  const mod = await getLinterModule();

  let stdout = "";
  let stderr = "";

  currentStdoutHandler = (text: string) => {
    stdout += text + "\n";
  };
  currentStderrHandler = (text: string) => {
    stderr += text + "\n";
  };

  try {
    // Strip any invalid or legacy git module imports from editor source
    const cleanSource = source.replace(/^\s*import\s+git\s*;?\s*$/gm, "");
    mod.FS.writeFile("/editor.goose", cleanSource);

    // Run check with JSON diagnostics
    let checkExit = 0;
    try {
      checkExit = mod.callMain([
        "check", "/editor.goose",
        "--stdlib", "/stdlib",
        "--diagnostics", "json"
      ]);
    } catch {
      // In Emscripten, non-zero compiler exit status or errors throw CppException/ExitStatus
    }

    let diagnostics: DiagnosticItem[] = [];
    try {
      if (stdout.trim().startsWith("[") && stdout.trim().endsWith("]")) {
        diagnostics = JSON.parse(stdout.trim());
      }
    } catch {
      // JSON parse error
    }

    // Transpile to C
    let transpiledC = "";
    if (checkExit === 0) {
      try {
        const transpileExit = mod.callMain(["-o", "/out.c", "/editor.goose", "--stdlib", "/stdlib"]);
        if (transpileExit === 0) {
          transpiledC = mod.FS.readFile("/out.c", { encoding: "utf8" });
        }
      } catch (err) {
        transpiledC = "// Transpilation note: " + String(err);
      }
    }

    // Generate AST Dump
    let astDump = "";
    stdout = "";
    try {
      mod.callMain(["--dump", "/editor.goose", "--stdlib", "/stdlib"]);
      astDump = stdout;
    } catch {
      astDump = "// AST dump unavailable";
    }

    // Run execution for print outputs (e.g. Mandelbrot, CLI algorithms)
    let executionOutput = "";
    if (checkExit === 0) {
      const execRes = executeGoose(source);
      if (execRes.logs.length > 0) {
        executionOutput = execRes.logs.join("\n");
      }
    }

    const durationMs = performance.now() - t0;
    return {
      success: checkExit === 0,
      diagnostics,
      transpiledC,
      astDump,
      stdout: executionOutput,
      stderr,
      durationMs,
    };
  } finally {
    currentStdoutHandler = null;
    currentStderrHandler = null;
  }
}

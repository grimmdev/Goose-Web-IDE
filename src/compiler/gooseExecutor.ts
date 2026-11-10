/**
 * Lightweight Goose Runtime Executor for Client-Side Script Execution
 *
 * Runs Goose main() and algorithmic code in JavaScript sandbox, capturing print() outputs.
 */

export interface ExecutionResult {
  success: boolean;
  logs: string[];
  error?: string;
}

export function executeGoose(source: string): ExecutionResult {
  const logs: string[] = [];
  const maxLogs = 500;

  function print(...args: any[]) {
    if (logs.length >= maxLogs) return;
    const formatted = args
      .map((arg) => {
        if (Array.isArray(arg)) {
          return arg.join("");
        }
        if (typeof arg === "object" && arg !== null) {
          return JSON.stringify(arg);
        }
        return String(arg);
      })
      .join(" ");
    logs.push(formatted);
  }

  let js = source;

  // 1. Remove comments
  js = js.replace(/\/\/.*$/gm, "");

  // 2. Remove import statements
  js = js.replace(/import\s+[a-zA-Z0-9_]+;/g, "");

  // 3. Remove embed_shader blocks
  js = js.replace(/(?:let|var)\s+[a-zA-Z0-9_]+\s*=\s*embed_shader\([^)]*\);/g, "");

  // 4. Struct definitions: struct Duck { name: const u8[:], quack_power: i64 }
  js = js.replace(/struct\s+([a-zA-Z0-9_]+)\s*\{([^}]*)\}/g, (_m, name) => {
    return `function ${name}(obj) { return Object.assign({}, obj); }`;
  });

  // 5. Struct instantiation: Duck { ... } -> Duck({ ... })
  js = js.replace(/\b([A-Z][a-zA-Z0-9_]*)\s*\{([^}]*)\}/g, "$1({$2})");

  // 6. for in range: for y in 0..height { -> for (let y = 0; y < height; y++) {
  js = js.replace(
    /for\s+([a-zA-Z0-9_]+)\s+in\s+([a-zA-Z0-9_]+)\.\.([a-zA-Z0-9_]+)\s*\{/g,
    "for (let $1 = $2; $1 < $3; $1++) {"
  );
  // for y in count { -> for (let y = 0; y < count; y++) {
  js = js.replace(
    /for\s+([a-zA-Z0-9_]+)\s+in\s+([0-9]+|[a-zA-Z0-9_]+)\s*\{/g,
    "for (let $1 = 0; $1 < $2; $1++) {"
  );

  // 7. while / if / else if conditions without parentheses
  js = js.replace(/while\s+(?!\()([^{]+?)\s*\{/g, "while ($1) {");
  js = js.replace(/if\s+(?!\()([^{]+?)\s*\{/g, "if ($1) {");
  js = js.replace(/else\s+if\s+(?!\()([^{]+?)\s*\{/g, "else if ($1) {");

  // 8. Type annotations on variable declarations
  js = js.replace(/(let|var)\s+([a-zA-Z0-9_]+)\s*:\s*[^=;]+/g, "$1 $2");

  // Type annotations in function parameters: fn foo(p1: Type, p2: Type)
  js = js.replace(/\bfn\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g, (_m, name, params) => {
    const cleanParams = params
      .split(",")
      .map((p: string) => p.replace(/:\s*[^,)]+/g, "").trim())
      .join(", ");
    return `fn ${name}(${cleanParams})`;
  });

  // 9. Type casts: (y as f32) -> y
  js = js.replace(/\bas\s+(?:f32|i64|u8|f64|i32|usize)\b/g, "");

  // 10. var -> let
  js = js.replace(/\bvar\b/g, "let");

  // 11. Array methods & properties: .clear() -> .length = 0, .len -> .length
  js = js.replace(/\.clear\(\)/g, ".length = 0");
  js = js.replace(/\.len\b/g, ".length");

  // 12. fn -> function and collect names for UFCS (e.g. duck.honk() -> honk(duck))
  const fnNames: string[] = [];
  js = js.replace(/\bfn\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*[^{]+)?\s*\{/g, (_m, name, params) => {
    fnNames.push(name);
    return `function ${name}(${params}) {`;
  });

  for (const name of fnNames) {
    if (name === "main") continue;
    const ufcsRegex = new RegExp(`([a-zA-Z0-9_]+)\\.${name}\\(([^)]*)\\)`, "g");
    js = js.replace(ufcsRegex, (_m, obj, args) => {
      const rest = args.trim().length > 0 ? `, ${args}` : "";
      return `${name}(${obj}${rest})`;
    });
  }

  // 13. String interpolation: "{d.name}" -> `${d.name}`
  js = js.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, content) => {
    if (content.includes("{") && content.includes("}")) {
      const template = content.replace(/\{([^{}]+)\}/g, "${$1}");
      return `\`${template}\``;
    }
    return match;
  });

  const fullScript = `
    const min = Math.min;
    const max = Math.max;
    const abs = Math.abs;
    const sin = Math.sin;
    const cos = Math.cos;
    const sqrt = Math.sqrt;
    const floor = Math.floor;
    const ceil = Math.ceil;
    const round = Math.round;

    ${js}

    if (typeof main === 'function') {
      main();
    }
  `;

  try {
    const fn = new Function("print", fullScript);
    fn(print);
    return {
      success: true,
      logs,
    };
  } catch (err: any) {
    return {
      success: false,
      logs,
      error: err.message || String(err),
    };
  }
}

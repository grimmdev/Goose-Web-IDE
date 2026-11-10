import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";

const GOOSE_COMPLETIONS = [
  { label: "fn", type: "keyword", info: "Define a function", apply: "fn name() {\n    \n}" },
  { label: "let", type: "keyword", info: "Immutable variable binding", apply: "let " },
  { label: "var", type: "keyword", info: "Mutable variable binding", apply: "var " },
  { label: "struct", type: "keyword", info: "Define a struct", apply: "struct Name {\n    \n}" },
  { label: "match", type: "keyword", info: "Pattern match", apply: "match value {\n    \n}" },
  { label: "import", type: "keyword", info: "Import a module", apply: "import std;" },
  { label: "export", type: "keyword", info: "Export function to C/WASM", apply: "export \"name\" fn " },
  { label: "print", type: "function", info: "Print string to console", apply: 'print("");' },
  { label: "println", type: "function", info: "Print string with newline", apply: 'println("");' },
  { label: "float3", type: "type", info: "3D vector type", apply: "float3 { 0.0, 0.0, 0.0 }" },
  { label: "float2", type: "type", info: "2D vector type", apply: "float2 { 0.0, 0.0 }" },
  { label: "length", type: "function", info: "Vector magnitude", apply: "length()" },
  { label: "normalize", type: "function", info: "Normalize vector to unit length", apply: "normalize()" },
  { label: "dot", type: "function", info: "Dot product of vectors", apply: "dot(a, b)" },
];

export function gooseCompletionSource(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\w*/);
  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }

  return {
    from: word.from,
    options: GOOSE_COMPLETIONS,
  };
}


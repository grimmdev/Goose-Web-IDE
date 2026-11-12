import { StreamLanguage } from "@codemirror/language";

export const gooseLanguage = StreamLanguage.define({
  name: "goose",
  startState() {
    return { inString: false, inComment: false };
  },
  token(stream, state) {
    if (stream.eatSpace()) return null;

    // Single-line comment
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    // Strings
    if (stream.match(/^"([^"\\]|\\.)*"/)) {
      return "string";
    }

    // Numbers (hex, float, decimal)
    if (stream.match(/^0x[0-9a-fA-F]+/)) return "number";
    if (stream.match(/^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/)) return "number";

    // Goose Keywords
    if (
      stream.match(
        /^(fn|let|var|const|struct|enum|match|if|else|for|in|while|return|break|continue|import|export|true|false|as)\b/
      )
    ) {
      return "keyword";
    }

    // Goose Types
    if (
      stream.match(
        /^(i8|i16|i32|i64|u8|u16|u32|u64|f32|f64|bool|string|void|float2|float3|float4|int2|int3|int4)\b/
      )
    ) {
      return "typeName";
    }

    // Built-in standard functions
    if (
      stream.match(
        /^(print|println|min|max|clamp|sin|cos|tan|sqrt|abs|floor|ceil|pow|dot|cross|normalize|length|reflect|push|pop|len)\b/
      )
    ) {
      return "builtin";
    }

    // Identifiers & Function names
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      if (stream.peek() === "(") {
        return "function";
      }
      return "variableName";
    }

    // Operators & Punctuation
    if (stream.match(/^(=>|->|::|:=|==|!=|<=|>=|\+=|-=|\*=|\/=|&&|\|\||\.\.|\.|\+|-|\*|\/|%|=|<|>|!|&|\||\^)/)) {
      return "operator";
    }

    stream.next();
    return null;
  },
});


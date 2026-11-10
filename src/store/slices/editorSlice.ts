import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface EditorState {
  source: string;
  cursor: number;
  isDirty: boolean;
}

export const DEFAULT_STARTER_SOURCE = `// Hello World in Goose
import std;

let hello_fs = embed_shader("frag", """
    layout(location = 0) out vec4 result;
    layout(set = 3, binding = 0) uniform Frame {
        vec2 u_resolution;
        float u_time;
    };

    float seg(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
    }

    float draw_char(vec2 p, int c) {
        float d = 1e5;
        if (c == 0) { // H
            d = min(d, seg(p, vec2(-0.3, -0.5), vec2(-0.3, 0.5)));
            d = min(d, seg(p, vec2(0.3, -0.5), vec2(0.3, 0.5)));
            d = min(d, seg(p, vec2(-0.3, 0.0), vec2(0.3, 0.0)));
        } else if (c == 1) { // E
            d = min(d, seg(p, vec2(-0.3, -0.5), vec2(-0.3, 0.5)));
            d = min(d, seg(p, vec2(-0.3, 0.5), vec2(0.3, 0.5)));
            d = min(d, seg(p, vec2(-0.3, 0.0), vec2(0.15, 0.0)));
            d = min(d, seg(p, vec2(-0.3, -0.5), vec2(0.3, -0.5)));
        } else if (c == 2) { // L
            d = min(d, seg(p, vec2(-0.3, -0.5), vec2(-0.3, 0.5)));
            d = min(d, seg(p, vec2(-0.3, -0.5), vec2(0.3, -0.5)));
        } else if (c == 3) { // O
            vec2 q = abs(p) - vec2(0.15, 0.35);
            d = abs(length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - 0.15);
        } else if (c == 4) { // W
            d = min(d, seg(p, vec2(-0.35, 0.5), vec2(-0.2, -0.5)));
            d = min(d, seg(p, vec2(-0.2, -0.5), vec2(0.0, 0.1)));
            d = min(d, seg(p, vec2(0.0, 0.1), vec2(0.2, -0.5)));
            d = min(d, seg(p, vec2(0.2, -0.5), vec2(0.35, 0.5)));
        } else if (c == 5) { // R
            d = min(d, seg(p, vec2(-0.3, -0.5), vec2(-0.3, 0.5)));
            d = min(d, seg(p, vec2(-0.3, 0.5), vec2(0.1, 0.5)));
            d = min(d, seg(p, vec2(0.1, 0.5), vec2(0.3, 0.25)));
            d = min(d, seg(p, vec2(0.3, 0.25), vec2(0.1, 0.0)));
            d = min(d, seg(p, vec2(-0.3, 0.0), vec2(0.1, 0.0)));
            d = min(d, seg(p, vec2(0.0, 0.0), vec2(0.3, -0.5)));
        } else if (c == 6) { // D
            d = min(d, seg(p, vec2(-0.3, -0.5), vec2(-0.3, 0.5)));
            d = min(d, seg(p, vec2(-0.3, 0.5), vec2(0.1, 0.5)));
            d = min(d, seg(p, vec2(0.1, 0.5), vec2(0.3, 0.25)));
            d = min(d, seg(p, vec2(0.3, 0.25), vec2(0.3, -0.25)));
            d = min(d, seg(p, vec2(0.3, -0.25), vec2(0.1, -0.5)));
            d = min(d, seg(p, vec2(-0.3, -0.5), vec2(0.1, -0.5)));
        }
        return d;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
        uv = uv * 6.0;
        uv.y += sin(u_time * 2.0 + uv.x * 0.5) * 0.15;

        float d = 1e5;
        // HELLO
        d = min(d, draw_char(uv - vec2(-4.0, 0.0), 0));
        d = min(d, draw_char(uv - vec2(-3.2, 0.0), 1));
        d = min(d, draw_char(uv - vec2(-2.4, 0.0), 2));
        d = min(d, draw_char(uv - vec2(-1.6, 0.0), 2));
        d = min(d, draw_char(uv - vec2(-0.8, 0.0), 3));

        // WORLD
        d = min(d, draw_char(uv - vec2(0.8, 0.0), 4));
        d = min(d, draw_char(uv - vec2(1.6, 0.0), 3));
        d = min(d, draw_char(uv - vec2(2.4, 0.0), 5));
        d = min(d, draw_char(uv - vec2(3.2, 0.0), 2));
        d = min(d, draw_char(uv - vec2(4.0, 0.0), 6));

        float alpha = smoothstep(0.08, 0.03, d);
        float glow = exp(-d * 3.5) * 0.45;
        vec3 bg = mix(vec3(0.06, 0.08, 0.14), vec3(0.02, 0.03, 0.05), clamp(length(uv) / 5.0, 0.0, 1.0));
        vec3 textCol = vec3(0.95, 0.75, 0.25) + 0.15 * cos(u_time * 2.0 + uv.x + vec3(0.0, 1.0, 2.0));
        vec3 col = bg + glow * vec3(0.9, 0.6, 0.2) + alpha * textCol;
        result = vec4(col, 1.0);
    }
""");

fn main() {
    print("Hello world");
}
`;

function getInitialSource(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = window.localStorage.getItem("honk_last_source");
      if (
        saved !== null &&
        saved.trim().length > 0 &&
        saved.trim() !== "import std;\n\nfn main() {\n    \n}" &&
        saved.trim() !== "import std;\n\nfn main() {}"
      ) {
        return saved;
      }
    } catch {}
  }
  return DEFAULT_STARTER_SOURCE;
}

const initialState: EditorState = {
  source: getInitialSource(),
  cursor: 0,
  isDirty: false,
};

export const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    setSource: (state, action: PayloadAction<string>) => {
      state.source = action.payload;
      state.isDirty = true;
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem("honk_last_source", action.payload);
        } catch {}
      }
    },
    setCursor: (state, action: PayloadAction<number>) => {
      state.cursor = action.payload;
    },
    markSaved: (state) => {
      state.isDirty = false;
    },
  },
});

export const { setSource, setCursor, markSaved } = editorSlice.actions;
export default editorSlice.reducer;


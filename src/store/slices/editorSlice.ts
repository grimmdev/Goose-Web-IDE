import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import helloWorldCode from "@/presets/hello_world.goose";

interface EditorState {
  source: string;
  cursor: number;
  isDirty: boolean;
}

export const DEFAULT_STARTER_SOURCE = helloWorldCode;

function getInitialSource(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = window.localStorage.getItem("honk_last_source");
      if (
        saved !== null &&
        saved.trim().length > 0 &&
        saved.trim() !== "import std;\n\nfn main() {\n    \n}" &&
        saved.trim() !== "import std;\n\nfn main() {}" &&
        !saved.includes("import git") &&
        !saved.includes("FLAPPY_SHADER")
      ) {
        return saved;
      }
      if (saved && (saved.includes("import git") || saved.includes("FLAPPY_SHADER"))) {
        window.localStorage.removeItem("honk_last_source");
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
      const sanitized = action.payload.replace(/^\s*import\s+git\s*;?\s*$/gm, "");
      state.source = sanitized;
      state.isDirty = true;
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem("honk_last_source", sanitized);
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


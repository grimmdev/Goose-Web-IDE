import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "./slices/themeSlice";
import editorReducer from "./slices/editorSlice";
import filesReducer from "./slices/filesSlice";
import diagnosticsReducer from "./slices/diagnosticsSlice";
import compilerReducer from "./slices/compilerSlice";
import presetsReducer from "./slices/presetsSlice";

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    editor: editorReducer,
    files: filesReducer,
    diagnostics: diagnosticsReducer,
    compiler: compilerReducer,
    presets: presetsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


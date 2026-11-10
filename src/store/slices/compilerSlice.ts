import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ViewportTab = "scene_3d" | "c_output" | "ast" | "terminal";

interface CompilerState {
  isCompiling: boolean;
  isSceneActive: boolean;
  activeTab: ViewportTab;
  isExpanded: boolean;
  transpiledC: string;
  astDump: string;
  terminalLogs: string[];
  compileDurationMs: number;
}

const initialState: CompilerState = {
  isCompiling: false,
  isSceneActive: false,
  activeTab: "scene_3d",
  isExpanded: true,
  transpiledC: "",
  astDump: "",
  terminalLogs: ["Ready. Type Goose code or select a preset to run."],
  compileDurationMs: 0,
};

export const compilerSlice = createSlice({
  name: "compiler",
  initialState,
  reducers: {
    setCompiling: (state, action: PayloadAction<boolean>) => {
      state.isCompiling = action.payload;
    },
    setSceneActive: (state, action: PayloadAction<boolean>) => {
      state.isSceneActive = action.payload;
    },
    toggleSceneActive: (state) => {
      state.isSceneActive = !state.isSceneActive;
    },
    setActiveTab: (state, action: PayloadAction<ViewportTab>) => {
      state.activeTab = action.payload;
    },
    setExpanded: (state, action: PayloadAction<boolean>) => {
      state.isExpanded = action.payload;
    },
    toggleExpanded: (state) => {
      state.isExpanded = !state.isExpanded;
    },
    setTranspiledC: (state, action: PayloadAction<string>) => {
      state.transpiledC = action.payload;
    },
    setAstDump: (state, action: PayloadAction<string>) => {
      state.astDump = action.payload;
    },
    addTerminalLog: (state, action: PayloadAction<string>) => {
      state.terminalLogs.push(action.payload);
      if (state.terminalLogs.length > 200) {
        state.terminalLogs.shift();
      }
    },
    clearTerminalLogs: (state) => {
      state.terminalLogs = [];
    },
    setCompileDuration: (state, action: PayloadAction<number>) => {
      state.compileDurationMs = action.payload;
    },
  },
});

export const {
  setCompiling,
  setSceneActive,
  toggleSceneActive,
  setActiveTab,
  setExpanded,
  toggleExpanded,
  setTranspiledC,
  setAstDump,
  addTerminalLog,
  clearTerminalLogs,
  setCompileDuration,
} = compilerSlice.actions;

export default compilerSlice.reducer;


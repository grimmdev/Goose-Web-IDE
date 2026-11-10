import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface DiagnosticItem {
  severity: "error" | "warning" | "info";
  message: string;
  file?: string;
  line: number;
  col: number;
  endLine?: number;
  endCol?: number;
  text?: string;
}

interface DiagnosticsState {
  items: DiagnosticItem[];
  errorCount: number;
  warningCount: number;
}

const initialState: DiagnosticsState = {
  items: [],
  errorCount: 0,
  warningCount: 0,
};

export const diagnosticsSlice = createSlice({
  name: "diagnostics",
  initialState,
  reducers: {
    setDiagnostics: (state, action: PayloadAction<DiagnosticItem[]>) => {
      state.items = action.payload;
      state.errorCount = action.payload.filter((d) => d.severity === "error").length;
      state.warningCount = action.payload.filter((d) => d.severity === "warning").length;
    },
    clearDiagnostics: (state) => {
      state.items = [];
      state.errorCount = 0;
      state.warningCount = 0;
    },
  },
});

export const { setDiagnostics, clearDiagnostics } = diagnosticsSlice.actions;
export default diagnosticsSlice.reducer;


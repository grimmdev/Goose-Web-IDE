import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface FileItem {
  id: string;
  name: string;
  path: string;
  content?: string;
  modifiedAt: number;
}

interface FilesState {
  items: FileItem[];
  activeFileId: string | null;
}

const initialState: FilesState = {
  items: [
    {
      id: "main.goose",
      name: "main.goose",
      path: "main.goose",
      modifiedAt: Date.now(),
    },
  ],
  activeFileId: "main.goose",
};

export const filesSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    setFiles: (state, action: PayloadAction<FileItem[]>) => {
      state.items = action.payload;
      if (!state.items.some((f) => f.id === state.activeFileId) && state.items.length > 0) {
        state.activeFileId = state.items[0].id;
      }
    },
    setActiveFileId: (state, action: PayloadAction<string>) => {
      state.activeFileId = action.payload;
    },
    addFile: (state, action: PayloadAction<FileItem>) => {
      state.items.push(action.payload);
      state.activeFileId = action.payload.id;
    },
    removeFile: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((f) => f.id !== action.payload);
      if (state.activeFileId === action.payload) {
        state.activeFileId = state.items.length > 0 ? state.items[0].id : null;
      }
    },
    updateFileContent: (state, action: PayloadAction<{ id: string; content: string }>) => {
      const item = state.items.find((f) => f.id === action.payload.id);
      if (item) {
        item.content = action.payload.content;
        item.modifiedAt = Date.now();
      }
    },
  },
});

export const { setFiles, setActiveFileId, addFile, removeFile, updateFileContent } = filesSlice.actions;
export default filesSlice.reducer;


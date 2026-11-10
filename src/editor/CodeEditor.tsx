import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, undo, redo, indentMore } from "@codemirror/commands";
import { keymap } from "@codemirror/view";
import { bracketMatching } from "@codemirror/language";
import { autocompletion } from "@codemirror/autocomplete";
import { gooseLanguage } from "./gooseMode";
import { createEditorTheme } from "./theme";
import { gooseCompletionSource } from "./completions";

export interface CodeEditorHandle {
  insertText: (text: string, cursorOffset?: number) => void;
  focus: () => void;
  getSource: () => string;
  undo: () => void;
  redo: () => void;
  insertTab: () => void;
  moveCaret: (direction: -1 | 1) => void;
  goToLine: (line: number, col?: number) => void;
}

interface CodeEditorProps {
  source: string;
  isDark: boolean;
  onChange: (value: string) => void;
  onCursorChange?: (cursor: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { source, isDark, onChange, onCursorChange, onFocus, onBlur },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  useImperativeHandle(ref, () => ({
    insertText: (text: string, cursorOffset?: number) => {
      const view = viewRef.current;
      if (!view) return;

      const pos = view.state.selection.main.head;
      view.dispatch({
        changes: { from: pos, insert: text },
        selection: { anchor: pos + (cursorOffset ?? text.length) },
      });
      view.focus();
    },
    focus: () => {
      viewRef.current?.focus();
    },
    getSource: () => {
      return viewRef.current?.state.doc.toString() ?? "";
    },
    undo: () => {
      if (viewRef.current) undo(viewRef.current);
    },
    redo: () => {
      if (viewRef.current) redo(viewRef.current);
    },
    insertTab: () => {
      if (viewRef.current) indentMore(viewRef.current);
    },
    moveCaret: (direction: -1 | 1) => {
      const view = viewRef.current;
      if (!view) return;
      const pos = view.state.selection.main.head;
      const newPos = Math.max(0, Math.min(view.state.doc.length, pos + direction));
      view.dispatch({
        selection: { anchor: newPos },
      });
    },
    goToLine: (line: number, col: number = 1) => {
      const view = viewRef.current;
      if (!view) return;
      try {
        const lineInfo = view.state.doc.line(Math.min(line, view.state.doc.lines));
        const targetPos = Math.min(lineInfo.from + (col - 1), lineInfo.to);
        view.dispatch({
          selection: { anchor: targetPos },
          scrollIntoView: true,
        });
        view.focus();
      } catch {
        // invalid line
      }
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const startState = EditorState.create({
      doc: source,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        autocompletion({ override: [gooseCompletionSource] }),
        gooseLanguage,
        themeCompartmentRef.current.of(createEditorTheme(isDark)),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
          if (update.selectionSet) {
            onCursorChangeRef.current?.(update.state.selection.main.head);
          }
          if (update.focusChanged) {
            if (viewRef.current?.hasFocus) {
              onFocusRef.current?.();
            } else {
              onBlurRef.current?.();
            }
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompartmentRef.current.reconfigure(createEditorTheme(isDark)),
      });
    }
  }, [isDark]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (source !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: source },
      });
    }
  }, [source]);

  return <div ref={containerRef} className="w-full h-full overflow-hidden" />;
});


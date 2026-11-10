import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export function createEditorTheme(isDark: boolean) {
  const baseTheme = EditorView.theme(
    {
      "&": {
        backgroundColor: isDark ? "#000000" : "#ffffff",
        color: isDark ? "#ffffff" : "#18181b",
        height: "100%",
        fontSize: "13px",
      },
      ".cm-content": {
        caretColor: isDark ? "#ffffff" : "#000000",
        padding: "8px 0",
        lineHeight: "1.6",
      },
      "&.cm-focused .cm-cursor": {
        borderLeftColor: isDark ? "#ffffff" : "#000000",
        borderLeftWidth: "2px",
      },
      "&.cm-focused .cm-selectionBackground, ::selection": {
        backgroundColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
      },
      ".cm-gutters": {
        backgroundColor: isDark ? "#000000" : "#ffffff",
        color: isDark ? "#52525b" : "#a1a1aa",
        borderRight: isDark ? "1px solid #18181b" : "1px solid #f4f4f5",
        paddingRight: "8px",
      },
      ".cm-activeLine": {
        backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "transparent",
        color: isDark ? "#ffffff" : "#000000",
        fontWeight: "bold",
      },
    },
    { dark: isDark }
  );

  const highlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: isDark ? "#f43f5e" : "#e11d48", fontWeight: "600" },
    { tag: t.typeName, color: isDark ? "#38bdf8" : "#0284c7" },
    { tag: t.function(t.variableName), color: isDark ? "#a78bfa" : "#7c3aed" },
    { tag: t.string, color: isDark ? "#4ade80" : "#16a34a" },
    { tag: t.number, color: isDark ? "#fb923c" : "#ea580c" },
    { tag: t.comment, color: isDark ? "#71717a" : "#a1a1aa", fontStyle: "italic" },
    { tag: t.operator, color: isDark ? "#e2e8f0" : "#334155" },
    { tag: t.special(t.variableName), color: isDark ? "#facc15" : "#ca8a04" },
  ]);

  return [baseTheme, syntaxHighlighting(highlightStyle)];
}


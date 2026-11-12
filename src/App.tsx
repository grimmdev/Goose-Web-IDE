import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "./store";
import { toggleTheme, setTheme } from "./store/slices/themeSlice";
import { setSource, setCursor, markSaved } from "./store/slices/editorSlice";
import { setFiles, setActiveFileId, addFile, removeFile, updateFileContent, FileItem } from "./store/slices/filesSlice";
import { setDiagnostics } from "./store/slices/diagnosticsSlice";
import {
  setCompiling,
  setSceneActive,
  setActiveTab,
  setExpanded,
  toggleExpanded,
  setTranspiledC,
  setAstDump,
  addTerminalLog,
  setCompileDuration,
} from "./store/slices/compilerSlice";
import { PresetItem } from "./store/slices/presetsSlice";
import { CodeEditor, CodeEditorHandle } from "./editor/CodeEditor";
import { ResultsPanel } from "./components/ResultsPanel";
import { PresetsDrawer } from "./components/PresetsDrawer";
import { DiagnosticsDrawer } from "./components/DiagnosticsDrawer";
import { HeaderDropdown } from "./components/HeaderDropdown";
import { AttributionsModal } from "./components/AttributionsModal";
import {
  Play,
  Square,
  FileText,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { sendToNative, subscribeToNative } from "./bridge";
import { checkAndCompileGoose } from "./compiler/gooseEngine";
import { playGooseHonk } from "./audio/honkSound";

export function App() {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useSelector((state: RootState) => state.theme.mode);
  const editor = useSelector((state: RootState) => state.editor);
  const filesState = useSelector((state: RootState) => state.files);
  const presetsState = useSelector((state: RootState) => state.presets);
  const diagnosticsState = useSelector((state: RootState) => state.diagnostics);
  const compilerState = useSelector((state: RootState) => state.compiler);

  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAttributionsOpen, setIsAttributionsOpen] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [isHonkGrowing, setIsHonkGrowing] = useState(false);

  const [viewportHeight, setViewportHeight] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return window.visualViewport ? window.visualViewport.height : window.innerHeight;
    }
    return 800;
  });

  const initialHeightRef = useRef<number>(
    typeof window !== "undefined"
      ? (window.visualViewport ? window.visualViewport.height : window.innerHeight)
      : 800
  );
  const initialWidthRef = useRef<number>(typeof window !== "undefined" ? window.innerWidth : 400);

  const editorRef = useRef<CodeEditorHandle>(null);
  const isEditorFocusedRef = useRef(false);
  const linterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDark = theme === "dark";
  const iconColor = isDark ? "#ffffff" : "#000000";

  // Sync theme with document class and native shell
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    sendToNative({ type: "theme:changed", mode: theme });
  }, [theme, isDark]);

  // Native bridge subscription
  useEffect(() => {
    sendToNative({ type: "ready" });

    const unsubscribe = subscribeToNative((msg) => {
      if (msg.type === "set_theme") {
        dispatch(setTheme(msg.mode));
      } else if (msg.type === "file:loaded") {
        dispatch(setSource(msg.content));
        dispatch(markSaved());
      } else if (msg.type === "file:list_updated") {
        dispatch(
          setFiles(
            msg.files.map((f) => ({
              id: f.id,
              name: f.name,
              path: f.path,
              modifiedAt: f.modifiedAt,
            }))
          )
        );
      } else if (msg.type === "keyboard:status") {
        setIsKeyboardActive(msg.isOpen);
        const vv = window.visualViewport;
        const currentHeight = vv ? vv.height : window.innerHeight;
        setViewportHeight(currentHeight);
      }
    });

    return unsubscribe;
  }, [dispatch]);

  // Track visual viewport resizes for Android soft keyboard
  useEffect(() => {
    const handleViewportChange = () => {
      const vv = window.visualViewport;
      const currentHeight = vv ? vv.height : window.innerHeight;
      const currentWidth = vv ? vv.width : window.innerWidth;
      setViewportHeight(currentHeight);

      if (Math.abs(currentWidth - initialWidthRef.current) > 60) {
        initialWidthRef.current = currentWidth;
        initialHeightRef.current = currentHeight;
        return;
      }

      if (currentHeight > initialHeightRef.current) {
        initialHeightRef.current = currentHeight;
      }

      const heightDelta = initialHeightRef.current - currentHeight;
      if (heightDelta > 100) {
        setIsKeyboardActive(true);
      } else if (heightDelta <= 80 && !isEditorFocusedRef.current) {
        setIsKeyboardActive(false);
      }

      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    const handleWindowScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleWindowScroll);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
      window.visualViewport.addEventListener("scroll", handleViewportChange);
    }
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleWindowScroll);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportChange);
        window.visualViewport.removeEventListener("scroll", handleViewportChange);
      }
    };
  }, []);

  // Background debounced linter on typing
  const runValidation = useCallback(
    async (code: string) => {
      try {
        const result = await checkAndCompileGoose(code);
        dispatch(setDiagnostics(result.diagnostics));
        dispatch(setTranspiledC(result.transpiledC));
        dispatch(setAstDump(result.astDump));
        dispatch(setCompileDuration(result.durationMs));
      } catch (err: any) {
        console.error("Linter error:", err);
      }
    },
    [dispatch]
  );

  // Background debounced validation on typing
  useEffect(() => {
    if (linterTimerRef.current) clearTimeout(linterTimerRef.current);
    linterTimerRef.current = setTimeout(() => {
      runValidation(editor.source);
    }, 400);

    return () => {
      if (linterTimerRef.current) clearTimeout(linterTimerRef.current);
    };
  }, [editor.source, runValidation]);

  // Stop Viewport Scene
  const handleStop = () => {
    (document.activeElement as HTMLElement)?.blur();
    sendToNative({ type: "keyboard:dismiss" });
    setIsKeyboardActive(false);
    sendToNative({ type: "haptic:trigger", style: "light" });
    dispatch(setSceneActive(false));
    dispatch(addTerminalLog("■ Viewport stopped."));
  };

  // Manual Run Trigger
  const handleRun = async () => {
    (document.activeElement as HTMLElement)?.blur();
    sendToNative({ type: "keyboard:dismiss" });
    setIsKeyboardActive(false);

    if (compilerState.isSceneActive) {
      handleStop();
      return;
    }

    playGooseHonk();
    setIsHonkGrowing(true);
    setTimeout(() => setIsHonkGrowing(false), 400);

    sendToNative({ type: "haptic:trigger", style: "medium" });
    dispatch(setCompiling(true));
    try {
      const result = await checkAndCompileGoose(editor.source);
      dispatch(setDiagnostics(result.diagnostics));
      dispatch(setTranspiledC(result.transpiledC));
      dispatch(setAstDump(result.astDump));
      dispatch(setCompileDuration(result.durationMs));

      if (result.success) {
        dispatch(addTerminalLog(`✓ Compilation successful in ${result.durationMs.toFixed(1)}ms`));
        if (result.stdout && result.stdout.trim().length > 0) {
          result.stdout.split("\n").forEach((line) => {
            dispatch(addTerminalLog(line));
          });
        }

        const hasVisualScene =
          editor.source.includes("embed_shader") ||
          editor.source.includes("map_scene") ||
          editor.source.includes("voxel") ||
          editor.source.includes("RAYTRACER_SHADER");

        if (hasVisualScene) {
          dispatch(setSceneActive(true));
          dispatch(setActiveTab("scene_3d"));
          dispatch(setExpanded(true));
        } else {
          dispatch(setSceneActive(false));
          dispatch(setActiveTab("terminal"));
          dispatch(setExpanded(true));
        }
      } else {
        dispatch(setSceneActive(false));
        dispatch(
          addTerminalLog(
            `✗ Compilation failed: ${result.diagnostics.length} diagnostics emitted`
          )
        );
      }
    } catch (err: any) {
      console.error("Compilation error:", err);
      dispatch(setSceneActive(false));
      dispatch(addTerminalLog(`✗ Compiler error: ${err.message || String(err)}`));
    } finally {
      dispatch(setCompiling(false));
    }
  };

  // Preset Selection
  const handleSelectPreset = (preset: PresetItem) => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    dispatch(setSource(preset.code));

    const hasVisualScene =
      preset.category === "3D Engine" ||
      preset.category === "Language" ||
      preset.code.includes("embed_shader") ||
      preset.code.includes("map_scene") ||
      preset.code.includes("voxel") ||
      preset.code.includes("RAYTRACER_SHADER");

    if (hasVisualScene) {
      dispatch(setActiveTab("scene_3d"));
      dispatch(setExpanded(true));
      dispatch(setSceneActive(true));
    } else {
      dispatch(setSceneActive(false));
      dispatch(setActiveTab("terminal"));
      dispatch(setExpanded(true));
    }
  };

  // File Creation
  const handleCreateFile = (name: string) => {
    const isShader = /\.(frag|glsl|fs)$/i.test(name);
    const starterContent = isShader
      ? `// ${name} — Live WebGL Fragment Shader for Viewport\nprecision highp float;\n\nuniform vec2 u_resolution;\nuniform float u_time;\nuniform vec2 u_cam_rot;\nuniform vec3 u_cam_pos;\n\nvoid main() {\n    vec2 uv = gl_FragCoord.xy / u_resolution.xy;\n    vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0.0, 2.0, 4.0));\n    gl_FragColor = vec4(col, 1.0);\n}\n`
      : `// ${name}\nimport std;\n\nfn main() {\n    print("Hello from ${name}!");\n}\n`;

    if (filesState.activeFileId) {
      dispatch(updateFileContent({ id: filesState.activeFileId, content: editor.source }));
    }

    const newFile: FileItem = {
      id: name,
      name,
      path: name,
      content: starterContent,
      modifiedAt: Date.now(),
    };
    dispatch(addFile(newFile));
    dispatch(setSource(starterContent));
    sendToNative({ type: "file:save", path: name, content: starterContent });
  };

  // File Selection
  const handleSelectFile = (file: FileItem) => {
    if (filesState.activeFileId) {
      dispatch(updateFileContent({ id: filesState.activeFileId, content: editor.source }));
    }
    dispatch(setActiveFileId(file.id));
    dispatch(setSource(file.content !== undefined ? file.content : ""));
    sendToNative({ type: "file:read", path: file.name });
  };

  // File Deletion
  const handleDeleteFile = (id: string) => {
    dispatch(removeFile(id));
  };

  // Format Code
  const handleFormatCode = () => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    dispatch(addTerminalLog("Auto-formatting code..."));
    // Basic formatting placeholder: trims trailing whitespace
    const formatted = editor.source
      .split("\n")
      .map((l) => l.trimEnd())
      .join("\n");
    dispatch(setSource(formatted));
  };

  // Export File (supports custom filename & content, with web fallback)
  const handleExport = (customFilename?: string, customContent?: string) => {
    const filename = customFilename || filesState.activeFileId || "main.goose";
    const content = customContent !== undefined ? customContent : editor.source;

    // Native bridge export (opens Android Share / Save Sheet)
    sendToNative({
      type: "file:export",
      filename,
      content,
    });

    // Browser Blob download fallback
    try {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // browser download suppressed or handled natively
    }

    sendToNative({ type: "haptic:trigger", style: "light" });
    dispatch(addTerminalLog(`✓ Exported ${filename}`));
  };

  // Auto-activate 3D/Game scene if last loaded project/preset contains a live scene
  useEffect(() => {
    const hasVisualScene =
      editor.source.includes("embed_shader") ||
      editor.source.includes("map_scene") ||
      editor.source.includes("voxel") ||
      editor.source.includes("RAYTRACER_SHADER");

    if (hasVisualScene) {
      dispatch(setActiveTab("scene_3d"));
      dispatch(setSceneActive(true));
    } else {
      dispatch(setActiveTab("terminal"));
      dispatch(setSceneActive(false));
    }
  }, []);

  // Open Goose Documentation
  const handleOpenDocs = () => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    const url = "https://aardappel.github.io/goose/";
    sendToNative({ type: "open_url", url });
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Auto-save debounced to native bridge & filesState sync
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editor.isDirty) {
        const fileName = filesState.activeFileId || "main.goose";
        dispatch(updateFileContent({ id: fileName, content: editor.source }));
        sendToNative({
          type: "file:save",
          path: fileName,
          content: editor.source,
        });
        dispatch(markSaved());
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [editor.source, editor.isDirty, filesState.activeFileId, dispatch]);

  return (
    <div
      style={{ height: viewportHeight ? `${viewportHeight}px` : "100%" }}
      className="flex flex-col w-full bg-white dark:bg-black text-black dark:text-white overflow-hidden font-sans select-none"
    >
      {/* Header Bar */}
      <header className="relative flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black z-10">
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900/60 select-none">
            <FileText size={15} color={iconColor} strokeWidth={1.5} />
            <span className="font-mono text-xs font-medium">main</span>
          </div>

          {editor.isDirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
          )}
        </div>

        <div className="flex items-center space-x-2">
          {diagnosticsState.items.length > 0 && (
            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen(true)}
              className="flex items-center space-x-1 px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs font-mono"
              aria-label="Diagnostics"
            >
              <AlertCircle size={14} color={iconColor} strokeWidth={1.5} />
              <span className="text-[11px] font-bold">{diagnosticsState.items.length}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center justify-center"
            aria-label="Tools and settings"
          >
            <MoreHorizontal size={15} color={iconColor} strokeWidth={1.5} />
          </button>

          <Button
            variant={compilerState.isSceneActive ? "stop" : "run"}
            size="sm"
            onClick={compilerState.isSceneActive ? handleStop : handleRun}
            className={`flex items-center space-x-1.5 px-3 py-1.5 ${
              isHonkGrowing ? "honk-grow-anim" : ""
            }`}
            disabled={compilerState.isCompiling}
          >
            {compilerState.isCompiling ? (
              <RefreshCw size={14} color="#000000" strokeWidth={2.5} className="animate-spin" />
            ) : compilerState.isSceneActive ? (
              <Square size={12} color="#ffffff" strokeWidth={2} fill="#ffffff" />
            ) : (
              <Play size={14} color="#000000" strokeWidth={2.5} fill="#000000" />
            )}
            <span
              className={`text-xs font-bold tracking-wider uppercase ${
                compilerState.isSceneActive ? "text-white" : "text-black"
              }`}
            >
              {compilerState.isCompiling ? "Running" : compilerState.isSceneActive ? "Stop" : "Run"}
            </span>
          </Button>
        </div>
      </header>

      {/* Code Editor Area */}
      <main className="flex-1 min-h-0 relative">
        <CodeEditor
          ref={editorRef}
          source={editor.source}
          isDark={isDark}
          onChange={(newVal) => dispatch(setSource(newVal))}
          onCursorChange={(cur) => dispatch(setCursor(cur))}
          onFocus={() => {
            isEditorFocusedRef.current = true;
            setIsKeyboardActive(true);
          }}
          onBlur={() => {
            isEditorFocusedRef.current = false;
            setIsKeyboardActive(false);
          }}
        />
      </main>

      {/* Results & Viewport Drawer */}
      <ResultsPanel
        activeTab={compilerState.activeTab}
        onTabChange={(tab) => dispatch(setActiveTab(tab))}
        isExpanded={compilerState.isExpanded}
        onToggleExpanded={() => dispatch(toggleExpanded())}
        isSceneActive={compilerState.isSceneActive}
        sourceCode={editor.source}
        transpiledC={compilerState.transpiledC}
        astDump={compilerState.astDump}
        terminalLogs={compilerState.terminalLogs}
        compileDurationMs={compilerState.compileDurationMs}
        isDark={isDark}
        shaderCode={
          (() => {
            const sf = filesState.items.find((f) => /\.(frag|glsl|fs)$/i.test(f.name));
            return sf ? (sf.id === filesState.activeFileId ? editor.source : sf.content) : undefined;
          })()
        }
      />

      {/* Sliding Drawers */}
      <PresetsDrawer
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        presets={presetsState.items}
        onSelectPreset={handleSelectPreset}
        isDark={isDark}
      />

      <DiagnosticsDrawer
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        diagnostics={diagnosticsState.items}
        onSelectDiagnostic={(d) => {
          editorRef.current?.goToLine(d.line, d.col);
        }}
        isDark={isDark}
      />

      <HeaderDropdown
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isDark={isDark}
        diagnosticsCount={diagnosticsState.items.length}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onToggleTheme={() => dispatch(toggleTheme())}
        onFormatCode={handleFormatCode}
        onExport={handleExport}
        onOpenDocs={handleOpenDocs}
        onOpenAttributions={() => setIsAttributionsOpen(true)}
      />

      <AttributionsModal
        isOpen={isAttributionsOpen}
        onClose={() => setIsAttributionsOpen(false)}
        isDark={isDark}
      />
    </div>
  );
}


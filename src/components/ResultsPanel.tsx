import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
import { ViewportTab, addTerminalLog } from "@/store/slices/compilerSlice";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import { compileGooseToShader } from "@/compiler/gooseShaderCompiler";
import {
  initWebGLContext,
  updateWebGLProgram,
  renderWebGLFrame,
  clearWebGLBlack,
  WebGLContextHandle,
} from "@/compiler/webglRenderer";
import { sendToNative } from "@/bridge";
import { parseProgrammableControls } from "@/compiler/programmableControls";
import { createGooseGameRuntime, GooseGameRuntime } from "@/compiler/gooseExecutor";
import { GfxInputState } from "@/compiler/gooseGfx";

interface ResultsPanelProps {
  activeTab: ViewportTab;
  onTabChange: (tab: ViewportTab) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isSceneActive: boolean;
  sourceCode: string;
  transpiledC: string;
  astDump: string;
  terminalLogs: string[];
  compileDurationMs: number;
  isDark: boolean;
  shaderCode?: string;
}

export function ResultsPanel({
  activeTab,
  onTabChange,
  isExpanded,
  onToggleExpanded,
  isSceneActive,
  sourceCode,
  transpiledC,
  astDump,
  terminalLogs,
  compileDurationMs,
  isDark,
  shaderCode,
}: ResultsPanelProps) {
  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fpsText, setFpsText] = useState("60.0 FPS | 1.8 ms");

  // Camera state for 3D Viewport
  const camState = useRef({
    time: 0.0,
    yaw: 0.0,
    pitch: 0.2,
    x: 0.0,
    y: 0.0,
    z: 0.0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  // Programmable controls parsed directly from Goose code
  const controls = useMemo(() => parseProgrammableControls(sourceCode), [sourceCode]);

  // Real-time Programmable Uniform States
  const touchState = useRef<[number, number, number, number]>([0, 0, 0, 0]); // x, y, isDown, justTapped
  const dpadState = useRef<[number, number]>([0, 0]); // dx, dy
  const dpadTouchActive = useRef<boolean>(false);
  const buttonsState = useRef<[number, number, number, number]>([0, 0, 0, 0]); // btn0, btn1, btn2, btn3
  const slidersState = useRef<[number, number, number, number]>([0, 0, 0, 0]);

  // Desktop Resizable Panel & Maximize States
  const [panelHeight, setPanelHeight] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Math.min(520, Math.max(380, Math.round(window.innerHeight * 0.45)));
    }
    return 440;
  });
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const isDraggingSplitterRef = useRef<boolean>(false);
  const startDragYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitterRef.current = true;
    startDragYRef.current = e.clientY;
    startHeightRef.current = panelHeight;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitterRef.current) return;
      const delta = startDragYRef.current - e.clientY;
      const maxH = window.innerHeight - 80;
      const newH = Math.max(180, Math.min(maxH, startHeightRef.current + delta));
      setPanelHeight(newH);
    };

    const handleMouseUp = () => {
      if (isDraggingSplitterRef.current) {
        isDraggingSplitterRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const gfxInputState = useRef<GfxInputState>({
    keysDown: new Set(),
    keysPressed: new Set(),
    keysReleased: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDx: 0,
    mouseDy: 0,
    mouseWheel: 0,
    mouseInWindow: true,
    mouseDown: [false, false, false],
    mousePressed: [false, false, false],
    mouseReleased: [false, false, false],
    cursorVisible: true,
    cursorShape: 0,
    textInputActive: false,
    gamepadChanges: 0,
    gamepadPrevDown: Array.from({ length: 4 }, () => new Array(15).fill(false)),
    virtualGamepad: {
      buttons: new Array(15).fill(false),
      axes: [0, 0, 0, 0, 0, 0],
    },
  });

  // Dynamic Goose Game Runtime (interprets and executes user Goose code in real time!)
  const runtimeRef = useRef<GooseGameRuntime | null>(null);
  const lastLoggedIndex = useRef<number>(0);
  const glHandleRef = useRef<WebGLContextHandle | null>(null);

  useEffect(() => {
    controls.sliders.forEach((s) => {
      slidersState.current[s.index] = s.defaultValue;
    });

    // Dispose previous runtime
    if (runtimeRef.current && runtimeRef.current.dispose) {
      runtimeRef.current.dispose();
      runtimeRef.current = null;
    }

    // Instantiate live Goose Game Runtime with WebGL GFX mapping
    try {
      if (!glHandleRef.current && canvasRef.current) {
        glHandleRef.current = initWebGLContext(canvasRef.current);
      }
      runtimeRef.current = createGooseGameRuntime(sourceCode, {
        canvas: canvasRef.current,
        gl: glHandleRef.current?.gl,
        inputState: gfxInputState.current,
      });
      lastLoggedIndex.current = 0;
      const initialLogs = runtimeRef.current.getLogs();
      if (initialLogs.length > 0) {
        lastLoggedIndex.current = initialLogs.length;
        initialLogs.forEach((l) => dispatch(addTerminalLog(l)));
      }
    } catch (err: any) {
      console.warn("Goose Runtime init error:", err);
    }

    return () => {
      if (runtimeRef.current && runtimeRef.current.dispose) {
        runtimeRef.current.dispose();
      }
    };
  }, [sourceCode, dispatch]);

  const iconColor = isDark ? "#ffffff" : "#000000";

  // Generic User Input Handlers
  const handleTap = () => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    if (runtimeRef.current) {
      runtimeRef.current.tap();
    }
  };

  const handleDpadDirection = (dir: "up" | "down" | "left" | "right") => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    dpadTouchActive.current = true;
    let gridDx = 0;
    let gridDy = 0;
    let shaderDpad: [number, number] = [0, 0];

    const vg = gfxInputState.current.virtualGamepad;

    switch (dir) {
      case "up":
        gridDx = 0;
        gridDy = 1;
        shaderDpad = [0, 1];
        if (vg) {
          vg.buttons[11] = true;
          vg.axes[1] = -1.0;
        }
        gfxInputState.current.keysDown.add("up");
        gfxInputState.current.keysDown.add("w");
        gfxInputState.current.keysPressed.add("up");
        gfxInputState.current.keysPressed.add("w");
        break;
      case "down":
        gridDx = 0;
        gridDy = -1;
        shaderDpad = [0, -1];
        if (vg) {
          vg.buttons[12] = true;
          vg.axes[1] = 1.0;
        }
        gfxInputState.current.keysDown.add("down");
        gfxInputState.current.keysDown.add("s");
        gfxInputState.current.keysPressed.add("down");
        gfxInputState.current.keysPressed.add("s");
        break;
      case "left":
        gridDx = -1;
        gridDy = 0;
        shaderDpad = [-1, 0];
        if (vg) {
          vg.buttons[13] = true;
          vg.axes[0] = -1.0;
        }
        gfxInputState.current.keysDown.add("left");
        gfxInputState.current.keysDown.add("a");
        gfxInputState.current.keysPressed.add("left");
        gfxInputState.current.keysPressed.add("a");
        break;
      case "right":
        gridDx = 1;
        gridDy = 0;
        shaderDpad = [1, 0];
        if (vg) {
          vg.buttons[14] = true;
          vg.axes[0] = 1.0;
        }
        gfxInputState.current.keysDown.add("right");
        gfxInputState.current.keysDown.add("d");
        gfxInputState.current.keysPressed.add("right");
        gfxInputState.current.keysPressed.add("d");
        break;
    }

    dpadState.current = shaderDpad;
    if (runtimeRef.current) {
      runtimeRef.current.dpad(gridDx, gridDy);
    }
  };

  const handleDpadRelease = () => {
    dpadTouchActive.current = false;
    dpadState.current = [0, 0];
    const vg = gfxInputState.current.virtualGamepad;
    if (vg) {
      vg.buttons[11] = false;
      vg.buttons[12] = false;
      vg.buttons[13] = false;
      vg.buttons[14] = false;
      vg.axes[0] = 0.0;
      vg.axes[1] = 0.0;
    }
    gfxInputState.current.keysDown.delete("up");
    gfxInputState.current.keysDown.delete("down");
    gfxInputState.current.keysDown.delete("left");
    gfxInputState.current.keysDown.delete("right");
    gfxInputState.current.keysDown.delete("w");
    gfxInputState.current.keysDown.delete("s");
    gfxInputState.current.keysDown.delete("a");
    gfxInputState.current.keysDown.delete("d");
  };

  const handleButtonPress = (index: number) => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    buttonsState.current[index] = 1.0;
    const vg = gfxInputState.current.virtualGamepad;
    if (vg && index >= 0 && index < 4) {
      vg.buttons[index] = true;
    }
    if (runtimeRef.current) {
      if (index === 0 && controls.tapButton) {
        runtimeRef.current.tap();
      } else {
        runtimeRef.current.button(index);
      }
    }
  };

  const handleButtonRelease = (index: number) => {
    buttonsState.current[index] = 0.0;
    const vg = gfxInputState.current.virtualGamepad;
    if (vg && index >= 0 && index < 4) {
      vg.buttons[index] = false;
    }
  };

  const handleSliderChange = (index: number, val: number) => {
    slidersState.current[index] = val;
    if (runtimeRef.current) {
      runtimeRef.current.slider(index, val);
    }
  };

  // Start / Manage 60 FPS Canvas Render Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!glHandleRef.current || glHandleRef.current.gl.canvas !== canvas) {
      glHandleRef.current = initWebGLContext(canvas);
    }

    const glHandle = glHandleRef.current;
    if (!glHandle) return;

    if (!isSceneActive) {
      clearWebGLBlack(glHandle);
      return;
    }

    // Compile user's live Goose code (or separate shader file) into WebGL shader on the fly
    const shaderResult = compileGooseToShader(sourceCode, shaderCode);
    if (shaderResult.success) {
      const updateRes = updateWebGLProgram(
        glHandle,
        shaderResult.fragmentShader,
        shaderResult.vertexShader
      );
      if (!updateRes.success) {
        console.warn("WebGL link error:", updateRes.error);
      }
    } else {
      clearWebGLBlack(glHandle);
      return;
    }

    if (activeTab !== "scene_3d" || !isExpanded) {
      return;
    }

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000.0, 0.1);
      lastTime = now;
      camState.current.time += dt;

      // Compute dpad from active keyboard, gamepad, or on-screen touch buttons
      let dx = 0;
      let dy = 0;
      const keys = gfxInputState.current.keysDown;
      if (keys.has("arrowup") || keys.has("w")) dy += 1;
      if (keys.has("arrowdown") || keys.has("s")) dy -= 1;
      if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
      if (keys.has("arrowright") || keys.has("d")) dx += 1;

      if (typeof navigator !== "undefined" && navigator.getGamepads) {
        const pads = navigator.getGamepads();
        const pad = pads && pads[0];
        if (pad && pad.connected) {
          if (Math.abs(pad.axes[0]) > 0.15) dx = pad.axes[0];
          if (Math.abs(pad.axes[1]) > 0.15) dy = -pad.axes[1];
        }
      }

      if (dpadTouchActive.current) {
        dx = dpadState.current[0];
        dy = dpadState.current[1];
      } else {
        dpadState.current = [dx, dy];
      }

      // Step the live Goose game runtime
      if (runtimeRef.current && isSceneActive) {
        runtimeRef.current.step(dt, {
          dt,
          time: camState.current.time,
          dpad: dpadState.current,
          buttons: buttonsState.current,
          sliders: slidersState.current,
          touch: touchState.current,
        });

        // Forward runtime logs to terminal
        const currentLogs = runtimeRef.current.getLogs();
        if (currentLogs.length > lastLoggedIndex.current) {
          for (let i = lastLoggedIndex.current; i < currentLogs.length; i++) {
            dispatch(addTerminalLog(currentLogs[i]));
          }
          lastLoggedIndex.current = currentLogs.length;
        }
      }

      // Query all dynamic variables computed by the running Goose code
      const gooseVars = runtimeRef.current
        ? runtimeRef.current.getVariables()
        : {};

      if (isSceneActive && isExpanded && activeTab === "scene_3d") {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const displayW = Math.round(rect.width * dpr);
          const displayH = Math.round(rect.height * dpr);
          if (canvas.width !== displayW || canvas.height !== displayH) {
            canvas.width = displayW;
            canvas.height = displayH;
          }
        }

        const t0 = performance.now();
        renderWebGLFrame(glHandle, {
          width: canvas.width,
          height: canvas.height,
          time: camState.current.time,
          yaw: camState.current.yaw,
          pitch: camState.current.pitch,
          camX: camState.current.x,
          camY: camState.current.y,
          camZ: camState.current.z,
          touch: touchState.current,
          dpad: dpadState.current,
          buttons: buttonsState.current,
          sliders: slidersState.current,
          variables: gooseVars,
        });
        // Clear tap edge trigger after frame render
        touchState.current[3] = 0.0;
        const frameMs = (performance.now() - t0).toFixed(1);

        frameCount++;
        if (now - fpsTimer >= 500) {
          const fps = ((frameCount * 1000) / (now - fpsTimer)).toFixed(1);
          frameCount = 0;
          fpsTimer = now;
          setFpsText(`${fps} FPS | ${frameMs} ms`);
        }
      }

      if (isSceneActive && activeTab === "scene_3d" && isExpanded) {
        animId = requestAnimationFrame(loop);
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [activeTab, isExpanded, isSceneActive, sourceCode, shaderCode]);

  // Keyboard Controls Listener for Programmable Controls, Flappy Goose, and Top-Down RPG
  useEffect(() => {
    if (!isSceneActive || activeTab !== "scene_3d") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.closest(".cm-editor")
      ) {
        return;
      }

      // Track input in standard GFX input state
      const k = e.key.toLowerCase();
      gfxInputState.current.keysDown.add(k);
      gfxInputState.current.keysPressed.add(k);
      if (k === "arrowleft") { gfxInputState.current.keysDown.add("left"); gfxInputState.current.keysPressed.add("left"); }
      if (k === "arrowright") { gfxInputState.current.keysDown.add("right"); gfxInputState.current.keysPressed.add("right"); }
      if (k === "arrowup") { gfxInputState.current.keysDown.add("up"); gfxInputState.current.keysPressed.add("up"); }
      if (k === "arrowdown") { gfxInputState.current.keysDown.add("down"); gfxInputState.current.keysPressed.add("down"); }
      if (k === " ") { gfxInputState.current.keysDown.add("space"); gfxInputState.current.keysPressed.add("space"); }
      if (k === "escape") { gfxInputState.current.keysDown.add("escape"); gfxInputState.current.keysPressed.add("escape"); }

      // Tap action key trigger
      if (controls.tapButton) {
        if (e.code === "Space" || e.code === "KeyW" || e.code === "ArrowUp") {
          e.preventDefault();
          handleTap();
        }
      }

      // Generic D-Pad keyboard mapping
      if (controls.hasDpad && !e.repeat) {
        if (e.code === "ArrowLeft" || e.code === "KeyA") {
          e.preventDefault();
          handleDpadDirection("left");
        }
        if (e.code === "ArrowRight" || e.code === "KeyD") {
          e.preventDefault();
          handleDpadDirection("right");
        }
        if (e.code === "ArrowUp" || e.code === "KeyW") {
          e.preventDefault();
          handleDpadDirection("up");
        }
        if (e.code === "ArrowDown" || e.code === "KeyS") {
          e.preventDefault();
          handleDpadDirection("down");
        }
      }

      // Generic Action Buttons keyboard mapping
      if (controls.buttons.length > 0) {
        if (e.code === "Space" || e.code === "KeyZ" || e.code === "KeyE") {
          e.preventDefault();
          handleButtonPress(0);
        }
        if (e.code === "KeyX") {
          e.preventDefault();
          handleButtonPress(1);
        }
        if (e.code === "KeyC") {
          e.preventDefault();
          handleButtonPress(2);
        }
        if (e.code === "KeyV") {
          e.preventDefault();
          handleButtonPress(3);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      gfxInputState.current.keysDown.delete(k);
      gfxInputState.current.keysReleased.add(k);
      if (k === "arrowleft") { gfxInputState.current.keysDown.delete("left"); gfxInputState.current.keysReleased.add("left"); }
      if (k === "arrowright") { gfxInputState.current.keysDown.delete("right"); gfxInputState.current.keysReleased.add("right"); }
      if (k === "arrowup") { gfxInputState.current.keysDown.delete("up"); gfxInputState.current.keysReleased.add("up"); }
      if (k === "arrowdown") { gfxInputState.current.keysDown.delete("down"); gfxInputState.current.keysReleased.add("down"); }
      if (k === " ") { gfxInputState.current.keysDown.delete("space"); gfxInputState.current.keysReleased.add("space"); }
      if (k === "escape") { gfxInputState.current.keysDown.delete("escape"); gfxInputState.current.keysReleased.add("escape"); }

      if (controls.hasDpad) {
        const keys = gfxInputState.current.keysDown;
        const anyHeld =
          keys.has("arrowup") || keys.has("w") ||
          keys.has("arrowdown") || keys.has("s") ||
          keys.has("arrowleft") || keys.has("a") ||
          keys.has("arrowright") || keys.has("d");

        if (!anyHeld) {
          handleDpadRelease();
        }
      }
      if (controls.buttons.length > 0) {
        if (e.code === "Space" || e.code === "KeyZ" || e.code === "KeyE") handleButtonRelease(0);
        if (e.code === "KeyX") handleButtonRelease(1);
        if (e.code === "KeyC") handleButtonRelease(2);
        if (e.code === "KeyV") handleButtonRelease(3);
      }
    };

    const handleGamepadConnected = () => {
      gfxInputState.current.gamepadChanges = (gfxInputState.current.gamepadChanges || 0) + 1;
    };
    const handleGamepadDisconnected = () => {
      gfxInputState.current.gamepadChanges = (gfxInputState.current.gamepadChanges || 0) + 1;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
    };
  }, [isSceneActive, activeTab, controls]);

  // Touch / Mouse controls for Canvas and 3D Viewport
  const handlePointerDown = (clientX: number, clientY: number, button: number = 0) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1.0 - (clientY - rect.top) / rect.height));
      touchState.current = [x, y, 1.0, 1.0];
      gfxInputState.current.mouseX = clientX - rect.left;
      gfxInputState.current.mouseY = clientY - rect.top;
      const bIdx = Math.max(0, Math.min(2, button));
      gfxInputState.current.mouseDown[bIdx] = true;
      gfxInputState.current.mousePressed[bIdx] = true;
    }
    if (controls.tapButton) {
      handleTap();
      return;
    }
    camState.current.isDragging = true;
    camState.current.lastX = clientX;
    camState.current.lastY = clientY;
  };

  const handlePointerMove = (clientX: number, clientY: number, movementX: number = 0, movementY: number = 0) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (touchState.current[2] > 0.5) {
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, 1.0 - (clientY - rect.top) / rect.height));
        touchState.current[0] = x;
        touchState.current[1] = y;
      }
      gfxInputState.current.mouseX = clientX - rect.left;
      gfxInputState.current.mouseY = clientY - rect.top;
      gfxInputState.current.mouseDx = (gfxInputState.current.mouseDx || 0) + movementX;
      gfxInputState.current.mouseDy = (gfxInputState.current.mouseDy || 0) + movementY;
    }
    if (!camState.current.isDragging) return;
    const dx = clientX - camState.current.lastX;
    const dy = clientY - camState.current.lastY;
    camState.current.lastX = clientX;
    camState.current.lastY = clientY;

    camState.current.yaw += dx * 0.008;
    camState.current.pitch = Math.max(
      -1.4,
      Math.min(1.4, camState.current.pitch + dy * 0.008)
    );
  };

  const handlePointerUp = (button: number = 0) => {
    touchState.current[2] = 0.0;
    camState.current.isDragging = false;
    const bIdx = Math.max(0, Math.min(2, button));
    gfxInputState.current.mouseDown[bIdx] = false;
    gfxInputState.current.mouseReleased[bIdx] = true;
  };

  return (
    <section className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex flex-col select-none">
      {/* Resizable Splitter Drag Handle */}
      {isExpanded && !isMaximized && (
        <div
          onMouseDown={handleSplitterMouseDown}
          title="Drag to resize results panel"
          className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 hover:bg-indigo-500 dark:hover:bg-indigo-500 cursor-row-resize transition-colors flex items-center justify-center group z-10 select-none"
        >
          <div className="w-10 h-0.5 rounded-full bg-neutral-400 dark:bg-neutral-600 group-hover:bg-white transition-colors" />
        </div>
      )}

      {/* Drawer Title Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-800 text-xs">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex items-center space-x-1.5 text-neutral-800 dark:text-neutral-200 hover:opacity-80"
        >
          <Activity size={14} color={iconColor} strokeWidth={1.5} />
          <span className="font-medium tracking-wide">Results</span>
          {isExpanded ? (
            <ChevronDown size={14} color={iconColor} strokeWidth={1.5} />
          ) : (
            <ChevronUp size={14} color={iconColor} strokeWidth={1.5} />
          )}
        </button>

        <div className="flex items-center space-x-2 text-[11px] text-neutral-500 ml-auto">
          {compileDurationMs > 0 && <span>{compileDurationMs.toFixed(1)} ms</span>}
          <div className="flex items-center rounded bg-neutral-100 dark:bg-neutral-900 p-0.5 border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => onTabChange("scene_3d")}
              className={`px-2.5 py-0.5 rounded text-[11px] transition ${activeTab === "scene_3d"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium shadow-sm"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
            >
              Viewport
            </button>
            <button
              onClick={() => onTabChange("terminal")}
              className={`px-2.5 py-0.5 rounded text-[11px] transition ${activeTab === "terminal"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium shadow-sm"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
            >
              Terminal
            </button>
          </div>

          {isExpanded && (
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore panel size" : "Maximize panel"}
              className="p-1 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              {isMaximized ? (
                <Minimize2 size={13} color={iconColor} strokeWidth={1.5} />
              ) : (
                <Maximize2 size={13} color={iconColor} strokeWidth={1.5} />
              )}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div
          style={{ height: isMaximized ? "calc(100vh - 55px)" : `${panelHeight}px` }}
          className="w-full flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-hidden relative"
        >
          {/* Viewport Tab (stays mounted to preserve WebGL context across tab switching) */}
          <div
            className={`relative w-full h-full flex flex-col items-center justify-center p-0 bg-black overflow-hidden ${activeTab === "scene_3d" ? "flex" : "hidden"
              }`}
          >
            {/* Canvas Container with maximum scaling and zero clipping */}
            <div
              className={`relative w-full h-full flex items-center justify-center overflow-hidden ${isSceneActive ? "cursor-pointer" : ""
                }`}
              onMouseDown={(e) => isSceneActive && handlePointerDown(e.clientX, e.clientY, e.button)}
              onMouseMove={(e) => isSceneActive && handlePointerMove(e.clientX, e.clientY, e.movementX, e.movementY)}
              onMouseUp={(e) => handlePointerUp(e.button)}
              onMouseEnter={() => {
                gfxInputState.current.mouseInWindow = true;
              }}
              onMouseLeave={() => {
                gfxInputState.current.mouseInWindow = false;
              }}
              onWheel={(e) => {
                if (isSceneActive) {
                  gfxInputState.current.mouseWheel = (gfxInputState.current.mouseWheel || 0) + Math.sign(e.deltaY);
                }
              }}
              onTouchStart={(e) => {
                if (isSceneActive && e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, 0);
              }}
              onTouchMove={(e) => {
                if (isSceneActive && e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, 0, 0);
              }}
              onTouchEnd={() => handlePointerUp(0)}
            >
              <canvas
                ref={canvasRef}
                width="640"
                height="400"
                className="w-full h-full max-w-full max-h-full object-contain block bg-black"
              />
              {isSceneActive && (
                <div className="absolute top-2 left-2 bg-black/75 backdrop-blur text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded border border-white/10 pointer-events-none select-none">
                  {fpsText}
                </div>
              )}
            </div>
          </div>

          {activeTab === "terminal" && (
            <div className="w-full h-full p-3 overflow-auto font-mono text-xs text-neutral-800 dark:text-neutral-200 select-text space-y-0.5">
              {terminalLogs.map((log, i) => (
                <div key={i} className="text-neutral-700 dark:text-neutral-300 whitespace-pre">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

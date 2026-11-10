import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { ViewportTab, addTerminalLog } from "@/store/slices/compilerSlice";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Sliders,
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
  const controls = parseProgrammableControls(sourceCode);
  const { isFlappy, isTopDown, isRaymarch } = controls;

  // Real-time Programmable Uniform States
  const touchState = useRef<[number, number, number, number]>([0, 0, 0, 0]); // x, y, isDown, justTapped
  const dpadState = useRef<[number, number]>([0, 0]); // dx, dy
  const buttonsState = useRef<[number, number, number, number]>([0, 0, 0, 0]); // btn0, btn1, btn2, btn3
  const slidersState = useRef<[number, number, number, number]>([0, 0, 0, 0]);

  // Local state for interactive slider UI tracking
  const [sliderValues, setSliderValues] = useState<{ [idx: number]: number }>({});

  useEffect(() => {
    const initial: { [idx: number]: number } = {};
    controls.sliders.forEach((s) => {
      initial[s.index] = s.defaultValue;
      slidersState.current[s.index] = s.defaultValue;
    });
    setSliderValues(initial);

    // Reset Top-Down RPG state on code load (spawn at guaranteed empty open space 2, 2)
    topDownState.current = {
      heroX: 2,
      heroY: 2,
      keys: 0,
      hasChest: true,
      gateUnlocked: false,
      questComplete: false,
      areaCode: 0,
      areaName: "Sunlit Courtyard",
      message: "Spawned in open Courtyard! Use D-pad to move, Action to interact.",
      map: [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 2, 0, 3, 1],
        [1, 0, 0, 0, 2, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 4, 1, 1, 1, 1],
        [1, 5, 5, 5, 5, 5, 5, 1],
        [1, 5, 5, 6, 5, 5, 5, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
      ],
    };
    setTopDownInfo({
      x: 2,
      y: 2,
      keys: 0,
      hasChest: true,
      gateUnlocked: false,
      questComplete: false,
      areaCode: 0,
      areaName: "Sunlit Courtyard",
      message: "Spawned in open Courtyard! Use D-pad to move, Action to interact.",
    });
    // Reset Flappy state on code load
    flappyState.current = {
      birdY: 0.5,
      birdVy: 0.0,
      score: 0,
      alive: true,
      pipe1: { x: 0.8, gapY: 0.45, gapH: 0.34, passed: false },
      pipe2: { x: 1.4, gapY: 0.55, gapH: 0.34, passed: false },
    };
    setIsFlappyAlive(true);
    setFlappyScore(0);
  }, [sourceCode]);

  // Flappy Goose Interactive State
  const [flappyScore, setFlappyScore] = useState(0);
  const [isFlappyAlive, setIsFlappyAlive] = useState(true);
  const flappyState = useRef({
    birdY: 0.5,
    birdVy: 0.0,
    score: 0,
    alive: true,
    pipe1: { x: 0.8, gapY: 0.45, gapH: 0.34, passed: false },
    pipe2: { x: 1.4, gapY: 0.55, gapH: 0.34, passed: false },
  });

  // Top-Down Game Boy Interactive State (spawn at 2, 2)
  const [topDownInfo, setTopDownInfo] = useState({
    x: 2,
    y: 2,
    keys: 0,
    hasChest: true,
    gateUnlocked: false,
    questComplete: false,
    areaCode: 0,
    areaName: "Sunlit Courtyard",
    message: "Spawned in open Courtyard! Use D-pad to move, Action to interact.",
  });
  const topDownState = useRef({
    heroX: 2,
    heroY: 2,
    keys: 0,
    hasChest: true,
    gateUnlocked: false,
    questComplete: false,
    areaCode: 0,
    areaName: "Sunlit Courtyard",
    message: "Spawned in open Courtyard! Use D-pad to move, Action to interact.",
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 2, 0, 3, 1],
      [1, 0, 0, 0, 2, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 4, 1, 1, 1, 1],
      [1, 5, 5, 5, 5, 5, 5, 1],
      [1, 5, 5, 6, 5, 5, 5, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
  });

  const iconColor = isDark ? "#ffffff" : "#000000";
  const glHandleRef = useRef<WebGLContextHandle | null>(null);

  // User input handlers
  const handleFlap = () => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    const s = flappyState.current;
    if (!s.alive) {
      s.birdY = 0.5;
      s.birdVy = -0.011;
      s.score = 0;
      s.alive = true;
      s.pipe1 = { x: 0.8, gapY: 0.45, gapH: 0.34, passed: false };
      s.pipe2 = { x: 1.4, gapY: 0.55, gapH: 0.34, passed: false };
      setFlappyScore(0);
      setIsFlappyAlive(true);
      return;
    }
    s.birdVy = -0.012;
  };

  const moveHero = (dx: number, dy: number) => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    const s = topDownState.current;

    const calcArea = (x: number, y: number) => {
      if (y === 4) return { code: 1, name: "Fortress Gate" };
      if (y >= 5) {
        if (y === 6 && x === 3) return { code: 3, name: "Sanctum of Sacred Goose" };
        return { code: 2, name: "Ancient Dungeon" };
      }
      return { code: 0, name: "Sunlit Courtyard" };
    };

    const updateInfo = (actionDesc?: string) => {
      const area = calcArea(s.heroX, s.heroY);
      s.areaCode = area.code;
      s.areaName = area.name;
      setTopDownInfo({
        x: s.heroX,
        y: s.heroY,
        keys: s.keys,
        hasChest: s.hasChest,
        gateUnlocked: s.gateUnlocked,
        questComplete: s.questComplete,
        areaCode: s.areaCode,
        areaName: s.areaName,
        message: s.message,
      });
      if (actionDesc) {
        dispatch(
          addTerminalLog(`[Game Boy 2D] ${actionDesc} -> Pos: (${s.heroX}, ${s.heroY}) [${s.areaName}]`)
        );
      }
    };

    // When Action button is tapped (dx=0, dy=0), interact with adjacent or current tiles
    if (dx === 0 && dy === 0) {
      // Check current tile for Relic Altar
      if (s.heroX === 3 && s.heroY === 6 && !s.questComplete) {
        s.questComplete = true;
        s.message = "★ SACRED GOOSE RELIC RETRIEVED! QUEST COMPLETE! ★";
        updateInfo("★ Retrieved Sacred Golden Goose Relic! Quest Complete! ★");
        return;
      }

      // Check 4 adjacent directions
      const dirs = [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ];
      for (const [adx, ady] of dirs) {
        const ax = s.heroX + adx;
        const ay = s.heroY + ady;
        if (ax >= 0 && ax < 8 && ay >= 0 && ay < 8) {
          const adjTile = s.map[ay][ax];
          if (adjTile === 3 && s.hasChest) {
            s.keys = 1;
            s.hasChest = false;
            s.map[ay][ax] = 7; // Opened chest
            s.message = "★ Golden Key collected from chest! Now unlock the southern Gate.";
            updateInfo("Opened Treasure Chest and acquired Golden Key!");
            return;
          }
          if (adjTile === 4 && !s.gateUnlocked) {
            if (s.keys > 0) {
              s.keys--;
              s.gateUnlocked = true;
              s.map[ay][ax] = 8; // Open doorway
              s.message = "★ Gate unlocked with Golden Key! Walk into dungeon depths.";
              updateInfo("Unlocked Fortress Gate with Golden Key!");
            } else {
              s.message = "The Gate is locked tight. Find the Golden Key in the chest first.";
              updateInfo("Examined locked Fortress Gate (needs Golden Key)");
            }
            return;
          }
          if (adjTile === 6 && !s.questComplete) {
            s.questComplete = true;
            s.message = "★ SACRED GOOSE RELIC RETRIEVED! QUEST COMPLETE! ★";
            updateInfo("★ Retrieved Sacred Golden Goose Relic! Quest Complete! ★");
            return;
          }
        }
      }
      s.message = `Inspecting surroundings in ${s.areaName}...`;
      updateInfo("Hero searches area");
      return;
    }

    const nx = s.heroX + dx;
    const ny = s.heroY + dy;
    if (nx < 0 || nx >= 8 || ny < 0 || ny >= 8) return;
    const tile = s.map[ny][nx];

    // Stone wall
    if (tile === 1) {
      s.message = "Blocked by ancient dungeon stone wall.";
      updateInfo("Blocked by stone wall");
      return;
    }
    // Water
    if (tile === 2) {
      s.message = "Deep water blocks the way. Walk around the pond.";
      updateInfo("Blocked by deep water");
      return;
    }

    // Locked Gate (tile 4)
    if (tile === 4 && !s.gateUnlocked) {
      if (s.keys > 0) {
        s.keys--;
        s.gateUnlocked = true;
        s.map[ny][nx] = 8; // Open doorway
        s.message = "★ Unlocked Gate with Golden Key! Stepped into the fortress.";
        s.heroX = nx;
        s.heroY = ny;
        updateInfo("Unlocked Gate and stepped through");
        return;
      } else {
        s.message = "The Gate is locked tight. Find the Golden Key in the chest first.";
        updateInfo("Blocked by locked Gate (find key in chest)");
        return;
      }
    }

    // Chest with Key (tile 3)
    if (tile === 3 && s.hasChest) {
      s.keys = 1;
      s.hasChest = false;
      s.map[ny][nx] = 7;
      s.message = "★ Golden Key collected from chest! Now unlock the southern Gate.";
      s.heroX = nx;
      s.heroY = ny;
      updateInfo("Found Golden Key in Treasure Chest!");
      return;
    }

    // Sacred Relic Pedestal (tile 6)
    if (tile === 6) {
      s.questComplete = true;
      s.message = "★ SACRED GOOSE RELIC RETRIEVED! QUEST COMPLETE! ★";
      s.heroX = nx;
      s.heroY = ny;
      updateInfo("★ Stepped onto sacred altar! Retrieved Golden Goose Relic! ★");
      return;
    }

    // Normal movement (Grass 0, Dungeon Floor 5, Opened Chest 7, Open Door 8)
    const prevArea = s.areaName;
    s.heroX = nx;
    s.heroY = ny;
    const newArea = calcArea(nx, ny);
    if (newArea.name !== prevArea) {
      s.message = `Entered: ${newArea.name}`;
      updateInfo(`Moved to (${nx}, ${ny}) [${newArea.name}]`);
    } else {
      s.message = `Hero at (${nx}, ${ny}) in ${newArea.name}`;
      updateInfo(`Moved to (${nx}, ${ny})`);
    }
  };

  // Programmable Control Event Handlers
  const handleDpadDirection = (dir: "up" | "down" | "left" | "right") => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    let gridDx = 0;
    let gridDy = 0;
    let shaderDpad: [number, number] = [0, 0];

    switch (dir) {
      case "up":
        gridDx = 0;
        gridDy = -1;
        shaderDpad = [0, 1];
        break;
      case "down":
        gridDx = 0;
        gridDy = 1;
        shaderDpad = [0, -1];
        break;
      case "left":
        gridDx = -1;
        gridDy = 0;
        shaderDpad = [-1, 0];
        break;
      case "right":
        gridDx = 1;
        gridDy = 0;
        shaderDpad = [1, 0];
        break;
    }

    dpadState.current = shaderDpad;
    if (isTopDown) {
      moveHero(gridDx, gridDy);
    }
  };

  const handleDpadRelease = () => {
    dpadState.current = [0, 0];
  };

  const handleButtonPress = (index: number) => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    buttonsState.current[index] = 1.0;
    if (isTopDown && index === 0) {
      moveHero(0, 0); // Action
    } else if ((controls.tapButton || isFlappy) && index === 0) {
      handleFlap();
    }
  };

  const handleButtonRelease = (index: number) => {
    buttonsState.current[index] = 0.0;
  };

  const handleSliderChange = (index: number, val: number) => {
    slidersState.current[index] = val;
    setSliderValues((prev) => ({ ...prev, [index]: val }));
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

      // 1. Flappy Goose Physics Simulation
      if (isFlappy && flappyState.current.alive && isSceneActive) {
        const fs = flappyState.current;
        fs.birdVy += 0.00064; // 25% reduced gravity (was 0.00085)
        fs.birdY += fs.birdVy;

        // Ground / Ceiling bounds
        if (fs.birdY > 0.83 || fs.birdY < 0.04) {
          fs.alive = false;
          setIsFlappyAlive(false);
        }

        // Pipe movement & recycling
        const speed = 0.0035;
        fs.pipe1.x -= speed;
        fs.pipe2.x -= speed;

        if (fs.pipe1.x < -0.15) {
          fs.pipe1.x = 1.05;
          fs.pipe1.gapY = 0.28 + Math.random() * 0.35;
          fs.pipe1.passed = false;
        }
        if (fs.pipe2.x < -0.15) {
          fs.pipe2.x = 1.05;
          fs.pipe2.gapY = 0.28 + Math.random() * 0.35;
          fs.pipe2.passed = false;
        }

        // Collision detection
        const birdX = 0.22;
        const checkPipe = (p: typeof fs.pipe1) => {
          if (Math.abs(birdX - p.x) < 0.065) {
            const inGap = fs.birdY > (p.gapY - p.gapH * 0.5) && fs.birdY < (p.gapY + p.gapH * 0.5);
            if (!inGap) {
              fs.alive = false;
              setIsFlappyAlive(false);
            }
          }
          if (!p.passed && p.x < birdX) {
            p.passed = true;
            fs.score++;
            setFlappyScore(fs.score);
          }
        };
        checkPipe(fs.pipe1);
        checkPipe(fs.pipe2);
      }

      if (isSceneActive && isExpanded && activeTab === "scene_3d") {
        const t0 = performance.now();
        renderWebGLFrame(
          glHandle,
          canvas.width,
          canvas.height,
          camState.current.time,
          camState.current.yaw,
          camState.current.pitch,
          camState.current.x,
          camState.current.y,
          camState.current.z,
          isTopDown ? topDownState.current.heroX : isFlappy ? 0.22 : dpadState.current[0],
          isTopDown ? topDownState.current.heroY : isFlappy ? flappyState.current.birdY : dpadState.current[1],
          isTopDown ? (topDownState.current.gateUnlocked ? 1 : 0) : isFlappy ? (flappyState.current.alive ? 1 : 0) : buttonsState.current[0],
          isTopDown ? topDownState.current.keys : isFlappy ? flappyState.current.score : 0,
          isTopDown
            ? [
                topDownState.current.hasChest ? 1.0 : 0.0,
                topDownState.current.questComplete ? 1.0 : 0.0,
                topDownState.current.areaCode,
              ]
            : isFlappy
            ? [flappyState.current.pipe1.x, flappyState.current.pipe1.gapY, flappyState.current.pipe1.gapH]
            : [0, 0, 0],
          isFlappy ? [flappyState.current.pipe2.x, flappyState.current.pipe2.gapY, flappyState.current.pipe2.gapH] : [0, 0, 0],
          touchState.current,
          dpadState.current,
          buttonsState.current,
          slidersState.current
        );
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
  }, [activeTab, isExpanded, isSceneActive, sourceCode, shaderCode, isFlappy, isTopDown]);

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

      if (isTopDown) {
        if (e.code === "ArrowUp" || e.code === "KeyW") {
          e.preventDefault();
          moveHero(0, -1);
        } else if (e.code === "ArrowDown" || e.code === "KeyS") {
          e.preventDefault();
          moveHero(0, 1);
        } else if (e.code === "ArrowLeft" || e.code === "KeyA") {
          e.preventDefault();
          moveHero(-1, 0);
        } else if (e.code === "ArrowRight" || e.code === "KeyD") {
          e.preventDefault();
          moveHero(1, 0);
        } else if (e.code === "Space" || e.code === "KeyE") {
          e.preventDefault();
          moveHero(0, 0);
        }
      } else if (isFlappy || controls.tapButton) {
        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
          e.preventDefault();
          handleFlap();
        }
      }

      // Programmable D-Pad keyboard mapping
      if (controls.hasDpad) {
        if (e.code === "ArrowLeft" || e.code === "KeyA") dpadState.current[0] = -1.0;
        if (e.code === "ArrowRight" || e.code === "KeyD") dpadState.current[0] = 1.0;
        if (e.code === "ArrowUp" || e.code === "KeyW") dpadState.current[1] = 1.0;
        if (e.code === "ArrowDown" || e.code === "KeyS") dpadState.current[1] = -1.0;
      }

      // Programmable Action Buttons keyboard mapping
      if (controls.buttons.length > 0) {
        if (e.code === "Space" || e.code === "KeyZ") buttonsState.current[0] = 1.0;
        if (e.code === "KeyX") buttonsState.current[1] = 1.0;
        if (e.code === "KeyC") buttonsState.current[2] = 1.0;
        if (e.code === "KeyV") buttonsState.current[3] = 1.0;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (controls.hasDpad) {
        if (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "KeyA" || e.code === "KeyD") {
          dpadState.current[0] = 0.0;
        }
        if (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "KeyW" || e.code === "KeyS") {
          dpadState.current[1] = 0.0;
        }
      }
      if (controls.buttons.length > 0) {
        if (e.code === "Space" || e.code === "KeyZ") buttonsState.current[0] = 0.0;
        if (e.code === "KeyX") buttonsState.current[1] = 0.0;
        if (e.code === "KeyC") buttonsState.current[2] = 0.0;
        if (e.code === "KeyV") buttonsState.current[3] = 0.0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSceneActive, activeTab, isFlappy, isTopDown, controls]);

  // Touch / Mouse controls for Canvas and 3D Viewport
  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1.0 - (clientY - rect.top) / rect.height));
      touchState.current = [x, y, 1.0, 1.0];
    }
    if (!isTopDown && (controls.tapButton || isFlappy)) {
      handleFlap();
      return;
    }
    camState.current.isDragging = true;
    camState.current.lastX = clientX;
    camState.current.lastY = clientY;
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (canvas && touchState.current[2] > 0.5) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1.0 - (clientY - rect.top) / rect.height));
      touchState.current[0] = x;
      touchState.current[1] = y;
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

  const handlePointerUp = () => {
    touchState.current[2] = 0.0;
    camState.current.isDragging = false;
  };

  const moveCam = (dir: "fwd" | "back" | "left" | "right" | "up" | "down") => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    const speed = 0.4;
    const yaw = camState.current.yaw;
    switch (dir) {
      case "fwd":
        camState.current.x += Math.sin(yaw) * speed;
        camState.current.z += Math.cos(yaw) * speed;
        break;
      case "back":
        camState.current.x -= Math.sin(yaw) * speed;
        camState.current.z -= Math.cos(yaw) * speed;
        break;
      case "left":
        camState.current.x -= Math.cos(yaw) * speed;
        camState.current.z += Math.sin(yaw) * speed;
        break;
      case "right":
        camState.current.x += Math.cos(yaw) * speed;
        camState.current.z -= Math.sin(yaw) * speed;
        break;
      case "up":
        camState.current.y += speed;
        break;
      case "down":
        camState.current.y -= speed;
        break;
    }
  };

  const resetCamera = () => {
    sendToNative({ type: "haptic:trigger", style: "light" });
    camState.current.yaw = 0.0;
    camState.current.pitch = 0.2;
    camState.current.x = 0.0;
    camState.current.y = 0.0;
    camState.current.z = 0.0;
  };

  return (
    <section className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex flex-col select-none">
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
              className={`px-2.5 py-0.5 rounded text-[11px] transition ${
                activeTab === "scene_3d"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Viewport
            </button>
            <button
              onClick={() => onTabChange("terminal")}
              className={`px-2.5 py-0.5 rounded text-[11px] transition ${
                activeTab === "terminal"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Terminal
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="h-72 sm:h-80 md:h-[400px] flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-hidden relative">
          {/* Viewport Tab (stays mounted to preserve WebGL context across tab switching) */}
          <div
            className={`relative w-full h-full flex flex-col items-center justify-between p-2 bg-black overflow-hidden ${
              activeTab === "scene_3d" ? "flex" : "hidden"
            }`}
          >
            {/* Canvas Container with strict aspect ratio scaling (zero clipping) */}
            <div
              className={`relative flex-1 w-full flex items-center justify-center overflow-hidden ${
                isSceneActive ? "cursor-pointer" : ""
              }`}
              onMouseDown={(e) => isSceneActive && handlePointerDown(e.clientX, e.clientY)}
              onMouseMove={(e) => isSceneActive && handlePointerMove(e.clientX, e.clientY)}
              onMouseUp={handlePointerUp}
              onTouchStart={(e) => {
                if (isSceneActive && e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
              }}
              onTouchMove={(e) => {
                if (isSceneActive && e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
              }}
              onTouchEnd={handlePointerUp}
            >
              <canvas
                ref={canvasRef}
                width="320"
                height="200"
                className="max-w-full max-h-[175px] sm:max-h-[240px] aspect-[16/10] object-contain block bg-black border border-neutral-800 rounded shadow-2xl"
              />
              {isSceneActive && (
                <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur text-emerald-400 font-mono text-[9px] px-1.5 py-0.5 rounded border border-white/10 pointer-events-none">
                  {fpsText}
                </div>
              )}
            </div>

            {/* In-Game Retro Area Status Pill (Top-Down Adventure) */}
            {isSceneActive && isTopDown && (
              <div className="mt-1 px-3 py-1 rounded-lg bg-neutral-900/90 border border-neutral-700/60 flex items-center justify-between text-[11px] font-mono text-neutral-300 max-w-sm w-full shadow select-none">
                <div className="flex items-center space-x-1.5 truncate mr-2">
                  <span className="text-amber-400 font-bold truncate">📍 {topDownInfo.areaName}</span>
                  {topDownInfo.keys > 0 && <span className="text-yellow-300 font-extrabold">🔑x{topDownInfo.keys}</span>}
                  {topDownInfo.questComplete && <span className="text-emerald-400 font-extrabold">★ RELIC</span>}
                </div>
                <span className="text-neutral-400 truncate text-[10px] text-right">{topDownInfo.message}</span>
              </div>
            )}

            {/* Interactive Control Buttons Bar — 100% Generic & Driven by In-Code @controls */}
            {isSceneActive && controls.hasAnyControls && (
              <div className="w-full mt-1.5 flex flex-col items-center justify-center space-y-1.5">
                {/* 1. Programmable Directional / Action Controls (D-pad + Custom Buttons + Tap) */}
                {(controls.hasDpad || controls.buttons.length > 0 || controls.tapButton) && (
                  <div className="flex items-center justify-center space-x-3 w-full max-w-xs select-none">
                    {/* Programmable D-Pad */}
                    {controls.hasDpad && (
                      <div className="flex items-center space-x-1.5 bg-neutral-900/90 p-1.5 rounded-2xl border border-neutral-800 shadow-xl select-none">
                        <button
                          type="button"
                          onPointerDown={() => handleDpadDirection("left")}
                          onPointerUp={handleDpadRelease}
                          onPointerLeave={handleDpadRelease}
                          className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-bold flex items-center justify-center text-base active:scale-90 transition cursor-pointer select-none shadow"
                        >
                          ◄
                        </button>
                        <div className="flex flex-col space-y-1.5">
                          <button
                            type="button"
                            onPointerDown={() => handleDpadDirection("up")}
                            onPointerUp={handleDpadRelease}
                            onPointerLeave={handleDpadRelease}
                            className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-bold flex items-center justify-center text-base active:scale-90 transition cursor-pointer select-none shadow"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onPointerDown={() => handleDpadDirection("down")}
                            onPointerUp={handleDpadRelease}
                            onPointerLeave={handleDpadRelease}
                            className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-bold flex items-center justify-center text-base active:scale-90 transition cursor-pointer select-none shadow"
                          >
                            ▼
                          </button>
                        </div>
                        <button
                          type="button"
                          onPointerDown={() => handleDpadDirection("right")}
                          onPointerUp={handleDpadRelease}
                          onPointerLeave={handleDpadRelease}
                          className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-bold flex items-center justify-center text-base active:scale-90 transition cursor-pointer select-none shadow"
                        >
                          ►
                        </button>
                      </div>
                    )}

                    {/* Programmable Action Buttons */}
                    {controls.buttons.length > 0 && (
                      <div className="flex items-center space-x-2 select-none">
                        {controls.buttons.map((btn) => (
                          <button
                            key={btn.index}
                            type="button"
                            onPointerDown={() => handleButtonPress(btn.index)}
                            onPointerUp={() => handleButtonRelease(btn.index)}
                            onPointerLeave={() => handleButtonRelease(btn.index)}
                            className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs shadow-xl active:scale-90 transition min-w-[56px] text-center cursor-pointer select-none"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Programmable Tap Action Button */}
                    {controls.tapButton && (
                      <button
                        onPointerDown={() => handleButtonPress(0)}
                        onPointerUp={() => handleButtonRelease(0)}
                        onPointerLeave={() => handleButtonRelease(0)}
                        onTouchStart={(e) => { e.preventDefault(); handleButtonPress(0); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(0); }}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-extrabold text-xs shadow-md active:scale-95 flex items-center justify-center space-x-1.5 transition cursor-pointer select-none"
                      >
                        <span>{controls.tapButton.label}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 2. Programmable Numeric Sliders */}
                {controls.sliders.length > 0 && (
                  <div className="flex flex-col space-y-1 w-full max-w-xs px-2 pt-1">
                    {controls.sliders.map((s) => (
                      <div key={s.index} className="flex items-center space-x-2 text-[10px] text-neutral-300">
                        <span className="font-mono min-w-[50px] text-neutral-400">{s.label}:</span>
                        <input
                          type="range"
                          min={s.min}
                          max={s.max}
                          step={(s.max - s.min) / 100}
                          value={sliderValues[s.index] ?? s.defaultValue}
                          onChange={(e) => handleSliderChange(s.index, parseFloat(e.target.value))}
                          className="flex-1 accent-indigo-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-mono w-8 text-right text-indigo-400">
                          {(sliderValues[s.index] ?? s.defaultValue).toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. 3D Raymarching Flight Controls */}
                {controls.hasFlight && (
                  <div className="flex items-center space-x-2 text-[10px]">
                    <div className="flex items-center space-x-1 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                      <span className="text-neutral-500">Fly:</span>
                      <button onClick={() => moveCam("fwd")} className="px-1.5 py-0.5 rounded bg-neutral-800 text-white font-mono">W</button>
                      <button onClick={() => moveCam("left")} className="px-1.5 py-0.5 rounded bg-neutral-800 text-white font-mono">A</button>
                      <button onClick={() => moveCam("back")} className="px-1.5 py-0.5 rounded bg-neutral-800 text-white font-mono">S</button>
                      <button onClick={() => moveCam("right")} className="px-1.5 py-0.5 rounded bg-neutral-800 text-white font-mono">D</button>
                    </div>
                    <div className="flex items-center space-x-1 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                      <button onClick={() => moveCam("up")} className="px-1.5 py-0.5 rounded bg-neutral-800 text-white font-mono">▲</button>
                      <button onClick={() => moveCam("down")} className="px-1.5 py-0.5 rounded bg-neutral-800 text-white font-mono">▼</button>
                    </div>
                    <button
                      onClick={resetCamera}
                      className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white flex items-center space-x-1"
                    >
                      <RotateCcw size={11} />
                      <span>Reset</span>
                    </button>
                  </div>
                )}
              </div>
            )}
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

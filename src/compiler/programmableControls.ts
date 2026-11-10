/**
 * Programmable Controls Engine for Goose
 *
 * Allows Goose developers to define interactive mobile and desktop controls
 * directly within Goose code using the in-code directive `// @controls: ...`
 * or via automatic uniform discovery.
 *
 * Supported In-Code Declarations:
 *   // @controls: dpad, button("Jump"), button("Attack")
 *   // @controls: tap("Flap")
 *   // @controls: slider("Speed", 0.1, 5.0, 1.0), button("Reset")
 *   // @controls: flight
 *   // @controls: joystick, button("Fire")
 */

export interface CustomButton {
  label: string;
  index: number;
}

export interface CustomSlider {
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  index: number;
}

export interface ParsedProgrammableControls {
  rawDirective: string;
  hasDpad: boolean;
  hasFlight: boolean;
  tapButton: { label: string } | null;
  buttons: CustomButton[];
  sliders: CustomSlider[];
  // Legacy / preset detection for backward compatibility
  isFlappy: boolean;
  isTopDown: boolean;
  isRaymarch: boolean;
  hasAnyControls: boolean;
}

export function parseProgrammableControls(source: string): ParsedProgrammableControls {
  const controlsMatch = source.match(/\/\/\s*@controls?:\s*(.+)$/im);
  const rawDirective = controlsMatch ? controlsMatch[1].trim() : "";

  const buttons: CustomButton[] = [];
  const sliders: CustomSlider[] = [];
  let tapButton: { label: string } | null = null;
  let hasDpad = false;
  let hasFlight = false;

  if (rawDirective.length > 0) {
    // 1. Check for tap("...") or standalone tap
    const tapMatch = rawDirective.match(/\btap(?:\s*\(\s*["']([^"']+)["']\s*\))?/i);
    if (tapMatch) {
      tapButton = { label: tapMatch[1] || "Tap / Action" };
    }

    // 2. Check for button("...") or btn("...")
    const btnRegex = /\b(?:button|btn)\s*\(\s*["']([^"']+)["']\s*\)/gi;
    let bMatch: RegExpExecArray | null;
    let btnIdx = 0;
    while ((bMatch = btnRegex.exec(rawDirective)) !== null && btnIdx < 4) {
      buttons.push({ label: bMatch[1], index: btnIdx++ });
    }

    // 3. Check for slider("Name", min, max, default)
    const sliderRegex =
      /\bslider\s*\(\s*["']([^"']+)["'](?:\s*,\s*(-?[0-9.]+))?(?:\s*,\s*(-?[0-9.]+))?(?:\s*,\s*(-?[0-9.]+))?\s*\)/gi;
    let sMatch: RegExpExecArray | null;
    let sIdx = 0;
    while ((sMatch = sliderRegex.exec(rawDirective)) !== null && sIdx < 4) {
      const label = sMatch[1];
      const min = sMatch[2] !== undefined ? parseFloat(sMatch[2]) : 0;
      const max = sMatch[3] !== undefined ? parseFloat(sMatch[3]) : 1;
      const defaultValue =
        sMatch[4] !== undefined ? parseFloat(sMatch[4]) : (min + max) / 2;
      sliders.push({ label, min, max, defaultValue, index: sIdx++ });
    }

    // 4. Check for dpad, joystick, directional
    if (/\b(?:d-?pad|joystick|directional)\b/i.test(rawDirective)) {
      hasDpad = true;
    }

    // 5. Check for flight or wasd
    if (/\b(?:flight|wasd|fly)\b/i.test(rawDirective)) {
      hasFlight = true;
    }
  }

  // Automatic uniform inspection fallback if no directive specified
  if (
    !hasDpad &&
    (/\buniform\s+vec2\s+u_dpad\b/.test(source) ||
      /\buniform\s+vec2\s+u_joystick\b/.test(source))
  ) {
    hasDpad = true;
  }

  // Internal physics simulation triggers (mutually exclusive)
  const isTopDown = hasDpad && (source.includes("Tile") || source.includes("GAMEBOY_SHADER") || source.includes("Vector2"));
  const isFlappy = !isTopDown && (source.includes("FLAPPY_SHADER") || (source.includes("Bird") && source.includes("u_pipe1")));
  const isRaymarch = source.includes("map_scene");

  if (isRaymarch && !hasFlight && rawDirective.length === 0) {
    hasFlight = true;
  }

  const hasAnyControls =
    hasDpad ||
    hasFlight ||
    tapButton !== null ||
    buttons.length > 0 ||
    sliders.length > 0;

  return {
    rawDirective,
    hasDpad,
    hasFlight,
    tapButton,
    buttons,
    sliders,
    isFlappy,
    isTopDown,
    isRaymarch,
    hasAnyControls,
  };
}


// Synthetic Web Audio Goose Honk generator (100% offline, 0 external assets)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn("Web Audio not supported:", e);
    return null;
  }
}

/**
 * Plays an authentic, brassy, nasal goose honk sound.
 * Characteristics:
 * - Two-stage pitch bend: 380Hz -> 610Hz peak -> 440Hz tail
 * - Rich harmonic buzzy spectrum (sawtooth + detuned pulse)
 * - Dual formant bandpass filters at 750Hz and 2300Hz (vocal tract & beak resonance)
 * - Subtle harmonic saturation
 */
export function playGooseHonk() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.32; // ~320ms honk

  // Master gain
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.001, now);
  // Sharp attack (18ms)
  masterGain.gain.exponentialRampToValueAtTime(0.55, now + 0.018);
  // Main honk body
  masterGain.gain.linearRampToValueAtTime(0.65, now + 0.12);
  // Rapid decay
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // Formant Filter 1 (Throat cavity resonance ~780Hz)
  const filter1 = ctx.createBiquadFilter();
  filter1.type = "bandpass";
  filter1.frequency.setValueAtTime(780, now);
  filter1.Q.setValueAtTime(3.2, now);

  // Formant Filter 2 (Nasal beak resonance ~2250Hz)
  const filter2 = ctx.createBiquadFilter();
  filter2.type = "peaking";
  filter2.frequency.setValueAtTime(2250, now);
  filter2.gain.setValueAtTime(12, now);
  filter2.Q.setValueAtTime(2.5, now);

  // Highpass to eliminate muddy DC / low-end thumps
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.setValueAtTime(220, now);

  // Dual Oscillators for authentic goose vocal cord buzz
  const osc1 = ctx.createOscillator();
  osc1.type = "sawtooth";

  const osc2 = ctx.createOscillator();
  osc2.type = "triangle";

  // Characteristic goose pitch contour: "W-HOONK" inflection
  // Starts ~380Hz, quickly ramps up to ~620Hz, then trails down to ~430Hz
  [osc1, osc2].forEach((osc, idx) => {
    const detune = idx === 0 ? 0 : 8; // slight detune between cords
    osc.detune.setValueAtTime(detune, now);

    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.07);
    osc.frequency.setValueAtTime(620, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(430, now + duration);
  });

  // Connect graph: Oscillators -> Highpass -> Filter1 -> Filter2 -> MasterGain -> Destination
  osc1.connect(highpass);
  osc2.connect(highpass);
  highpass.connect(filter1);
  filter1.connect(filter2);
  filter2.connect(masterGain);
  masterGain.connect(ctx.destination);

  // Start and stop
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration + 0.05);
  osc2.stop(now + duration + 0.05);
}


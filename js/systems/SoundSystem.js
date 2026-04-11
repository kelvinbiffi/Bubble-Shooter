/**
 * =============================================================================
 * SoundSystem.js — Procedural Audio Effects via Web Audio API
 * =============================================================================
 *
 * PURPOSE:
 *   Generates all game sound effects in real-time using oscillators and
 *   noise buffers — no external audio files needed. This keeps the game
 *   at zero external dependencies and under 20 KB total.
 *
 * WHY PROCEDURAL AUDIO?
 *   - Zero network requests (no .mp3/.wav files to load)
 *   - Tiny file size (code is smaller than a single sound file)
 *   - Infinitely tweakable (change frequency = change sound)
 *   - Demonstrates Web Audio API knowledge (valued in game dev)
 *
 * HOW WEB AUDIO API WORKS:
 *   The Web Audio API uses a node graph (like a modular synthesizer):
 *
 *     Oscillator → GainNode → Destination (speakers)
 *        ↑             ↑
 *     frequency     volume
 *
 *   OscillatorNode: generates a waveform (sine, square, triangle, sawtooth)
 *   GainNode:       controls volume (0 = silent, 1 = full)
 *   BiquadFilter:   shapes frequency content (bandpass, lowpass, etc.)
 *
 *   Key methods:
 *     setValueAtTime(value, time)        — set value at exact time
 *     linearRampToValueAtTime(v, t)      — smooth linear transition
 *     exponentialRampToValueAtTime(v, t) — smooth exponential transition
 *                                          (cannot ramp to 0, use 0.001)
 *
 * AUDIO CONTEXT REQUIREMENT:
 *   Browsers require a user gesture (click/tap) before creating or resuming
 *   an AudioContext. The SoundSystem.init() method handles this — it should
 *   be called from a click event handler (e.g., the "Launch Game" button).
 *
 * SOUND DESIGN NOTES:
 *   - Shoot:  Square wave pitch sweep 1200→150 Hz (classic 8-bit laser)
 *   - Pop:    Sine bend 600→200 Hz + filtered noise burst (bubbly snap)
 *   - Combo:  Ascending C-E-G major triad blips (signals "bonus!")
 *   - Drop:   Dual sine+triangle sweep 800→80 Hz (weighty whoosh)
 *   - Clear:  C5-E5-G5-C6 arpeggio + sustained major chord (victory!)
 *   - Over:   Descending G4-Eb4-C4 minor with pitch bend (melancholy)
 * =============================================================================
 */

export class SoundSystem {
  constructor() {
    this.ctx    = null;  // AudioContext (created on first user gesture)
    this.muted  = false;
  }

  /**
   * Initialize the AudioContext. MUST be called from a user gesture (click/tap).
   * Browsers block audio until a gesture occurs — this is not a bug, it's policy.
   */
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  /** Resume context if suspended (happens after tab switching on some browsers) */
  _ensureRunning() {
    if (!this.ctx || this.muted) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  /** Toggle mute on/off */
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // ===========================================================================
  // SOUND EFFECTS
  // ===========================================================================

  /**
   * Shoot — short "pew" laser sound.
   * Square wave with fast 1200→150 Hz exponential sweep over 150ms.
   * Square wave gives it that classic 8-bit bite.
   */
  playShoot() {
    if (!this._ensureRunning()) return;
    const ctx  = this.ctx;
    const t    = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Pop — bubbly pop sound.
   * Two layers: sine oscillator bending 600→200 Hz for the tonal "bloop",
   * plus a 60ms burst of bandpass-filtered white noise for the snappy "crack".
   */
  playPop() {
    if (!this._ensureRunning()) return;
    const ctx = this.ctx;
    const t   = ctx.currentTime;

    // Layer 1: Tonal "bloop" (sine that bends down fast)
    const osc     = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);
    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);

    // Layer 2: Noise burst for the "snap" texture
    const bufferSize  = ctx.sampleRate * 0.06; // 60ms of noise
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data        = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noiseSrc  = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    const bandpass       = ctx.createBiquadFilter();
    bandpass.type        = 'bandpass';
    bandpass.frequency.value = 1000;
    bandpass.Q.value     = 1.5;

    noiseSrc.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.06);
  }

  /**
   * Combo — ascending major triad blips (C5, E5, G5).
   * Three quick square-wave notes spaced 80ms apart.
   * Rising major pattern universally signals "bonus!"
   */
  playCombo() {
    if (!this._ensureRunning()) return;
    const ctx   = this.ctx;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'square';
      const t    = ctx.currentTime + i * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  /**
   * Drop — falling whoosh sound.
   * Dual-oscillator sweep: sine (800→80 Hz) + triangle sub (400→40 Hz).
   * Two layers give it weight and a whooshy feel.
   */
  playDrop() {
    if (!this._ensureRunning()) return;
    const ctx = this.ctx;
    const t   = ctx.currentTime;

    // Main sweep
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type   = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.35);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0.0, t + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);

    // Sub layer — one octave lower for weight
    const sub     = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type      = 'triangle';
    sub.frequency.setValueAtTime(400, t);
    sub.frequency.exponentialRampToValueAtTime(40, t + 0.35);
    subGain.gain.setValueAtTime(0.2, t);
    subGain.gain.linearRampToValueAtTime(0.0, t + 0.35);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(t);
    sub.stop(t + 0.35);
  }

  /**
   * Level Clear — victory jingle (~1 second).
   * Ascending arpeggio C5-E5-G5-C6 followed by a sustained C major chord.
   */
  playLevelClear() {
    if (!this._ensureRunning()) return;
    const ctx   = this.ctx;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    // Arpeggio
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'square';
      const t    = ctx.currentTime + i * 0.15;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
      gain.gain.setValueAtTime(0.25, t + 0.14);
      gain.gain.linearRampToValueAtTime(0.0, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });

    // Final sustained major chord (C6 + E6 + G6) for the "ta-da"
    const chordT = ctx.currentTime + notes.length * 0.15;
    [1046.50, 1318.51, 1567.98].forEach((freq) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'square';
      osc.frequency.setValueAtTime(freq, chordT);
      gain.gain.setValueAtTime(0.0, chordT);
      gain.gain.linearRampToValueAtTime(0.15, chordT + 0.01);
      gain.gain.setValueAtTime(0.15, chordT + 0.3);
      gain.gain.linearRampToValueAtTime(0.0, chordT + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(chordT);
      osc.stop(chordT + 0.45);
    });
  }

  /**
   * Game Over — descending minor tones with pitch bend.
   * Three triangle-wave notes: G4, Eb4, C4 (C minor descent).
   * Soft waveform + minor key = melancholy.
   */
  playGameOver() {
    if (!this._ensureRunning()) return;
    const ctx   = this.ctx;
    const notes = [392.00, 311.13, 261.63]; // G4, Eb4, C4

    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'triangle';
      const t    = ctx.currentTime + i * 0.22;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 0.95, t + 0.25); // Sad pitch bend
      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
      gain.gain.setValueAtTime(0.3, t + 0.15);
      gain.gain.linearRampToValueAtTime(0.0, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }
}

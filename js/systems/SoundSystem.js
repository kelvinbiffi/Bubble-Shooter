/**
 * =============================================================================
 * SoundSystem.js — File-based Audio (music + SFX) via Web Audio API
 * =============================================================================
 *
 * Plays the studio-produced tracks and SFX (see STUDIO/AUDIO-MAP.md).
 * Two buses (music / sfx) hang off the AudioContext so we can duck the
 * music under important jingles and mute everything at once.
 *
 * Public API kept from the old synth version:
 *   init(), toggleMute(), playShoot(), playPop(n), playCombo(), playDrop(),
 *   playLevelClear(), playGameOver()
 * New: playMusic(worldIdx), stopMusic()
 * =============================================================================
 */

const SFX = {
  shoot:    { url: 'assets/audio/sfx/shoot.mp3',    vol: 0.55 },
  pop:      { url: 'assets/audio/sfx/pop.mp3',      vol: 0.70 },
  combo:    { url: 'assets/audio/sfx/combo.mp3',    vol: 0.65 },
  drop:     { url: 'assets/audio/sfx/drop.mp3',     vol: 0.60 },
  clear:    { url: 'assets/audio/sfx/clear.mp3',    vol: 0.80 },
  gameover: { url: 'assets/audio/sfx/gameover.mp3', vol: 0.75 },
};

const MUSIC = [
  { url: 'assets/audio/music/world0.mp3', vol: 0.35 },
  { url: 'assets/audio/music/world1.mp3', vol: 0.35 },
  { url: 'assets/audio/music/world2.mp3', vol: 0.30 },
];

const MAX_VOICES = 8;

export class SoundSystem {
  constructor() {
    this.ctx      = null;
    this.muted    = localStorage.getItem('bb-muted') === '1';
    this.buffers  = new Map();   // url -> AudioBuffer (ou Promise em voo)
    this.musicBus = null;
    this.sfxBus   = null;
    this.musicSrc  = null;
    this.musicGain = null;
    this.musicWorld = -1;
    this.voices   = 0;
    this.comboSrc = null;
  }

  /** MUST be called from a user gesture. */
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.musicBus = this.ctx.createGain();
    this.sfxBus   = this.ctx.createGain();
    this.musicBus.connect(this.ctx.destination);
    this.sfxBus.connect(this.ctx.destination);
    this._applyMute();
    // SFX são pequenos: pré-carrega tudo
    for (const { url } of Object.values(SFX)) this._load(url);
  }

  _ensureRunning() {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  _applyMute() {
    if (!this.ctx) return;
    const v = this.muted ? 0 : 1;
    this.musicBus.gain.setValueAtTime(v, this.ctx.currentTime);
    this.sfxBus.gain.setValueAtTime(v, this.ctx.currentTime);
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('bb-muted', this.muted ? '1' : '0');
    this._applyMute();
    return this.muted;
  }

  async _load(url) {
    if (this.buffers.has(url)) return this.buffers.get(url);
    const promise = fetch(url)
      .then(r => r.arrayBuffer())
      .then(ab => this.ctx.decodeAudioData(ab))
      .then(buf => { this.buffers.set(url, buf); return buf; })
      .catch(() => { this.buffers.delete(url); return null; });
    this.buffers.set(url, promise);
    return promise;
  }

  _playSfx(name, { rate = 1, delay = 0, vol = null } = {}) {
    if (!this._ensureRunning() || this.muted) return null;
    const def = SFX[name];
    const buf = this.buffers.get(def.url);
    if (!buf || buf instanceof Promise) { this._load(def.url); return null; }
    if (this.voices >= MAX_VOICES) return null;
    const src  = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = rate;
    gain.gain.value = vol ?? def.vol;
    src.connect(gain);
    gain.connect(this.sfxBus);
    this.voices++;
    src.onended = () => { this.voices--; };
    src.start(this.ctx.currentTime + delay);
    return src;
  }

  // ---- Música ----

  async playMusic(worldIdx) {
    if (!this._ensureRunning()) return;
    if (this.musicWorld === worldIdx && this.musicSrc) return; // mesma trilha, segue tocando
    this.stopMusic(0.5);
    this.musicWorld = worldIdx;
    const def = MUSIC[worldIdx];
    if (!def) return;
    const buf = await this._load(def.url);
    if (!buf || this.musicWorld !== worldIdx) return; // trocou de mundo no meio do load
    const src  = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    src.loop = true;
    // respiro do Suno no fecho: crossfade simples encurtando o loop em 1s
    src.loopEnd = Math.max(0, buf.duration - 1);
    src.connect(gain);
    gain.connect(this.musicBus);
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(def.vol, t + 0.5);
    src.start(t);
    this.musicSrc  = src;
    this.musicGain = gain;
  }

  stopMusic(fade = 0.3) {
    if (!this.musicSrc) return;
    const src = this.musicSrc, gain = this.musicGain;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + fade);
    src.stop(t + fade + 0.05);
    this.musicSrc = null;
    this.musicGain = null;
    this.musicWorld = -1;
  }

  /** Abaixa a música pra 40% durante um jingle e volta em fade. */
  _duck(duration) {
    if (!this.musicGain) return;
    const def = MUSIC[this.musicWorld];
    const base = def ? def.vol : 0.35;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(base * 0.4, t + 0.1);
    this.musicGain.gain.setValueAtTime(base * 0.4, t + duration);
    this.musicGain.gain.linearRampToValueAtTime(base, t + duration + 0.5);
  }

  // ---- SFX (API antiga) ----

  playShoot() {
    this._playSfx('shoot', { rate: 0.95 + Math.random() * 0.1 });
  }

  /** Escadinha satisfatória: 1 pop por bolha com pitch subindo (máx 8). */
  playPop(count = 1) {
    const n = Math.min(count, MAX_VOICES);
    for (let i = 0; i < n; i++) {
      this._playSfx('pop', { rate: 1 + i * 0.03, delay: i * 0.04 });
    }
  }

  playCombo() {
    if (this.comboSrc) { try { this.comboSrc.stop(); } catch (e) {} }
    this.comboSrc = this._playSfx('combo');
  }

  playDrop() {
    this._playSfx('drop');
  }

  playLevelClear() {
    this._duck(1.6);
    this._playSfx('clear');
  }

  playGameOver() {
    this.stopMusic(0.3);
    this._playSfx('gameover', { delay: 0.3 });
  }
}

import tracksData from "../assets/music/tracks.json";
import sfxData from "../assets/audio/sfx.json";

type Wave = "square" | "triangle" | "sawtooth" | "sine" | "noise";
interface Channel {
  wave: Wave;
  volume: number;
  notes: string;
}
interface Track {
  bpm: number;
  loop: boolean;
  channels: Channel[];
}
interface SfxPart {
  wave: Wave;
  f0: number;
  f1: number;
  dur: number;
  vol: number;
  at: number;
}
interface Ev {
  t: number;
  freq: number;
  dur: number;
}
interface Voice {
  wave: Wave;
  volume: number;
  events: Ev[];
  i: number;
  loopStart: number;
}

const NOTE_RE = /^([A-G])([#b]?)(-?\d)\/(\d+(?:\.\d+)?)$/;
const REST_RE = /^r\/(\d+(?:\.\d+)?)$/;
const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const STORAGE_KEY = "rpg-sacha-lea.audio";
export const VOLUME_STEPS = [1, 0.6, 0.3, 0];

/** Parse "E4/4 r/2 ..." en événements (durées en doubles-croches). */
function parseNotes(src: string, stepSec: number): { events: Ev[]; length: number } {
  const events: Ev[] = [];
  let t = 0;
  for (const tok of src.trim().split(/\s+/)) {
    const rest = REST_RE.exec(tok);
    if (rest) {
      t += Number(rest[1]) * stepSec;
      continue;
    }
    const m = NOTE_RE.exec(tok);
    if (!m) throw new Error(`Note invalide dans la musique : « ${tok} »`);
    const midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    const dur = Number(m[4]) * stepSec;
    events.push({ t, freq: 440 * Math.pow(2, (midi - 69) / 12), dur });
    t += dur;
  }
  return { events, length: t };
}

/** Musique et effets synthétisés (WebAudio). Les fichiers de public/audio/manifest.json les remplacent. */
class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private timer: number | null = null;
  private voices: Voice[] = [];
  private trackLength = 0;
  private trackLoop = true;
  private trackStart = 0;
  private current: string | null = null;
  private fileAudio: HTMLAudioElement | null = null;
  private manifest: { music: Record<string, string>; sfx: Record<string, string> } = { music: {}, sfx: {} };
  private sfxBuffers = new Map<string, AudioBuffer>();
  volumeIndex = 0;
  muted = false;

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as { volumeIndex?: number };
      if (typeof saved.volumeIndex === "number" && saved.volumeIndex >= 0 && saved.volumeIndex < VOLUME_STEPS.length) {
        this.volumeIndex = saved.volumeIndex;
      }
    } catch {
      /* préférences ignorées */
    }
    this.muted = VOLUME_STEPS[this.volumeIndex] === 0;
    const unlock = () => this.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    void this.loadManifest();
  }

  get volume(): number {
    return VOLUME_STEPS[this.volumeIndex];
  }

  cycleVolume(): void {
    this.setVolumeIndex((this.volumeIndex + 1) % VOLUME_STEPS.length);
  }

  toggleMute(): void {
    this.setVolumeIndex(this.volume === 0 ? 0 : VOLUME_STEPS.length - 1);
  }

  private setVolumeIndex(i: number): void {
    this.volumeIndex = i;
    this.muted = this.volume === 0;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ volumeIndex: i }));
    } catch {
      /* stockage indisponible */
    }
    if (this.master) this.master.gain.value = this.volume;
    if (this.fileAudio) this.fileAudio.volume = this.volume * 0.6;
  }

  private async loadManifest(): Promise<void> {
    try {
      const res = await fetch("/audio/manifest.json");
      if (!res.ok) return;
      const data = (await res.json()) as Partial<typeof this.manifest>;
      this.manifest = { music: data.music ?? {}, sfx: data.sfx ?? {} };
    } catch {
      /* pas de manifeste : audio synthétisé */
    }
  }

  private unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.6;
      this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (this.current && this.voices.length === 0 && !this.fileAudio) this.startSynth(this.current);
  }

  playMusic(key: string): void {
    if (this.current === key && (this.timer !== null || this.fileAudio)) return;
    this.stopMusic();
    this.current = key;
    if (!this.ctx) return; // démarrera au premier geste du joueur
    this.startSynth(key);
  }

  stopMusic(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.voices = [];
    if (this.fileAudio) {
      this.fileAudio.pause();
      this.fileAudio = null;
    }
    this.current = null;
  }

  private startSynth(key: string): void {
    const file = this.manifest.music[key];
    const loop = (tracksData as unknown as Record<string, Track>)[key]?.loop ?? true;
    if (file) {
      this.fileAudio = new Audio(`/audio/${file}`);
      this.fileAudio.loop = loop;
      this.fileAudio.volume = this.volume * 0.6;
      void this.fileAudio.play().catch(() => undefined);
      return;
    }
    const track = (tracksData as unknown as Record<string, Track>)[key];
    if (!track || !this.ctx) return;
    const stepSec = 60 / track.bpm / 4;
    let longest = 0;
    this.voices = track.channels.map((c) => {
      const { events, length } = parseNotes(c.notes, stepSec);
      longest = Math.max(longest, length);
      return { wave: c.wave, volume: c.volume, events, i: 0, loopStart: 0 };
    });
    this.trackLength = longest;
    this.trackLoop = track.loop;
    this.trackStart = this.ctx.currentTime + 0.08;
    this.voices.forEach((v) => (v.loopStart = this.trackStart));
    this.timer = window.setInterval(() => this.schedule(), 90);
    this.schedule();
  }

  private schedule(): void {
    if (!this.ctx) return;
    const horizon = this.ctx.currentTime + 0.4;
    for (const v of this.voices) {
      while (v.events.length > 0) {
        const ev = v.events[v.i];
        const t = v.loopStart + ev.t;
        if (t > horizon) break;
        if (t >= this.ctx.currentTime - 0.05) this.tone(v.wave, ev.freq, ev.freq, ev.dur, v.volume, t, this.musicGain);
        v.i++;
        if (v.i >= v.events.length) {
          if (!this.trackLoop) {
            v.events = [];
            break;
          }
          v.i = 0;
          v.loopStart += this.trackLength;
        }
      }
    }
  }

  private tone(wave: Wave, f0: number, f1: number, dur: number, vol: number, at: number, out: AudioNode): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(vol, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(dur, 0.02));
    gain.connect(out);
    if (wave === "noise") {
      if (!this.noiseBuf) return;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(Math.max(200, f0), at);
      filter.frequency.exponentialRampToValueAtTime(Math.max(100, f1), at + dur);
      src.connect(filter).connect(gain);
      src.start(at, Math.random() * 0.5);
      src.stop(at + dur + 0.02);
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  playSfx(key: string): void {
    if (!this.ctx || this.volume === 0) return;
    const file = this.manifest.sfx[key];
    if (file) {
      void this.playFileSfx(key, file);
      return;
    }
    const parts = (sfxData as unknown as Record<string, SfxPart[]>)[key];
    if (!parts) return;
    const now = this.ctx.currentTime;
    for (const p of parts) this.tone(p.wave, p.f0, p.f1, p.dur, p.vol, now + p.at, this.master);
  }

  private async playFileSfx(key: string, file: string): Promise<void> {
    if (!this.ctx) return;
    try {
      let buf = this.sfxBuffers.get(key);
      if (!buf) {
        const res = await fetch(`/audio/${file}`);
        buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this.sfxBuffers.set(key, buf);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.master);
      src.start();
    } catch {
      /* fichier absent : pas de son */
    }
  }
}

export const audio = new AudioManagerImpl();

/* Aura — a face made of dots. Canvas 2D, no dependencies (AURA_MANUALE.md, portato in TypeScript
   senza cambiare parametri né preset).
   States: idle (breathes), listening (ripples when you type or speak), thinking (slow galaxy spin),
   speaking (pulses with the voice). It also looks toward the pointer. Default look: ink dots on a
   light ground, no halo; pass core/rim (or set --aura-core / --aura-rim) for colour. */

export type StatoAura = "idle" | "listening" | "thinking" | "speaking";

interface Preset {
  scale: number;
  spin: number;
  jitter: number;
  breath: number;
  breathHz: number;
  gaze: number;
  glow: number;
  swirl: number;
  pulse: number;
}

interface Punto {
  r: number;
  a: number;
  ph: number;
  sp: number;
  rgb: string;
}

interface Onda {
  t0: number;
  s: number;
}

export interface OpzioniAura {
  size?: number;
  count?: number;
  core?: string;
  rim?: string;
  follow?: boolean;
  halo?: boolean;
  state?: StatoAura;
  /** Scelta del progetto: Aura è un elemento di brand e si muove anche con «riduci movimento».
      `true` la lascia ferma come nel manuale. Default: segue la preferenza di sistema. */
  reduced?: boolean;
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const PRESETS: Record<StatoAura, Preset> = {
  idle: { scale: 1.0, spin: 0.06, jitter: 0.35, breath: 0.025, breathHz: 0.22, gaze: 0.07, glow: 0.85, swirl: 0, pulse: 0 },
  listening: { scale: 1.06, spin: 0.02, jitter: 0.18, breath: 0.012, breathHz: 0.55, gaze: 0.11, glow: 1.0, swirl: 0, pulse: 0 },
  thinking: { scale: 0.97, spin: 0.55, jitter: 0.45, breath: 0.018, breathHz: 0.7, gaze: 0.03, glow: 0.9, swirl: 1, pulse: 0 },
  speaking: { scale: 1.02, spin: 0.09, jitter: 0.28, breath: 0.0, breathHz: 0.0, gaze: 0.08, glow: 1.0, swirl: 0, pulse: 1 },
};

const CHIAVI_PRESET = Object.keys(PRESETS.idle) as Array<keyof Preset>;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

export class AuraEngine {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  size: number;
  count: number;
  follow: boolean;
  halo: boolean;
  reduced: boolean;
  state: StatoAura = "idle";
  private t = 0;
  private rotation = 0;
  private extAmp: number | null = null; // external amplitude 0..1 (e.g. from an audio analyser); null = synthesised
  private ripples: Onda[] = [];
  private kickAt = -10;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private p: Preset = { ...PRESETS.idle };
  private target: Preset = { ...PRESETS.idle };
  private dots: Punto[] = [];
  private coreRgb: [number, number, number] = [17, 19, 24];
  private last: number;
  private raf: number;
  private dead = false;

  constructor(canvas: HTMLCanvasElement, opts: OpzioniAura = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Aura: canvas 2D non disponibile");
    this.ctx = ctx;
    this.size = opts.size || 240;
    this.count = opts.count || Math.round(90 + this.size * 0.55);
    this.follow = opts.follow !== false;
    this.halo = opts.halo === true; // a soft glow behind the dots, for coloured versions only; off for ink dots
    this.reduced = opts.reduced ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
    for (let i = 0; i < this.count; i++) {
      const k = i + 0.5;
      this.dots.push({ r: Math.sqrt(k / this.count), a: k * GOLDEN, ph: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 1.2, rgb: "17,19,24" });
    }
    this.setColors(opts.core, opts.rim);
    if (opts.state) this.setState(opts.state);
    this.resize();
    this.last = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  /** Read colours from CSS custom properties (or take two hex values). Call again when the theme changes. */
  setColors(core?: string, rim?: string): void {
    if (!core || !rim) {
      const cs = getComputedStyle(this.canvas);
      core = core || cs.getPropertyValue("--aura-core").trim() || "#111318";
      rim = rim || cs.getPropertyValue("--aura-rim").trim() || "#111318";
    }
    const c = hexToRgb(core);
    const r = hexToRgb(rim);
    this.coreRgb = c;
    for (const d of this.dots) {
      const [R, G, B] = mix(c, r, Math.pow(d.r, 0.85));
      d.rgb = `${R},${G},${B}`;
    }
  }

  resize(size?: number): void {
    if (size) this.size = size;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** 'idle' | 'listening' | 'thinking' | 'speaking' */
  setState(state: StatoAura): void {
    if (!PRESETS[state] || state === this.state) return;
    this.state = state;
    this.target = { ...PRESETS[state] };
    if (state === "listening") this.ripple(0.5);
    if (state === "thinking") this.kick();
  }

  /** A wave from the centre outward: call on each keystroke, or with a voice level, while listening. */
  ripple(strength = 0.4): void {
    this.ripples.push({ t0: this.t, s: Math.max(0.1, Math.min(1, strength)) });
    if (this.ripples.length > 6) this.ripples.shift();
  }

  /** A quick contraction, like a nod: the message was received. */
  kick(): void {
    this.kickAt = this.t;
  }

  /** Voice level 0..1 while speaking (from an AnalyserNode, for instance). Pass null to go back to the synthesised rhythm. */
  setAmplitude(a: number | null): void {
    this.extAmp = a == null ? null : Math.max(0, Math.min(1, a));
  }

  /** Pointer position in page coordinates; Aura turns toward it. */
  setPointer(clientX: number, clientY: number): void {
    if (!this.follow) return;
    const b = this.canvas.getBoundingClientRect();
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;
    const reach = Math.max(b.width, 320) * 1.5;
    this.pointer.tx = Math.max(-1, Math.min(1, (clientX - cx) / reach));
    this.pointer.ty = Math.max(-1, Math.min(1, (clientY - cy) / reach));
  }

  setFollow(on: boolean): void {
    this.follow = !!on;
    if (!on) {
      this.pointer.tx = 0;
      this.pointer.ty = 0;
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.dead = true;
  }

  private envelope(): number {
    if (this.extAmp != null) return this.extAmp;
    const t = this.t;
    // a syllable-like rhythm: two beats around 2–4 Hz under a slower phrase wave
    const v = 0.55 * Math.sin(t * 14.5) + 0.45 * Math.sin(t * 23 + 1.3) + 0.35 * Math.sin(t * 3.1);
    return Math.max(0, Math.min(1, v));
  }

  private tick(now: number): void {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.reduced) {
      this.draw(); // reduced motion: a still face
      return;
    }
    this.t += dt;
    const k = 1 - Math.exp(-dt * 5);
    for (const key of CHIAVI_PRESET) this.p[key] += (this.target[key] - this.p[key]) * k;
    const kp = 1 - Math.exp(-dt * 4);
    this.pointer.x += (this.pointer.tx - this.pointer.x) * kp;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * kp;
    this.rotation += this.p.spin * dt;
    this.draw();
  }

  private draw(): void {
    const { ctx, p, t } = this;
    const S = this.size;
    const R = S * 0.42;
    const cx = S / 2;
    const cy = S / 2;
    ctx.clearRect(0, 0, S, S);

    const breath = 1 + p.breath * Math.sin(2 * Math.PI * p.breathHz * t);
    const kickAge = t - this.kickAt;
    const kick = kickAge < 1.5 ? 1 - 0.07 * Math.exp(-kickAge * 5) * Math.cos(kickAge * 16) : 1;
    const env = p.pulse > 0.01 ? p.pulse * this.envelope() : 0;
    const scale = p.scale * breath * kick;
    const base = Math.max(1.05, S / 100); // dot radius at the centre; small faces keep their dots visible
    this.ripples = this.ripples.filter((w) => t - w.t0 < 2.2);

    // a soft halo behind the dots while speaking or listening
    const haloA = 0.1 * p.glow + env * 0.12;
    if (this.halo && haloA > 0.02) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.9);
      g.addColorStop(0, `rgba(${this.coreRgb.join(",")},${haloA})`);
      g.addColorStop(1, `rgba(${this.coreRgb.join(",")},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    }

    const gx = this.pointer.x * R * p.gaze;
    const gy = this.pointer.y * R * p.gaze;
    for (const d of this.dots) {
      const rr = d.r;
      // thinking: the inside turns faster than the rim, like a galaxy, and some dots drift in and out
      const ang = d.a + this.rotation * (1 + p.swirl * (1.4 - rr));
      let radial = rr + p.swirl * 0.07 * Math.sin(t * 2.2 * d.sp + d.ph) * (0.3 + rr);
      // speaking: rings pulse outward with the voice
      radial *= 1 + env * 0.14 * (0.35 + 0.65 * rr) * (1 + 0.6 * Math.sin(rr * 16 - t * 11));
      // listening: ripples travel from the centre to the rim
      for (const w of this.ripples) {
        const age = t - w.t0;
        const front = age * 1.3;
        const dd = rr - front;
        radial += w.s * 0.09 * Math.exp(-dd * dd * 60) * Math.exp(-age * 1.6);
      }
      const jx = p.jitter * Math.sin(t * d.sp + d.ph);
      const jy = p.jitter * Math.cos(t * d.sp * 1.3 + d.ph);
      const x = cx + Math.cos(ang) * radial * R * scale + gx * (1.35 - rr) + jx;
      const y = cy + Math.sin(ang) * radial * R * scale + gy * (1.35 - rr) + jy;
      const size = base * (1.15 - 0.4 * rr) * (1 + env * 0.45 * (1 - rr));
      const shimmer = 0.85 + 0.15 * Math.sin(t * 1.7 * d.sp + d.ph);
      const alpha = Math.min(1, p.glow * shimmer * (1 - 0.5 * rr * rr) * (S < 64 ? 1.25 : 1));
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.rgb},${alpha.toFixed(3)})`;
      ctx.fill();
    }
  }
}

export { PRESETS as AURA_PRESETS };

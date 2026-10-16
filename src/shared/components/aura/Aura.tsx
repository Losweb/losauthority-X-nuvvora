import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { AuraEngine, type StatoAura } from "./aura-engine";

/**
 * <Aura> — the assistant's face, made of dots. Ink on white by default (AURA_MANUALE.md).
 *
 * props
 *   state      'idle' | 'listening' | 'thinking' | 'speaking'   (default 'idle')
 *   size px, default 240 (128 as a hero, 32 beside a chat message)
 *   live true = this face reacts: follows the pointer and takes `state`; false = always idle, no pointer (default true)
 *   amplitude 0..1 voice level while speaking, or null for the built-in rhythm
 *   core, rim hex colours (default: --aura-core / --aura-rim on the canvas, else #111318)
 *   halo a soft glow behind the dots; only for coloured versions (default false)
 *   count number of dots (default: 90 + size × 0.55)
 *   label accessible name (default 'Aura')
 *   reduced ferma (true) o in movimento (false) a prescindere da «riduci movimento»; default: la preferenza di sistema
 *
 * ref
 *   ripple(strength 0..1) a wave from the centre: call on each keystroke or voice peak while listening
 *   kick() a quick nod: the message was received
 *   setAmplitude(a) voice level while speaking
 *   engine the AuraEngine instance
 */
export interface AuraProps {
  state?: StatoAura;
  size?: number;
  live?: boolean;
  amplitude?: number | null;
  core?: string;
  rim?: string;
  halo?: boolean;
  count?: number;
  label?: string;
  reduced?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface AuraHandle {
  ripple: (strength?: number) => void;
  kick: () => void;
  setAmplitude: (a: number | null) => void;
  readonly engine: AuraEngine | null;
}

export const Aura = forwardRef<AuraHandle, AuraProps>(function Aura(
  { state = "idle", size = 240, live = true, amplitude = null, core, rim, halo = false, count, label = "Aura", reduced, className, style },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<AuraEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const e = new AuraEngine(canvas, { size, count, core, rim, halo, reduced, follow: live, state: live ? state : "idle" });
    engine.current = e;
    const move = (ev: PointerEvent) => e.setPointer(ev.clientX, ev.clientY);
    if (live) window.addEventListener("pointermove", move, { passive: true });
    const recolor = () => e.setColors(core, rim);
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    mq?.addEventListener("change", recolor);
    const mo = new MutationObserver(recolor);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => {
      window.removeEventListener("pointermove", move);
      mq?.removeEventListener("change", recolor);
      mo.disconnect();
      e.destroy();
      engine.current = null;
    };
    // Il motore nasce una volta sola; le prop che cambiano passano dagli effetti qui sotto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engine.current?.setState(live ? state : "idle");
  }, [state, live]);
  useEffect(() => {
    engine.current?.setFollow(live);
  }, [live]);
  useEffect(() => {
    engine.current?.setAmplitude(amplitude);
  }, [amplitude]);
  useEffect(() => {
    engine.current?.resize(size);
  }, [size]);
  useEffect(() => {
    engine.current?.setColors(core, rim);
  }, [core, rim]);

  useImperativeHandle(
    ref,
    () => ({
      ripple: (s?: number) => engine.current?.ripple(s),
      kick: () => engine.current?.kick(),
      setAmplitude: (a: number | null) => engine.current?.setAmplitude(a),
      get engine() {
        return engine.current;
      },
    }),
    [],
  );

  return <canvas ref={canvasRef} className={["aura", className].filter(Boolean).join(" ")} style={style} role="img" aria-label={label} width={size} height={size} />;
});

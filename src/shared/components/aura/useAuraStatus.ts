import { useCallback, useEffect, useRef, useState } from "react";
import type { AuraHandle } from "./Aura";
import type { StatoAura } from "./aura-engine";

/**
 * useAuraStatus — turns what the user does into Aura's state, in one place (AURA_MANUALE.md).
 *
 *   const aura = useAuraStatus();
 *   <Aura ref={aura.ref} state={aura.status} />
 *   <textarea onChange={(e) => { setText(e.target.value); aura.typing(); }} onFocus={aura.focus} />
 *   onSend:  aura.sent();  await model();  aura.speaking();  await showReply();  aura.done();
 *
 * typing()    → 'listening' + a ripple; falls back to 'idle' after 2.5 s of silence
 * focus()     → 'listening' if idle
 * sent()      → a nod (kick) + 'thinking'
 * speaking()  → 'speaking'
 * done()      → 'idle'
 */
export function useAuraStatus() {
  const ref = useRef<AuraHandle>(null);
  const [status, setStatus] = useState<StatoAura>("idle");
  const idle = useRef<number | undefined>(undefined);

  const typing = useCallback((strength?: number) => {
    setStatus("listening");
    ref.current?.ripple(strength ?? 0.25 + Math.random() * 0.3);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setStatus((s) => (s === "listening" ? "idle" : s)), 2500);
  }, []);
  const focus = useCallback(() => setStatus((s) => (s === "idle" ? "listening" : s)), []);
  const sent = useCallback(() => {
    window.clearTimeout(idle.current);
    ref.current?.kick();
    setStatus("thinking");
  }, []);
  const speaking = useCallback(() => setStatus("speaking"), []);
  const done = useCallback(() => setStatus("idle"), []);

  useEffect(() => () => window.clearTimeout(idle.current), []);
  return { ref, status, setStatus, typing, focus, sent, speaking, done };
}

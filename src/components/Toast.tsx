// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';

const message = signal<{ text: string; n: number } | null>(null);
let counter = 0;

/** Brief, low-importance confirmations ("Copied", "Saved"). Each is also reflected elsewhere in the UI. */
export function toast(text: string): void {
  message.value = { text, n: ++counter };
}

export function ToastHost() {
  const ref = useRef<HTMLDivElement>(null);
  const m = message.value;

  useEffect(() => {
    const el = ref.current;
    if (!el || !m) return;
    try {
      el.showPopover();
    } catch {
      // Already open: the text has been replaced in place.
    }
    const ariaNotify = (document as unknown as { ariaNotify?: (s: string) => void }).ariaNotify;
    ariaNotify?.call(document, m.text);
    const t = setTimeout(() => {
      try {
        el.hidePopover();
      } catch {
        // Closed already.
      }
    }, 2200);
    return () => clearTimeout(t);
  }, [m?.n]);

  return (
    <div role="region" aria-label="Notifications">
      <div ref={ref} class="toast" popover="manual" role="status">
        {m?.text}
      </div>
    </div>
  );
}

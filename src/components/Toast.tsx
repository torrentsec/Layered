// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

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
    const t = setTimeout(() => {
      try {
        el.hidePopover();
      } catch {
        // Closed already.
      }
    }, 2200);
    return () => clearTimeout(t);
  }, [m?.n]);

  // The live region stays in the tree; a status role on the popover itself is
  // often not announced, as it goes from hidden to shown and filled at once.
  return (
    <>
      <div class="visually-hidden" role="status">
        {m?.text}
      </div>
      <div ref={ref} class="toast" popover="manual" aria-hidden="true">
        {m?.text}
      </div>
    </>
  );
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { useState } from 'preact/hooks';
import { Sheet } from './Sheet';
import { patchSettings, settings } from '../data/store';
import { shouldShowInstallHint } from '../data/installHint';

function detect(): boolean {
  return shouldShowInstallHint(
    {
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints ?? 0,
      standalone: (navigator as Navigator & { standalone?: boolean }).standalone,
      displayStandalone: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    },
    settings.peek().installHintSeen,
  );
}

/** Safari on iOS has no install prompt, so this says where the option lives. Shown once. */
export function InstallHint() {
  const [open, setOpen] = useState(detect);
  if (!open) return null;
  const close = () => {
    patchSettings({ installHintSeen: true });
    setOpen(false);
  };
  return (
    <Sheet open title="Add to Home Screen" onClose={close}>
      <p>
        Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Layered then opens full screen and works
        offline.
      </p>
      <p class="small-print">Morning notifications on iPhone and iPad need this, and iOS 16.4 or later.</p>
      <div class="sheet-actions">
        <button type="button" class="btn" onClick={close}>
          Got it
        </button>
      </div>
    </Sheet>
  );
}

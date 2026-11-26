// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A tick where the platform supports it. iOS Safari has no vibrate, so this is a no-op there. */
export function haptic(ms = 8): void {
  if (reduced()) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Some browsers throw outside a user gesture; a missing tick is harmless.
  }
}

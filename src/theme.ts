// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { effect } from '@preact/signals';
import { settings, type Theme } from './data/store';

// Mirrors the inline script in index.html, which reads this key before first paint.
const KEY = 'color-scheme';

function apply(theme: Theme) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  const value = theme === 'system' ? 'light dark' : theme;
  if (meta) meta.content = value;
  try {
    if (theme === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141311' : '#f4f1ea');
}

export function initTheme(): void {
  effect(() => apply(settings.value.theme));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => apply(settings.value.theme));
}

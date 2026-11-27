// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { ComponentChildren } from 'preact';

interface Props {
  title: ComponentChildren;
  /** Plain-text title for the collapsed bar. */
  short: string;
  action?: ComponentChildren;
  subtitle?: ComponentChildren;
}

/**
 * iOS-style navigation: a slim bar stays pinned while the large title scrolls
 * away beneath it, and the bar's own title fades in as it does (CSS scroll
 * timeline, so there is no scroll listener).
 */
export function TitleBar({ title, short, action, subtitle }: Props) {
  return (
    <>
      <header class="titlebar">
        <div class="row">
          <span class="small" aria-hidden="true">{short}</span>
          {action}
        </div>
      </header>
      <div class="large-head">
        <h1 class="large-title">{title}</h1>
        {subtitle && <p class="subtitle">{subtitle}</p>}
      </div>
    </>
  );
}

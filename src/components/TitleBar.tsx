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

/** iOS-style large title that collapses into the bar as you scroll (CSS scroll timeline). */
export function TitleBar({ title, short, action, subtitle }: Props) {
  return (
    <header class="titlebar">
      <div class="row">
        <span class="small" aria-hidden="true">{short}</span>
        {action}
      </div>
      <h1 class="large-title">{title}</h1>
      {subtitle && <p class="subtitle">{subtitle}</p>}
    </header>
  );
}

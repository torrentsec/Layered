// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { ItemKind } from '../engine/types';
import { tempColor } from './colors';

/** Base = yellow circle, mid = red square, outer = blue triangle, accessory = black quarter. */
export function LayerMark({ kind, size = 24 }: { kind: ItemKind; size?: number }) {
  return (
    <svg class="mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {kind === 'base' && <circle cx="12" cy="12" r="10" fill="var(--yellow)" />}
      {kind === 'mid' && <rect x="3" y="3" width="18" height="18" fill="var(--red)" />}
      {kind === 'outer' && <path d="M12 2 L22.5 21 H1.5 Z" fill="var(--blue)" />}
      {kind === 'accessory' && <path d="M3 21 V3 A18 18 0 0 1 21 21 Z" fill="var(--ink)" />}
    </svg>
  );
}

/** A small poster for list rows: circle coloured by temperature plus a rain bar. */
export function MiniMark({ feels, rain }: { feels: number; rain: number }) {
  return (
    <svg class="mini" viewBox="0 0 36 36" aria-hidden="true">
      <rect x="0" y="0" width="36" height="36" fill="var(--surface-2)" />
      <circle cx="16" cy="16" r="12" fill={tempColor(feels)} />
      <path d="M36 36 H20 L36 20 Z" fill="var(--ink)" />
      <rect x="0" y={36 - Math.max(2, (rain / 100) * 36)} width="4" height={Math.max(2, (rain / 100) * 36)} fill="var(--blue)" />
    </svg>
  );
}

export function Chevron() {
  return (
    <svg class="chev" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3 5 L7 9 L11 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  );
}

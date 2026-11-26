// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { tempColor } from './colors';

interface Props {
  feels: number;
  rain: number;
  onCircleTap?: () => void;
}

/**
 * The poster: a temperature-coloured circle, red square, black quarter-circle
 * and blue triangle on a thin rule. The square and triangle drift with rain
 * chance so the composition shifts with the day without becoming a chart.
 */
export function Hero({ feels, rain, onCircleTap }: Props) {
  const tilt = Math.round((rain / 100) * 12);
  return (
    <svg class="hero" viewBox="0 0 360 260" role="img" aria-label={`Feels like ${Math.round(feels)} degrees`}>
      <rect x="0" y="0" width="360" height="260" fill="var(--surface)" />
      <path d="M0 260 V140 A120 120 0 0 1 120 260 Z" fill="var(--ink)" />
      <rect x="226" y="28" width="92" height="92" fill="var(--red)" transform={`rotate(${tilt} 272 74)`} />
      <circle
        class="temp-circle"
        cx="168"
        cy="128"
        r="92"
        fill={tempColor(feels)}
        onClick={onCircleTap}
      />
      <path d={`M${300 - tilt} 150 L346 246 H254 Z`} fill="var(--blue)" />
      <rect x="24" y="226" width="312" height="4" fill="var(--ink)" />
      <rect x="40" y="36" width="6" height="64" fill="var(--yellow)" />
    </svg>
  );
}

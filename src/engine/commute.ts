// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { advise, type AdviseInput } from './advise';
import { bandRank } from './bands';
import { wetFrom } from './rain';
import { fmt24, type TimeFormatter } from './time';
import type { Advice, Extra, Hour } from './types';

export interface CommuteAdvice {
  /** What to wear: the colder leg's layers with both legs' extras. */
  advice: Advice;
  out: Advice;
  back: Advice;
  colder: 'out' | 'back';
  notes: string[];
}

const legName = { out: 'the way there', back: 'the way home' } as const;

function differenceNote(e: Extra, leg: 'out' | 'back', hours: Hour[], fmt: TimeFormatter): string {
  if (e.tone === 'rain') {
    const wet = wetFrom(hours, fmt);
    const when = wet ? ` — ${wet}` : '';
    return `${e.label} for ${legName[leg]}${when}`;
  }
  return `${e.label} for ${legName[leg]}`;
}

export function adviseCommute(
  base: Omit<AdviseInput, 'hours'>,
  outHours: Hour[],
  backHours: Hour[],
  fmt: TimeFormatter = fmt24,
): CommuteAdvice | null {
  const out = advise({ ...base, hours: outHours });
  const back = advise({ ...base, hours: backHours });
  if (!out || !back) return null;

  const colder = back.effective < out.effective ? 'back' : 'out';
  const cold = colder === 'out' ? out : back;

  const seen = new Set<string>();
  const extras: Extra[] = [];
  for (const e of [...cold.extras, ...out.extras, ...back.extras]) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    extras.push(e);
  }
  // Swing is about a single stretch outdoors; across two legs it's noise.
  const merged = extras.filter((e) => e.id !== 'swing');
  if (merged.some((e) => e.id === 'hood')) {
    for (let i = merged.length - 1; i >= 0; i--) if (merged[i].id === 'umbrella') merged.splice(i, 1);
  }

  const notes: string[] = [];
  const outIds = new Set(out.extras.map((e) => e.id));
  const backIds = new Set(back.extras.map((e) => e.id));
  for (const e of back.extras) if (!outIds.has(e.id) && e.id !== 'swing') notes.push(differenceNote(e, 'back', backHours, fmt));
  for (const e of out.extras) if (!backIds.has(e.id) && e.id !== 'swing') notes.push(differenceNote(e, 'out', outHours, fmt));
  if (bandRank(out.band) !== bandRank(back.band)) {
    const warmer = colder === 'out' ? back : out;
    notes.push(`Colder on ${legName[colder]} (${Math.round(cold.effective)}° vs ${Math.round(warmer.effective)}°)`);
  }

  const advice: Advice = {
    ...cold,
    extras: merged,
    minFeels: Math.min(out.minFeels, back.minFeels),
    maxFeels: Math.max(out.maxFeels, back.maxFeels),
    hours: [...outHours, ...backHours],
    why: { ...cold.why, rules: [`Dressing for ${legName[colder]}, the colder leg`, ...cold.why.rules, ...notes] },
  };
  return { advice, out, back, colder, notes };
}

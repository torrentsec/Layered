// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { Advice, Hour } from '../engine/types';
import type { Units } from '../data/units';
import { fmtDressFor, fmtTemp, localiseTemp, localiseWind } from '../data/units';
import { timeFmt } from '../data/format';
import { LayerMark } from './Marks';
import { tempColor } from './colors';

export function LayerList({ advice }: { advice: Advice }) {
  return (
    <ul class="group" aria-label="What to wear" style={{ listStyle: 'none', padding: 0 }}>
      {advice.layers.map((l) => (
        <li class="row-item" key={l.kind + l.label}>
          <LayerMark kind={l.kind} />
          <span class="grow">
            {l.item ? `Your ${l.item.name.toLowerCase()}` : l.label}
            {l.item && <span class="sub">{l.label}</span>}
          </span>
          {l.item?.color && <span class="swatch" style={{ background: l.item.color }} aria-hidden="true" />}
          {l.optional && <span class="optional">optional</span>}
        </li>
      ))}
    </ul>
  );
}

export function ExtraChips({ advice, units }: { advice: Advice; units: Units }) {
  if (!advice.extras.length) return null;
  return (
    <ul class="chips" aria-label="Also bring">
      {advice.extras.map((e) => (
        <li class={`chip ${e.tone}`} key={e.id}>
          <i aria-hidden="true" />
          {e.item ? e.item.name : localiseWind(e.label, units.wind)}
        </li>
      ))}
    </ul>
  );
}

export function HourlyStrip({ hours, inWindow, units }: { hours: Hour[]; inWindow: Set<string>; units: Units }) {
  const fmt = timeFmt(units.clock);
  return (
    <ol class="hourly" aria-label="Hourly feels-like">
      {hours.map((h) => (
        <li key={h.time} class={inWindow.has(h.time) ? 'in' : undefined}>
          <span class="meta">{fmt(h.time)}</span>
          <span class="dot" style={{ background: tempColor(h.feels) }} aria-hidden="true" />
          <span class="t num">{fmtTemp(h.feels, units.temp)}</span>
          <span class="p">{h.precipProb >= 10 ? `${Math.round(h.precipProb)}%` : ''}</span>
          <span class="visually-hidden">{h.precipProb >= 10 ? 'chance of rain' : 'dry'}{inWindow.has(h.time) ? ', while you’re out' : ''}</span>
        </li>
      ))}
    </ol>
  );
}

export function WhyBody({ advice, units }: { advice: Advice; units: Units }) {
  const w = advice.why;
  const fmt = timeFmt(units.clock);
  const t = (c: number) => fmtTemp(c, units.temp);
  const signed = (n: number) => {
    const v = units.temp === 'f' ? Math.round(n * 1.8 * 10) / 10 : n;
    return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v)}°`;
  };
  const learnedNote = w.learnedFrom === 'activity' ? 'from your ratings for this activity' : w.learnedFrom === 'all' ? 'from all your ratings' : 'no ratings yet';
  return (
    <>
      <ul class="group" style={{ listStyle: 'none', padding: 0 }}>
        <li class="row-item plain"><span class="grow">Coldest hour</span><span class="meta num">{fmt(w.coldestHour)} · feels {t(w.coldestFeels)}</span></li>
        <li class="row-item plain"><span class="grow">Activity</span><span class="meta num">{signed(w.activityOffset)}</span></li>
        <li class="row-item plain"><span class="grow">Your manual offset</span><span class="meta num">{signed(w.manualOffset)}</span></li>
        <li class="row-item plain"><span class="grow">Learned<span class="sub">{learnedNote}</span></span><span class="meta num">{signed(w.learnedOffset)}</span></li>
        <li class="row-item plain"><span class="grow"><strong>Dress for</strong></span><span class="num"><strong>{fmtDressFor(w.effective, units.temp)}</strong></span></li>
      </ul>
      <h2 class="group-title" style={{ margin: '16px 0 8px' }}>Rules that fired</h2>
      <ul style={{ paddingLeft: '20px', margin: 0 }}>
        {w.rules.map((r) => <li key={r}>{localiseWind(localiseTemp(r, units.temp), units.wind)}</li>)}
      </ul>
    </>
  );
}

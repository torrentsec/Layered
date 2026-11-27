// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { useState } from 'preact/hooks';
import type { Advice, Hour, LayerAdvice } from '../engine/types';
import { ACTIVITY_LABEL } from '../engine/activity';
import type { Units } from '../data/units';
import { fmtDressFor, fmtTemp, localiseTemp, localiseWind } from '../data/units';
import { timeFmt } from '../data/format';
import { choiceOptions, fromWardrobe, genericName, layerText, needsRows } from '../data/advice-text';
import { href } from '../router';
import { LayerMark } from './Marks';
import { Segmented } from './Segmented';
import { tempColor } from './colors';

function LayerRows({ layers }: { layers: LayerAdvice[] }) {
  return (
    <ul class="group" aria-label="What to wear" style={{ listStyle: 'none', padding: 0 }}>
      {layers.map((l) => {
        const t = layerText(l);
        return (
          <li class="row-item" key={l.kind + l.label}>
            <LayerMark kind={l.kind} />
            <span class="grow">
              {t.title}
              {t.sub && <span class="sub">{t.sub}</span>}
            </span>
            {t.general && <span class="optional general">general advice</span>}
            {l.optional && <span class="optional">optional</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function LayerList({ advice }: { advice: Advice }) {
  const [choice, setChoice] = useState(0);
  const options = choiceOptions(advice.alternatives?.length ?? 0);
  if (options.length < 2) return <LayerRows layers={advice.layers} />;
  const pick = Math.min(choice, options.length - 1);
  const layers = pick === 0 ? advice.layers : advice.alternatives![pick - 1];
  return (
    <div class="advice-choice">
      <Segmented label="Which combination" value={pick} options={options} onChange={setChoice} />
      <LayerRows layers={layers} />
    </div>
  );
}

export function Limitations({ advice }: { advice: Advice }) {
  if (!advice.limitations?.length) return null;
  return (
    <section class="card advice-gaps" aria-labelledby="advice-gaps-title">
      <h2 id="advice-gaps-title">What this can’t cover</h2>
      <ul>
        {advice.limitations.map((l) => <li key={l}>{l}</li>)}
      </ul>
      <a href={href('wardrobe')}>Update your wardrobe</a>
    </section>
  );
}

export function ExtraChips({ advice, units }: { advice: Advice; units: Units }) {
  if (!advice.extras.length) return null;
  return (
    <ul class="chips" aria-label="Also bring">
      {advice.extras.map((e) => (
        <li class={`chip ${e.tone}`} key={e.id}>
          <i aria-hidden="true" />
          {localiseWind(e.label, units.wind)}
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
  const owned = advice.layers.filter(fromWardrobe);
  const general = advice.layers.filter((l) => !fromWardrobe(l));
  const r = advice.requirements;
  return (
    <div class="why">
      <h2 class="why-title">The weather</h2>
      <ul class="group">
        <li class="row-item plain"><span class="grow">Coldest hour</span><span class="meta num">{fmt(w.coldestHour)} · feels {t(w.coldestFeels)}</span></li>
        <li class="row-item plain"><span class="grow">Feels like</span><span class="meta num">{t(advice.minFeels)} to {t(advice.maxFeels)}</span></li>
      </ul>

      <h2 class="why-title">You</h2>
      <ul class="group">
        <li class="row-item plain"><span class="grow">{ACTIVITY_LABEL[w.activity]}<span class="sub">activity</span></span><span class="meta num">{signed(w.activityOffset)}</span></li>
        {w.comfortOffset !== undefined && (
          <li class="row-item plain"><span class="grow">How you feel the cold<span class="sub">from your comfort settings</span></span><span class="meta num">{signed(w.comfortOffset)}</span></li>
        )}
        <li class="row-item plain"><span class="grow">Your manual offset</span><span class="meta num">{signed(w.manualOffset)}</span></li>
        <li class="row-item plain"><span class="grow">Learned<span class="sub">{learnedNote}</span></span><span class="meta num">{signed(w.learnedOffset)}</span></li>
        <li class="row-item plain"><span class="grow"><strong>Dress for</strong></span><span class="num"><strong>{fmtDressFor(w.effective, units.temp)}</strong></span></li>
      </ul>

      {r && (
        <>
          <h2 class="why-title">What the day needs</h2>
          <ul class="group">
            {needsRows(r).map((n) => (
              <li class="row-item plain" key={n.label}><span class="grow">{n.label}</span><span class="meta">{n.value}</span></li>
            ))}
          </ul>
        </>
      )}

      {owned.length > 0 && (
        <>
          <h2 class="why-title">From your wardrobe</h2>
          <ul class="group">
            {owned.map((l) => <li class="row-item plain" key={l.kind + l.label}><span class="grow">{layerText(l).title}</span></li>)}
          </ul>
        </>
      )}
      {general.length > 0 && (
        <>
          <h2 class="why-title">General advice</h2>
          <p class="why-note">Not matched to your wardrobe, so this is what most people would wear.</p>
          <ul class="group">
            {general.map((l) => <li class="row-item plain" key={l.kind + l.label}><span class="grow">{genericName(l)}</span></li>)}
          </ul>
        </>
      )}

      <h2 class="why-title">Rules that fired</h2>
      <ul class="why-rules">
        {w.rules.map((rule) => <li key={rule}>{localiseWind(localiseTemp(rule, units.temp), units.wind)}</li>)}
      </ul>
    </div>
  );
}

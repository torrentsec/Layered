// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { useState } from 'preact/hooks';
import type { Forecast } from '../data/forecast-types';
import { fmtDressFor, fmtTemp } from '../data/units';
import { timeFmt } from '../data/format';
import { ratings, settings, inventory, comfort } from '../data/store';
import { rainSummary } from '../engine/rain';
import type { Activity } from '../engine/types';
import { planDay, restOfDay } from '../state/advice';
import { ExtraChips, HourlyStrip, LayerList, Limitations, WhyBody } from '../components/AdviceParts';
import { Hero } from '../components/Hero';
import { Sheet } from '../components/Sheet';

interface Props {
  forecast: Forecast;
  date: string;
  activity?: Activity;
  duration?: number;
  commute?: boolean;
  onCircleTap?: () => void;
  /** Rendered between the verdict and the hourly strip (pickers on Today). */
  controls?: preact.ComponentChildren;
  /** Extra cards under the strip (heads-ups, feedback). */
  footer?: preact.ComponentChildren;
}

export function DayView({ forecast, date, activity, duration, commute, onCircleTap, controls, footer }: Props) {
  const s = settings.value;
  const units = s.units;
  const [why, setWhy] = useState(false);
  const plan = planDay(forecast, date, { settings: s, ratings: ratings.value, inventory: inventory.value, comfort: comfort.value, activity, duration, commute });
  const info = forecast.days.find((d) => d.date === date);
  const fmt = timeFmt(units.clock);

  if (!plan) {
    return (
      <div class="empty">
        <h2>Nothing left to plan</h2>
        <p>The forecast for this day has run out. Check the Week view.</p>
      </div>
    );
  }
  const { advice, commute: c } = plan;
  const rain = restOfDay(plan.dayHours, date);
  const maxRain = Math.max(0, ...advice.hours.map((h) => h.precipProb));

  return (
    <>
      <Hero feels={advice.effective} rain={maxRain} onCircleTap={onCircleTap} />
      <div class="readout">
        <div>
          <div class="feels num" aria-label={`Dress for ${fmtDressFor(advice.effective, units.temp)}`}>{fmtDressFor(advice.effective, units.temp)}</div>
          <div class="feels-label">
            Feels {fmtTemp(advice.minFeels, units.temp)} to {fmtTemp(advice.maxFeels, units.temp)}
            {c ? ' across both legs' : ' while you’re out'}
          </div>
        </div>
        <button type="button" class="text-btn" onClick={() => setWhy(true)}>Why this?</button>
      </div>
      <h2 class="verdict">{advice.verdict}</h2>
      <p class="summary">{advice.summary}</p>

      <LayerList advice={advice} />
      <ExtraChips advice={advice} units={units} />
      <Limitations advice={advice} />
      {c && (
        <ul class="group" aria-label="Commute legs" style={{ listStyle: 'none', padding: 0 }}>
          {([['Out', c.out], ['Back', c.back]] as const).map(([name, leg]) => (
            <li class="row-item plain" key={name}>
              <span class="grow">
                {name} · {fmt(leg.hours[0].time)}
                <span class="sub">{leg.verdict}{c.colder === (name === 'Out' ? 'out' : 'back') ? ' · colder leg' : ''}</span>
              </span>
              <span class="num">feels {fmtTemp(leg.minFeels, units.temp)}</span>
            </li>
          ))}
        </ul>
      )}
      {c && c.notes.length > 0 && (
        <ul class="card" style={{ listStyle: 'none', paddingLeft: '16px' }} aria-label="Commute notes">
          {c.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}

      {controls}

      <h2 class="group-title">Next hours</h2>
      <HourlyStrip hours={plan.dayHours} inWindow={plan.windowTimes} units={units} />
      {rain.length > 0 && <p class="card" style={{ margin: '4px 0 12px' }}><strong>{rainSummary(rain, fmt)}</strong></p>}
      {info?.sunrise && info.sunset && (
        <p class="small-print" style={{ margin: '0 4px' }}>
          Sunrise {fmt(info.sunrise)} · Sunset {fmt(info.sunset)}
        </p>
      )}
      {footer}

      <Sheet open={why} title="Why this?" onClose={() => setWhy(false)}>
        <WhyBody advice={advice} units={units} />
      </Sheet>
    </>
  );
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { useEffect, useState } from 'preact/hooks';
import { airChips, type AirChip } from '../engine/air';
import { headsUps } from '../engine/headsups';
import { addRating } from '../engine/learning';
import { hourOf } from '../engine/time';
import type { Activity, Advice, Hour } from '../engine/types';
import { fetchAir } from '../data/openmeteo';
import { ratings } from '../data/store';
import type { Units } from '../data/units';
import { localiseTemp, localiseWind } from '../data/units';
import { timeFmt } from '../data/format';
import { haptic } from './haptics';
import { toast } from './Toast';

const MET_OFFICE = 'https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings';

const ICON: Record<string, string> = { ice: '◆', storm: '▲', uv: '●', heat: '●', fog: '■' };

export function HeadsUps({ hours, units }: { hours: Hour[]; units: Units }) {
  const list = headsUps(hours, timeFmt(units.clock));
  if (!list.length) return null;
  return (
    <section aria-labelledby="headsups-title">
      <h2 class="group-title" id="headsups-title">Layered heads-ups</h2>
      {list.map((h) => (
        <div class="card headsup" key={h.id} style={{ borderLeft: '6px solid var(--red)' }}>
          <span aria-hidden="true" style={{ fontSize: '22px', lineHeight: 1 }}>{ICON[h.id]}</span>
          <div>
            <h3>{h.title}</h3>
            <p>{localiseWind(localiseTemp(h.detail, units.temp), units.wind)}</p>
          </div>
        </div>
      ))}
      <p class="small-print" style={{ margin: '0 4px' }}>
        Our own reading of the forecast, not an official warning. See{' '}
        <a href={MET_OFFICE} target="_blank" rel="noopener">Met Office warnings</a>.
      </p>
    </section>
  );
}

const airCache = new Map<string, { at: number; chips: AirChip[] }>();

export function AirChips({ lat, lon, date }: { lat: number; lon: number; date: string }) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)},${date}`;
  const [chips, setChips] = useState<AirChip[]>(airCache.get(key)?.chips ?? []);
  useEffect(() => {
    const hit = airCache.get(key);
    if (hit && Date.now() - hit.at < 60 * 60 * 1000) return setChips(hit.chips);
    let live = true;
    fetchAir(lat, lon, date)
      .then((s) => {
        const c = airChips(s);
        airCache.set(key, { at: Date.now(), chips: c });
        if (live) setChips(c);
      })
      // Pollen and AQI are a nice-to-have; a failure just means no chips.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key]);
  if (!chips.length) return null;
  return (
    <ul class="chips" aria-label="Air quality and pollen">
      {chips.map((c) => (
        <li class={`chip ${c.level === 'moderate' ? 'sun' : 'warn'}`} key={c.id}>
          <i aria-hidden="true" />
          {c.label}
        </li>
      ))}
    </ul>
  );
}

const CHOICES: { rating: -1 | 0 | 1; face: string; label: string }[] = [
  { rating: -1, face: '🥶', label: 'Too cold' },
  { rating: 0, face: '👌', label: 'Just right' },
  { rating: 1, face: '🥵', label: 'Too warm' },
];

/** From 18:00, one tap tells the engine how today's advice actually felt. */
export function FeedbackCard({ now, advice, activity }: { now: string; advice: Advice; activity: Activity }) {
  const date = now.slice(0, 10);
  if (hourOf(now) < 18) return null;
  const given = ratings.value.find((r) => r.date === date && r.activity === activity);
  return (
    <section class="card" aria-labelledby="fb-title" style={{ marginTop: '16px' }}>
      <h2 id="fb-title" style={{ fontSize: '19px' }}>How did today’s outfit feel?</h2>
      <div class="feedback" role="group" aria-labelledby="fb-title">
        {CHOICES.map((c) => (
          <button
            type="button"
            key={c.rating}
            aria-pressed={given?.rating === c.rating}
            style={given?.rating === c.rating ? { borderColor: 'var(--ink)', borderWidth: '2px' } : undefined}
            onClick={() => {
              haptic(12);
              ratings.value = addRating(ratings.value, { date, rating: c.rating, effective: advice.effective, activity });
              toast(c.rating === 0 ? 'Noted. Same again.' : c.rating < 0 ? 'Noted. Warmer next time.' : 'Noted. Lighter next time.');
            }}
          >
            <span aria-hidden="true">{c.face}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

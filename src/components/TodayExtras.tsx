// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { useEffect, useState } from 'preact/hooks';
import { airChips, type AirChip } from '../engine/air';
import { headsUps } from '../engine/headsups';
import { correctablePieces, type Piece } from '../engine/garment-learning';
import { addRating } from '../engine/learning';
import { hourOf } from '../engine/time';
import type { Activity, Advice, GarmentCorrection, Hour, Rating } from '../engine/types';
import '../state/garment-warmth';
import '../styles/feedback.css';
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

const DETAILS: { value: NonNullable<Rating['detail']>; label: string }[] = [
  { value: 'too-many-layers', label: 'Too many layers' },
  { value: 'not-enough-protection', label: 'Not enough protection' },
];

const VERDICTS: { value: GarmentCorrection['verdict']; label: string }[] = [
  { value: 'too-warm', label: 'Too warm' },
  { value: 'too-cool', label: 'Too cool' },
];

/** From 18:00, one tap tells the engine how today's advice actually felt; the rest is optional. */
export function FeedbackCard({ now, advice, activity }: { now: string; advice: Advice; activity: Activity }) {
  const date = now.slice(0, 10);
  if (hourOf(now) < 18) return null;
  const given = ratings.value.find((r) => r.date === date && r.activity === activity);
  const pieces = correctablePieces(advice.layers);

  // The rating for the day is replaced whole, so clearing a choice really clears it.
  const save = (next: Rating) => {
    const clean: Rating = { date: next.date, rating: next.rating, effective: next.effective, activity: next.activity };
    if (next.detail) clean.detail = next.detail;
    if (next.corrections?.length) clean.corrections = next.corrections;
    ratings.value = addRating(ratings.value, clean);
  };
  const verdictFor = (p: Piece) => given?.corrections?.find((c) => c.category === p.category && c.thickness === p.thickness)?.verdict;

  return (
    <section class="card fb-card" aria-labelledby="fb-title">
      <h2 id="fb-title">How did today’s outfit feel?</h2>
      <div class="feedback" role="group" aria-labelledby="fb-title">
        {CHOICES.map((c) => (
          <button
            type="button"
            key={c.rating}
            aria-pressed={given?.rating === c.rating}
            onClick={() => {
              haptic(12);
              save({ ...given, date, rating: c.rating, effective: advice.effective, activity });
              toast(c.rating === 0 ? 'Noted. Same again.' : c.rating < 0 ? 'Noted. Warmer next time.' : 'Noted. Lighter next time.');
            }}
          >
            <span aria-hidden="true">{c.face}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      {given ? (
        <>
          <fieldset class="fb-more">
            <legend>Anything else? <span class="fb-optional">Optional</span></legend>
            <div class="fb-toggles">
              {DETAILS.map((d) => (
                <button
                  type="button"
                  key={d.value}
                  aria-pressed={given.detail === d.value}
                  onClick={() => save({ ...given, detail: given.detail === d.value ? undefined : d.value })}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </fieldset>
          {pieces.length ? (
            <fieldset class="fb-more">
              <legend>Which piece felt wrong?</legend>
              <ul class="fb-pieces">
                {pieces.map((p) => {
                  const current = verdictFor(p);
                  const id = `fb-piece-${p.key.replace(':', '-')}`;
                  return (
                    <li key={p.key}>
                      <span id={id} class="fb-piece-name">{p.name}</span>
                      <div class="fb-toggles" role="group" aria-labelledby={id}>
                        {VERDICTS.map((v) => (
                          <button
                            type="button"
                            key={v.value}
                            aria-pressed={current === v.value}
                            onClick={() => {
                              const others = (given.corrections ?? []).filter((c) => !(c.category === p.category && c.thickness === p.thickness));
                              const corrections = current === v.value ? others : [...others, { category: p.category, thickness: p.thickness, verdict: v.value }];
                              save({ ...given, corrections });
                            }}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p class="small-print">One mark won’t change anything. Two that agree will.</p>
            </fieldset>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

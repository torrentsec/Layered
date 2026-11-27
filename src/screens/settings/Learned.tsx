// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { ACTIVITY_LABEL } from '../../engine/activity';
import { forgetAllGarments, forgetGarment, LAYERS_KEY, parseGarmentKey } from '../../engine/garment-learning';
import { activityOffsets, learnOffset, temperatureVotes } from '../../engine/learning';
import { garmentLabel } from '../../engine/match';
import { garmentWarmth, ratings, settings } from '../../data/store';
import { tempDelta } from '../../data/units';
import { engineOf } from '../../data/engine-choice';
import { LearnedCard } from './LearnedCard';
import { toast } from '../../components/Toast';
import { localToday } from '../../state/garment-warmth';
import '../../styles/feedback.css';

const sign = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '±');
const points = (v: number) => `${sign(v)}${Math.abs(v)}`;
const plural = (n: number) => `${n} rating${n === 1 ? '' : 's'}`;

interface Row {
  key: string;
  name: string;
  sub: string;
  value: number;
}

function garmentRows(map: Record<string, number>): Row[] {
  const rows: Row[] = [];
  for (const [key, value] of Object.entries(map)) {
    if (key === LAYERS_KEY) {
      rows.push({ key, name: 'Fewer layers', sub: 'From “Too many layers”', value });
      continue;
    }
    const g = parseGarmentKey(key);
    if (!g) continue;
    rows.push({ key, name: garmentLabel(g.category, g.thickness), sub: value > 0 ? 'Warmer than its thickness' : 'Cooler than its thickness', value });
  }
  return rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.name.localeCompare(b.name));
}

/** Everything feedback has changed, in one place, each piece reversible (US-039). */
export function LearnedSection() {
  const temp = settings.value.units.temp;
  const today = localToday();
  const all = ratings.value;
  const votes = temperatureVotes(all).length;
  const science = engineOf(settings.value) === 'science';
  const overall = learnOffset(all, today);
  const perActivity = activityOffsets(all, today);
  const rows = garmentRows(garmentWarmth.value);
  const degrees = (c: number) => {
    const v = tempDelta(c, temp);
    return `${sign(v)}${Math.abs(v)}°`;
  };

  return (
    <>
      <h2 class="group-title" id="learned-title">What Layered has learned</h2>
      <section class="group" aria-labelledby="learned-title">
        {science ? <LearnedCard /> : <>
        <div class="row-item plain learned-row">
          <span class="grow">Overall<span class="sub">{votes ? `From ${plural(votes)}` : 'No ratings yet'}</span></span>
          <span class="meta num">{degrees(overall)}</span>
        </div>
        {perActivity.map((a) => (
          <div class="row-item plain learned-row" key={a.activity}>
            <span class="grow">{ACTIVITY_LABEL[a.activity]}<span class="sub">From {plural(a.count)}</span></span>
            <span class="meta num">{degrees(a.offset)}</span>
          </div>
        ))}
        </>}
      </section>
      <h3 class="group-title" id="learned-garments">Garments</h3>
      {rows.length ? (
        <ul class="group" aria-labelledby="learned-garments" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((r) => (
            <li class="row-item plain learned-row" key={r.key}>
              <span class="grow">{r.name}<span class="sub">{r.sub}</span></span>
              <span class="meta num">{points(r.value)}</span>
              <button
                type="button"
                class="text-btn"
                aria-label={`Reset ${r.name}`}
                onClick={() => {
                  ratings.value = forgetGarment(ratings.value, r.key);
                  toast(`${r.name} reset`);
                }}
              >
                Reset
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p class="small-print" style={{ margin: '0 4px' }}>Nothing yet. After rating a day, mark any piece that felt too warm or too cool.</p>
      )}
      <p class="small-print" style={{ margin: '8px 4px 0' }}>
        A garment changes only after two marks that agree, and never by more than one thickness step.{' '}
        {science ? 'Resetting temperature learning keeps your garment marks.' : 'Temperature learning resets under How you run.'}
      </p>
      {rows.length ? (
        <button
          type="button"
          class="text-btn"
          style={{ marginTop: '4px' }}
          onClick={() => {
            ratings.value = forgetAllGarments(ratings.value);
            toast('Garment learning reset');
          }}
        >
          Reset all garments
        </button>
      ) : null}
    </>
  );
}

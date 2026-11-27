// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import '../../styles/record.css';
import { useState } from 'preact/hooks';
import { ACTIVITY_LABEL } from '../../engine/activity';
import { BANDS } from '../../engine/bands';
import { percent, trackRecord, type Group, type Issue, type Tally, type TrackRecord, type Trend } from '../../engine/track-record';
import type { BandId } from '../../engine/types';
import { longDate } from '../../data/format';
import { history, type DayRecord } from '../../data/store';
import { localDate } from '../../state/history';
import { Sheet } from '../../components/Sheet';
import { toast } from '../../components/Toast';

/** Short names so the chart's labels fit a phone. */
const BAND_NAME: Record<BandId, string> = {
  tshirt: 'T-shirt',
  light: 'Light layer',
  two: 'Two layers',
  jacket: 'Jacket',
  coat: 'Coat',
  bundle: 'Bundle up',
};

const VERDICT = Object.fromEntries(BANDS.map((b) => [b.id, b.verdict])) as Record<string, string>;

const RATING_TEXT = { '-1': 'Too cold', '0': 'Just right', '1': 'Too warm' } as const;

const ISSUE_TEXT: Record<Issue, { name: string; detail: string; count: (n: number) => string }> = {
  'no-forecast': { name: 'No forecast', detail: 'The forecast didn’t load, so there was no advice.', count: (n) => `${days(n)} without a forecast` },
  'engine-error': { name: 'Advice failed', detail: 'Something broke while working out the advice.', count: (n) => `${days(n)} where the advice failed` },
  'incomplete-inventory': { name: 'Wardrobe gaps', detail: 'The advice named clothes your wardrobe doesn’t have.', count: (n) => `${days(n)} with wardrobe gaps` },
};

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

const TREND_TEXT: Record<Trend, (prev: Tally) => string> = {
  better: (p) => `Better than the fortnight before, when it was ${percent(p.rate ?? 0)}.`,
  worse: (p) => `Down on the fortnight before, when it was ${percent(p.rate ?? 0)}.`,
  steady: () => 'About the same as the fortnight before.',
  'too-few': () => 'Rate a few more days to see a trend.',
};

function Headline({ t }: { t: TrackRecord }) {
  if (t.overall.rate === null) {
    return (
      <div class="card record-head">
        <p class="record-rate">No rated days yet</p>
        <p class="record-note">From 6pm, Today asks how your outfit felt. Your record builds from those answers.</p>
      </div>
    );
  }
  return (
    <div class="card record-head">
      <p class="record-rate">
        You rated <strong>{percent(t.overall.rate)}</strong> of days just right
      </p>
      <p class="record-note">
        {t.overall.justRight} of {days(t.overall.rated)} rated. {TREND_TEXT[t.trend](t.previous)}
      </p>
    </div>
  );
}

// Fixed geometry in viewBox units; the SVG scales to the card's width.
const W = 320;
const LABEL_W = 88;
const VALUE_W = 56;
const ROW = 32;
const BAR = 16;

function barPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w);
  // Square at the baseline, rounded at the data end.
  return `M${x},${y}H${x + w - rr}A${rr},${rr} 0 0 1 ${x + w},${y + rr}V${y + h - rr}A${rr},${rr} 0 0 1 ${x + w - rr},${y + h}H${x}Z`;
}

function BandChart({ groups }: { groups: Group<BandId>[] }) {
  const rows = groups.filter((g) => g.rated > 0);
  if (!rows.length) return null;
  const track = W - LABEL_W - VALUE_W;
  const summary = rows.map((g) => `${BAND_NAME[g.key]}: ${g.justRight} of ${g.rated} just right`).join('; ');
  return (
    <figure class="card record-chart">
      <figcaption id="record-chart-title">Just right, by weather</figcaption>
      <svg viewBox={`0 0 ${W} ${rows.length * ROW}`} role="img" aria-labelledby="record-chart-title" aria-describedby="record-chart-desc">
        <desc id="record-chart-desc">{summary}.</desc>
        {rows.map((g, i) => {
          const y = i * ROW + (ROW - BAR) / 2;
          const w = (g.rate ?? 0) * track;
          return (
            <g key={g.key} class="record-bar">
              <title>{`${BAND_NAME[g.key]}: ${percent(g.rate ?? 0)} just right, ${g.justRight} of ${g.rated}`}</title>
              <text x={0} y={y + BAR / 2} dominant-baseline="central" class="record-axis">{BAND_NAME[g.key]}</text>
              <rect x={LABEL_W} y={y} width={track} height={BAR} rx={4} class="record-track" />
              {w > 0 && <path d={barPath(LABEL_W, y, w, BAR, 4)} class="record-fill" />}
              <text x={W} y={y + BAR / 2} dominant-baseline="central" text-anchor="end" class="record-value">
                {g.justRight} of {g.rated}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function BreakdownTable<K extends string>({ id, caption, head, groups, name }: { id: string; caption: string; head: string; groups: Group<K>[]; name: (k: K) => string }) {
  const cell = (n: number, g: Group<K>) => (g.rated ? n : '–');
  return (
    <div class="record-table" role="region" aria-labelledby={id} tabIndex={0}>
      <table>
        <caption id={id}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{head}</th>
            <th scope="col">Days</th>
            <th scope="col">Just right</th>
            <th scope="col">Too cold</th>
            <th scope="col">Too warm</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.key}>
              <th scope="row">{name(g.key)}</th>
              <td>{g.days}</td>
              <td>{g.rated ? `${g.justRight} (${percent(g.rate ?? 0)})` : '–'}</td>
              <td>{cell(g.tooCold, g)}</td>
              <td>{cell(g.tooWarm, g)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const RECENT = 7;

function DayItem({ r }: { r: DayRecord }) {
  const verdict = r.band ? VERDICT[r.band] ?? r.band : ISSUE_TEXT[r.issue ?? 'no-forecast'].name;
  return (
    <li class="row-item plain">
      <span class="grow">
        {longDate(r.date)}
        <span class="sub">{verdict} · {ACTIVITY_LABEL[r.activity]}</span>
      </span>
      <span class="meta">{r.rating === undefined ? 'Not rated' : RATING_TEXT[r.rating]}</span>
    </li>
  );
}

function RecentDays({ list }: { list: DayRecord[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, RECENT);
  return (
    <>
      <h3 class="record-sub" id="record-days">Recent days</h3>
      <ul class="group record-list" aria-labelledby="record-days">
        {shown.map((r) => <DayItem key={`${r.date}:${r.activity}`} r={r} />)}
      </ul>
      {list.length > RECENT && (
        <button type="button" class="btn secondary record-more" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${list.length}`}
        </button>
      )}
    </>
  );
}

function Issues({ t, list }: { t: TrackRecord; list: DayRecord[] }) {
  const flagged = list.filter((r) => r.issue);
  const counts = (Object.keys(ISSUE_TEXT) as Issue[]).filter((k) => t.issues[k]).map((k) => ISSUE_TEXT[k].count(t.issues[k]));
  return (
    <>
      <h3 class="record-sub" id="record-issues">Problems</h3>
      {flagged.length ? (
        <>
          <p class="record-note record-pad">{counts.join(', ').replace(/^./, (c) => c.toUpperCase())}.</p>
          <ul class="group record-list" aria-labelledby="record-issues">
            {flagged.map((r) => (
              <li class="row-item plain" key={`${r.date}:${r.activity}`}>
                <span class="grow">
                  {ISSUE_TEXT[r.issue!].name}
                  <span class="sub">{ISSUE_TEXT[r.issue!].detail}</span>
                </span>
                <span class="meta">{longDate(r.date)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p class="record-note record-pad">No problems recorded.</p>
      )}
    </>
  );
}

export function RecordSection() {
  const list = history.value;
  const [confirming, setConfirming] = useState(false);
  const t = trackRecord(list, localDate());

  return (
    <section aria-labelledby="record-title">
      <h2 class="group-title" id="record-title">Your record</h2>
      <Headline t={t} />
      {list.length > 0 && (
        <>
          <BandChart groups={t.byBand} />
          <BreakdownTable id="record-by-band" caption="By weather" head="Weather" groups={t.byBand} name={(k) => BAND_NAME[k]} />
          <BreakdownTable id="record-by-activity" caption="By activity" head="Activity" groups={t.byActivity} name={(k) => ACTIVITY_LABEL[k]} />
          <RecentDays list={list} />
          <Issues t={t} list={list} />
          <div class="group">
            <button type="button" class="row-item plain" onClick={() => setConfirming(true)}>
              <span class="grow record-danger">Clear history</span>
            </button>
          </div>
        </>
      )}
      <p class="group-foot">Kept on this device for 60 days. It only leaves with your export or sync.</p>

      <Sheet open={confirming} title="Clear history?" onClose={() => setConfirming(false)}>
        <p>This deletes {days(new Set(list.map((r) => r.date)).size)} of history from this device. Your ratings, and what Layered has learned from them, are kept.</p>
        <div class="sheet-actions">
          <button type="button" class="btn secondary" onClick={() => setConfirming(false)}>Cancel</button>
          <button
            type="button"
            class="btn danger"
            onClick={() => {
              history.value = [];
              setConfirming(false);
              toast('History cleared');
            }}
          >
            Clear history
          </button>
        </div>
      </Sheet>
    </section>
  );
}

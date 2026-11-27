// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { useEffect, useRef, useState } from 'preact/hooks';
import { ACTIVITIES, ACTIVITY_LABEL, EFFORTS, EFFORT_LABEL, scalesWithEffort } from '../engine/activity';
import type { LegsAdvice } from '../engine/routines';
import { localNow, type TimeFormatter } from '../engine/time';
import type { Activity, Effort } from '../engine/types';
import { longDate, timeFmt, weekday } from '../data/format';
import { fmtTemp, type TempUnit } from '../data/units';
import { patchSettings, routines, settings } from '../data/store';
import { currentPlace, forecastState, loadForecast } from '../state/forecast';
import { DayView } from './DayView';
import { AirChips, FeedbackCard, HeadsUps } from '../components/TodayExtras';
import { planDay } from '../state/advice';
import { outForAfter, type Swap } from '../state/out-for';
import { ratings, inventory, comfort } from '../data/store';
import { TitleBar } from '../components/TitleBar';
import { PlaceSheet, placeLabel } from '../components/PlaceSheet';
import { Segmented } from '../components/Segmented';
import { Chevron } from '../components/Marks';
import { toast } from '../components/Toast';
import { haptic } from '../components/haptics';
import { SharePoster } from '../components/SharePoster';

const DURATIONS = [2, 5, 10].map((h) => ({ value: h, label: `${h} h` }));
const SECRET_TAPS = 7;
const EFFORT_OPTIONS = EFFORTS.map((e) => ({ value: e, label: EFFORT_LABEL[e] }));

/** Today's routines and commute legs, each with its own reading (US-066). */
function PlanLegs({ legs, fmt, unit }: { legs: LegsAdvice; fmt: TimeFormatter; unit: TempUnit }) {
  return (
    <>
      <ul class="group" aria-label="Today’s plans" style={{ listStyle: 'none', padding: 0 }}>
        {legs.legs.map(({ leg, advice, coldest }) => (
          <li class="row-item plain" key={leg.id}>
            <span class="grow">
              {leg.label} · {fmt(leg.start ?? leg.hours[0].time)}
              <span class="sub">
                {advice.verdict} · {ACTIVITY_LABEL[leg.activity]}
                {leg.effort && scalesWithEffort(leg.activity) ? `, ${EFFORT_LABEL[leg.effort].toLowerCase()}` : ''}
                {coldest && legs.legs.length > 1 ? ' · coldest' : ''}
              </span>
            </span>
            <span class="num">feels {fmtTemp(advice.minFeels, unit)}</span>
          </li>
        ))}
      </ul>
      {legs.notes.length > 0 && (
        <ul class="card" style={{ listStyle: 'none', paddingLeft: '16px' }} aria-label="Plan notes">
          {legs.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </>
  );
}

export function Today() {
  const s = settings.value;
  const place = currentPlace.value;
  const st = forecastState.value;
  const [placesOpen, setPlacesOpen] = useState(false);
  const [activity, setActivity] = useState<Activity>(s.activity);
  const [effort, setEffort] = useState<Effort>('steady');
  const [duration, setDuration] = useState(s.duration);
  const taps = useRef({ n: 0, t: 0 });
  const swap = useRef<Swap | null>(null);
  const pickActivity = (a: Activity) => {
    const next = outForAfter(a, { duration, swap: swap.current });
    swap.current = next.swap;
    setDuration(next.duration);
    setActivity(a);
  };
  const pickDuration = (h: number) => {
    swap.current = null;
    setDuration(h);
  };

  useEffect(() => {
    void loadForecast();
  }, [place?.id, place?.lat, place?.lon]);

  const onCircleTap = () => {
    const now = Date.now();
    taps.current = now - taps.current.t < 1500 ? { n: taps.current.n + 1, t: now } : { n: 1, t: now };
    if (taps.current.n === SECRET_TAPS) {
      taps.current.n = 0;
      haptic(20);
      toast('layered · torrentsec · ●■▲');
    }
  };

  const title = place ? placeLabel(place) : 'Layered';
  const f = st.forecast;
  const now = f ? localNow(f.utcOffsetSeconds) : '';
  const date = now.slice(0, 10);
  const fmt = timeFmt(s.units.clock);
  const commuteDay = s.commute.enabled && date && s.commute.days.includes(weekday(date));
  const dayEffort = scalesWithEffort(activity) ? effort : undefined;
  const plan = f
    ? planDay(f, date, { settings: s, ratings: ratings.value, inventory: inventory.value, comfort: comfort.value, activity, effort: dayEffort, duration, routines: routines.value })
    : null;

  return (
    <>
      <TitleBar
        short={title}
        action={place && f ? <SharePoster forecast={f} date={date} place={title} activity={activity} duration={duration} effort={dayEffort} /> : undefined}
        title={
          <button type="button" class="place-btn" onClick={() => setPlacesOpen(true)} aria-label={`Place: ${title}. Change place`}>
            <span>{title}</span>
            <Chevron />
          </button>
        }
        subtitle={
          f ? (
            <>
              {longDate(date)}
              <br />
              {(() => {
                const at = fmt(localNow(f.utcOffsetSeconds, f.fetchedAt));
                const via = f.source === 'met-norway' ? ' · via MET Norway' : '';
                return st.stale ? <span class="stale">Offline · Last updated {at}{via}</span> : <span>Updated {at}{via}</span>;
              })()}
            </>
          ) : undefined
        }
      />
      <main>
        {!place && (
          <div class="empty">
            <h2>Where are you?</h2>
            <p>Layered needs a place to read the forecast for.</p>
            <button type="button" class="btn" onClick={() => setPlacesOpen(true)}>Choose a place</button>
          </div>
        )}
        {place && st.status === 'loading' && !f && <p class="empty" aria-live="polite">Reading the sky…</p>}
        {place && st.status === 'error' && (
          <div class="empty" role="alert">
            <h2>No forecast</h2>
            <p>{st.error}</p>
            <button type="button" class="btn" onClick={() => void loadForecast(true)}>Try again</button>
          </div>
        )}
        {place && f && (
          <DayView
            forecast={f}
            date={date}
            activity={activity}
            effort={dayEffort}
            duration={duration}
            routines={routines.value}
            onCircleTap={onCircleTap}
            footer={
              <>
                <AirChips lat={place.lat} lon={place.lon} date={date} />
                <HeadsUps hours={f.hours.filter((h) => h.time.slice(0, 13) >= now.slice(0, 13)).slice(0, 24)} units={s.units} />
                {plan ? <FeedbackCard now={now} advice={plan.advice} activity={activity} /> : null}
              </>
            }
            controls={
              <section aria-label="Your plans" style={{ margin: '16px 0' }}>
                {plan?.legs && <PlanLegs legs={plan.legs} fmt={fmt} unit={s.units.temp} />}
                <h2 class="group-title" style={{ marginTop: plan?.legs ? undefined : 0 }}>Activity</h2>
                <div class="pick" role="group" aria-label="Activity">
                  {ACTIVITIES.map((a) => (
                    <button
                      type="button"
                      key={a}
                      aria-pressed={a === activity}
                      onClick={() => {
                        haptic();
                        pickActivity(a);
                      }}
                    >
                      {ACTIVITY_LABEL[a]}
                    </button>
                  ))}
                </div>
                {scalesWithEffort(activity) && (
                  <>
                    <h2 class="group-title">Effort</h2>
                    <Segmented label="Effort" value={effort} options={EFFORT_OPTIONS} onChange={setEffort} />
                  </>
                )}
                {!commuteDay && (
                  <>
                    <h2 class="group-title">Out for</h2>
                    <Segmented label="Out for" value={duration} options={DURATIONS} onChange={pickDuration} />
                  </>
                )}
                <div class="group" style={{ marginTop: '16px' }}>
                  <label class="row-item plain">
                    <span class="grow">Commute mode{commuteDay ? <span class="sub">Out {s.commute.out} · back {s.commute.back}</span> : null}</span>
                    <input
                      type="checkbox"
                      class="check"
                      checked={s.commute.enabled}
                      onChange={(e) => patchSettings({ commute: { ...s.commute, enabled: e.currentTarget.checked } })}
                    />
                  </label>
                  {s.commute.enabled && (
                    <>
                      <label class="row-item plain">
                        <span class="grow">Leave</span>
                        <input type="time" value={s.commute.out} onChange={(e) => patchSettings({ commute: { ...s.commute, out: e.currentTarget.value || s.commute.out } })} />
                      </label>
                      <label class="row-item plain">
                        <span class="grow">Head home</span>
                        <input type="time" value={s.commute.back} onChange={(e) => patchSettings({ commute: { ...s.commute, back: e.currentTarget.value || s.commute.back } })} />
                      </label>
                      {!commuteDay && <p class="small-print" style={{ padding: '0 16px 12px', margin: 0 }}>Not a commute day. Pick days in Settings.</p>}
                    </>
                  )}
                </div>
              </section>
            }
          />
        )}
      </main>
      <PlaceSheet open={placesOpen} onClose={() => setPlacesOpen(false)} />
    </>
  );
}

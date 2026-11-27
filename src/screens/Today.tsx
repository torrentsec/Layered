// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { useEffect, useRef, useState } from 'preact/hooks';
import { ACTIVITIES, ACTIVITY_LABEL } from '../engine/activity';
import { localNow } from '../engine/time';
import type { Activity } from '../engine/types';
import { longDate, timeFmt, weekday } from '../data/format';
import { patchSettings, settings } from '../data/store';
import { currentPlace, forecastState, loadForecast } from '../state/forecast';
import { DayView } from './DayView';
import { AirChips, FeedbackCard, HeadsUps } from '../components/TodayExtras';
import { planDay } from '../state/advice';
import { ratings, wardrobe } from '../data/store';
import { TitleBar } from '../components/TitleBar';
import { PlaceSheet, placeLabel } from '../components/PlaceSheet';
import { Segmented } from '../components/Segmented';
import { Chevron } from '../components/Marks';
import { toast } from '../components/Toast';
import { haptic } from '../components/haptics';
import { SharePoster } from '../components/SharePoster';

const DURATIONS = [2, 5, 10].map((h) => ({ value: h, label: `${h} h` }));
const SECRET_TAPS = 7;

export function Today() {
  const s = settings.value;
  const place = currentPlace.value;
  const st = forecastState.value;
  const [placesOpen, setPlacesOpen] = useState(false);
  const [activity, setActivity] = useState<Activity>(s.activity);
  const [duration, setDuration] = useState(s.duration);
  const taps = useRef({ n: 0, t: 0 });

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

  return (
    <>
      <TitleBar
        short={title}
        action={place && f ? <SharePoster forecast={f} date={date} place={title} activity={activity} duration={duration} /> : undefined}
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
              {st.stale && (
                <>
                  <br />
                  <span class="stale">Offline · Last updated {fmt(new Date(f.fetchedAt + f.utcOffsetSeconds * 1000).toISOString().slice(0, 16))}</span>
                </>
              )}
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
            duration={duration}
            onCircleTap={onCircleTap}
            footer={
              <>
                <AirChips lat={place.lat} lon={place.lon} date={date} />
                <HeadsUps hours={f.hours.filter((h) => h.time.slice(0, 13) >= now.slice(0, 13)).slice(0, 24)} units={s.units} />
                {(() => {
                  const plan = planDay(f, date, { settings: s, ratings: ratings.value, wardrobe: wardrobe.value, activity, duration });
                  return plan ? <FeedbackCard now={now} advice={plan.advice} activity={activity} /> : null;
                })()}
              </>
            }
            controls={
              <section aria-label="Your plans" style={{ margin: '16px 0' }}>
                <h2 class="group-title" style={{ marginTop: 0 }}>Activity</h2>
                <div class="pick" role="group" aria-label="Activity">
                  {ACTIVITIES.map((a) => (
                    <button
                      type="button"
                      key={a}
                      aria-pressed={a === activity}
                      onClick={() => {
                        haptic();
                        setActivity(a);
                      }}
                    >
                      {ACTIVITY_LABEL[a]}
                    </button>
                  ))}
                </div>
                {!commuteDay && (
                  <>
                    <h2 class="group-title">Out for</h2>
                    <Segmented label="Out for" value={duration} options={DURATIONS} onChange={setDuration} />
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

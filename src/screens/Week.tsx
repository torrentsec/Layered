// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { useEffect, useRef } from 'preact/hooks';
import { localNow } from '../engine/time';
import { fmtTemp } from '../data/units';
import { dayLabel, daysBetween, longDate } from '../data/format';
import { CERTAINTY_LABEL, certaintyFor } from '../engine/certainty';
import { ratings, settings, inventory, comfort } from '../data/store';
import { currentPlace, forecastState, loadForecast } from '../state/forecast';
import { planDay } from '../state/advice';
import { go, href, route } from '../router';
import { DayView } from './DayView';
import { outerText } from '../data/advice-text';
import { TitleBar } from '../components/TitleBar';
import { MiniMark } from '../components/Marks';
import { placeLabel } from '../components/PlaceSheet';

export function Week() {
  const place = currentPlace.value;
  const st = forecastState.value;
  const f = st.forecast;
  const selected = route.value.param;

  useEffect(() => {
    void loadForecast();
  }, [place?.id]);

  if (!place || !f) {
    return (
      <>
        <TitleBar short="Week" title="Week" />
        <main class="empty">
          {st.status === 'error' ? <p role="alert">{st.error}</p> : !place ? <p>Choose a place on Today first.</p> : <p aria-live="polite">Reading the sky…</p>}
        </main>
      </>
    );
  }

  const today = localNow(f.utcOffsetSeconds).slice(0, 10);
  const days = f.days.filter((d) => d.date >= today);
  if (selected) return <DaySwiper dates={days.map((d) => d.date)} selected={selected} today={today} />;

  const s = settings.value;
  const u = s.units;
  const tomorrow = days[1];

  return (
    <>
      <TitleBar short="Week" title="Week" subtitle={placeLabel(place)} />
      <main>
        {tomorrow && <TomorrowCard date={tomorrow.date} />}
        <h2 class="group-title">Next {days.length} days</h2>
        <ul class="group days" style={{ listStyle: 'none', padding: 0 }}>
          {days.map((d) => {
            const plan = planDay(f, d.date, { settings: s, ratings: ratings.value, inventory: inventory.value, comfort: comfort.value });
            const marker = CERTAINTY_LABEL[certaintyFor(daysBetween(today, d.date), plan?.advice.hours ?? [])];
            return (
              <li key={d.date}>
                <a class="row-item day-row" href={href('week', d.date)} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <MiniMark feels={plan?.advice.effective ?? d.feelsMin} rain={d.precipProbMax} />
                  <span class="grow">
                    <strong>{dayLabel(d.date, today)}</strong>
                    <span class="sub">{plan ? [plan.advice.verdict, outerText(plan.advice.layers)].filter(Boolean).join(' · ') : '—'}{d.precipProbMax >= 30 ? ` · ${Math.round(d.precipProbMax)}% rain` : ''}
                      {marker && <> · <span class="certainty">{marker}</span></>}
                    </span>
                  </span>
                  <span class="range num">
                    <span class="visually-hidden">Feels </span>
                    {fmtTemp(d.feelsMin, u.temp)} <span style={{ color: 'var(--ink-2)' }} aria-hidden="true">/</span>
                    <span class="visually-hidden"> to </span> {fmtTemp(d.feelsMax, u.temp)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
        <p class="group-foot">Verdicts use your default {s.commute.enabled ? 'commute' : 'activity'} from Settings.</p>
      </main>
    </>
  );
}

function TomorrowCard({ date }: { date: string }) {
  const f = forecastState.value.forecast!;
  const plan = planDay(f, date, { settings: settings.value, ratings: ratings.value, inventory: inventory.value, comfort: comfort.value });
  if (!plan) return null;
  const layers = plan.advice.layers.filter((l) => !l.optional).map((l) => (l.nickname ? `Your ${l.nickname}` : l.label));
  const extras = plan.advice.extras.filter((e) => e.tone === 'rain' || e.tone === 'cold').map((e) => e.label.toLowerCase());
  return (
    <a class="card" href={href('week', date)} style={{ display: 'block', color: 'inherit', textDecoration: 'none', borderLeft: '6px solid var(--yellow)' }}>
      <span class="small-print">Tomorrow</span>
      <h2 style={{ fontSize: '22px', margin: '2px 0' }}>{plan.advice.verdict}</h2>
      <p style={{ margin: 0, color: 'var(--ink-2)' }}>
        {[layers.join(', '), extras.join(', ')].filter(Boolean).join(' · ')}
      </p>
    </a>
  );
}

/** Full Today-style views side by side; swipe or use the arrows to move between days. */
function DaySwiper({ dates, selected, today }: { dates: string[]; selected: string; today: string }) {
  const ref = useRef<HTMLElement>(null);
  const f = forecastState.value.forecast!;
  const idx = Math.max(0, dates.indexOf(selected));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    // Update the URL once a swipe settles, so Back returns to the list, not each day.
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const i = Math.round(el.scrollLeft / el.clientWidth);
        const d = dates[i];
        if (d && d !== route.value.param) history.replaceState(null, '', href('week', d));
        if (d) route.value = { tab: 'week', param: d };
      }, 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [dates]);

  const step = (n: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: n * el.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  return (
    <>
      <TitleBar
        short={dayLabel(selected, today)}
        title={dayLabel(selected, today)}
        subtitle={longDate(selected)}
        action={
          <span style={{ display: 'flex', gap: '8px' }}>
            <button type="button" class="text-btn" onClick={() => go('week')}>All days</button>
            <button type="button" class="icon-btn" aria-label="Previous day" disabled={idx === 0} onClick={() => step(-1)}>‹</button>
            <button type="button" class="icon-btn" aria-label="Next day" disabled={idx === dates.length - 1} onClick={() => step(1)}>›</button>
          </span>
        }
      />
      <main class="swiper" ref={ref} aria-label="Days">
        {dates.map((d, i) => (
          // Off-screen neighbours are inert, so Tab and screen readers stay on the day shown.
          <section key={d} aria-label={longDate(d)} inert={i !== idx}>
            {/* Only render the neighbours; sixteen full day views would be wasted work. */}
            {Math.abs(dates.indexOf(d) - idx) <= 1 ? <DayView forecast={f} date={d} /> : <div style={{ minHeight: '100dvh' }} />}
          </section>
        ))}
      </main>
    </>
  );
}

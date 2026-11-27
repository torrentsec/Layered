// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { useEffect, useState } from 'preact/hooks';
import { ACTIVITIES, ACTIVITY_LABEL } from '../engine/activity';
import { packingText } from '../engine/packing';
import type { Activity } from '../engine/types';
import { addDays, dayLabel, longDate } from '../data/format';
import { ratings, settings, trips, uid, inventory, comfort, type Trip as TripT, type TripStop } from '../data/store';
import { orderedStops, planTrip, type TripPlan } from '../data/trip';
import { fmtTemp } from '../data/units';
import { go, href, route } from '../router';
import { TitleBar } from '../components/TitleBar';
import { Sheet } from '../components/Sheet';
import { PlaceSearch } from '../components/PlaceSheet';
import { LayerMark, MiniMark } from '../components/Marks';
import { toast } from '../components/Toast';
import { haptic } from '../components/haptics';

const todayIso = () => new Date().toISOString().slice(0, 10);

function tripRange(t: TripT): string {
  const s = orderedStops(t.stops);
  if (!s.length) return 'No stops yet';
  return `${longDate(s[0].start)} – ${longDate(s.at(-1)!.end)}`;
}

export function Trip() {
  const id = route.value.param;
  const [editing, setEditing] = useState<TripT | null>(null);
  const trip = id ? trips.value.find((t) => t.id === id) : undefined;

  const newTrip = () => setEditing({ id: uid(), name: '', stops: [], activities: ['walking'], checked: {}, createdAt: Date.now() });
  const save = (t: TripT) => {
    const exists = trips.value.some((x) => x.id === t.id);
    trips.value = exists ? trips.value.map((x) => (x.id === t.id ? t : x)) : [...trips.value, t];
    setEditing(null);
    go('trip', t.id);
  };
  const remove = (t: TripT) => {
    if (!confirm(`Delete “${t.name || 'this trip'}”?`)) return;
    trips.value = trips.value.filter((x) => x.id !== t.id);
    setEditing(null);
    go('trip');
  };

  return (
    <>
      {trip ? (
        <TripDetail trip={trip} onEdit={() => setEditing(trip)} />
      ) : (
        <>
          <TitleBar short="Trips" title="Trips" action={<button type="button" class="text-btn" onClick={newTrip}>New trip</button>} />
          <main>
            {trips.value.length === 0 ? (
              <div class="empty">
                <h2>Pack for where you’re going</h2>
                <p>Add one or more destinations with dates. Layered works out what each day needs and totals it into one packing list.</p>
                <button type="button" class="btn" onClick={newTrip}>Plan a trip</button>
              </div>
            ) : (
              <ul class="group" style={{ listStyle: 'none', padding: 0 }}>
                {[...trips.value].sort((a, b) => (orderedStops(a.stops)[0]?.start ?? '').localeCompare(orderedStops(b.stops)[0]?.start ?? '')).map((t) => (
                  <li key={t.id}>
                    <a class="row-item" href={href('trip', t.id)} style={{ color: 'inherit', textDecoration: 'none' }}>
                      <LayerMark kind="outer" />
                      <span class="grow">
                        <strong>{t.name || orderedStops(t.stops).map((s) => s.place.name).join(' → ') || 'Untitled trip'}</strong>
                        <span class="sub">{tripRange(t)}</span>
                      </span>
                      <span class="meta">›</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </main>
        </>
      )}
      {editing && <TripEditor initial={editing} onSave={save} onDelete={trips.value.some((t) => t.id === editing.id) ? () => remove(editing) : undefined} onClose={() => setEditing(null)} />}
    </>
  );
}

function TripEditor({ initial, onSave, onDelete, onClose }: { initial: TripT; onSave: (t: TripT) => void; onDelete?: () => void; onClose: () => void }) {
  const [t, setT] = useState<TripT>(initial);
  const [adding, setAdding] = useState(initial.stops.length === 0);
  const stops = orderedStops(t.stops);
  const setStop = (id: string, p: Partial<TripStop>) =>
    setT({
      ...t,
      stops: t.stops.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...p };
        // Keep the range valid while someone is still typing dates.
        if (next.end < next.start) next.end = next.start;
        return next;
      }),
    });
  const valid = t.stops.length > 0;

  return (
    <Sheet open title={initial.name ? 'Edit trip' : 'New trip'} onClose={onClose}>
      <label class="field">
        <span>Name (optional)</span>
        <input type="text" value={t.name} placeholder={stops.map((s) => s.place.name).join(' → ') || 'Summer in Portugal'} onInput={(e) => setT({ ...t, name: e.currentTarget.value })} />
      </label>

      <h2 class="group-title" style={{ margin: '16px 0 8px' }}>Destinations</h2>
      {stops.map((s, i) => (
        <div class="card" key={s.id} style={{ background: 'var(--paper)', margin: '8px 0' }}>
          <div class="row-item plain" style={{ padding: 0, minHeight: '32px' }}>
            <span class="grow"><strong>{i + 1}. {s.place.name}</strong><span class="sub">{s.place.detail}</span></span>
            <button type="button" class="icon-btn" aria-label={`Remove ${s.place.name}`} onClick={() => setT({ ...t, stops: t.stops.filter((x) => x.id !== s.id) })}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '8px' }}>
            <label class="field" style={{ margin: '8px 0 0' }}>
              <span>Arrive</span>
              <input type="date" value={s.start} min={todayIso()} onChange={(e) => e.currentTarget.value && setStop(s.id, { start: e.currentTarget.value })} />
            </label>
            <label class="field" style={{ margin: '8px 0 0' }}>
              <span>Leave</span>
              <input type="date" value={s.end} min={s.start} onChange={(e) => e.currentTarget.value && setStop(s.id, { end: e.currentTarget.value })} />
            </label>
          </div>
        </div>
      ))}
      {adding ? (
        <PlaceSearch
          label={stops.length ? 'Next destination' : 'Where are you going?'}
          onPick={(p) => {
            const start = stops.length ? addDays(stops.at(-1)!.end, 1) : addDays(todayIso(), 1);
            setT({ ...t, stops: [...t.stops, { id: uid(), place: p, start, end: addDays(start, 2) }] });
            setAdding(false);
            haptic();
          }}
        />
      ) : (
        <button type="button" class="btn secondary wide" onClick={() => setAdding(true)}>Add a destination</button>
      )}

      <h2 class="group-title" style={{ margin: '20px 0 8px' }}>You’ll be</h2>
      <div class="pick" role="group" aria-label="Activities" style={{ flexWrap: 'wrap', margin: 0, padding: 0 }}>
        {ACTIVITIES.map((a: Activity) => (
          <button
            type="button"
            key={a}
            aria-pressed={t.activities.includes(a)}
            onClick={() => setT({ ...t, activities: t.activities.includes(a) ? t.activities.filter((x) => x !== a) : [...t.activities, a] })}
          >
            {ACTIVITY_LABEL[a]}
          </button>
        ))}
      </div>

      <div class="sheet-actions">
        {onDelete && <button type="button" class="btn danger" onClick={onDelete} style={{ marginRight: 'auto' }}>Delete</button>}
        <button type="button" class="btn secondary" onClick={onClose}>Cancel</button>
        <button type="button" class="btn" disabled={!valid} onClick={() => onSave(t)}>Save</button>
      </div>
    </Sheet>
  );
}

function TripDetail({ trip, onEdit }: { trip: TripT; onEdit: () => void }) {
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [failed, setFailed] = useState(false);
  const s = settings.value;
  const u = s.units;
  const title = trip.name || orderedStops(trip.stops).map((x) => x.place.name).join(' → ') || 'Trip';
  const sig = JSON.stringify([trip.stops, trip.activities, s.manualOffset]);

  useEffect(() => {
    let live = true;
    setFailed(false);
    planTrip({ ...trip, stops: orderedStops(trip.stops) }, { manualOffset: s.manualOffset, ratings: ratings.value, inventory: inventory.value, comfort: comfort.value, today: todayIso() })
      .then((p) => live && setPlan(p))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [sig]);

  const toggle = (id: string) => {
    haptic();
    trips.value = trips.value.map((t) => (t.id === trip.id ? { ...t, checked: { ...t.checked, [id]: !t.checked[id] } } : t));
  };

  const share = async () => {
    if (!plan) return;
    const text = packingText(`Packing for ${title}`, plan.packing, trip.checked);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Packing for ${title}`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast('Packing list copied');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('Couldn’t share the list');
    }
  };

  const ticked = plan ? plan.packing.filter((i) => trip.checked[i.id]).length : 0;

  return (
    <>
      <TitleBar
        short={title}
        title={title}
        subtitle={tripRange(trip)}
        action={
          <span style={{ display: 'flex', gap: '4px' }}>
            <button type="button" class="text-btn" onClick={() => go('trip')}>Trips</button>
            <button type="button" class="text-btn" onClick={onEdit}>Edit</button>
          </span>
        }
      />
      <main>
        {failed && <p class="empty" role="alert">Couldn’t reach the weather service. Check your connection and try again.</p>}
        {!plan && !failed && <p class="empty" aria-live="polite">Checking the weather at each stop…</p>}
        {plan && (
          <>
            {plan.stops.map(({ stop, days, error }) => {
              const typical = days.some((d) => d.source === 'typical');
              return (
                <section key={stop.id} aria-label={stop.place.name}>
                  <h2 class="group-title">
                    {stop.place.name} · {longDate(stop.start)} – {longDate(stop.end)}
                  </h2>
                  {typical && <p class="group-foot" style={{ margin: '0 16px 8px' }}><strong>Typical weather</strong> for dates past the 16-day forecast, from the last five years.</p>}
                  {error && <p class="group-foot stale" style={{ margin: '0 16px 8px' }}>{error}</p>}
                  <ol class="hourly" aria-label={`Days in ${stop.place.name}`}>
                    {days.map((d) => (
                      <li key={d.date} class="trip-day">
                        <span class="meta">{dayLabel(d.date, todayIso())}</span>
                        {d.advice ? (
                          <>
                            <MiniMark feels={d.advice.effective} rain={Math.max(0, ...d.advice.hours.map((h) => h.precipProb))} />
                            <span class="t num">{fmtTemp(d.advice.minFeels, u.temp)}</span>
                            <span class="small-print" style={{ textAlign: 'center', lineHeight: 1.2 }}>{d.advice.verdict}</span>
                            {d.source === 'typical' && <span class="visually-hidden">typical weather</span>}
                          </>
                        ) : (
                          <span class="small-print">No data</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}

            <div class="row-item plain" style={{ padding: '0 4px', marginTop: '16px' }}>
              <h2 class="grow" style={{ fontSize: '22px' }}>Packing list</h2>
              <button type="button" class="text-btn" onClick={share}>Share</button>
            </div>
            <p class="group-foot" style={{ margin: '0 4px 8px' }}>
              {plan.dayCount} day{plan.dayCount === 1 ? '' : 's'} · {ticked} of {plan.packing.length} packed. Assumes you re-wear jumpers and take one coat.
            </p>
            {plan.packing.length === 0 ? (
              <p class="card">No forecast for these dates yet.</p>
            ) : (
              <ul class="group" style={{ listStyle: 'none', padding: 0 }}>
                {plan.packing.map((i) => (
                  <li key={i.id}>
                    <label class="row-item">
                      <LayerMark kind={i.kind} />
                      <span class="grow" style={trip.checked[i.id] ? { textDecoration: 'line-through', color: 'var(--ink-2)' } : undefined}>
                        {i.label}
                      </span>
                      {i.qty > 1 && <span class="meta num">× {i.qty}</span>}
                      <input type="checkbox" class="check" checked={!!trip.checked[i.id]} onChange={() => toggle(i.id)} />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </>
  );
}

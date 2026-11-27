// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { useState } from 'preact/hooks';
import { ACTIVITIES, ACTIVITY_LABEL, EFFORTS, EFFORT_LABEL, scalesWithEffort } from '../../engine/activity';
import { ROUTINE_HOURS, ROUTINE_PRESETS, WEEK_ORDER, clampRoutineHours, daysLabel, lengthLabel, type RoutineSpec } from '../../engine/routines';
import type { Activity, Effort } from '../../engine/types';
import { WEEKDAY_SHORT, timeFmt } from '../../data/format';
import { routines, settings, uid, type Routine } from '../../data/store';
import { Sheet } from '../../components/Sheet';
import { toast } from '../../components/Toast';

const BLANK: RoutineSpec = { name: '', time: '08:00', hours: 0.5, days: [1, 2, 3, 4, 5], activity: 'walking' };

function RoutineSheet({ draft, onClose }: { draft: Routine | null; onClose: () => void }) {
  const [r, setR] = useState<Routine | null>(draft);
  const [prev, setPrev] = useState(draft);
  // The sheet stays mounted, so a newly opened routine replaces the old draft.
  const [noDays, setNoDays] = useState(false);
  if (draft !== prev) {
    setPrev(draft);
    setR(draft);
    setNoDays(false);
  }
  const isNew = !!r && !routines.value.some((x) => x.id === r.id);
  const patch = (p: Partial<Routine>) => r && setR({ ...r, ...p });

  const save = (e: Event) => {
    e.preventDefault();
    if (!r) return;
    if (!r.days.length) {
      setNoDays(true);
      return;
    }
    const clean: Routine = { ...r, name: r.name.trim() || 'Routine', hours: clampRoutineHours(r.hours) };
    if (!scalesWithEffort(clean.activity)) delete clean.effort;
    routines.value = isNew ? [...routines.value, clean] : routines.value.map((x) => (x.id === clean.id ? clean : x));
    toast(isNew ? `Added ${clean.name}` : 'Saved');
    onClose();
  };

  return (
    <Sheet open={!!draft} title={isNew ? 'New routine' : 'Edit routine'} onClose={onClose}>
      {r && (
        <form onSubmit={save}>
          <label class="field">
            <span>Name</span>
            <input type="text" value={r.name} placeholder="Dog walk" maxLength={40} autocomplete="off" enterkeyhint="next" required onInput={(e) => patch({ name: e.currentTarget.value })} />
          </label>
          <label class="field">
            <span>Starts at</span>
            <input type="time" value={r.time} required onInput={(e) => patch({ time: e.currentTarget.value || r.time })} />
          </label>
          <label class="field">
            <span>Outside for</span>
            <select value={r.hours} onChange={(e) => patch({ hours: Number(e.currentTarget.value) })}>
              {ROUTINE_HOURS.map((h) => <option key={h} value={h}>{lengthLabel(h)}</option>)}
            </select>
          </label>
          <fieldset class="field" style={{ border: 0, padding: 0 }}>
            <legend class="routine-legend">Days</legend>
            <div class="pick weekdays">
              {WEEK_ORDER.map((d) => (
                <button
                  type="button"
                  key={d}
                  aria-pressed={r.days.includes(d)}
                  onClick={() => {
                    setNoDays(false);
                    patch({ days: r.days.includes(d) ? r.days.filter((x) => x !== d) : [...r.days, d] });
                  }}
                >
                  {WEEKDAY_SHORT[d]}
                </button>
              ))}
            </div>
            {noDays && <p role="alert" class="small-print stale routine-error">Pick at least one day.</p>}
          </fieldset>
          <label class="field">
            <span>Activity</span>
            <select value={r.activity} onChange={(e) => patch({ activity: e.currentTarget.value as Activity })}>
              {ACTIVITIES.map((a) => <option key={a} value={a}>{ACTIVITY_LABEL[a]}</option>)}
            </select>
          </label>
          {scalesWithEffort(r.activity) && (
            <label class="field">
              <span>Effort</span>
              <select value={r.effort ?? ''} onChange={(e) => patch({ effort: (e.currentTarget.value || undefined) as Effort | undefined })}>
                <option value="">Not set (steady)</option>
                {EFFORTS.map((x) => <option key={x} value={x}>{EFFORT_LABEL[x]}</option>)}
              </select>
            </label>
          )}
          <div class="sheet-actions">
            {!isNew && (
              <button
                type="button"
                class="btn danger"
                onClick={() => {
                  routines.value = routines.value.filter((x) => x.id !== r.id);
                  toast(`Deleted ${r.name}`);
                  onClose();
                }}
              >
                Delete
              </button>
            )}
            <button type="button" class="btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" class="btn">Save</button>
          </div>
        </form>
      )}
    </Sheet>
  );
}

export function RoutinesSection() {
  const fmt = timeFmt(settings.value.units.clock);
  const [editing, setEditing] = useState<Routine | null>(null);
  const list = [...routines.value].sort((a, b) => a.time.localeCompare(b.time));
  const presets = ROUTINE_PRESETS.filter((p) => !routines.value.some((r) => r.name.toLowerCase() === p.name.toLowerCase()));

  return (
    <>
      <h2 class="group-title">Routines</h2>
      <ul class="group" style={{ listStyle: 'none', padding: 0 }}>
        {list.map((r) => (
          <li key={r.id}>
            <button type="button" class="row-item plain" onClick={() => setEditing(r)}>
              <span class="grow">
                <span class="visually-hidden">Edit </span>
                {r.name}
                <span class="sub">
                  {fmt(`2000-01-01T${r.time}`)} · {lengthLabel(r.hours)} · {daysLabel(r.days)} · {ACTIVITY_LABEL[r.activity]}
                  {r.effort && scalesWithEffort(r.activity) ? `, ${EFFORT_LABEL[r.effort].toLowerCase()}` : ''}
                </span>
              </span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" class="row-item plain" onClick={() => setEditing({ ...BLANK, id: uid() })}>
            <span class="grow link">Add a routine</span>
          </button>
        </li>
      </ul>
      {presets.length > 0 && (
        <div class="pick routine-presets" role="group" aria-label="Add a common routine">
          {presets.map((p) => (
            <button
              type="button"
              key={p.name}
              onClick={() => {
                routines.value = [...routines.value, { ...p, days: [...p.days], id: uid() }];
                toast(`Added ${p.name}`);
              }}
            >
              <span aria-hidden="true">+ </span>
              <span class="visually-hidden">Add </span>
              {p.name} {p.time}
            </button>
          ))}
        </div>
      )}
      <p class="group-foot">Today dresses you for the coldest of the day’s routines and says what the others need.</p>
      <RoutineSheet draft={editing} onClose={() => setEditing(null)} />
    </>
  );
}

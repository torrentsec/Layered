// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { ACTIVITIES, ACTIVITY_EXPOSURE, ACTIVITY_LABEL, COMMUTE_MODES, COMMUTE_MODE_LABEL, type CommuteMode } from '../../engine/activity';
import type { Activity } from '../../engine/types';
import { patchSettings, settings } from '../../data/store';
import { WEEKDAY_SHORT } from '../../data/format';

// Monday first, as people plan their week.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function DefaultsSection() {
  const s = settings.value;
  return (
    <>
    <h2 class="group-title">Defaults</h2>
    <div class="group">
      <label class="row-item plain">
        <span class="grow">Activity</span>
        <select
          value={s.activity}
          onChange={(e) => {
            const activity = e.currentTarget.value as Activity;
            // An indoor default with a ten-hour window would dress you for a whole day outside.
            const exposure = ACTIVITY_EXPOSURE[activity];
            patchSettings(exposure ? { activity, duration: exposure } : { activity });
          }}
        >
          {ACTIVITIES.map((a) => <option key={a} value={a}>{ACTIVITY_LABEL[a]}</option>)}
        </select>
      </label>
      <label class="row-item plain">
        <span class="grow">Out for</span>
        <select value={s.duration} onChange={(e) => patchSettings({ duration: Number(e.currentTarget.value) })}>
          {[2, 5, 10].map((h) => <option key={h} value={h}>{h} hours</option>)}
        </select>
      </label>
    </div>

    <h2 class="group-title">Commute</h2>
    <div class="group">
      <label class="row-item plain">
        <span class="grow">Commute mode</span>
        <input type="checkbox" class="check" checked={s.commute.enabled} onChange={(e) => patchSettings({ commute: { ...s.commute, enabled: e.currentTarget.checked } })} />
      </label>
      <label class="row-item plain">
        <span class="grow">Leave</span>
        <input type="time" value={s.commute.out} onChange={(e) => patchSettings({ commute: { ...s.commute, out: e.currentTarget.value || s.commute.out } })} />
      </label>
      <label class="row-item plain">
        <span class="grow">Head home</span>
        <input type="time" value={s.commute.back} onChange={(e) => patchSettings({ commute: { ...s.commute, back: e.currentTarget.value || s.commute.back } })} />
      </label>
      <label class="row-item plain">
        <span class="grow">Getting there</span>
        <select
          value={s.commute.mode ?? ''}
          onChange={(e) => patchSettings({ commute: { ...s.commute, mode: (e.currentTarget.value || undefined) as CommuteMode | undefined } })}
        >
          <option value="">Same as the day</option>
          {COMMUTE_MODES.map((m) => <option key={m} value={m}>{COMMUTE_MODE_LABEL[m]}</option>)}
        </select>
      </label>
      <label class="row-item plain">
        <span class="grow">Each way</span>
        <select value={s.commute.legHours} onChange={(e) => patchSettings({ commute: { ...s.commute, legHours: Number(e.currentTarget.value) } })}>
          {[1, 2].map((h) => <option key={h} value={h}>{h === 1 ? 'Up to an hour' : 'Up to two hours'}</option>)}
        </select>
      </label>
      <fieldset class="row-item plain" style={{ border: 0, margin: 0, display: 'block' }}>
        <legend class="visually-hidden">Commute days</legend>
        <div class="pick weekdays">
          {WEEK_ORDER.map((d) => (
            <button
              type="button"
              key={d}
              aria-pressed={s.commute.days.includes(d)}
              onClick={() => {
                const days = s.commute.days.includes(d) ? s.commute.days.filter((x) => x !== d) : [...s.commute.days, d];
                patchSettings({ commute: { ...s.commute, days } });
              }}
            >
              {WEEKDAY_SHORT[d]}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
    </>
  );
}

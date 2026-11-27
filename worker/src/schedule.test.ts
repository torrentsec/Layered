// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import type { PushSchedule } from '../../src/data/push-api';
import { dueFor, localClock, occasionDate, type LocalClock, type Marks } from './schedule';

const at = (iso: string) => Date.parse(iso);
const clock = (tz: string, iso: string) => localClock(tz, at(iso))!;
const WEEKDAYS = [1, 2, 3, 4, 5];
const none: Marks = { lastMorning: null, lastEvening: null, lastAlert: null };
const sched = (over: Partial<PushSchedule> = {}): PushSchedule => ({ morning: '07:00', evening: null, days: WEEKDAYS, changeAlerts: false, ...over });

describe('local clock', () => {
  it('follows each zone, including half and quarter hours', () => {
    expect(clock('Europe/London', '2026-11-27T07:00:00Z')).toMatchObject({ date: '2026-11-27', iso: '2026-11-27T07:00', minutes: 420, offsetSeconds: 0 });
    expect(clock('Europe/London', '2026-07-03T06:00:00Z')).toMatchObject({ iso: '2026-07-03T07:00', offsetSeconds: 3600 });
    expect(clock('Asia/Kathmandu', '2026-11-27T01:15:00Z')).toMatchObject({ iso: '2026-11-27T07:00', offsetSeconds: 20_700 });
    expect(clock('Pacific/Auckland', '2026-11-27T18:00:00Z')).toMatchObject({ date: '2026-11-28', iso: '2026-11-28T07:00' });
    expect(clock('UTC', '2026-11-27T00:00:30Z')).toMatchObject({ iso: '2026-11-27T00:00', minutes: 0 });
  });

  it('is null for an unknown zone', () => {
    expect(localClock('Mars/Olympus', at('2026-11-27T07:00:00Z'))).toBeNull();
  });
});

describe('morning due time', () => {
  const due = (tz: string, iso: string, s = sched(), marks = none) => dueFor(s, marks, clock(tz, iso)).morning;

  it('fires within [time, time + 15 min) and not either side', () => {
    expect(due('Europe/London', '2026-11-27T06:59:59Z')).toBeNull();
    expect(due('Europe/London', '2026-11-27T07:00:00Z')).toBe('2026-11-27');
    expect(due('Europe/London', '2026-11-27T07:14:59Z')).toBe('2026-11-27');
    expect(due('Europe/London', '2026-11-27T07:15:00Z')).toBeNull();
  });

  it('catches an off-grid time on the next quarter-hour run', () => {
    expect(due('Europe/London', '2026-11-27T07:15:00Z', sched({ morning: '07:05' }))).toBe('2026-11-27');
    expect(due('Europe/London', '2026-11-27T07:30:00Z', sched({ morning: '07:05' }))).toBeNull();
  });

  it('uses local time across a DST change', () => {
    // New York moves to EDT on Sunday 8 March 2026: 07:00 is 12:00Z on Saturday and 11:00Z on Sunday.
    const weekend = sched({ days: [0, 6] });
    expect(due('America/New_York', '2026-03-07T12:00:00Z', weekend)).toBe('2026-03-07');
    expect(due('America/New_York', '2026-03-08T12:00:00Z', weekend)).toBeNull();
    expect(due('America/New_York', '2026-03-08T11:00:00Z', weekend)).toBe('2026-03-08');
    // London summer time: 07:00 BST is 06:00Z.
    expect(due('Europe/London', '2026-07-03T06:00:00Z')).toBe('2026-07-03');
    expect(due('Europe/London', '2026-07-03T07:00:00Z')).toBeNull();
  });

  it('follows the local day of the week, not UTC', () => {
    // Friday 18:00Z is Saturday 07:00 in Auckland.
    expect(due('Pacific/Auckland', '2026-11-27T18:00:00Z')).toBeNull();
    expect(due('Pacific/Auckland', '2026-11-27T18:00:00Z', sched({ days: [6] }))).toBe('2026-11-28');
    expect(due('Europe/London', '2026-11-28T07:00:00Z')).toBeNull();
    expect(due('Europe/London', '2026-11-27T07:00:00Z', sched({ days: [] }))).toBeNull();
  });

  it('sends once per local date', () => {
    expect(due('Europe/London', '2026-11-27T07:05:00Z', sched(), { ...none, lastMorning: '2026-11-27' })).toBeNull();
    expect(due('Europe/London', '2026-11-27T07:05:00Z', sched(), { ...none, lastMorning: '2026-11-26' })).toBe('2026-11-27');
  });

  it('is off when there is no morning time', () => {
    expect(due('Europe/London', '2026-11-27T07:00:00Z', sched({ morning: null, evening: '20:00' }))).toBeNull();
  });
});

describe('evening due time', () => {
  const due = (iso: string, s = sched({ morning: null, evening: '20:30' }), marks = none) => dueFor(s, marks, clock('Europe/London', iso)).evening;

  it('fires the evening before a scheduled day', () => {
    // Sunday evening for Monday; Friday evening would be for Saturday.
    expect(due('2026-11-29T20:30:00Z')).toBe('2026-11-29');
    expect(due('2026-11-27T20:30:00Z')).toBeNull();
    expect(due('2026-11-26T20:44:00Z')).toBe('2026-11-26');
    expect(due('2026-11-26T20:45:00Z')).toBeNull();
  });

  it('sends once per evening', () => {
    expect(due('2026-11-29T20:40:00Z', undefined, { ...none, lastEvening: '2026-11-29' })).toBeNull();
  });

  it('keeps a late time on its own day when the window crosses midnight', () => {
    const late = sched({ morning: null, evening: '23:50', days: [6] });
    const c = clock('Europe/London', '2026-11-28T00:00:00Z');
    expect(occasionDate('23:50', c)).toBe('2026-11-27');
    expect(dueFor(late, none, c).evening).toBe('2026-11-27');
    expect(dueFor(late, { ...none, lastEvening: '2026-11-27' }, c).evening).toBeNull();
  });
});

describe('change-alert re-checks', () => {
  const alerts = sched({ changeAlerts: true });
  const sent: Marks = { ...none, lastMorning: '2026-11-27' };
  const check = (iso: string, s = alerts, marks = sent) => dueFor(s, marks, clock('Europe/London', iso)).alert;

  it('re-checks hourly after the morning push until 18:00', () => {
    expect(check('2026-11-27T08:00:00Z')).toBe('2026-11-27');
    expect(check('2026-11-27T08:15:00Z')).toBeNull();
    expect(check('2026-11-27T17:00:00Z')).toBe('2026-11-27');
    expect(check('2026-11-27T18:00:00Z')).toBeNull();
  });

  it('needs the morning push first, the option on, and no alert yet today', () => {
    expect(check('2026-11-27T08:00:00Z', alerts, none)).toBeNull();
    expect(check('2026-11-27T08:00:00Z', alerts, { ...none, lastMorning: '2026-11-26' })).toBeNull();
    expect(check('2026-11-27T08:00:00Z', sched())).toBeNull();
    expect(check('2026-11-27T08:00:00Z', alerts, { ...sent, lastAlert: '2026-11-27' })).toBeNull();
  });

  it('never re-checks in the run that sends the morning', () => {
    const c: LocalClock = clock('Europe/London', '2026-11-27T08:00:00Z');
    expect(dueFor(sched({ morning: '08:00', changeAlerts: true }), { ...none, lastMorning: '2026-11-27' }, c)).toMatchObject({ morning: null, alert: '2026-11-27' });
    expect(dueFor(sched({ morning: '08:00', changeAlerts: true }), none, c)).toMatchObject({ morning: '2026-11-27', alert: null });
  });

  it('runs once an hour in a quarter-hour zone too', () => {
    const k = (iso: string) => dueFor(alerts, sent, clock('Asia/Kathmandu', iso)).alert;
    // 02:15Z is 08:00 in Kathmandu; 02:00Z is 07:45.
    const hits = ['2026-11-27T02:00:00Z', '2026-11-27T02:15:00Z', '2026-11-27T02:30:00Z', '2026-11-27T02:45:00Z'].map(k).filter(Boolean);
    expect(hits).toEqual(['2026-11-27']);
  });
});

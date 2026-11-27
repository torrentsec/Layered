// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { addDays } from '../../src/data/format';
import type { Forecast } from '../../src/data/forecast-types';
import type { PushPayload, PushProfile, PushSchedule } from '../../src/data/push-api';
import { PUSH_SQL, type PushDatabase, type SubscriptionRow } from '../../functions/_lib/push-db';
import { bodyFor, changed, parseSummary, planFor, summarise } from './plan';
import { dueFor, localClock, type LocalClock } from './schedule';

export type Kind = 'morning' | 'evening' | 'alert';

export interface Job {
  row: SubscriptionRow;
  kind: Kind;
  /** The local date the job belongs to. */
  date: string;
  clock: LocalClock;
  schedule: PushSchedule;
  profile: PushProfile;
}

function parse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Everything due for one subscription at `now`. A row that no longer parses is skipped, not fatal. */
export function jobsFor(row: SubscriptionRow, now: number): Job[] {
  const clock = localClock(row.tz, now);
  const schedule = parse<PushSchedule>(row.schedule);
  const profile = parse<PushProfile>(row.profile);
  if (!clock || !schedule || !profile) return [];
  const due = dueFor(schedule, { lastMorning: row.last_morning, lastEvening: row.last_evening, lastAlert: row.last_alert }, clock);
  const jobs: Job[] = [];
  for (const kind of ['morning', 'evening', 'alert'] as const) {
    const date = due[kind];
    if (date) jobs.push({ row, kind, date, clock, schedule, profile });
  }
  return jobs;
}

export const placeKey = (lat: number, lon: number): string => `${lat.toFixed(2)},${lon.toFixed(2)}`;

/** One forecast request per place, however many people there are due. */
export function groupByPlace(jobs: Job[]): Map<string, Job[]> {
  const groups = new Map<string, Job[]>();
  for (const j of jobs) {
    const k = placeKey(j.row.lat, j.row.lon);
    groups.set(k, [...(groups.get(k) ?? []), j]);
  }
  return groups;
}

/** Hours the push service may hold a message: past these it would arrive too late to help. */
export const TTL: Record<Kind, number> = { morning: 3 * 3600, alert: 2 * 3600, evening: 10 * 3600 };

const TITLE: Record<Kind, string> = { morning: 'What to wear today', evening: 'What to wear tomorrow', alert: 'Today’s advice has changed' };

export interface Outgoing {
  payload: PushPayload;
  /** Written after a successful send. */
  mark: { sql: string; args: unknown[] };
}

/** The message for one job, or null when there is nothing to say (no forecast hours, or no change). */
export function compose(job: Job, f: Forecast): Outgoing | null {
  const { row, kind, date, clock, profile } = job;
  if (kind === 'evening') {
    const plan = planFor(f, addDays(date, 1), profile, clock.iso);
    if (!plan) return null;
    return {
      payload: { title: TITLE.evening, body: bodyFor(plan, profile, 'tomorrow'), tag: 'layered-evening', url: '/' },
      mark: { sql: PUSH_SQL.markEvening, args: [row.id, date] },
    };
  }
  if (kind === 'morning') {
    const plan = planFor(f, date, profile, clock.iso);
    if (!plan) return null;
    return {
      payload: { title: TITLE.morning, body: bodyFor(plan, profile, 'today'), tag: 'layered-today', url: '/' },
      mark: { sql: PUSH_SQL.markMorning, args: [row.id, date, JSON.stringify(summarise(plan.advice, date, clock.iso))] },
    };
  }
  const before = parseSummary(row.last_summary);
  if (!before || before.date !== date) return null;
  // Same window as the morning push, so the day warming up as it goes isn't mistaken for a change.
  const plan = planFor(f, date, profile, before.at);
  if (!plan) return null;
  const now = summarise(plan.advice, date, before.at);
  if (!changed(before, now)) return null;
  return {
    // Same tag as the morning push, so the update replaces it rather than stacking.
    payload: { title: TITLE.alert, body: bodyFor(plan, profile, 'today'), tag: 'layered-today', url: '/' },
    mark: { sql: PUSH_SQL.markAlert, args: [row.id, date, JSON.stringify(now)] },
  };
}

export interface RunDeps {
  db: PushDatabase;
  now: number;
  /** Open-Meteo with the MET Norway fallback; throws when both fail. */
  forecast: (lat: number, lon: number, offsetSeconds: number) => Promise<Forecast>;
  /** Resolves to the push service's HTTP status. */
  send: (row: SubscriptionRow, payload: string, kind: Kind) => Promise<number>;
  log?: (entry: Record<string, unknown>) => void;
}

export interface RunStats {
  subscriptions: number;
  due: number;
  places: number;
  sent: number;
  skipped: number;
  expired: number;
  failed: number;
}

export async function runOnce(deps: RunDeps): Promise<RunStats> {
  const log = deps.log ?? (() => undefined);
  const { results: rows } = await deps.db.prepare(PUSH_SQL.all).all<SubscriptionRow>();
  const jobs = rows.flatMap((r) => jobsFor(r, deps.now));
  const groups = groupByPlace(jobs);
  const stats: RunStats = { subscriptions: rows.length, due: jobs.length, places: groups.size, sent: 0, skipped: 0, expired: 0, failed: 0 };
  const gone = new Set<string>();

  await Promise.all(
    [...groups.values()].map(async (group) => {
      const first = group[0];
      let f: Forecast;
      try {
        f = await deps.forecast(first.row.lat, first.row.lon, first.clock.offsetSeconds);
      } catch (err) {
        stats.failed += group.length;
        log({ message: 'forecast failed', jobs: group.length, error: err instanceof Error ? err.message : String(err) });
        return;
      }
      // In order, so a 410 on one job stops the same row's next job.
      for (const job of group) {
        if (gone.has(job.row.id)) continue;
        const out = compose(job, f);
        if (!out) {
          stats.skipped++;
          continue;
        }
        let status: number;
        try {
          status = await deps.send(job.row, JSON.stringify(out.payload), job.kind);
        } catch (err) {
          stats.failed++;
          log({ message: 'push failed', kind: job.kind, error: err instanceof Error ? err.message : String(err) });
          continue;
        }
        if (status === 404 || status === 410) {
          // The browser unsubscribed or the push service forgot it; the row can never deliver again.
          gone.add(job.row.id);
          await deps.db.prepare(PUSH_SQL.remove).bind(job.row.id).first();
          stats.expired++;
        } else if (status >= 200 && status < 300) {
          await deps.db.prepare(out.mark.sql).bind(...out.mark.args).run();
          stats.sent++;
        } else {
          stats.failed++;
          log({ message: 'push rejected', kind: job.kind, status });
        }
      }
    }),
  );
  return stats;
}

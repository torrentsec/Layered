// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { Database, Statement } from './db';

/** The Worker also lists rows, which the sync API never needs. */
export interface ListStatement extends Statement {
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface PushDatabase extends Database {
  prepare(sql: string): ListStatement;
}

export interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  lat: number;
  lon: number;
  tz: string;
  /** PushSchedule as JSON. */
  schedule: string;
  /** PushProfile as JSON. */
  profile: string;
  last_morning: string | null;
  last_evening: string | null;
  last_alert: string | null;
  /** Summary of the last morning or alert push, as JSON. */
  last_summary: string | null;
}

const COLUMNS = 'id, endpoint, p256dh, auth, lat, lon, tz, schedule, profile, last_morning, last_evening, last_alert, last_summary';

export const PUSH_SQL = {
  byId: 'SELECT id FROM push_subscriptions WHERE id = ?1',
  byEndpoint: 'SELECT id FROM push_subscriptions WHERE endpoint = ?1',
  // A browser that re-subscribes under a known id hands over its new endpoint; any row left on it is stale.
  dropEndpoint: 'DELETE FROM push_subscriptions WHERE endpoint = ?1 AND id <> ?2',
  upsert:
    'INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, lat, lon, tz, schedule, profile, created_at, updated_at) ' +
    'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10) ' +
    'ON CONFLICT (id) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth, ' +
    'lat = excluded.lat, lon = excluded.lon, tz = excluded.tz, schedule = excluded.schedule, profile = excluded.profile, ' +
    'updated_at = excluded.updated_at',
  remove: 'DELETE FROM push_subscriptions WHERE id = ?1 RETURNING id',
  all: `SELECT ${COLUMNS} FROM push_subscriptions`,
  markMorning: 'UPDATE push_subscriptions SET last_morning = ?2, last_summary = ?3 WHERE id = ?1',
  markEvening: 'UPDATE push_subscriptions SET last_evening = ?2 WHERE id = ?1',
  markAlert: 'UPDATE push_subscriptions SET last_alert = ?2, last_summary = ?3 WHERE id = ?1',
} as const;

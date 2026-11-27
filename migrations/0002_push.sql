-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (c) 2026 torrentsec

-- One row per browser push subscription. `id` is random and is the only
-- handle the app keeps. Coordinates arrive rounded to two decimals.
-- `schedule` and `profile` are PushSchedule and PushProfile as JSON.
-- The `last_*` columns hold the subscriber's local date (YYYY-MM-DD) of the
-- last push of each kind, so a run never sends the same one twice;
-- `last_summary` is what the last morning or alert push said, as JSON.
-- Timestamps are milliseconds since the epoch.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  tz TEXT NOT NULL,
  schedule TEXT NOT NULL,
  profile TEXT NOT NULL,
  last_morning TEXT,
  last_evening TEXT,
  last_alert TEXT,
  last_summary TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

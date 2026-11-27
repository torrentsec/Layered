-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (c) 2026 Daniel Woo

-- One row per sync code. `data` is a device's export bundle as JSON and
-- `updated_at` is milliseconds since the epoch, set by the server.
CREATE TABLE IF NOT EXISTS sync_blobs (
  code TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Fixed-window counters. `key` holds a hashed client address, never the raw IP.
-- `window` is the window's index: epoch milliseconds divided by its length.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT,
  "window" INTEGER,
  count INTEGER,
  PRIMARY KEY (key, "window")
);

-- Lets expired windows be swept without a full scan.
CREATE INDEX IF NOT EXISTS rate_limits_window ON rate_limits ("window");

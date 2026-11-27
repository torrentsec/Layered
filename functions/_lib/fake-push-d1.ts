// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { SQL } from './db';
import { PUSH_SQL, type ListStatement, type PushDatabase, type SubscriptionRow } from './push-db';

type Row = SubscriptionRow & { created_at: number; updated_at: number };

/**
 * In-memory stand-in for D1 in the push tests. It understands exactly the
 * statements in PUSH_SQL and the rate limiter, so a query change breaks a
 * test rather than passing silently.
 */
export class FakePushD1 implements PushDatabase {
  rows = new Map<string, Row>();
  limits = new Map<string, number>();
  log: string[] = [];

  prepare(sql: string): ListStatement {
    let args: unknown[] = [];
    const stmt: ListStatement = {
      bind: (...values) => {
        args = values;
        return stmt;
      },
      first: async <T>() => this.exec(sql, args) as T | null,
      run: async () => this.exec(sql, args),
      all: async <T>() => ({ results: this.exec(sql, args) as T[] }),
    };
    return stmt;
  }

  seed(row: Partial<Row> & Pick<Row, 'id' | 'endpoint'>): void {
    this.rows.set(row.id, {
      p256dh: '',
      auth: '',
      lat: 0,
      lon: 0,
      tz: 'UTC',
      schedule: '{}',
      profile: '{}',
      last_morning: null,
      last_evening: null,
      last_alert: null,
      last_summary: null,
      created_at: 0,
      updated_at: 0,
      ...row,
    });
  }

  private exec(sql: string, a: unknown[]): unknown {
    this.log.push(sql);
    const s = (i: number) => a[i] as string;
    switch (sql) {
      case PUSH_SQL.byId:
        return this.rows.has(s(0)) ? { id: s(0) } : null;
      case PUSH_SQL.byEndpoint:
        return [...this.rows.values()].find((r) => r.endpoint === s(0)) ?? null;
      case PUSH_SQL.dropEndpoint:
        for (const r of [...this.rows.values()]) if (r.endpoint === s(0) && r.id !== s(1)) this.rows.delete(r.id);
        return null;
      case PUSH_SQL.upsert: {
        const [id, endpoint, p256dh, auth, lat, lon, tz, schedule, profile, now] = a as [string, string, string, string, number, number, string, string, string, number];
        if ([...this.rows.values()].some((r) => r.endpoint === endpoint && r.id !== id)) throw new Error('UNIQUE constraint failed: push_subscriptions.endpoint');
        const prev = this.rows.get(id);
        this.rows.set(id, {
          last_morning: null,
          last_evening: null,
          last_alert: null,
          last_summary: null,
          created_at: now,
          ...prev,
          id,
          endpoint,
          p256dh,
          auth,
          lat,
          lon,
          tz,
          schedule,
          profile,
          updated_at: now,
        });
        return null;
      }
      case PUSH_SQL.remove: {
        const had = this.rows.delete(s(0));
        return had ? { id: s(0) } : null;
      }
      case PUSH_SQL.all:
        return [...this.rows.values()].map((r) => {
          const copy: Partial<Row> = { ...r };
          delete copy.created_at;
          delete copy.updated_at;
          return copy;
        });
      case PUSH_SQL.markMorning:
        return this.patch(s(0), { last_morning: s(1), last_summary: s(2) });
      case PUSH_SQL.markEvening:
        return this.patch(s(0), { last_evening: s(1) });
      case PUSH_SQL.markAlert:
        return this.patch(s(0), { last_alert: s(1), last_summary: s(2) });
      case SQL.hit: {
        const k = `${a[0]}|${a[1]}`;
        const count = (this.limits.get(k) ?? 0) + 1;
        this.limits.set(k, count);
        return { count };
      }
      case SQL.sweep:
        for (const k of this.limits.keys()) if (Number(k.split('|')[1]) < (a[0] as number)) this.limits.delete(k);
        return null;
      default:
        throw new Error(`Unexpected SQL: ${sql}`);
    }
  }

  private patch(id: string, p: Partial<Row>): null {
    const r = this.rows.get(id);
    if (r) this.rows.set(id, { ...r, ...p });
    return null;
  }
}

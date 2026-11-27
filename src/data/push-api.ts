// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { ComfortProfile } from '../engine/comfort';
import type { Activity } from '../engine/types';
import type { Units } from './units';

/**
 * The contract between the app, the `/api/push/*` Pages Functions and the
 * `layered-push` Worker. A subscription carries only what the Worker needs to
 * run the engine for one place: coordinates rounded to two decimals, a time
 * zone and the person's settings. No identifiers beyond a random id.
 */

export const PUSH_API = {
  key: '/api/push/key',
  subscribe: '/api/push/subscribe',
  /** DELETE `${PUSH_API.subscription}/${id}` */
  subscription: '/api/push',
} as const;

export interface PushSchedule {
  /** Local "HH:MM" for today's outfit, or null to skip mornings. */
  morning: string | null;
  /** Local "HH:MM" for tomorrow's outfit (US-061), or null. */
  evening: string | null;
  /** 0 = Sunday, as Date#getDay. */
  days: number[];
  /** One extra alert when the day's advice changes materially (US-043). */
  changeAlerts: boolean;
}

export interface PushProfile {
  units: Units;
  activity: Activity;
  manualOffset: number;
  comfort: ComfortProfile;
  commute: { enabled: boolean; out: string; back: string; legHours: number; days: number[]; mode?: Activity };
}

export interface SubscribeRequest {
  /** Present when updating an existing subscription. */
  id?: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  lat: number;
  lon: number;
  /** IANA time zone, e.g. "Europe/London". */
  tz: string;
  schedule: PushSchedule;
  profile: PushProfile;
}

export interface SubscribeResponse {
  id: string;
}

export interface PushKeyResponse {
  /** VAPID application server key, base64url. */
  publicKey: string;
}

/** What the service worker receives in a push event. */
export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/** Upper bound on a subscribe request body; real ones are well under 2 KB. */
export const MAX_SUBSCRIBE_BYTES = 8 * 1024;

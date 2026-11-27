// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import '../../styles/notifications.css';
import { effect } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { notificationText } from '../../engine/notify';
import { localNow } from '../../engine/time';
import { timeFmt, WEEKDAY_SHORT } from '../../data/format';
import {
  buildSubscribeRequest,
  debounce,
  DEFAULT_EVENING,
  DEFAULT_MORNING,
  detectSupport,
  disablePush,
  enablePush,
  initialStatus,
  isBusy,
  isChecked,
  requestSignature,
  RESUBSCRIBE_DEBOUNCE_MS,
  transition,
  updatePush,
  type NotifyStatus,
  type PushDeps,
} from '../../data/push';
import type { NotifyPrefs } from '../../data/store';
import { comfort, inventory, patchSettings, ratings, settings } from '../../data/store';
import { planDay } from '../../state/advice';
import { currentPlace, forecastState, loadForecast } from '../../state/forecast';
import { toast } from '../../components/Toast';

// Monday first, matching the commute days.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const EXAMPLE = 'Coat + umbrella today · showers from 16:00';
const SIG_KEY = 'layered:v1:pushSignature';
// Without a service worker (blocked, or still installing) `ready` never settles.
const SW_WAIT_MS = 10_000;

function readSig(): string | null {
  try {
    return localStorage.getItem(SIG_KEY);
  } catch {
    return null;
  }
}

function writeSig(sig: string | null): void {
  try {
    if (sig === null) localStorage.removeItem(SIG_KEY);
    else localStorage.setItem(SIG_KEY, sig);
  } catch {
    // Without storage the next launch simply re-posts once.
  }
}

const deps: PushDeps = {
  fetch: (input, init) => fetch(input, init),
  requestPermission: () => Notification.requestPermission(),
  registration: () =>
    Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('No service worker')), SW_WAIT_MS)),
    ]),
  request: (subscription, id) => {
    const place = currentPlace.peek();
    if (!place) return null;
    return buildSubscribeRequest({
      subscription,
      place,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      settings: settings.peek(),
      comfort: comfort.peek(),
      id,
    });
  },
};

function support() {
  return detectSupport({
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone:
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      (window.matchMedia?.('(display-mode: standalone)').matches ?? false),
  });
}

const permission = (): NotificationPermission | null => ('Notification' in window ? Notification.permission : null);

const patchNotify = (p: Partial<NotifyPrefs>) => patchSettings({ notify: { ...settings.peek().notify, ...p } });

/**
 * Keeps the server's copy in step with the schedule, place and profile, from
 * any screen. Started once from main.tsx.
 */
export function watchPushSettings(): () => void {
  const post = debounce((id: string) => {
    updatePush(deps, id)
      .then((r) => {
        if (!r) return;
        writeSig(r.signature);
        if (r.id !== id) patchNotify({ subscriptionId: r.id });
      })
      // Left unsent; the signature still differs, so the next change or launch retries.
      .catch(() => undefined);
  }, RESUBSCRIBE_DEBOUNCE_MS);

  return effect(() => {
    const s = settings.value;
    const c = comfort.value;
    const place = currentPlace.value;
    const id = s.notify.subscriptionId;
    if (!s.notify.enabled || !id || !place) return;
    const probe = buildSubscribeRequest({
      subscription: { endpoint: '', keys: { p256dh: '', auth: '' } },
      place,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      settings: s,
      comfort: c,
      id,
    });
    if (requestSignature(probe) !== readSig()) post(id);
  });
}

function usePreview(): { text: string; real: boolean } {
  const st = forecastState.value;
  const f = st.status === 'ready' ? st.forecast : undefined;
  const s = settings.value;
  if (!f) return { text: EXAMPLE, real: false };
  const date = localNow(f.utcOffsetSeconds).slice(0, 10);
  const plan = planDay(f, date, { settings: s, ratings: ratings.value, inventory: inventory.value, comfort: comfort.value });
  return plan ? { text: notificationText(plan.advice, plan.dayHours, timeFmt(s.units.clock)), real: true } : { text: EXAMPLE, real: false };
}

function footnote(status: NotifyStatus, message: string | null, time: string): string {
  switch (status) {
    case 'unsupported':
      return 'This browser can’t receive notifications. Chrome, Edge, Firefox and Safari can.';
    case 'ios-install':
      return 'On iPhone and iPad, notifications work once Layered is on your Home Screen (iOS 16.4 or later). Tap Share, then Add to Home Screen, and open Layered from there.';
    case 'ios-update':
      return 'Notifications on iPhone and iPad need iOS 16.4 or later.';
    case 'denied':
      return 'Notifications are blocked for Layered. Allow them in your browser’s site settings (on iPhone: Settings, Notifications, Layered), then come back here.';
    case 'error':
      return `${message ?? 'Something went wrong.'} Notifications are still off.`;
    case 'asking':
      return 'Turning on…';
    case 'subscribing':
      return 'Turning on…';
    case 'disabling':
      return 'Turning off…';
    case 'on':
      return `Sent at ${time} local time on the days you pick. Your place goes to the server rounded to about a kilometre.`;
    case 'off':
      return message ?? 'A short note each morning with what to wear. Your place goes to the server rounded to about a kilometre.';
  }
}

export function NotificationsSection() {
  const s = settings.value;
  const n = s.notify;
  const [status, setStatus] = useState<NotifyStatus>(() => initialStatus(support(), permission(), n));
  const [message, setMessage] = useState<string | null>(null);
  const preview = usePreview();
  const available = status !== 'unsupported' && status !== 'ios-install' && status !== 'ios-update';

  useEffect(() => {
    if (forecastState.peek().status === 'idle') void loadForecast();
  }, []);

  const turnOn = async () => {
    setMessage(null);
    if (!currentPlace.peek()) {
      setMessage('Add a place first, so there’s a forecast to send.');
      return;
    }
    let st = transition(status, { type: 'enable' });
    setStatus(st);
    // enablePush asks for permission before its first await, so the tap still counts as the gesture.
    const r = await enablePush(deps);
    if (!r.ok && (r.reason === 'denied' || r.reason === 'dismissed')) {
      setStatus(transition(st, { type: 'permission', result: r.reason === 'denied' ? 'denied' : 'default' }));
      return;
    }
    st = transition(st, { type: 'permission', result: 'granted' });
    if (r.ok) {
      writeSig(r.signature);
      patchNotify({ enabled: true, subscriptionId: r.id, time: n.time || DEFAULT_MORNING });
      setStatus(transition(st, { type: 'subscribed' }));
      toast('Notifications on');
    } else {
      patchNotify({ enabled: false, subscriptionId: undefined });
      setMessage(r.reason === 'no-place' ? 'Add a place first, so there’s a forecast to send.' : r.message ?? null);
      setStatus(r.reason === 'no-place' ? 'off' : transition(st, { type: 'failed' }));
    }
  };

  const turnOff = async () => {
    setMessage(null);
    const st = transition(status, { type: 'disable' });
    setStatus(st);
    const r = await disablePush(deps, n.subscriptionId);
    // The browser has stopped listening either way; a lingering server copy just sends into the void.
    writeSig(null);
    patchNotify({ enabled: false, subscriptionId: undefined });
    setStatus(transition(st, { type: 'disabled' }));
    if (!r.ok) setMessage('Notifications are off on this device. The server didn’t confirm it forgot you; it will stop on its own.');
  };

  const days = n.days;
  const evening = n.evening === true;

  return (
    <>
      <h2 class="group-title">Notifications</h2>
      <div class="group" aria-busy={isBusy(status)}>
        <label class="row-item plain">
          <span class="grow">Morning outfit</span>
          <input
            type="checkbox"
            class="check"
            checked={isChecked(status)}
            disabled={!available || isBusy(status) || status === 'denied'}
            aria-describedby="notify-foot"
            onChange={(e) => {
              const on = e.currentTarget.checked;
              // Keep the box in step with the real state until the browser and server agree.
              e.currentTarget.checked = isChecked(status);
              void (on ? turnOn() : turnOff());
            }}
          />
        </label>
        {available && (
          <>
            <label class="row-item plain">
              <span class="grow">Time</span>
              <input type="time" value={n.time || DEFAULT_MORNING} onChange={(e) => patchNotify({ time: e.currentTarget.value || n.time })} />
            </label>
            <fieldset class="row-item plain notify-days">
              <legend class="visually-hidden">Notification days</legend>
              <div class="pick weekdays">
                {WEEK_ORDER.map((d) => (
                  <button
                    type="button"
                    key={d}
                    aria-pressed={days.includes(d)}
                    onClick={() => patchNotify({ days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] })}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                ))}
              </div>
            </fieldset>
            <label class="row-item plain">
              <span class="grow">
                Evening heads-up
                <span class="sub">Tomorrow’s outfit the night before</span>
              </span>
              <input type="checkbox" class="check" checked={evening} onChange={(e) => patchNotify({ evening: e.currentTarget.checked, eveningTime: n.eveningTime || DEFAULT_EVENING })} />
            </label>
            {evening && (
              <label class="row-item plain">
                <span class="grow">Evening time</span>
                <input type="time" value={n.eveningTime || DEFAULT_EVENING} onChange={(e) => patchNotify({ eveningTime: e.currentTarget.value || n.eveningTime || DEFAULT_EVENING })} />
              </label>
            )}
            <label class="row-item plain">
              <span class="grow">
                Tell me if the day changes
                <span class="sub">One extra note at most, if the advice shifts</span>
              </span>
              <input type="checkbox" class="check" checked={n.changeAlerts === true} onChange={(e) => patchNotify({ changeAlerts: e.currentTarget.checked })} />
            </label>
            <div class="row-item plain notify-preview">
              <span class="grow">
                <span class="sub">{preview.real ? 'This morning’s would read' : 'It reads like this'}</span>
                <span class="notify-sample">{preview.text}</span>
              </span>
            </div>
          </>
        )}
      </div>
      <p id="notify-foot" class={status === 'error' || status === 'denied' ? 'group-foot notify-alert' : 'group-foot'} role="status">
        {footnote(status, message, n.time || DEFAULT_MORNING)}
      </p>
    </>
  );
}

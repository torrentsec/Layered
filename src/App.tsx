// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { FunctionComponent } from 'preact';
import { signal } from '@preact/signals';
import { href, route, type Tab } from './router';
import { Today } from './screens/Today';
import { Onboarding, settleOnboarding } from './screens/Onboarding';
import { onboarded } from './data/store';
import { ToastHost } from './components/Toast';
import { InstallHint } from './components/InstallHint';
import { SettingsIcon, TodayIcon, TripIcon, WardrobeIcon, WeekIcon } from './components/Icons';

interface TabDef {
  id: Tab;
  label: string;
  icon: FunctionComponent;
  load: () => Promise<FunctionComponent>;
}

// Settled once at start-up, so adding a place during the flow doesn't end it early.
settleOnboarding();

// Only Today ships in the start-up bundle; the other tabs load on first visit.
// The service worker precaches every chunk, so after install the switch is local.
const TAB_DEFS: TabDef[] = [
  { id: 'today', label: 'Today', icon: TodayIcon, load: () => Promise.resolve(Today) },
  { id: 'week', label: 'Week', icon: WeekIcon, load: () => import('./screens/Week').then((m) => m.Week) },
  { id: 'trip', label: 'Trip', icon: TripIcon, load: () => import('./screens/Trip').then((m) => m.Trip) },
  { id: 'wardrobe', label: 'Wardrobe', icon: WardrobeIcon, load: () => import('./screens/Wardrobe').then((m) => m.Wardrobe) },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, load: () => import('./screens/Settings').then((m) => m.Settings) },
];

const screens = signal<Partial<Record<Tab, FunctionComponent>>>({ today: Today });
/** The tab whose chunk failed to arrive, typically offline before the service worker cached it. */
const failed = signal<Tab | null>(null);
const pending = new Set<Tab>();

function loadScreen(def: TabDef): void {
  if (screens.peek()[def.id] || pending.has(def.id)) return;
  pending.add(def.id);
  failed.value = null;
  def
    .load()
    .then((screen) => {
      screens.value = { ...screens.peek(), [def.id]: screen };
    })
    .catch(() => {
      failed.value = def.id;
    })
    .finally(() => pending.delete(def.id));
}

export function App() {
  if (!onboarded.value) {
    return (
      <>
        <Onboarding />
        <ToastHost />
      </>
    );
  }
  const r = route.value;
  const active = TAB_DEFS.find((t) => t.id === r.tab) ?? TAB_DEFS[0];
  const Screen = screens.value[active.id];
  const broken = !Screen && failed.value === active.id;
  if (!Screen && !broken) loadScreen(active);
  return (
    <>
      <div class="app">
        {Screen && <Screen key={active.id} />}
        {broken && (
          <div class="empty" role="alert">
            <h2>Couldn’t open {active.label}</h2>
            <p>It needs a connection the first time. Check you’re online.</p>
            <button type="button" class="btn" onClick={() => loadScreen(active)}>
              Try again
            </button>
          </div>
        )}
      </div>
      {TAB_DEFS.length > 1 && (
        <nav class="tabbar" aria-label="Sections">
          {TAB_DEFS.map((t) => (
            <a key={t.id} href={href(t.id)} aria-current={t.id === active.id ? 'page' : undefined}>
              <t.icon />
              {t.label}
            </a>
          ))}
        </nav>
      )}
      <ToastHost />
      <InstallHint />
    </>
  );
}

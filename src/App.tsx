// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { FunctionComponent } from 'preact';
import { href, route, type Tab } from './router';
import { Today } from './screens/Today';
import { Week } from './screens/Week';
import { Settings } from './screens/Settings';
import { Trip } from './screens/Trip';
import { Wardrobe } from './screens/Wardrobe';
import { Onboarding, settleOnboarding } from './screens/Onboarding';
import { onboarded } from './data/store';
import { ToastHost } from './components/Toast';
import { InstallHint } from './components/InstallHint';
import { SettingsIcon, TodayIcon, TripIcon, WardrobeIcon, WeekIcon } from './components/Icons';

interface TabDef {
  id: Tab;
  label: string;
  icon: FunctionComponent;
  screen: FunctionComponent;
}

// Settled once at start-up, so adding a place during the flow doesn't end it early.
settleOnboarding();

const TAB_DEFS: TabDef[] = [
  { id: 'today', label: 'Today', icon: TodayIcon, screen: Today },
  { id: 'week', label: 'Week', icon: WeekIcon, screen: Week },
  { id: 'trip', label: 'Trip', icon: TripIcon, screen: Trip },
  { id: 'wardrobe', label: 'Wardrobe', icon: WardrobeIcon, screen: Wardrobe },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, screen: Settings },
];

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
  const Screen = active.screen;
  return (
    <>
      <div class="app">
        <Screen key={active.id} />
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

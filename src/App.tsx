// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { FunctionComponent } from 'preact';
import { href, route, type Tab } from './router';
import { Today } from './screens/Today';
import { Week } from './screens/Week';
import { ToastHost } from './components/Toast';
import { TodayIcon, WeekIcon } from './components/Icons';

interface TabDef {
  id: Tab;
  label: string;
  icon: FunctionComponent;
  screen: FunctionComponent;
}

const TAB_DEFS: TabDef[] = [
  { id: 'today', label: 'Today', icon: TodayIcon, screen: Today },
  { id: 'week', label: 'Week', icon: WeekIcon, screen: Week },
];

export function App() {
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
    </>
  );
}

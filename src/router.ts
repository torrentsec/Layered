// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { signal } from '@preact/signals';

export type Tab = 'today' | 'week' | 'trip' | 'wardrobe' | 'settings';
export const TABS: Tab[] = ['today', 'week', 'trip', 'wardrobe', 'settings'];

export interface Route {
  tab: Tab;
  /** e.g. a day in Week ("2026-11-27") or a trip id. */
  param?: string;
}

function parse(hash: string): Route {
  const [tab, param] = hash.replace(/^#\/?/, '').split('/');
  return { tab: (TABS as string[]).includes(tab) ? (tab as Tab) : 'today', param: param || undefined };
}

export const route = signal<Route>(parse(location.hash));

addEventListener('hashchange', () => {
  route.value = parse(location.hash);
});

export function href(tab: Tab, param?: string): string {
  return `#/${tab}${param ? `/${param}` : ''}`;
}

export function go(tab: Tab, param?: string): void {
  location.hash = href(tab, param);
}

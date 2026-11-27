// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

const SECTION: Record<string, string> = { week: 'Week', trip: 'Trips', wardrobe: 'Wardrobe', settings: 'Settings' };

/** Document title per section (WCAG 2.4.2). Today is the app itself, so it keeps the bare name. */
export function docTitle(tab: string): string {
  return SECTION[tab] ? `${SECTION[tab]} · Layered` : 'Layered';
}

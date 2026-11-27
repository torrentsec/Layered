// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { THICKNESSES, type Category, type CategoryId, type Inventory, type InventoryEntry, type Thickness } from '../engine/inventory';

/** Thicknesses a category records counts for; untyped categories use one "medium" count. */
export const thicknessesOf = (cat: Category): Thickness[] => (cat.thickness ? THICKNESSES : ['medium']);

const hasDetails = (e: InventoryEntry): boolean =>
  e.insulation !== undefined || e.water !== undefined || e.wind !== undefined || !!e.material?.length || !!e.nickname;

/** Drops an entry that no longer says anything, so it reads as "not set" again. */
const tidy = (e: InventoryEntry): InventoryEntry | undefined => (Object.keys(e.counts).length || hasDetails(e) ? e : undefined);

/**
 * Moves one count up or down. Counts are whole and never below 0. Stepping
 * down from "not set" leaves it not set: only an explicit "Don't own" or a
 * step down from 1 records a 0.
 */
export function stepCount(e: InventoryEntry | undefined, t: Thickness, delta: 1 | -1): InventoryEntry {
  const base: InventoryEntry = e ?? { counts: {} };
  const cur = base.counts[t];
  if (cur === undefined && delta < 0) return base;
  const next = Math.max(0, Math.round((cur ?? 0) + delta));
  return { ...base, counts: { ...base.counts, [t]: next } };
}

export function dontOwn(e: InventoryEntry | undefined, cat: Category): InventoryEntry {
  return { ...(e ?? {}), counts: Object.fromEntries(thicknessesOf(cat).map((t) => [t, 0])) };
}

/** Back to "not set". Details such as a nickname survive, since they aren't counts. */
export function clearCounts(e: InventoryEntry | undefined): InventoryEntry | undefined {
  return e ? tidy({ ...e, counts: {} }) : undefined;
}

export function patchDetails(e: InventoryEntry | undefined, patch: Partial<Omit<InventoryEntry, 'counts'>>): InventoryEntry | undefined {
  const next: InventoryEntry = { ...(e ?? { counts: {} }), ...patch };
  for (const k of ['insulation', 'water', 'wind', 'material', 'nickname'] as const) {
    const v = next[k];
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) delete next[k];
  }
  return tidy(next);
}

export function withEntry(inv: Inventory, id: CategoryId, e: InventoryEntry | undefined): Inventory {
  const next = { ...inv };
  if (e) next[id] = e;
  else delete next[id];
  return next;
}

/** One-line status for a category row. */
export function summarise(e: InventoryEntry | undefined, cat: Category): string {
  const ts = thicknessesOf(cat);
  const known = ts.filter((t) => e?.counts[t] !== undefined);
  if (!known.length) return 'Not set';
  const owned = ts.filter((t) => (e!.counts[t] ?? 0) > 0);
  if (!owned.length) return known.length === ts.length ? 'Don’t own' : 'Partly set';
  if (!cat.thickness) return String(e!.counts.medium);
  return owned.map((t) => `${e!.counts[t]} ${t}`).join(' · ');
}

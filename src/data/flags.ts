// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * Innovation-Sprint prototypes, off unless asked for (docs/process.md,
 * Innovation Sprints: production behaviour doesn't change). A flag is turned
 * on with `?flags=a,b` in the URL and remembered on this device only, so a demo
 * survives reloads and hash navigation; `?flags=` turns them all off.
 */
export const FLAGS = ['feels-in-clothes', 'site-street', 'site-shade'] as const;
export type Flag = (typeof FLAGS)[number];

export const FLAGS_KEY = 'layered:flags';

const known = (s: string): s is Flag => (FLAGS as readonly string[]).includes(s);

/** The known flags in a comma list; unknown names are dropped so a typo never turns something odd on. */
export function parseFlags(raw: string | null | undefined): Set<Flag> {
  return new Set((raw ?? '').split(',').map((s) => s.trim()).filter(known));
}

interface FlagEnv {
  search: string;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}

function browserEnv(): FlagEnv | undefined {
  if (typeof location === 'undefined') return undefined;
  let storage: FlagEnv['storage'];
  // Private browsing or blocked site data throws on access; flags then last for the page only.
  try {
    storage = localStorage;
  } catch {
    storage = undefined;
  }
  return { search: location.search, storage };
}

/** Flags in force: the URL wins and is remembered; otherwise what was remembered. */
export function activeFlags(env: FlagEnv | undefined = browserEnv()): Set<Flag> {
  if (!env) return new Set();
  const asked = new URLSearchParams(env.search).get('flags');
  try {
    if (asked !== null) {
      const set = parseFlags(asked);
      if (set.size) env.storage?.setItem(FLAGS_KEY, [...set].join(','));
      else env.storage?.removeItem(FLAGS_KEY);
      return set;
    }
    return parseFlags(env.storage?.getItem(FLAGS_KEY));
  } catch {
    return asked !== null ? parseFlags(asked) : new Set();
  }
}

let cached: Set<Flag> | undefined;

export function flagOn(name: Flag): boolean {
  cached ??= activeFlags();
  return cached.has(name);
}

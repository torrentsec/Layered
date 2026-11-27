// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/** Which engine dresses you: the thermal model, or the Sprint 5 temperature bands. */
export type EngineChoice = 'science' | 'bands';

export const DEFAULT_ENGINE: EngineChoice = 'science';

/**
 * The engine in force. Anything but an explicit 'bands' means the thermal
 * model, so people who never touched the setting, older saved settings and
 * older push subscriptions all get the default.
 */
export function engineOf(s: { engine?: unknown } | null | undefined): EngineChoice {
  return s?.engine === 'bands' ? 'bands' : DEFAULT_ENGINE;
}

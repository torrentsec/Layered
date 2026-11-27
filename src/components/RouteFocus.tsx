// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { useEffect, useRef } from 'preact/hooks';
import { route } from '../router';
import { docTitle } from '../data/doc-title';

/**
 * Names the document after the current section (WCAG 2.4.2). After an in-app
 * navigation that removed the focused control (a list row, a Back button),
 * focus would fall to <body>; it goes to the new screen's heading instead, so
 * keyboard and screen reader users carry on from the top (WCAG 2.4.3).
 */
export function RouteFocus() {
  const { tab, param } = route.value;
  const first = useRef(true);

  useEffect(() => {
    document.title = docTitle(tab);
  }, [tab]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (document.activeElement && document.activeElement !== document.body) return;
    document.querySelector<HTMLElement>('.large-title')?.focus({ preventScroll: true });
  }, [tab, param]);

  return null;
}

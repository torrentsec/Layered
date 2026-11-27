// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { render } from 'preact';
import './styles/app.css';
import { App } from './App';
import { initTheme } from './theme';
import { printBanner } from './banner';
import { runWardrobeMigration } from './data/migrate';
import { startHistory } from './state/history';

runWardrobeMigration();
initTheme();
printBanner();
startHistory();
render(<App />, document.getElementById('app')!);
// Resubscribing can wait until the page has loaded; importing it eagerly would
// bring the whole Notifications section into the start-up bundle.
addEventListener(
  'load',
  () => void import('./screens/settings/Notifications').then((m) => m.watchPushSettings()),
  { once: true },
);

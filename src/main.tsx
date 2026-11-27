// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { render } from 'preact';
import './styles/app.css';
import { App } from './App';
import { initTheme } from './theme';
import { printBanner } from './banner';
import { runWardrobeMigration } from './data/migrate';

runWardrobeMigration();
initTheme();
printBanner();
render(<App />, document.getElementById('app')!);

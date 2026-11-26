// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { render } from 'preact';
import './styles/app.css';
import { App } from './App';
import { initTheme } from './theme';
import { printBanner } from './banner';

initTheme();
printBanner();
render(<App />, document.getElementById('app')!);

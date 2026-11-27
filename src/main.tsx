// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { render } from 'preact';
import './styles/app.css';
// One stylesheet per feature, so parallel work never collides at the end of a shared file.
import './styles/advice.css';
import './styles/wardrobe.css';
import './styles/forecast.css';
import './styles/notifications.css';
import './styles/routines.css';
import { App } from './App';
import { initTheme } from './theme';
import { printBanner } from './banner';
import { runWardrobeMigration } from './data/migrate';
import { watchPushSettings } from './screens/settings/Notifications';
import { startHistory } from './state/history';

runWardrobeMigration();
initTheme();
printBanner();
watchPushSettings();
startHistory();
render(<App />, document.getElementById('app')!);

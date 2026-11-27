// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { TitleBar } from '../components/TitleBar';
import { AboutSection } from './settings/About';
import { AppearanceSection } from './settings/Appearance';
import { ComfortSection } from './settings/Comfort';
import { DataSection } from './settings/Data';
import { DefaultsSection } from './settings/Defaults';
import { PlacesSection } from './settings/Places';
import { UnitsSection } from './settings/Units';

// Each section owns its own state and file, so features can add sections
// without touching their neighbours.
export function Settings() {
  return (
    <>
      <TitleBar short="Settings" title="Settings" />
      <main>
        <PlacesSection />
        <UnitsSection />
        <DefaultsSection />
        <ComfortSection />
        <AppearanceSection />
        <DataSection />
        <AboutSection />
      </main>
    </>
  );
}

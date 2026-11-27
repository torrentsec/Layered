// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { TitleBar } from '../components/TitleBar';
import { AboutSection } from './settings/About';
import { AppearanceSection } from './settings/Appearance';
import { ComfortSection } from './settings/Comfort';
import { DataSection } from './settings/Data';
import { DefaultsSection } from './settings/Defaults';
import { NotificationsSection } from './settings/Notifications';
import { PlacesSection } from './settings/Places';
import { RecordSection } from './settings/Record';
import { RoutinesSection } from './settings/Routines';
import { SyncSection } from './settings/Sync';
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
        <NotificationsSection />
        <RoutinesSection />
        <ComfortSection />
        <RecordSection />
        <AppearanceSection />
        <SyncSection />
        <DataSection />
        <AboutSection />
      </main>
    </>
  );
}

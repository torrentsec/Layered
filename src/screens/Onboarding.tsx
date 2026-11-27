// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { useEffect, useRef, useState } from 'preact/hooks';
import type { Place } from '../data/openmeteo';
import { locate } from '../data/location';
import { here, onboarded, patchSettings, places } from '../data/store';
import { go } from '../router';
import { PlaceSearch } from '../components/PlaceSheet';
import { haptic } from '../components/haptics';
import { PreferenceRows, SensitivityPicker } from './settings/Comfort';

const STEPS = 3;

/** True when nothing suggests this device has been used before (US-006). */
export function needsOnboarding(): boolean {
  return !onboarded.value && places.value.length === 0 && here.value === null;
}

/** Existing users skip the flow without being asked. */
export function settleOnboarding(): void {
  if (!onboarded.value && !needsOnboarding()) onboarded.value = true;
}

function finish(): void {
  onboarded.value = true;
  go('today');
}

export function Onboarding() {
  const [step, setStep] = useState(1);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Move focus with the step so screen readers announce where they are, but not on first load.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const next = () => (step < STEPS ? setStep(step + 1) : finish());

  const useHere = async () => {
    setLocating(true);
    setErr(null);
    try {
      here.value = await locate();
      patchSettings({ placeId: 'here' });
      setChosen('Current location');
      haptic();
      setStep(2);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLocating(false);
    }
  };

  const pick = (p: Place) => {
    if (!places.value.some((x) => x.id === p.id)) places.value = [...places.value, { ...p, kind: 'home' }];
    patchSettings({ placeId: p.id });
    setChosen(p.name);
    haptic();
    setStep(2);
  };

  return (
    <div class="app" style={{ paddingTop: 'calc(16px + var(--safe-top))', paddingBottom: 'calc(24px + var(--safe-bottom))' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px' }}>
        <span class="small-print" style={{ margin: 0 }}>Step {step} of {STEPS}</span>
        <button type="button" class="text-btn" onClick={finish}>Skip setup</button>
      </header>
      <main>
        {step === 1 && (
          <section aria-labelledby="ob-h">
            <h1 id="ob-h" ref={heading} tabIndex={-1} class="large-title">Where are you?</h1>
            <p>Layered reads the forecast for one place and tells you what to wear.</p>
            <button type="button" class="btn wide" onClick={useHere} disabled={locating} style={{ marginTop: '8px' }}>
              {locating ? 'Finding you…' : 'Use my location'}
            </button>
            <p class="small-print">Only used to fetch your forecast. Rounded to about 1 km and kept on this device.</p>
            {err && <p role="alert" class="stale">{err}</p>}
            <PlaceSearch onPick={pick} label="Or search for a place" />
          </section>
        )}
        {step === 2 && (
          <section aria-labelledby="ob-h">
            <h1 id="ob-h" ref={heading} tabIndex={-1} class="large-title">How do you feel the cold?</h1>
            {chosen && <p class="small-print" aria-live="polite">Forecast for {chosen}.</p>}
            <p>This sets your starting point. You can fine-tune it in Settings.</p>
            <SensitivityPicker />
          </section>
        )}
        {step === 3 && (
          <section aria-labelledby="ob-h">
            <h1 id="ob-h" ref={heading} tabIndex={-1} class="large-title">Anything else?</h1>
            <p>All optional. Leave anything you’re not sure about.</p>
            <PreferenceRows />
            <p class="small-print">Add what you own in Wardrobe whenever you like. Advice works without it.</p>
          </section>
        )}
        <div style={{ display: 'grid', gap: '8px', marginTop: '24px' }}>
          {step > 1 && (
            <button type="button" class="btn wide" onClick={next}>{step === STEPS ? 'Done' : 'Continue'}</button>
          )}
          <button type="button" class="btn secondary wide" onClick={next}>{step === STEPS ? 'Skip' : 'Skip this step'}</button>
        </div>
      </main>
    </div>
  );
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { useEffect, useState } from 'preact/hooks';
import type { Forecast } from '../data/forecast-types';
import { longDate } from '../data/format';
import { ratings, settings, inventory, comfort } from '../data/store';
import { fmtTemp } from '../data/units';
import { layerText } from '../data/advice-text';
import type { Activity } from '../engine/types';
import { planDay } from '../state/advice';
import { haptic } from './haptics';
import { loadPosterFonts, posterFilename, renderPoster, type PosterData } from './poster';
import { toast } from './Toast';

interface Props {
  forecast: Forecast;
  date: string;
  place: string;
  activity: Activity;
  duration: number;
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  // Revoking straight away can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function SharePoster({ forecast, date, place, activity, duration }: Props) {
  const [busy, setBusy] = useState(false);

  // Fonts load ahead of the tap so the share sheet opens inside the user's
  // gesture window; Safari refuses navigator.share once that has lapsed.
  useEffect(() => {
    void loadPosterFonts();
  }, []);

  const onShare = async () => {
    haptic();
    const s = settings.value;
    const plan = planDay(forecast, date, { settings: s, ratings: ratings.value, inventory: inventory.value, comfort: comfort.value, activity, duration });
    if (!plan) {
      toast('Nothing to share yet');
      return;
    }
    const a = plan.advice;
    const data: PosterData = {
      place,
      dateLabel: longDate(date),
      feelsLabel: `Feels ${fmtTemp(a.minFeels, s.units.temp)} / ${fmtTemp(a.maxFeels, s.units.temp)}`,
      verdict: a.verdict,
      layers: a.layers.map((l) => ({
        kind: l.kind,
        label: `${layerText(l).title}${l.optional ? ', optional' : ''}`,
      })),
      feels: a.effective,
      rain: Math.max(0, ...a.hours.map((h) => h.precipProb)),
    };
    const name = posterFilename(date);
    setBusy(true);
    let blob: Blob | null = null;
    try {
      blob = await renderPoster(data);
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Layered · ${place}` });
      } else {
        download(blob, name);
        toast('Poster saved');
      }
    } catch (e) {
      const err = e as DOMException;
      if (err?.name === 'AbortError') return;
      if (err?.name === 'NotAllowedError' && blob) {
        download(blob, name);
        toast('Poster saved');
        return;
      }
      toast('Couldn’t make the poster');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" class="text-btn" onClick={() => void onShare()} disabled={busy} aria-label="Share today as a poster">
      Share
    </button>
  );
}

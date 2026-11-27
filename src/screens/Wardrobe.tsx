// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import '../styles/wardrobe.css';
import { useEffect, useId, useState } from 'preact/hooks';
import {
  CATALOGUE,
  category,
  ownership,
  type Category,
  type CategoryId,
  type Group,
  type InventoryEntry,
  type Level,
  type Material,
  type Thickness,
  type WaterResistance,
} from '../engine/inventory';
import { comfort, inventory, ratings, settings } from '../data/store';
import { missingForToday, type Gap } from '../engine/gaps';
import { localNow } from '../engine/time';
import { currentPlace, forecastState, loadForecast } from '../state/forecast';
import { planDay } from '../state/advice';
import { route } from '../router';
import { clearCounts, dontOwn, patchDetails, stepCount, summarise, thicknessesOf, withEntry } from '../data/inventory-edit';
import { TitleBar } from '../components/TitleBar';
import { Sheet } from '../components/Sheet';
import { Segmented } from '../components/Segmented';
import { LayerMark } from '../components/Marks';
import { haptic } from '../components/haptics';

const GROUPS: { id: Group; label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'mid', label: 'Mid' },
  { id: 'outer', label: 'Outer' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'footwear', label: 'Footwear' },
  { id: 'accessory', label: 'Accessories' },
];

const THICK_LABEL: Record<Thickness, string> = { thin: 'Thin', medium: 'Medium', thick: 'Thick' };
const LEVELS: Level[] = ['low', 'medium', 'high'];
const WATER: WaterResistance[] = ['none', 'resistant', 'waterproof'];
const MATERIALS: Material[] = ['wool', 'cotton', 'synthetic', 'fleece', 'down'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (name: string) => (name.endsWith('s') ? name : `${name}s`).toLowerCase();

const save = (id: CategoryId, e: InventoryEntry | undefined) => {
  inventory.value = withEntry(inventory.value, id, e);
};

const isCategory = (s?: string): s is CategoryId => CATALOGUE.some((c) => c.id === s);
const rowId = (id: CategoryId) => `wd-cat-${id}`;

/** Today's gaps, with the default activity, once a forecast is to hand. */
function todaysGaps(): Gap[] {
  const f = forecastState.value.forecast;
  if (!currentPlace.value || !f) return [];
  const plan = planDay(f, localNow(f.utcOffsetSeconds).slice(0, 10), { settings: settings.value, ratings: ratings.value, inventory: inventory.value, comfort: comfort.value });
  return plan?.advice.requirements ? missingForToday(plan.advice.requirements, inventory.value) : [];
}

export function Wardrobe() {
  const param = route.value.param;
  const [open, setOpen] = useState<CategoryId | null>(isCategory(param) ? param : null);
  const [details, setDetails] = useState<CategoryId | null>(null);
  const inv = inventory.value;
  const set = CATALOGUE.filter((c) => ownership(inv, c.id) !== 'unknown').length;
  const total = CATALOGUE.length;
  const gaps = todaysGaps();

  useEffect(() => {
    void loadForecast();
  }, [currentPlace.value?.id]);

  // Opened from a link such as #/wardrobe/gloves: bring that row into view.
  useEffect(() => {
    if (!isCategory(param)) return;
    setOpen(param);
    document.getElementById(rowId(param))?.scrollIntoView({ block: 'center' });
  }, [param]);

  const openGap = (id: CategoryId) => {
    setOpen(id);
    requestAnimationFrame(() => {
      const row = document.getElementById(rowId(id));
      row?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? ('instant' as ScrollBehavior) : 'smooth' });
      row?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    });
  };

  return (
    <>
      <TitleBar short="Wardrobe" title="Wardrobe" />
      <main>
        {set === 0 && (
          <div class="empty wd-empty">
            <h2>No wardrobe needed</h2>
            <p>Layered gives sound advice without one. Set the categories you like and it will suggest from what you own.</p>
          </div>
        )}
        {gaps.length > 0 && (
          <section class="card wd-gaps" aria-labelledby="wd-gaps-title">
            <h2 id="wd-gaps-title">Set these to improve today’s advice</h2>
            <ul>
              {gaps.map((g) => (
                <li key={g.id}>
                  <button type="button" class="wd-gap" onClick={() => openGap(g.id)}>
                    <span class="grow">
                      {category(g.id).name}
                      <span class="sub">{g.reason}</span>
                    </span>
                    <span class="wd-chev" aria-hidden="true">
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section class="card wd-progress" aria-label="Wardrobe completeness">
          <p class="wd-progress-line">
            <strong class="num">{set}</strong> of <span class="num">{total}</span> categories set
          </p>
          <progress max={total} value={set} aria-label={`${set} of ${total} categories set`} />
          <p class="small-print">“Not set” gets general advice. “Don’t own” means Layered won’t suggest it. Changes save as you go.</p>
        </section>
        {GROUPS.map((g) => (
          <section key={g.id} aria-labelledby={`wg-${g.id}`}>
            <h2 class="group-title" id={`wg-${g.id}`}>
              {g.label}
            </h2>
            <ul class="group wd-list">
              {CATALOGUE.filter((c) => c.group === g.id).map((c) => (
                <CategoryRow
                  key={c.id}
                  cat={c}
                  entry={inv[c.id]}
                  open={open === c.id}
                  onToggle={() => setOpen(open === c.id ? null : c.id)}
                  onDetails={() => setDetails(c.id)}
                />
              ))}
            </ul>
          </section>
        ))}
      </main>
      {details && <DetailsSheet cat={category(details)} entry={inv[details]} onClose={() => setDetails(null)} />}
    </>
  );
}

function CategoryRow({ cat, entry, open, onToggle, onDetails }: { cat: Category; entry?: InventoryEntry; open: boolean; onToggle: () => void; onDetails: () => void }) {
  const id = useId();
  const status = summarise(entry, cat);
  const state = ownership({ [cat.id]: entry }, cat.id);
  return (
    <li class="wd-cat" id={rowId(cat.id)}>
      <button type="button" class="row-item" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <LayerMark kind={cat.group} />
        <span class="grow">
          {cat.name}
          {cat.description && <span class="sub">{cat.description}</span>}
          {entry?.nickname && <span class="sub">“{entry.nickname}”</span>}
        </span>
        <span class="meta wd-status" data-state={state}>
          {status}
        </span>
        <span class="meta wd-chev" aria-hidden="true">
          ›
        </span>
      </button>
      {open && (
        <div class="wd-edit" id={id}>
          {cat.thickness && <p class="small-print">Thickness is a rough guide to warmth, not a measurement.</p>}
          {thicknessesOf(cat).map((t) => (
            <Stepper key={t} cat={cat} entry={entry} t={t} />
          ))}
          <div class="wd-actions">
            <button type="button" class="btn secondary" aria-pressed={state === 'none'} onClick={() => save(cat.id, dontOwn(entry, cat))}>
              Don’t own
            </button>
            <button type="button" class="btn secondary" disabled={status === 'Not set'} onClick={() => save(cat.id, clearCounts(entry))}>
              Clear
            </button>
            <button type="button" class="text-btn wd-more" onClick={onDetails}>
              Details
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Stepper({ cat, entry, t }: { cat: Category; entry?: InventoryEntry; t: Thickness }) {
  const id = useId();
  const n = entry?.counts[t];
  const what = cat.thickness ? `${t} ${plural(cat.name)}` : plural(cat.name);
  const canDown = n !== undefined && n > 0;
  const step = (d: 1 | -1) => {
    if (d < 0 && !canDown) return;
    haptic();
    save(cat.id, stepCount(entry, t, d));
  };
  return (
    <div class="wd-step" role="group" aria-labelledby={id}>
      <span class="grow">
        <span id={id}>{cat.thickness ? THICK_LABEL[t] : 'How many'}</span>
        {cat.examples && <span class="sub">{cat.examples[t]}</span>}
      </span>
      <button type="button" class="wd-btn" aria-label={`Fewer ${what}`} aria-disabled={!canDown} onClick={() => step(-1)}>
        −
      </button>
      <output class="wd-count num" aria-live="polite" data-unset={n === undefined}>
        {n === undefined ? 'Not set' : n}
      </output>
      <button type="button" class="wd-btn" aria-label={`More ${what}`} onClick={() => step(1)}>
        +
      </button>
    </div>
  );
}

function DetailsSheet({ cat, entry, onClose }: { cat: Category; entry?: InventoryEntry; onClose: () => void }) {
  const matId = useId();
  const patch = (p: Partial<Omit<InventoryEntry, 'counts'>>) => save(cat.id, patchDetails(entry, p));
  const mats = entry?.material ?? [];
  return (
    <Sheet open title={cat.name} onClose={onClose}>
      <p class="small-print wd-sheet-lead">All optional. Anything not set uses Layered’s usual guess for {plural(cat.name)}.</p>
      <div class="field">
        <span>Insulation</span>
        <Segmented<string>
          label="Insulation"
          value={entry?.insulation ?? ''}
          options={[{ value: '', label: 'Not set' }, ...LEVELS.map((l) => ({ value: l, label: cap(l) }))]}
          onChange={(v) => patch({ insulation: (v || undefined) as Level | undefined })}
        />
        <span class="small-print">How warm it is for its thickness. Overrides the guess from thickness.</span>
      </div>
      <div class="field">
        <span>Water resistance</span>
        <Segmented<string>
          label="Water resistance"
          value={entry?.water ?? ''}
          options={[{ value: '', label: 'Not set' }, ...WATER.map((w) => ({ value: w, label: cap(w) }))]}
          onChange={(v) => patch({ water: (v || undefined) as WaterResistance | undefined })}
        />
        <span class="small-print">If not set: {cat.defaults.water}.</span>
      </div>
      <div class="field">
        <span>Wind resistance</span>
        <Segmented<string>
          label="Wind resistance"
          value={entry?.wind ?? ''}
          options={[{ value: '', label: 'Not set' }, ...LEVELS.map((l) => ({ value: l, label: cap(l) }))]}
          onChange={(v) => patch({ wind: (v || undefined) as Level | undefined })}
        />
        <span class="small-print">If not set: {cat.defaults.wind}.</span>
      </div>
      <div class="field">
        <span id={matId}>Materials</span>
        <div class="wd-mats" role="group" aria-labelledby={matId}>
          {MATERIALS.map((m) => {
            const on = mats.includes(m);
            return (
              <button key={m} type="button" aria-pressed={on} onClick={() => patch({ material: on ? mats.filter((x) => x !== m) : [...mats, m] })}>
                {cap(m)}
              </button>
            );
          })}
        </div>
      </div>
      {cat.group === 'outer' && (
        <label class="field">
          <span>Nickname</span>
          <input type="text" value={entry?.nickname ?? ''} placeholder="navy puffer" maxLength={40} autocomplete="off" onInput={(e) => patch({ nickname: e.currentTarget.value.trimStart() })} />
          <span class="small-print">Advice will say “your {entry?.nickname?.trim() || 'navy puffer'}”.</span>
        </label>
      )}
      <div class="sheet-actions">
        <button type="button" class="btn" onClick={onClose}>
          Done
        </button>
      </div>
    </Sheet>
  );
}

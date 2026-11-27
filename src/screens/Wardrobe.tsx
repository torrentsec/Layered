// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { useState } from 'preact/hooks';
import type { ItemKind, WardrobeItem } from '../engine/types';
import { uid, wardrobe } from '../data/store';
import { TitleBar } from '../components/TitleBar';
import { Sheet } from '../components/Sheet';
import { Segmented } from '../components/Segmented';
import { LayerMark } from '../components/Marks';

const KINDS: { value: ItemKind; label: string; hint: string }[] = [
  { value: 'base', label: 'Base', hint: 'T-shirts, long sleeves, thermals' },
  { value: 'mid', label: 'Mid', hint: 'Jumpers, fleeces, overshirts' },
  { value: 'outer', label: 'Outer', hint: 'Jackets and coats' },
  { value: 'accessory', label: 'Extras', hint: 'Hats, gloves, scarves, umbrellas' },
];

const WARMTH = ['Very light', 'Light', 'Medium', 'Warm', 'Very warm'];

const blank = (layer: ItemKind = 'outer'): WardrobeItem => ({ id: uid(), name: '', layer, warmth: 3, waterproof: false, windproof: false });

export function Wardrobe() {
  const [editing, setEditing] = useState<WardrobeItem | null>(null);
  const items = wardrobe.value;

  const save = (item: WardrobeItem) => {
    wardrobe.value = items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item];
    setEditing(null);
  };

  return (
    <>
      <TitleBar short="Wardrobe" title="Wardrobe" action={<button type="button" class="text-btn" onClick={() => setEditing(blank())}>Add</button>} />
      <main>
        {items.length === 0 && (
          <div class="empty">
            <h2>Your clothes, by name</h2>
            <p>Add what you actually own and Layered will say “your navy puffer” instead of “warm coat”. It works fine without.</p>
            <button type="button" class="btn" onClick={() => setEditing(blank())}>Add an item</button>
          </div>
        )}
        {KINDS.map((k) => {
          const list = items.filter((i) => i.layer === k.value).sort((a, b) => a.warmth - b.warmth);
          if (!list.length) return null;
          return (
            <section key={k.value} aria-labelledby={`wk-${k.value}`}>
              <h2 class="group-title" id={`wk-${k.value}`}>{k.label}</h2>
              <ul class="group" style={{ listStyle: 'none', padding: 0 }}>
                {list.map((i) => (
                  <li key={i.id}>
                    <button type="button" class="row-item" onClick={() => setEditing(i)}>
                      <LayerMark kind={i.layer} />
                      <span class="grow">
                        {i.name}
                        <span class="sub">
                          {WARMTH[i.warmth - 1]}
                          {i.waterproof ? ' · waterproof' : ''}
                          {i.windproof ? ' · windproof' : ''}
                        </span>
                      </span>
                      {i.color && <span class="swatch" style={{ background: i.color }} aria-hidden="true" />}
                      <span class="meta" aria-hidden="true">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {items.length > 0 && <p class="group-foot">Layered picks the item whose warmth best fits the day, and prefers waterproof outerwear when rain is likely.</p>}
      </main>
      {editing && (
        <ItemEditor
          item={editing}
          isNew={!items.some((i) => i.id === editing.id)}
          onSave={save}
          onDelete={() => {
            wardrobe.value = items.filter((i) => i.id !== editing.id);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function ItemEditor({ item, isNew, onSave, onDelete, onClose }: { item: WardrobeItem; isNew: boolean; onSave: (i: WardrobeItem) => void; onDelete: () => void; onClose: () => void }) {
  const [i, setI] = useState(item);
  const kind = KINDS.find((k) => k.value === i.layer)!;
  return (
    <Sheet open title={isNew ? 'Add an item' : 'Edit item'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (i.name.trim()) onSave({ ...i, name: i.name.trim() });
        }}
      >
        <label class="field">
          <span>Name</span>
          <input type="text" required value={i.name} placeholder="Navy puffer" onInput={(e) => setI({ ...i, name: e.currentTarget.value })} />
        </label>
        <div class="field">
          <span id="layer-label">Layer</span>
          <Segmented<ItemKind> label="Layer" value={i.layer} options={KINDS.map((k) => ({ value: k.value, label: k.label }))} onChange={(layer) => setI({ ...i, layer })} />
          <span class="small-print">{kind.hint}</span>
        </div>
        <div class="field">
          <span>Warmth: {WARMTH[i.warmth - 1]}</span>
          <Segmented<number> label="Warmth" value={i.warmth} options={[1, 2, 3, 4, 5].map((w) => ({ value: w, label: String(w) }))} onChange={(w) => setI({ ...i, warmth: w as WardrobeItem['warmth'] })} />
        </div>
        <div class="group" style={{ background: 'var(--paper)' }}>
          <label class="row-item plain">
            <span class="grow">Waterproof</span>
            <input type="checkbox" class="check" checked={i.waterproof} onChange={(e) => setI({ ...i, waterproof: e.currentTarget.checked })} />
          </label>
          <label class="row-item plain">
            <span class="grow">Windproof</span>
            <input type="checkbox" class="check" checked={i.windproof} onChange={(e) => setI({ ...i, windproof: e.currentTarget.checked })} />
          </label>
          <label class="row-item plain">
            <span class="grow">Colour<span class="sub">Optional</span></span>
            <input type="color" value={i.color ?? '#1e4fa0'} onInput={(e) => setI({ ...i, color: e.currentTarget.value })} style={{ width: '44px', height: '36px', border: 0, background: 'none' }} />
          </label>
        </div>
        <div class="sheet-actions">
          {!isNew && <button type="button" class="btn danger" style={{ marginRight: 'auto' }} onClick={onDelete}>Delete</button>}
          <button type="button" class="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>
    </Sheet>
  );
}

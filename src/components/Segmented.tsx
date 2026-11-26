// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { useId } from 'preact/hooks';
import { haptic } from './haptics';

interface Props<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

/** Radio group styled as an iOS segmented control; arrow keys come free with radios. */
export function Segmented<T extends string | number>({ label, value, options, onChange }: Props<T>) {
  const name = useId();
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <fieldset class="segmented" style={{ '--n': options.length }}>
      <legend class="visually-hidden">{label}</legend>
      <span
        class="thumb"
        aria-hidden="true"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => (
        <label key={String(o.value)}>
          <input
            type="radio"
            name={name}
            checked={o.value === value}
            onChange={() => {
              haptic();
              onChange(o.value);
            }}
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}

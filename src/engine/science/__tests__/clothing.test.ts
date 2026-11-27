// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import fixture from '../__fixtures__/clothing.json';
import { CATALOGUE, THICKNESSES, type CategoryId, type Thickness } from '../../inventory';
import {
  BASE_ALLOWANCE_CLO,
  correctionFactor,
  ensembleClo,
  GARMENT_CLO,
  garmentClo,
  isEstimate,
  PERMEABILITY,
  resultantIcl,
  WET_FACTOR,
} from '../clothing';
import type { GarmentClo } from '../types';

const tol = fixture.meta.tolerance;
type FixtureGarment = { clo?: number; source: string } & Partial<Record<Thickness, number>>;
const garments = fixture.garments as unknown as Record<string, FixtureGarment>;
const asGarments = (gs: { category: string; thickness?: string }[]) => gs as GarmentClo[];
const sumOf = (gs: GarmentClo[]) => BASE_ALLOWANCE_CLO + gs.reduce((s, g) => s + garmentClo(g), 0);

describe('garment table', () => {
  it('covers every catalogue category', () => {
    for (const c of CATALOGUE) expect(GARMENT_CLO[c.id], c.id).toBeDefined();
  });

  it('has a value per thickness exactly when the catalogue has thicknesses', () => {
    for (const c of CATALOGUE) {
      expect(typeof GARMENT_CLO[c.id].clo === 'object', c.id).toBe(c.thickness);
    }
  });

  it('matches clothing.json → garments', () => {
    expect(BASE_ALLOWANCE_CLO).toBe(garments['base-allowance'].clo);
    for (const [id, row] of Object.entries(garments)) {
      if (id === 'base-allowance') continue;
      const category = id as CategoryId;
      expect(GARMENT_CLO[category].source, id).toBe(row.source);
      if (row.clo !== undefined) expect(garmentClo({ category }), id).toBe(row.clo);
      else for (const t of THICKNESSES) expect(garmentClo({ category, thickness: t }), `${id} ${t}`).toBe(row[t]);
    }
  });

  it('flags estimates where the source says so', () => {
    for (const c of CATALOGUE) {
      for (const t of THICKNESSES) {
        const source = GARMENT_CLO[c.id].source;
        if (isEstimate(c.id, t)) expect(source, `${c.id} ${t}`).toMatch(/estimate/);
      }
    }
    expect(isEstimate('tshirt', 'medium')).toBe(false);
    expect(isEstimate('tshirt', 'thick')).toBe(true);
    expect(isEstimate('fleece', 'medium')).toBe(true);
    expect(isEstimate('coat', 'thin')).toBe(true);
    expect(isEstimate('coat', 'thick')).toBe(false);
    expect(isEstimate('jeans')).toBe(false);
  });

  it('gets warmer with thickness', () => {
    for (const c of CATALOGUE.filter((x) => x.thickness)) {
      const [a, b, d] = THICKNESSES.map((t) => garmentClo({ category: c.id, thickness: t }));
      expect(a, c.id).toBeLessThan(b);
      expect(b, c.id).toBeLessThan(d);
    }
  });

  it('defaults to medium, ignores thickness where there is none, and lets an override win', () => {
    expect(garmentClo({ category: 'coat' })).toBe(0.6);
    expect(garmentClo({ category: 'jeans', thickness: 'thick' })).toBe(0.25);
    expect(garmentClo({ category: 'coat', thickness: 'thin', clo: 0.52 })).toBe(0.52);
    expect(garmentClo({ category: 'coat', clo: -1 })).toBe(0);
    expect(garmentClo({ category: 'umbrella' })).toBe(0);
  });
});

describe('ISO 9920 ensemble summation', () => {
  const rows = [...fixture.ensembles.map((e) => ({ ...e, label: e.name })), ...fixture.bandPlans.map((e) => ({ ...e, label: e.band }))];
  it.each(rows)('$label', ({ garments: gs, sumClo, icl }) => {
    const g = asGarments(gs);
    expect(sumOf(g)).toBeCloseTo(sumClo, 6);
    const e = ensembleClo(g, 0, 0, 'dry');
    expect(Math.abs(e.basic - icl)).toBeLessThanOrEqual(tol.icl);
  });

  it('is monotonic in each garment', () => {
    const plan = asGarments(fixture.bandPlans[4].garments);
    const base = ensembleClo(plan, 4, 1, 'dry');
    for (let i = 0; i < plan.length; i++) {
      const warmer = plan.map((g, j) => (j === i ? { ...g, clo: garmentClo(g) + 0.05 } : g));
      const e = ensembleClo(warmer, 4, 1, 'dry');
      expect(e.basic).toBeGreaterThan(base.basic);
      expect(e.resultant).toBeGreaterThan(base.resultant);
    }
  });

  it('counts the base allowance with nothing else worn', () => {
    expect(ensembleClo([], 0, 0, 'dry').basic).toBeCloseTo(0.835 * 0.06 + 0.161, 6);
  });
});

describe('Havenith and Nilsson correction factor', () => {
  it.each(fixture.correction.map(([icl, vr, vw, factor]) => ({ icl, vr, vw, factor })))(
    'icl $icl, vr $vr, vw $vw → $factor',
    ({ icl, vr, vw, factor }) => {
      expect(Math.abs(correctionFactor(icl, vr, vw) - factor)).toBeLessThanOrEqual(tol.factor);
    },
  );

  it('never increases with wind beyond the fixture tolerance, and is flat past the clamp', () => {
    for (const icl of [0, 0.3, 0.6, 1, 2]) {
      for (const vw of [0, 0.6, 1.2]) {
        let prev = correctionFactor(icl, 0, vw);
        for (let vr = 0; vr <= 20; vr += 0.05) {
          const f = correctionFactor(icl, vr, vw);
          expect(f, `icl ${icl} vr ${vr} vw ${vw}`).toBeLessThanOrEqual(prev + tol.factor);
          prev = f;
        }
        expect(correctionFactor(icl, 20, vw)).toBe(correctionFactor(icl, 3.5, vw));
      }
    }
  });

  it('caps walking speed at 1.2 m/s and air speed below at 0.15 m/s', () => {
    expect(correctionFactor(1, 1, 3)).toBe(correctionFactor(1, 1, 1.2));
    expect(correctionFactor(1, 0, 0)).toBe(1);
  });
});

describe('resultant insulation', () => {
  const coat = asGarments(fixture.bandPlans[4].garments);

  it('equals basic insulation standing in still air', () => {
    for (const icl of [0.2, 0.36, 0.6, 1.38, 2]) expect(resultantIcl(icl, 0.15, 0)).toBeCloseTo(icl, 9);
    const e = ensembleClo(coat, 0, 0, 'dry');
    expect(e.resultant).toBeCloseTo(e.basic, 9);
    expect(e.windLoss).toBeCloseTo(0, 9);
  });

  it('applies the ISO 9920 factor to basic insulation', () => {
    for (const icl of [0.3, 1.38]) expect(resultantIcl(icl, 2, 1)).toBeCloseTo(icl * correctionFactor(icl, 2, 1), 9);
  });

  it('scales 10 m wind by 0.68 to body height', () => {
    const e = ensembleClo(coat, 5, 0, 'dry');
    expect(e.resultant).toBeCloseTo(resultantIcl(e.basic, 3.4, 0), 9);
  });

  it('uses walking speed as the air speed in calm air', () => {
    const e = ensembleClo(coat, 0, 1.2, 'dry');
    expect(e.resultant).toBeCloseTo(resultantIcl(e.basic, 1.2, 1.2), 9);
  });

  it('loses insulation as wind and walking rise, and stops at the clamp', () => {
    let prev = Infinity;
    for (let w10 = 0; w10 <= 30; w10 += 0.5) {
      const r = ensembleClo(coat, w10, 1, 'dry').resultant;
      expect(r).toBeLessThanOrEqual(prev + tol.factor * 2);
      prev = r;
    }
    expect(ensembleClo(coat, 30, 1, 'dry').resultant).toBe(ensembleClo(coat, 3.5 / 0.68, 1, 'dry').resultant);
    expect(ensembleClo(coat, 3, 1.2, 'dry').resultant).toBeLessThan(ensembleClo(coat, 3, 0.6, 'dry').resultant);
  });

  it('reports a wind loss in the range the spike quotes for a breezy walk', () => {
    const e = ensembleClo(coat, 4.4, 1.2, 'dry'); // 3 m/s at the body
    expect(e.windLoss).toBeGreaterThan(0.25);
    expect(e.windLoss).toBeLessThan(0.6);
    expect(e.windLoss).toBeCloseTo(1 - e.resultant / e.basic, 9);
  });
});

describe('wet clothing', () => {
  const coat = asGarments(fixture.bandPlans[4].garments);
  const at = (wet: 'dry' | 'showers' | 'rain', water?: 'none' | 'resistant' | 'waterproof') =>
    ensembleClo(coat, 0, 0, wet, water ? { water, wind: 'medium' } : undefined);

  it('applies 0.85 in showers and 0.70 in rain without protection', () => {
    expect(at('showers').resultant).toBeCloseTo(at('dry').basic * 0.85, 9);
    expect(at('rain').resultant).toBeCloseTo(at('dry').basic * 0.7, 9);
    expect(at('rain', 'none').resultant).toBe(at('rain').resultant);
  });

  it('keeps basic insulation dry, since matching compares basic values', () => {
    expect(at('rain').basic).toBe(at('dry').basic);
  });

  it('is moderated by the outer layer: none < resistant < waterproof', () => {
    expect(at('rain', 'none').resultant).toBeLessThan(at('rain', 'resistant').resultant);
    expect(at('rain', 'resistant').resultant).toBeLessThan(at('rain', 'waterproof').resultant);
    expect(at('showers', 'resistant').resultant).toBeGreaterThan(at('showers', 'none').resultant);
    expect(at('rain', 'waterproof').resultant).toBeCloseTo(at('dry').basic * 0.95, 9);
  });

  it('never adds insulation and is 1 when dry', () => {
    for (const row of Object.values(WET_FACTOR)) {
      expect(row.dry).toBe(1);
      expect(row.rain).toBeLessThanOrEqual(row.showers);
      expect(row.showers).toBeLessThanOrEqual(1);
    }
  });
});

describe('permeability', () => {
  it('is 8 under a windproof or waterproof outer layer', () => {
    const shell = asGarments([{ category: 'jumper' }, { category: 'waterproof-jacket' }]);
    expect(ensembleClo(shell, 0, 0, 'dry', { water: 'waterproof', wind: 'medium' }).permeability).toBe(PERMEABILITY.shell);
    expect(ensembleClo(shell, 0, 0, 'dry', { water: 'none', wind: 'high' }).permeability).toBe(8);
  });

  it('is 1000 when knitwear is the outermost layer', () => {
    const knit = asGarments([{ category: 'longsleeve' }, { category: 'jumper' }, { category: 'jeans' }]);
    expect(ensembleClo(knit, 0, 0, 'dry').permeability).toBe(1000);
    expect(ensembleClo(knit, 0, 0, 'dry', { water: 'none', wind: 'low' }).permeability).toBe(1000);
  });

  it('is 50 otherwise', () => {
    const jacket = asGarments([{ category: 'jumper' }, { category: 'light-jacket' }]);
    expect(ensembleClo(jacket, 0, 0, 'dry', { water: 'none', wind: 'medium' }).permeability).toBe(50);
    expect(ensembleClo(asGarments([{ category: 'tshirt' }]), 0, 0, 'dry').permeability).toBe(50);
  });
});

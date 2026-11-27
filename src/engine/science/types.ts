// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

/**
 * Contracts for the physiology-based engine (docs/science/thermal-model.md).
 * Units are fixed by name: °C, m/s, %, W/m², clo. Wind is at 10 m unless the
 * name says otherwise.
 */

import type { CategoryId, Level, Thickness, WaterResistance } from '../inventory';
import type { Activity, BandId, Effort } from '../types';

/** °C, m/s, %, W/m², clo. Wind is always at 10 m unless the name says otherwise. */
export interface Weather {
  ta: number;             // air temperature, °C
  rh: number;             // relative humidity, %
  wind10: number;         // m/s at 10 m
  tmrt: number;           // mean radiant temperature, °C
  radiation: 'forecast' | 'estimated' | 'none';
}

export interface Radiation {
  /** W/m², mean over the preceding hour, horizontal plane. */
  ghi: number;
  direct: number;
  diffuse: number;
  /** W/m² on a plane normal to the sun, when the provider gives it. */
  dni?: number;
}

export interface SunPosition {
  elevation: number;      // degrees above horizon
  dayOfYear: number;
}

export type UtciCategory =
  | 'extreme-cold' | 'very-strong-cold' | 'strong-cold' | 'moderate-cold' | 'slight-cold'
  | 'none'
  | 'moderate-heat' | 'strong-heat' | 'very-strong-heat' | 'extreme-heat';

export interface UtciResult {
  utci: number;           // °C equivalent temperature
  category: UtciCategory;
  /** Inputs were clamped into the polynomial's range (wind, Tmrt − ta). */
  clamped: boolean;
  /** pa > 5 kPa: no number is trustworthy; category is extreme-heat. */
  outOfRange: boolean;
}

export interface Metabolic {
  m: number;              // W/m²
  w: number;              // external work, W/m²
  walk: number;           // m/s, already within ISO 11079's lower bound and 1.2 cap
  ride: number;           // m/s added to relative air speed (cycling), else 0
  clampedM: boolean;      // M was above 400 W/m²
}

export interface IreqParams {
  ta: number;
  tr: number;
  va: number;             // m/s relative air speed at the body
  rh: number;
  m: number;
  w?: number;             // default 0
  walk: number;
  p?: number;             // air permeability l/(m² s), default 50
  icl?: number;           // basic clo worn, for DLE; default 1.0
}

export interface IreqResult {
  ireqMin: number;        // resultant clo
  ireqNeutral: number;
  iclMin: number;         // basic clo
  iclNeutral: number;
  /** Hours; Infinity when more than 8 h. */
  dleMin: number;
  dleNeutral: number;
  /** ta > 10 °C or another ISO 11079 limit exceeded; values are an extension. */
  extended: boolean;
}

export interface GarmentClo {
  category: CategoryId;
  thickness?: Thickness;
  /** Overrides the table, from InventoryEntry.insulation or material. */
  clo?: number;
}

export interface EnsembleClo {
  basic: number;          // ISO 9920 Icl, clo
  resultant: number;      // after wind/walking and wetness, clo
  /** 1 − resultant/basic, for "Wind takes 25% off". */
  windLoss: number;
  permeability: number;   // l/(m² s) used
}

export interface ClothingTarget {
  icl: number;            // basic clo the outfit should reach (bias included)
  floor: number;          // Icl_min for the exposure
  neutral: number;        // Icl_neutral
  bias: number;           // personal bias applied
  exposureHours: number;
  basis: 'ireq' | 'ireq-extended' | 'heat-ladder';
}

export interface BiasState {
  mean: number;           // clo
  variance: number;       // clo²
  updated: string;        // YYYY-MM-DD
  count: number;
  /** Mean at the start of `updated`'s day: the reference for that day's votes, so their order does not matter. */
  dayMean?: number;
}

// Each module implements its signature; these types let call sites and tests
// be written before the implementations land.
export type UtciFn = (ta: number, tr: number, va10: number, rh: number) => UtciResult;
export type UtciCategoryFn = (utci: number) => UtciCategory;
export type IreqFn = (params: IreqParams) => IreqResult;
export type DleFn = (params: IreqParams & { icl: number }) => { min: number; neutral: number };
export type LightestIclForFn = (params: Omit<IreqParams, 'icl'>, exposureHours: number) => number;
export type MetabolicRateFn = (activity: Activity, effort?: Effort) => Metabolic;
export type GarmentCloFn = (g: GarmentClo) => number;
export type WetState = 'dry' | 'showers' | 'rain';
export type EnsembleCloFn = (
  garments: GarmentClo[],
  wind10: number,
  walk: number,
  wet: WetState,
  outer?: { water: WaterResistance; wind: Level },
) => EnsembleClo;
export type SunPositionFn = (lat: number, lon: number, utcMs: number) => SunPosition;
export type EstimateRadiationFn = (sun: SunPosition, cloud: number) => Radiation;
export type MeanRadiantTempFn = (ta: number, rh: number, cloud: number, sun: SunPosition, rad: Radiation) => number;
export type WindAtBodyFn = (wind10: number) => number;
export type ClothingTargetFn = (input: {
  hours: Weather[];
  activity: Activity;
  effort?: Effort;
  exposureHours: number;
  bias: number;
}) => ClothingTarget;
export type UpdateBiasFn = (
  state: BiasState,
  vote: -1 | 0 | 1,
  date: string,
  opts?: { wornIcl?: number; modelIcl?: number; mostlyIndoors?: boolean },
) => BiasState;
export type BandForCloFn = (icl: number) => BandId;

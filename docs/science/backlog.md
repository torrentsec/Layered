# Science engine: proposed Sprint backlog

Companion to [thermal-model.md](thermal-model.md). One Sprint, five Developers.
Contracts first: S0 is merged on day 1 so the others can build against stubs.

## Contracts (S0, merged first)

New folder `src/engine/science/`, pure TypeScript, no DOM, no network. Units are
fixed by name so no function needs a units flag.

```ts
// src/engine/science/types.ts

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
}
```

```ts
// Function signatures (one module each)
export function utci(ta: number, tr: number, va10: number, rh: number): UtciResult;                 // utci.ts
export function utciCategory(utci: number): UtciCategory;                                          // utci.ts
export function ireq(params: IreqParams): IreqResult;                                              // ireq.ts
export function dle(params: IreqParams & { icl: number }): { min: number; neutral: number };        // ireq.ts
export function lightestIclFor(params: Omit<IreqParams, 'icl'>, exposureHours: number): number;     // ireq.ts
export function metabolicRate(activity: Activity, effort?: Effort): Metabolic;                      // metabolic.ts
export function garmentClo(g: GarmentClo): number;                                                  // clothing.ts
export function ensembleClo(
  garments: GarmentClo[], wind10: number, walk: number,
  wet: 'dry' | 'showers' | 'rain', outer?: { water: WaterResistance; wind: Level },
): EnsembleClo;                                                                                     // clothing.ts
export function sunPosition(lat: number, lon: number, utcMs: number): SunPosition;                  // radiation.ts
export function estimateRadiation(sun: SunPosition, cloud: number): Radiation;                       // radiation.ts
export function meanRadiantTemp(ta: number, rh: number, cloud: number, sun: SunPosition, rad: Radiation): number; // radiation.ts
export function windAtBody(wind10: number): number;                                                 // radiation.ts (log profile, 0.68)
export function clothingTarget(input: {
  hours: Weather[]; activity: Activity; effort?: Effort; exposureHours: number; bias: number;
}): ClothingTarget;                                                                                 // target.ts
export function updateBias(state: BiasState, vote: -1 | 0 | 1, date: string, opts?: {
  wornIcl?: number; modelIcl?: number; mostlyIndoors?: boolean;
}): BiasState;                                                                                      // bias.ts
export function bandForClo(icl: number): BandId;                                                    // target.ts
```

`Hour` (in `src/engine/types.ts`) gains optional fields; every one optional so saved
forecasts and MET Norway rows stay valid:

```ts
rh?: number; cloud?: number; ghi?: number; direct?: number; diffuse?: number; dni?: number;
```

Shared-contract impact: `Hour` is read by `src/data/forecast-types.ts`,
`src/data/metno.ts`, `worker/src/*`, fixtures in `src/data/*.fixture.ts` and engine
tests. Optional fields need no call-site changes; the parsers add them.

## Stories

| # | Story | Owner | Size | Depends on |
|---|---|---|---|---|
| S0 | Science contracts, stubs and fixture loader | Dev 1 | S | — |
| S1 | UTCI polynomial and categories | Dev 2 | M | S0 |
| S2 | IREQ, DLE and lightest-clo solver | Dev 3 | L | S0 |
| S3 | Clothing table, ensemble and resultant insulation | Dev 4 | M | S0 |
| S4 | Solar position, mean radiant temperature, cloud fallback | Dev 5 | M | S0 |
| S5 | Forecast variables: Open-Meteo, MET Norway, Worker | Dev 1 | M | S0 |
| S6 | Metabolic table and effort | Dev 4 | S | S0 |
| S7 | Clothing target and verdict mapping (behind a flag) | Dev 3 | M | S1–S4, S6 |
| S8 | Personal insulation bias (Kalman) and migration from °C offsets | Dev 2 | M | S0 |
| S9 | "Why this?" in clo and UTCI | Dev 5 | S | S7 |

### S0 Science contracts, stubs and fixture loader

As a Developer I want the science types and stubs merged first so every story
builds against the same contract.

* Acceptance: `types.ts` as above; each function exported and throwing
  `not implemented`; `__fixtures__/load.ts` with typed readers for the five JSON
  files; `science/index.ts` re-exports.
* Header comment in each module credits pythermalcomfort (MIT) where formulas are
  ported.
* Tests: a smoke test that each fixture parses and has `meta.pythermalcomfort.version`.

### S1 UTCI polynomial and categories

As someone checking the forecast I want one "feels like" number that includes sun,
wind and humidity, so that a sunny calm day and a grey windy day at the same
temperature read differently.

* Port the 6th-order polynomial (Bröde et al. 2012) and the saturation-pressure
  function exactly.
* Clamp `va10` to [0.5, 17] and `tr − ta` to [−30, 70]; set `clamped`. `pa > 5 kPa`
  sets `outOfRange` and `category: 'extreme-heat'`.
* Acceptance: every `utci.json` row with `inRange: true` matches within **0.05 °C**
  and the category matches exactly (upper edge inclusive); every row with
  `inRange: false` returns `clamped` or `outOfRange`.
* Performance: 384 hours under 2 ms on a mid-range phone (bench test in Vitest,
  reported, not gated).

### S2 IREQ, DLE and lightest-clo solver

As a commuter I want advice that knows I am outside for 25 minutes, not all day.

* Port ISO 11079 Annex: both criteria, step-halving loop (start 0.5 m²K/W, step 0.5,
  stop at |B| ≤ 0.01, max 150), resultant→basic conversion, DLE with Qlim 40 W·h/m² (144 kJ/m²).
* `extended` when outside ISO limits; still compute (needed up to 20 °C).
* `lightestIclFor`: bisection on 0.3–3.0 clo for `DLE_neutral ≥ exposure`, then
  `DLE_min`; returns `iclMin` when even 3.0 clo is not enough.
* Acceptance: `ireq.json → cases` within **0.05 clo** (ireq, icl) and **0.1 h**
  (DLE; "more than 8" ↔ `Infinity`); `dleSweep` monotonic and within tolerance;
  `extrapolated` within 0.05 clo with `extended: true`.
* Unit tests for each threshold: walking-speed lower bound, M clamp, 8 h ceiling.

### S3 Clothing table, ensemble and resultant insulation

As someone with a wardrobe I want the app to know a puffer is warmer than a
denim jacket, by how much, and that wind cuts through a jumper.

* `GARMENT_CLO: Record<CategoryId, number | Record<Thickness, number>>` from
  `clothing.json → garments` (keep the source string as a comment).
* `ensembleClo`: base allowance + garments, `0.835·Σ + 0.161`, ISO 9920 dynamic
  correction with `var` clamped to [0.15, 3.5] and `vw` to [0, 1.2], wet factors
  0.85/0.70 outside the waterproof layer, permeability 8/50/1000 from the outer
  layer.
* Acceptance: `ensembles` and `bandPlans` within **0.005 clo**; every
  `correction` row within **0.001**; test that factor never increases with wind
  (guards the clamp).

### S4 Solar position, mean radiant temperature, cloud fallback

As someone out on a clear winter morning I want the sun to count, and a clear
night to count the other way.

* `sunPosition` (NOAA/Spencer), `meanRadiantTemp` (six-directional, constants as
  documented), `estimateRadiation` (Haurwitz → Kasten–Czeplak → Erbs).
* Radiation is the preceding-hour mean: compute the sun at `time − 30 min`.
* Night cap `ta − Tmrt ≤ 10 K`.
* Acceptance: `mrt.json → solarPosition` within **0.05°**, `forecast` within
  **0.1 K** (before the night cap; a separate test checks the cap),
  `cloudFallback` within **0.5 W/m²** and **0.1 K**.

### S5 Forecast variables: Open-Meteo, MET Norway, Worker

As the engine I need humidity, cloud and radiation for every hour, from either
provider.

* Add to `HOURLY_VARS`: `relative_humidity_2m`, `cloud_cover`,
  `shortwave_radiation`, `direct_radiation`, `diffuse_radiation`,
  `direct_normal_irradiance`. Parse into the new optional `Hour` fields.
* MET Norway: read `instant.details.relative_humidity` (already in the type) and
  `cloud_area_fraction` (add to `MetnoStep`); radiation left undefined, so the
  engine uses `estimateRadiation`.
* Worker (`worker/src/forecast.ts`) uses the same `forecastUrl`, so it gets the
  variables for free; check payload size and D1/KV limits if forecasts are cached
  there. Six more series × 48 h is about 2 KB per place.
* App fetch is 16 days × 24 h: six series add about 12 KB uncompressed per place
  (384 hours × 6 values × about 5 characters); acceptable, note in
  `docs/performance.md`.
* Acceptance: parser tests with Open-Meteo and MET Norway fixtures updated;
  missing values stay `undefined`, not 0 (0 W/m² is a real night value).

### S6 Metabolic table and effort

* `METABOLIC: Record<Activity, …>` and effort table from thermal-model §5.2,
  Compendium METs × 45 W/m², clamp 400 W/m² with `clampedM`.
* Acceptance: table test (each value and its source code in a comment);
  `walk ≥ 0.0052·(M − 58)` for every entry; cycling has `w ≈ 0.2·M` and `ride > 0`.

### S7 Clothing target and verdict mapping (behind a flag)

As the Product Owner I want to compare the new engine with the old one before it
replaces it.

* `clothingTarget`: per hour of the window, IREQ-based `lightestIclFor` (cold and
  cool), heat ladder when the target is ≤ 0.5 clo or `ta > 20 °C`; take the
  maximum over the window's hours that the person is outside.
* `bandForClo` with edges 0.50 / 0.70 / 0.95 / 1.25 / 1.50; hedge ±0.08 clo
  (±0.15 when radiation estimated or UTCI clamped) sets `removable: 'edge'`.
* `requirementsFor` gains an optional `science` input; when present the band and
  layers come from clo. Feature flag `engine: 'bands' | 'science'` in settings
  (developer screen only).
* Acceptance: golden-day tests (London 26 Nov fixture, a hot Madrid day, a −10 °C
  Oslo day) with expected bands written down **before** implementation by the PO;
  no snapshot-only tests.
* Shared-contract rule applies (`requirementsFor` signature).

### S8 Personal insulation bias (Kalman) and migration

* `updateBias` as in thermal-model §8.3 (Q 0.0004/day, R 0.09, step 0.15,
  prior σ 0.25, clamp ±0.6).
* Migration: replay stored `Rating[]` in date order to build the initial state;
  map `SENSITIVITY_OFFSET` to the prior mean (±0.15 clo).
* Acceptance: first vote moves the mean by 0.06 ± 0.005 clo; ten identical votes
  converge but never exceed the clamp; "just right" shrinks variance without
  moving the mean; property test that the update is order-independent within
  0.02 clo for votes on the same day.

### S9 "Why this?" in clo and UTCI

* Copy per thermal-model §9.3, British English, short. `design-skills:ux-writing`
  review; accessibility audit on the sheet.
* Acceptance: screenshot at 390 px light and dark, no overflow; "clo" has an
  inline explanation; numbers rounded as specified.

## Test strategy

* **Fixtures are the oracle.** Each module has one table-driven test over its
  fixture file with the tolerance from `meta.tolerance`; a failing row prints its
  inputs.
* Fixtures come from the script, are committed and are never edited by hand. A change to the
  script lands in its own commit with the rebuilt JSON.
* Property tests (no fixtures): IREQ decreases with M and increases with wind;
  ensemble clo is monotonic in each garment; DLE increases with worn clo. UTCI
  gets no wind-monotonicity property: the published polynomial is not monotonic
  in wind everywhere, and we do not alter it.
* Golden days (S7) are the only end-to-end checks and are written from PO
  expectations, not from the output.
* No network in tests; Open-Meteo/MET Norway parsing uses the existing fixtures.

## Open-Meteo and MET Norway changes

| Variable | Open-Meteo hourly | MET Norway | Used by |
|---|---|---|---|
| Relative humidity | `relative_humidity_2m` | `relative_humidity` (instant) | UTCI, IREQ, longwave |
| Cloud cover | `cloud_cover` (%) | `cloud_area_fraction` (%) | longwave, fallback radiation |
| Global horizontal | `shortwave_radiation` | — (estimated) | Tmrt |
| Direct horizontal | `direct_radiation` | — | Tmrt |
| Diffuse horizontal | `diffuse_radiation` | — | Tmrt |
| Direct normal | `direct_normal_irradiance` | — | Tmrt (avoids dividing by sin β) |

Wind stays `wind_speed_10m`; the app requests km/h, the science module converts
(`/ 3.6`). Precipitation and snow already exist and feed the wet factor.

Worker: same URL builder, so no code change beyond the parser; the morning
notification text can quote UTCI. Fallback: MET Norway rows have humidity and
cloud, so the science engine works on both providers, with `radiation:
'estimated'` and the wider hedge on MET Norway.

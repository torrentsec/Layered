# Thermal model: from forecast to required clothing insulation

Status: spike (Product Backlog refinement). Branch `spike/thermal-model`.
Audience: the Developers who will build `src/engine/science/` next Sprint, and the Product Owner.

The engine today turns the coldest feels-like temperature of the window into an
"effective temperature", adds hand-tuned offsets (activity, effort, comfort profile,
learned) and looks the result up in six temperature bands (`src/engine/bands.ts`,
`src/engine/requirements.ts`). This document proposes replacing the bands with
standardised thermal-comfort models, says which inputs they need, gives
reference values, and lists what we still have to assume.

Fixtures to test against are in `src/engine/science/__fixtures__/`. They are produced
by `scripts/science/generate_fixtures.py` from **pythermalcomfort 4.8.1** (Center for
the Built Environment, UC Berkeley; MIT licence), plus a reference implementation
of the outdoor radiation equations given in section 6.

---

## 1. Recommended model in one page

1. **Per forecast hour**, compute mean radiant temperature `Tmrt` from Open-Meteo
   radiation and solar elevation (section 6). When radiation is missing (MET Norway),
   estimate it from cloud cover.
2. **UTCI** (`ta`, `Tmrt`, 10 m wind, `rh`) gives one "feels like" number and a
   stress category for every hour, hot or cold (section 3). It replaces apparent
   temperature in the headline and in "Why this?".
3. **Metabolic rate** `M` and walking speed come from the activity and effort
   (section 5), not from °C offsets.
4. **Cold and cool hours (ta ≤ 10 °C, and as an extension up to about 20 °C)**:
   ISO 11079 IREQ gives the *resultant* insulation needed for thermal neutrality
   (`IREQ_neutral`) and for an acceptable minimum (`IREQ_min`), and their *basic*
   equivalents `Icl_neutral`, `Icl_min` (section 2).
5. **Exposure-aware target.** Steady-state IREQ assumes all day outside. For a
   commute we use the Duration Limited Exposure (DLE): the target is the lightest
   basic insulation whose `DLE_min` covers the time outside, never below
   `Icl_min` for long exposures and never above `Icl_neutral` (section 2.5).
6. **Warm hours** (target under about 0.5 clo): light-clothing ladder chosen by
   UTCI heat category; heat categories also drive sun, shade and water extras
   (section 4).
7. **Wardrobe matching** compares the target with the ensemble insulation of owned
   garments: `Icl = 0.835·ΣIclu + 0.161` (ISO 9920), corrected for wind and walking
   and reduced when wet (section 7).
8. **Personalisation** is one number, a personal insulation bias in clo, updated
   from comfort votes with a Kalman filter; a single vote moves it by under half of
   what it says (section 8).
9. **UX** keeps the six verdicts by mapping clo ranges onto them, so copy, layer
   plans and history keep working (section 9).
10. Everything is pure, synchronous TypeScript in the engine; no new network calls
    except five extra hourly variables from Open-Meteo.

---

## 2. Required clothing insulation, IREQ (ISO 11079:2007)

### 2.1 What it is

IREQ is the clothing insulation that keeps the body in heat balance at defined
skin temperature and sweating levels in a given cold environment. It was
proposed by Holmér (1984) and standardised in ISO/TR 11079:1993, then ISO
11079:2007, which also covers local cooling (hands, feet, face) and the Duration
Limited Exposure. ISO confirmed the 2007 edition in 2022; a second edition is at
committee-draft stage (ISO/CD 11079, project 93442), so values may move slightly.

Two criteria are computed:

| Criterion | Mean skin temperature `tsk` (°C) | Skin wettedness `w` | Meaning |
|---|---|---|---|
| `IREQ_min` | `33.34 − 0.0354·M` | 0.06 | Minimum: slight cooling, mild discomfort accepted |
| `IREQ_neutral` | `35.7 − 0.0285·M` | `0.001·M` | Thermal neutrality: no cooling sensation |

(`M` in W/m²; constants as in the ISO 11079 Annex and the pythermalcomfort source.)

### 2.2 Inputs

| Symbol | Meaning | Our source |
|---|---|---|
| `ta` | air temperature, °C | `temperature_2m` |
| `tr` | mean radiant temperature, °C | section 6 |
| `va` | relative air speed at the body, m/s (0.4–18) | 10 m wind scaled to 1.1 m (factor 0.68, log profile, z0 = 0.01 m) plus ride speed for cycling |
| `rh` / `pa` | humidity; `pa` from `rh` and saturation pressure | `relative_humidity_2m` |
| `M` | metabolic rate, W/m² (58–400) | section 5 |
| `W` | external work, W/m² | ≈0 on foot; ≈0.2·M cycling |
| `walk` | walking speed, m/s (≥ 0.0052·(M − 58), ≤ 1.2) | section 5 |
| `p` | clothing air permeability, l/(m²·s) | 50 by default; 8 for a waterproof shell, 1000 for knit only |
| `Icl` | basic insulation worn (only for DLE) | section 7 |

Validity (ISO 11079, enforced by pythermalcomfort with `limit_inputs`):
`58 ≤ M ≤ 400`, `ta ≤ 10 °C`, `0.4 ≤ va ≤ 18 m/s`,
`0.0052·(M−58) ≤ walk ≤ 1.2 m/s`. ISO 11079 does not cover precipitation; wet
clothing is handled separately (section 7.4).

### 2.3 Resultant vs basic insulation

IREQ is a **resultant** insulation (`I_cl,r`): the insulation a person actually gets
while walking in wind. Garment tables give **basic** (intrinsic, static) insulation
`Icl`, measured on a standing manikin in still air. The two are linked through the
ISO 11079 Annex expressions also used in the code:

```
Ia      = 0.092·exp(−0.15·va − 0.22·walk) − 0.0045                 (m²K/W, boundary air)
corr    = 0.54·exp(−0.15·va − 0.22·walk)·p^0.075 − 0.06·ln(p) + 0.5
fcl     = 1 + 1.197·I                                               (I in m²K/W)
Icl     = (IREQ + Ia/fcl) / corr − 0.085/fcl                         (m²K/W; 1 clo = 0.155)
```

pythermalcomfort returns both: `ireq_*` (resultant) and `icl_*` (basic). **The
matching stage must compare garments against `icl_*`**, never against `ireq_*`. At
0 °C, 3 m/s, walking at 4 km/h (135 W/m²) the fixture gives `IREQ_neutral` 1.65 clo
but `Icl_neutral` 2.33 clo: wind and walking strip about 30% of the insulation.

### 2.4 Iterative solution

The heat balance `M − W − E − Res − R − C = S` has `IREQ` inside the clothing
surface temperature, the radiative coefficient and the area factor, so it is
solved iteratively. ISO 11079 and pythermalcomfort use a step-halving search:

1. Start at `IREQ = 0.5 m²K/W` (about 3.2 clo) with a step of 0.5 m²K/W.
2. Compute `fcl`, evaporative loss `E = w·(psk − pa)/Re,T`, respiratory loss
   `Res = 0.0173·M·(pex − pa) + 0.0014·M·(tex − ta)`, clothing surface temperature
   `tcl = tsk − IREQ·(M − W − E − Res)`, radiative coefficient
   `hr = σ·0.95·0.77·(tcl⁴ − tr⁴)/(tcl − tr)`, convection `hc = 1/Ia − hr`.
3. Balance `B = M − W − E − Res − R − C`. If `B > 0` step down and halve the step,
   else step up. Stop when `|B| ≤ 0.01 W/m²` (at most 150 iterations).
4. Final `IREQ = (tsk − tcl)/(R + C)`.

The TypeScript port should copy the loop exactly (same start value, same halving
rule, same stopping criterion) so it lands on the same fixed point; a different
root finder (e.g. Brent) converges to the same answer within 0.01 clo but makes
fixture comparison noisier.

### 2.5 Duration Limited Exposure and the exposure-aware target

When worn insulation is below `IREQ`, body heat is lost and the DLE is the time
until a tolerable loss `Qlim = 40 kJ/m²` (`DLE = Qlim/|S|`, hours). It is found by
a second iteration on the storage rate `S` with the worn insulation. Values above
8 h are reported as "more than 8".

This is the key to making IREQ usable for everyday trips. Steady-state IREQ at
0 °C with a 3 m/s breeze asks for 2.3 clo basic insulation for walking. No
London commuter wears that, and they are right: they are outside for 20 minutes.
The `dleSweep` fixture for that case:

| Basic insulation worn (clo) | 0.6 | 0.8 | 1.0 | 1.2 | 1.4 | 1.6 | 1.8 | 2.0 |
|---|---|---|---|---|---|---|---|---|
| `DLE_min` (h) | 0.30 | 0.42 | 0.59 | 0.87 | 1.38 | 2.66 | > 8 | > 8 |
| `DLE_neutral` (h) | 0.22 | 0.30 | 0.39 | 0.52 | 0.70 | 0.99 | 1.50 | 2.67 |

Proposed rule:

```
exposure  = hours outside in the window (activity exposure, commute legs, or the window length)
target    = lightest Icl in [Icl_min − margin, Icl_neutral] with DLE_neutral(Icl) ≥ exposure
            (falls back to DLE_min ≥ exposure when nothing reaches neutral)
target   += personal bias (section 8)
```

`DLE(Icl)` is monotonic in `Icl`, so the lightest insulation meeting the exposure
is found by bisection on clo (about 8 IREQ evaluations per hour; well under a
millisecond each). For the example above a 30-minute walk needs about 1.2 clo
(neutral) or 1.0 clo (minimum) instead of 2.3: a jumper and a medium coat, which
matches how people dress.

### 2.6 Standing and waiting

`IREQ` for standing (M ≈ 70 W/m²) is very large (4.5 clo basic at −5 °C) and its
DLE is short; this is the physics behind "cold when still". For mixed activities
(an office day, transport) use a time-weighted `M` over the exposure rather than
the lowest value, and show the DLE warning only when a single still stretch is
longer than its DLE (for example a 40-minute wait at a match).

---

## 3. UTCI (Universal Thermal Climate Index)

### 3.1 Definition

UTCI is "the air temperature of the reference environment which produces the
same strain index value in comparison with the reference individual's response to
the real environment" (Jendritzky, de Dear and Havenith 2012). The physiology is
the Fiala multi-node model (Fiala et al. 2012) coupled to the UTCI clothing model
(Havenith et al. 2012). Reference environment: `Tmrt = ta`, 50% relative humidity
(vapour pressure capped at 20 hPa above 29 °C), wind 0.5 m/s at 10 m, a person
walking at 4 km/h (135 W/m²) (Bröde et al. 2012).

### 3.2 Operational procedure

Bröde et al. (2012) fitted a 6th-order polynomial in `ta`, `Tmrt − ta`, `va` (10 m)
and `pa` (kPa) to the full model; this is the `UTCI_a002` program on utci.org and
what pythermalcomfort implements. It is fast enough for 384 hours on a phone. The
polynomial has 210 terms; port it from the pythermalcomfort source (MIT) or the
utci.org Fortran (no licence stated; treat as reference only) and test against
`utci.json`.

Valid inputs (the official program's checks):

| Input | Range |
|---|---|
| `ta` | −50 to +50 °C |
| `Tmrt − ta` | −30 to +70 K |
| `va` at 10 m | 0.5 to 17 m/s (the program accepts up to 30; the documentation says 17) |
| `pa` | 0 to 5 kPa (hot and humid hours can exceed this) |

Outside the range the polynomial still returns a number but can be non-monotonic
or unrealistic. Our clamp policy: clamp `va` to [0.5, 17] (Open-Meteo calm hours
are often below 0.5), clamp `Tmrt − ta` to [−30, 70], and if `pa > 5 kPa` mark the
hour "extreme heat" without a number. The fixture `utci.json` has the raw
polynomial and an `inRange` flag for every row so both behaviours are testable.

### 3.3 Stress categories (Bröde et al. 2012, Błażejczyk et al. 2012)

| UTCI (°C) | Category | Our band today |
|---|---|---|
| > 46 | extreme heat stress | — |
| 38 to 46 | very strong heat stress | — |
| 32 to 38 | strong heat stress | — |
| 26 to 32 | moderate heat stress | T-shirt |
| 9 to 26 | no thermal stress | light / two / jacket |
| 0 to 9 | slight cold stress | jacket / coat |
| −13 to 0 | moderate cold stress | coat / bundle |
| −27 to −13 | strong cold stress | bundle |
| −40 to −27 | very strong cold stress | bundle |
| < −40 | extreme cold stress | bundle |

(pythermalcomfort includes the upper edge of each bin; we should do the same.)

### 3.4 The UTCI clothing model and why we do not use it for advice

UTCI assumes people dress for the air temperature. Havenith et al. (2012) derived
the static intrinsic insulation as a cubic in `ta` from Polish and Swedish field
surveys; the commonly quoted form is

```
Icl,static ≈ 1.372 − 0.01866·ta − 0.0004849·ta² − 0.000009333·ta³   (clo)
```

(coefficients as reported in the UTCI literature; a 2010 conference version gives
1.374, −0.013847, −0.00043804, −0.0000238383, so check against the primary paper
before relying on them), bounded to roughly 0.4 clo at 30 °C and above. It is then
corrected for wind and walking (ISO 9920 style), with hood, per-segment
distribution and clothing vapour resistance.

Consequence: UTCI already includes "typical" clothing for the temperature. It
answers "how stressful is this weather for someone dressed normally", **not**
"what should this person wear". So:

* UTCI is the right headline number and category (one scale for hot and cold, wind,
  sun and humidity in one figure, validated outdoors).
* Required clothing comes from IREQ (cold) and the heat ladder (warm), using UTCI
  only as context and for heat extras.
* Using UTCI as the input to the old bands would double-count clothing: the index
  is already "dressed".

---

## 4. Warm side

IREQ is only defined for `ta ≤ 10 °C`, and once the required insulation drops
below about 0.5 clo the answer is "as little as is socially acceptable" plus sun
and heat protection; insulation stops being the lever.

Proposed rule:

1. Compute `Icl_neutral` with the IREQ balance up to `ta = 20 °C` even though the
   standard stops at 10 °C. The `extrapolated` cases in `ireq.json` show the
   extension behaves smoothly (walking at 135 W/m² in a 1 m/s breeze: 0.99 clo at
   12 °C, 0.77 at 15 °C, 0.55 at 18 °C, 0.34 at 21 °C). Mark these hours `extended: true` in the
   explanation.
2. If the target is ≤ 0.5 clo, or `ta > 20 °C`, choose from a fixed light ladder by
   UTCI category:
   * no thermal stress and target 0.3–0.5 clo: long-sleeve or T-shirt with a light
     layer optional (today's "Light layer optional");
   * no thermal stress and target < 0.3 clo, or moderate heat stress: T-shirt and
     shorts ("T-shirt weather");
   * strong heat stress and above: light, loose, light-coloured clothing; add
     "Shade and water" and "Avoid hard exercise" extras.
3. UV index keeps driving sunglasses and sunscreen as now.

**PMV (ISO 7730)** was considered for the warm side. It is a steady-state indoor
model: valid for `10 ≤ ta ≤ 30 °C`, air speed ≤ 1 m/s, `M ≤ 4 met`,
`Icl ≤ 2 clo` and no direct sun. Outdoors the wind is usually above 1 m/s and
`Tmrt` can be 20–30 K above air temperature in sun, both outside its range. The
`pmv.json` neutral-clo table is a sanity check only: for walking at 2.6 met in a
1 m/s breeze it gives 0.92 clo at 15 °C and 0.41 clo at 21 °C, the same order as
the IREQ extension at a slightly lower 135 W/m² (0.77 and 0.34). **PET** (Höppe 1999) is an outdoor index
but uses a fixed 0.9 clo and indoor-like reference; UTCI was built to replace both
for outdoor use and covers wind and radiation over a wider range (Jendritzky et al.
2012; Błażejczyk et al. 2012). Recommendation: UTCI for the headline, IREQ for the
cold, the ladder above for warm hours; PMV and PET not shipped.

---

## 5. Metabolic rate

### 5.1 Units

Thermal models use W per m² of body surface; 1 met = 58.15 W/m² (seated rest).
The Compendium of Physical Activities (Ainsworth et al. 2011) uses a different MET:
3.5 ml O₂·kg⁻¹·min⁻¹ ≈ 1 kcal·kg⁻¹·h⁻¹. For a reference adult (70 kg, 1.75 m,
DuBois area 1.85 m²; 1.8 m² used here) one Compendium MET is about
`70 × 1.163 / 1.8 ≈ 45 W/m²`. **Convert Compendium values with 45 W/m² per MET, not
58.15.** Check: walking 4.0 km/h is 3.0 Compendium MET → 136 W/m², which is the UTCI
reference walker (135 W/m²); 4.8 km/h is 3.5 MET → 158 W/m², against 151 W/m²
(2.6 met) in ASHRAE 55 / ISO 8996.

### 5.2 Proposed table

| Activity (app) | Basis | Compendium code / ISO 8996 | M (W/m²) | Walk (m/s) | Ride speed (m/s) |
|---|---|---|---|---|---|
| walking | walking 4.8 km/h, level, firm surface | 17200, 3.5 MET | 155 | 1.3→1.2 cap | — |
| standing | standing relaxed | ISO 8996 / ASHRAE 1.2 met | 70 | 0 | — |
| transport | 50% walking 4 km/h, 50% standing | time-weighted | 100 | 0.6 | — |
| office | as transport (exposure ≈ 2 h already in `ACTIVITY_EXPOSURE`) | time-weighted | 100 | 0.6 | — |
| indoors | walking 4 km/h to the shop | 17170, 3.0 MET | 135 | 1.1 | — |
| night | 30% walking, 70% standing | time-weighted | 95 | 0.4 | — |
| cycling (steady) | bicycling to/from work, self-selected pace | 01011, 6.8 MET | 305 (W ≈ 60) | 0 | 5 (18 km/h) |
| running (steady) | running 9.7 km/h | 12050, 9.8 MET | 440 → clamp 400 | 1.2 cap | — |
| hiking (steady) | hiking, cross-country | 17080, 6.0 MET | 270 | 1.2 cap | — |

Effort scaling (Compendium speed codes):

| Activity | easy | steady | hard |
|---|---|---|---|
| running | 8.0 km/h, 8.3 MET → 375 | 9.7 km/h, 9.8 MET → 440 | 11.3 km/h, 11.0 MET → 495 |
| cycling | leisure < 16 km/h, 4.0 MET → 180 (ride 4 m/s) | 6.8 MET → 305 (5 m/s) | 22–25.5 km/h, 10.0 MET → 450 (6.5 m/s) |
| hiking | 5.3 MET → 240 | 6.0 MET → 270 | backpacking, 7.0 MET → 315 |

Notes:

* ISO 11079 is only valid up to 400 W/m². Running above that is clamped and the
  explanation says so; for running the useful output is "light layers, gloves and
  hat below X", not a precise clo.
* For cycling the relative air speed is the wind at 1.1 m plus ride speed. Headwind
  and tailwind average out over a round trip; use `va = v1.1 + ride` for the
  outbound leg and accept a little overdressing on the way back.
* Compendium values are population averages; individual variation is ±20%, which
  is one of the things the personal bias absorbs.
* ISO 8996:2021 gives the same order of values (and methods to measure them); we
  use the Compendium because it has commuting-specific codes.

---

## 6. Mean radiant temperature outdoors

### 6.1 Why

Sun on a clear winter morning can make an hour feel 5–10 K warmer than shade;
a clear night sky makes it feel colder. Apparent temperature ignores this; UTCI and
IREQ both need `Tmrt`.

### 6.2 Method (six-directional simplification, standing person in the open)

Following the integral-radiation method of Thorsson et al. (2007) and its NWP form
in Di Napoli, Hogan and Pappenberger (2020):

```
Tmrt = [ ( 0.5·L↓ + 0.5·L↑ + (αk/εp)·(0.5·D + 0.5·ρ·G + fp·I) ) / σ ]^0.25 − 273.15
```

| Symbol | Meaning | Value / source |
|---|---|---|
| `L↓` | downward longwave, W/m² | Brutsaert (1975) clear-sky emissivity `1.24·(e/T)^(1/7)`, cloud blend `ε = c + (1−c)·ε_clr` (Crawford and Duchon 1999) |
| `L↑` | upward longwave | `εp·σ·Ta⁴` (ground taken at air temperature) |
| `D` | diffuse horizontal irradiance | `diffuse_radiation` |
| `G` | global horizontal irradiance | `shortwave_radiation` |
| `I` | direct beam on a plane normal to the sun | `direct_normal_irradiance`, or `direct_radiation / sin(elevation)` |
| `fp` | projected-area factor, standing person | `0.308·cos(β·(0.998 − β²/50000))`, β = solar elevation in degrees (Fanger 1970; used by RayMan and VDI 3787) |
| `αk` | shortwave absorptivity | 0.7 |
| `εp` | body emissivity | 0.97 |
| `ρ` | ground albedo | 0.2 |
| `σ` | Stefan–Boltzmann | 5.67·10⁻⁸ |

The sun only counts above 1° elevation: `direct / sin(β)` diverges near the
horizon and Open-Meteo values are hourly means. Open-Meteo radiation is the mean
over the **preceding** hour, so solar elevation should be computed at the
mid-point (`time − 30 min`), or the `*_instant` variables used.

Solar elevation: NOAA / Spencer (1971) Fourier series for declination and the
equation of time (implemented in the generator; `mrt.json → solarPosition`). It
needs the place's latitude, longitude and UTC time; the engine works in local wall
time, so pass `utcOffsetSeconds` from the forecast.

Fixture check (`mrt.json → forecast`): at 15 °C with sun at 30° and 400 W/m² direct
`Tmrt` is 43.7 °C; a clear night at 15 °C gives 5.1 °C; overcast night 13.9 °C.
These are plausible for an open square (Thorsson et al. 2007). A clear night at
−5 °C gives −18 °C, 13 K below air temperature: the Brutsaert emissivity is low in
dry cold air and the open-site assumption sees the whole sky, so this is the
upper end of the night effect; cap `ta − Tmrt` at 10 K at night until votes say otherwise.
The ASHRAE 55 SolarCal increment (Arens et al. 2015) for the same beam is given
alongside (`solarCalDeltaMrt`): it is an indoor model with its own geometry, so it
is a plausibility check, not an equality.

Known limits: urban canyons, shade and snow cover change `Tmrt` by tens of kelvin
(Kántor and Unger 2011). We assume a person in the open, which is the honest worst
case for sun and for night radiation. A later "mostly in shade" toggle could set
`fp·I → 0`.

### 6.3 Fallback without radiation (MET Norway)

MET Norway `locationforecast/2.0/complete` has `cloud_area_fraction` but no
radiation. Chain:

1. Clear-sky global irradiance (Haurwitz 1945): `Gclr = 1098·cos Z·exp(−0.057/cos Z)`.
2. Cloud reduction (Kasten and Czeplak 1980): `G = Gclr·(1 − 0.75·c^3.4)`, `c` the cloud fraction.
3. Split into direct and diffuse with the Erbs, Klein and Duffie (1982) correlation
   on the clearness index `kt = G / (1361·(1 + 0.033·cos(2π·doy/365))·cos Z)`.
4. `Tmrt` as above. The `cloudFallback` fixtures cover this chain.

Expected error is larger (hour-level cloud timing is the weak point), so mark the
hour `radiation: 'estimated'` and widen the comfort margin (section 9.3).

---

## 7. Clothing insulation

### 7.1 Garment values for our catalogue

Basic insulation per garment `Iclu` in clo, from ISO 9920:2007 Annex B as
reproduced in ISO 7730 Table C.2 and ASHRAE 55; "estimate" where the catalogue does
not map onto a listed garment. Full table with sources: `clothing.json → garments`.

| Category | thin | medium | thick | Source |
|---|---|---|---|---|
| base allowance (briefs, socks) | 0.06 | | | ISO 7730 C.2 |
| T-shirts | 0.08 | 0.09 | 0.12 | ISO 7730 (0.09); others estimate |
| Long-sleeve tops | 0.15 | 0.25 | 0.30 | ISO 7730 light / normal / flannel shirt |
| Thermal tops | 0.12 | 0.20 | 0.30 | ISO 7730 long-sleeve underwear; ASHRAE long underwear top; thick estimate |
| Jumpers | 0.20 | 0.28 | 0.35 | ISO 7730 thin / normal / thick sweater |
| Cardigans | 0.18 | 0.25 | 0.32 | estimate (open front) |
| Hoodies | 0.25 | 0.34 | 0.40 | ASHRAE sweatshirt 0.34; others estimate |
| Fleeces | 0.25 | 0.35 | 0.45 | estimate |
| Light jackets | 0.25 | 0.35 | 0.40 | ISO 7730 light summer jacket / jacket |
| Insulated jackets | 0.40 | 0.55 | 0.70 | ISO 7730 down jacket 0.55 |
| Coats | 0.45 | 0.60 | 0.70 | ISO 7730 coat 0.60, parka 0.70 |
| Waterproof jackets | 0.15 | 0.30 | 0.55 | estimate |
| Shorts | 0.08 | | | ISO 7730 shorts 0.06 / walking shorts 0.11 |
| Light trousers | 0.20 | | | ISO 7730 |
| Jeans | 0.25 | | | ISO 7730 normal trousers |
| Heavy trousers | 0.28 | | | ISO 7730 flannel trousers |
| Trainers / sandals | 0.02 | | | ISO 7730 thin-soled shoes |
| Waterproof shoes | 0.04 | | | ISO 7730 thick-soled shoes |
| Boots | 0.10 | | | ISO 7730 |
| Gloves | 0.05 | | | ISO 7730 |
| Hat, scarf | 0.02 | | | estimate |

Hat, gloves and scarf barely move whole-body clo, but they are what ISO 11079's
**local cooling** criteria are about (hands, feet, face and airways). Keep their
current rule-based triggers, and later replace them with the ISO 11079 local
criteria (finger temperature, wind chill on the face), not with clo.

The user's own `insulation` level (`InventoryEntry.insulation`) can shift the
thickness value by ±0.05 clo; `material: 'down'` on an outer layer suggests the
thick value.

### 7.2 Ensemble summation (ISO 9920)

```
Icl = 0.835 · Σ Iclu + 0.161     (clo)
```

valid for ensembles with fairly even coverage. Fixture `clothing.json → bandPlans`:
today's "coat" plan (long sleeve, jumper, medium coat, jeans, trainers) is 1.38 clo;
the "bundle" plan with thick everything and boots reaches 1.66 clo (1.73 with hat,
scarf and gloves, `ensembles → bundle`).
That is the ceiling of the catalogue, and below `Icl_neutral` for long cold
exposures, which is why the exposure-aware target (2.5) matters and why the
wardrobe gap message ("Nothing warm enough for a long wait") needs DLE.

### 7.3 Wind and walking: resultant insulation

Two corrections exist, and we need both:

* **ISO 9920 / Havenith and Nilsson (2004)** for normal clothing (`Icl ≥ 0.6`):
  `I_T,r / I_T = exp(−0.281·(var − 0.15) + 0.044·(var − 0.15)² − 0.492·vw + 0.176·vw²)`,
  with the nude form `exp(−0.533·(var−0.15) + 0.069·(var−0.15)² − 0.462·vw + 0.201·vw²)`
  blended linearly for `Icl < 0.6`. Valid for `0.15 ≤ var ≤ 3.5 m/s`, `vw ≤ 1.2 m/s`.
  The quadratic turns upward above about 3.3 m/s, so **clamp `var` at 3.5**.
  Fixture: `clothing.json → correction`. (An erratum, Eur J Appl Physiol 93:506, 2005,
  corrects a constant in their Eq. 6.)
* **ISO 11079 Annex** (cold-weather clothing, includes permeability `p`, valid to
  18 m/s): the `corr` expression in 2.3. This is what IREQ uses internally.

`ensembleClo(garments, wind, walkSpeed, wet)` should return both the basic `Icl`
(compared with `Icl_*` from IREQ) and the resultant value (for display and DLE).
Permeability: a waterproof or windproof outer layer (`wind: 'high'` or
`water: 'waterproof'`) sets `p = 8`; otherwise 50; knitwear-only outer 1000. This is
where the inventory's wind level finally has a physical meaning.

### 7.4 Wet clothing

Water in clothing lowers insulation and adds evaporative cooling. Reported
reductions range from 2–8% for sweat-level moisture to 19–42% (heat loss) for
soaked clothing and up to 65% for a fully wet layer (Wang et al. 2016 and studies
cited there). Proposal:

| Condition | Factor on `Icl` of layers outside the waterproof |
|---|---|
| dry | 1.00 |
| showers, no waterproof outer, `precip ≥ 0.5 mm/h` | 0.85 |
| steady rain, no waterproof outer | 0.70 |
| waterproof outer (`water: 'waterproof'`) | 1.00 for layers under it; 0.95 for condensation |

These factors are engineering judgement anchored to the literature range, not a
standard; they are a parameter to tune with votes.

### 7.5 Water vapour permeability

ISO 9920 also estimates the evaporative resistance of the ensemble via the
permeability index `im` (typically 0.38 for normal clothing, lower for coated
fabrics). IREQ uses a fixed `0.06/0.38` ratio, which overstates breathability of a
waterproof shell. Effect: during hard effort under a non-breathable shell people get
damp and then cold. Not modelled now; listed as a limitation and a candidate
"Breathable shell" hint for running and cycling.

---

## 8. Personalisation

### 8.1 State

One scalar per user, the personal insulation bias `b` (clo), added to the target:
`target = model target + b`. Optional per-activity offsets `δa` with their own small
prior (hierarchical shrinkage), replacing `learnedFor`'s "≥ 3 ratings" switch.

### 8.2 Prior

`b ~ N(μ0, σ0²)` with `μ0` from the comfort profile: cold −> +0.15 clo, average 0,
warm −0.15 clo (about the same effect as today's ±2 °C offsets at 135 W/m²), and
`σ0 = 0.25 clo` (inter-person spread in preferred insulation in field studies is of
this order; Havenith et al. 2012 report wide clothing scatter at any temperature).
`overheatWhenWalking` and `coldWhenStill` become ±0.1 clo on the matching activity
group's `δa` prior mean.

### 8.3 Update from a vote (Kalman filter, one dimension)

A vote `y ∈ {−1 too cold, 0 just right, +1 too warm}` on a day where the advice was
`target_t` and (if known) the user wore `worn_t`:

```
predict:  P ← P + Q·Δdays                  (Q = 0.0004 clo²/day: lets taste drift ~0.1 clo/month)
observe:  z = b − y·s                       (s = 0.15 clo: one vote step)
          if worn_t is known: z = worn_t − model_target_t − y·s
gain:     K = P / (P + R)                   (R = 0.09 clo², i.e. a single vote is ±0.3 clo noisy)
update:   b ← b + K·(z − b);   P ← (1 − K)·P
```

With the prior `P = 0.0625`, the first vote has `K ≈ 0.41`: a "too cold" moves the
bias by about 0.06 clo, less than half the 0.15 step it "asked" for. After ten
consistent votes `P` has shrunk and `K ≈ 0.08`, so one odd day barely moves a
well-established bias; Q stops it freezing. "Just right" votes are observations
too (`z = b`), so they also shrink `P`: the model becomes more confident, not only
more biased.

Guards: clamp `|b| ≤ 0.6 clo`; ignore a vote when the day's forecast error was
large (the existing `track-record` already knows), and down-weight votes whose
window was mostly indoors (`R × 2`).

### 8.4 Body characteristics (later, optional)

ISO 11079 and UTCI use a reference adult. Sex, age and body size enter
thermophysiology through surface-to-mass ratio, body fat and metabolic rate.
pythermalcomfort's JOS-3 model takes them, but it is heavy and needs inputs we do
not want to collect. If ever added: scale `M` by measured resting metabolic rate,
and set `μ0` from published group differences, still learning `b` per person.
Our recommendation is not to ask for these; the vote-learned bias absorbs most
of the variance (personal comfort models beat population models: median accuracy
73% vs 51%, Kim, Schiavon and Brager 2018).

---

## 9. Mapping back to the UX

### 9.1 Verdicts

Keep `BandId` and verdict copy; derive the band from the target basic insulation
(including the base allowance and bottoms) instead of °C:

| Target `Icl` (clo) | Band | Verdict | Plan's own `Icl` |
|---|---|---|---|
| < 0.50 | tshirt | T-shirt weather | 0.36 |
| 0.50–0.70 | light | Light layer optional | 0.60 |
| 0.70–0.95 | two | Two light layers | 0.84 |
| 0.95–1.25 | jacket | Jacket on | 1.09 |
| 1.25–1.50 | coat | Coat on | 1.38 |
| ≥ 1.50 | bundle | Bundle up | 1.66 |

The plan values are each band's layer plan from `requirements.ts` summed with
ISO 9920 (base allowance, bottoms and footwear included; `clothing.json →
bandPlans`). Edges are the midpoints between
neighbouring plans, rounded to 0.05, so the verdict names the plan nearest the
target; the matcher still has to reach the target itself. `insulationPoints`
retires once matching works in clo; during the migration, map clo to points
through the band (the band's plan points), not by a formula.

The band edge hedge (`EDGE_HEDGE`, ±1 °C) becomes ±0.08 clo, widened to ±0.15 clo
when radiation is estimated or UTCI was clamped.

### 9.2 Layer plans

The matcher fills base → mid → outer from the wardrobe until `ensembleClo ≥
target`, preferring the fewest layers, then the outer layer with the needed wind
and water properties. Bottoms and footwear keep their own rules but contribute to
the sum.

### 9.3 "Why this?"

Replace the °C offset arithmetic with:

* "Feels like **−3 °C** (UTCI), moderate cold stress" for the coldest hour, with
  "sun adds 4°" or "clear night sky takes 2°" when `Tmrt − ta` is over 2 K.
* "Walking, about 155 W/m² · 25 min outside".
* "Needs about **1.3 clo**; long sleeve, jumper, coat and jeans give 1.4 clo."
  (Rounded to 0.05 internally, shown to 0.1; "clo" gets a one-line explanation:
  "a unit of clothing warmth; a business suit is about 1".)
* "Your adjustment: +0.10 clo, from 14 ratings."
* "Wind takes 25% off this outfit's warmth" when the resultant correction is over 15%.
* Flags: "outside the standard's range, estimate", "radiation estimated from cloud".

---

## 10. Limitations and assumptions

1. Steady-state models (IREQ, UTCI's polynomial of a dynamic model at 2 h). Short
   exposures are handled only through DLE; transitions (warm office → cold street)
   are not modelled.
2. IREQ is standardised for `ta ≤ 10 °C`; 10–20 °C is an extension, cross-checked
   against PMV only.
3. Reference adult (≈70 kg, 1.8 m²). No sex, age or body-size adjustment.
4. Compendium METs are averages; individual metabolic rate varies ±20%.
5. Garment clo values for several categories are estimates; garments vary by ±30%
   within a category.
6. `Tmrt` assumes an open site, ground at air temperature, albedo 0.2; no urban
   shading, no snow albedo.
7. MET Norway fallback estimates radiation from cloud cover; hour-level errors are
   large.
8. Wind: 10 m forecast scaled with a neutral log profile over open ground; streets
   are usually calmer, gaps between buildings windier.
9. Wet-clothing factors are judgement within a published range.
10. Vapour resistance is fixed in IREQ; non-breathable shells under effort are not
    modelled.
11. Local cooling (hands, feet, face) stays rule-based for now.
12. UTCI clothing-model coefficients quoted in 3.4 need checking against the primary
    paper; they do not affect our implementation (we use the polynomial).
13. ISO 11079 is under revision; a second edition may change constants.

---

## 11. Reference data in this branch

| File | Model | Source | Tolerance |
|---|---|---|---|
| `utci.json` | UTCI polynomial, 1 350 rows (ta −30..40, Tmrt − ta 0/10/30, v 0.5–20, rh 10–95) | pythermalcomfort `utci` | 0.05 °C |
| `ireq.json` | IREQ min/neutral, Icl, DLE: 368 cases in range, DLE sweep, warm extension | pythermalcomfort `ireq` | 0.05 clo, 0.1 h |
| `pmv.json` | PMV/PPD and neutral clo (warm-side cross-check) | pythermalcomfort `pmv_ppd_iso` | 0.01 PMV |
| `clothing.json` | garment table, ISO 9920 ensembles, resultant correction | pythermalcomfort `clothing` | 0.005 clo |
| `mrt.json` | solar elevation, Tmrt from radiation, cloud fallback | reference implementation in the generator | 0.05°, 0.1 K |

Rebuild with `python3 -I scripts/science/generate_fixtures.py` inside a venv with
`pythermalcomfort==4.8.1`. pythermalcomfort is MIT-licensed (© 2019 Federico
Tartarini); porting its formulas into our AGPL code is permitted with attribution,
which the science module should carry in a header comment.

---

## 12. Sources

Standards (abstracts and tables of contents checked; full texts are paid):

* ISO 11079:2007. *Ergonomics of the thermal environment — Determination and
  interpretation of cold stress when using required clothing insulation (IREQ) and
  local cooling effects.* https://www.iso.org/standard/38900.html (revision:
  https://www.iso.org/standard/93442.html)
* ISO 9920:2007. *Ergonomics of the thermal environment — Estimation of thermal
  insulation and water vapour resistance of a clothing ensemble.*
  https://www.iso.org/standard/39257.html
* ISO 8996:2021. *Ergonomics of the thermal environment — Determination of metabolic rate.*
  https://www.iso.org/standard/74230.html
* ISO 7730:2005. *Ergonomics of the thermal environment — Analytical determination and
  interpretation of thermal comfort using calculation of the PMV and PPD indices
  and local thermal comfort criteria.* https://www.iso.org/standard/39155.html
* ANSI/ASHRAE Standard 55-2023. *Thermal Environmental Conditions for Human Occupancy*
  (SolarCal, clothing and metabolic tables).

Papers:

* Holmér, I. (1984). Required clothing insulation (IREQ) as an analytical index of
  cold stress. *ASHRAE Transactions* 90(1B), 1116–1128.
* Holmér, I. (1988). Assessment of cold stress in terms of required clothing
  insulation — IREQ. *International Journal of Industrial Ergonomics* 3(2), 159–166.
  https://doi.org/10.1016/0169-8141(88)90017-X
* Jendritzky, G., de Dear, R., Havenith, G. (2012). UTCI — why another thermal index?
  *Int J Biometeorol* 56(3), 421–428. https://doi.org/10.1007/s00484-011-0513-7
* Bröde, P., Fiala, D., Błażejczyk, K., Holmér, I., Jendritzky, G., Kampmann, B.,
  Tinz, B., Havenith, G. (2012). Deriving the operational procedure for the
  Universal Thermal Climate Index (UTCI). *Int J Biometeorol* 56(3), 481–494.
  https://doi.org/10.1007/s00484-011-0454-1
* Havenith, G., Fiala, D., Błażejczyk, K., Richards, M., Bröde, P., Holmér, I.,
  Rintamäki, H., Benshabat, Y., Jendritzky, G. (2012). The UTCI-clothing model.
  *Int J Biometeorol* 56(3), 461–470. https://doi.org/10.1007/s00484-011-0451-4
* Fiala, D., Havenith, G., Bröde, P., Kampmann, B., Jendritzky, G. (2012).
  UTCI-Fiala multi-node model of human heat transfer and temperature regulation.
  *Int J Biometeorol* 56(3), 429–441. https://doi.org/10.1007/s00484-011-0424-7
* Błażejczyk, K., Epstein, Y., Jendritzky, G., Staiger, H., Tinz, B. (2012).
  Comparison of UTCI to selected thermal indices. *Int J Biometeorol* 56(3),
  515–535. https://doi.org/10.1007/s00484-011-0453-2
* Havenith, G., Nilsson, H. O. (2004). Correction of clothing insulation for
  movement and wind effects, a meta-analysis. *Eur J Appl Physiol* 92(6), 636–640.
  https://doi.org/10.1007/s00421-004-1113-6 ; erratum 93, 506 (2005),
  https://doi.org/10.1007/s00421-004-1267-2
* Ainsworth, B. E., et al. (2011). 2011 Compendium of Physical Activities: a second
  update of codes and MET values. *Med Sci Sports Exerc* 43(8), 1575–1581.
  https://doi.org/10.1249/MSS.0b013e31821ece12
* Thorsson, S., Lindberg, F., Eliasson, I., Holmer, B. (2007). Different methods for
  estimating the mean radiant temperature in an outdoor urban setting.
  *Int J Climatol* 27(14), 1983–1993. https://doi.org/10.1002/joc.1537
* Kántor, N., Unger, J. (2011). The most problematic variable in the course of
  human-biometeorological comfort assessment — the mean radiant temperature.
  *Cent Eur J Geosci* 3(1), 90–100. https://doi.org/10.2478/s13533-011-0010-x
* Di Napoli, C., Hogan, R. J., Pappenberger, F. (2020). Mean radiant temperature from
  global-scale numerical weather prediction models. *Int J Biometeorol* 64(7),
  1233–1245. https://doi.org/10.1007/s00484-020-01900-5
* Arens, E., Hoyt, T., Zhou, X., Huang, L., Zhang, H., Schiavon, S. (2015). Modeling
  the comfort effects of short-wave solar radiation indoors. *Building and
  Environment* 88, 3–9. https://doi.org/10.1016/j.buildenv.2014.09.004
* Höppe, P. (1999). The physiological equivalent temperature — a universal index for
  the biometeorological assessment of the thermal environment. *Int J Biometeorol*
  43, 71–75. https://doi.org/10.1007/s004840050118
* Fanger, P. O. (1970). *Thermal Comfort.* Danish Technical Press, Copenhagen.
* Brutsaert, W. (1975). On a derivable formula for long-wave radiation from clear
  skies. *Water Resources Research* 11(5), 742–744. https://doi.org/10.1029/WR011i005p00742
* Crawford, T. M., Duchon, C. E. (1999). An improved parameterization for estimating
  effective atmospheric emissivity for use in calculating daytime downwelling
  longwave radiation. *J Appl Meteorol* 38(4), 474–480.
  https://doi.org/10.1175/1520-0450(1999)038%3C0474:AIPFEE%3E2.0.CO;2
* Haurwitz, B. (1945). Insolation in relation to cloudiness and cloud density.
  *J Meteorol* 2(3), 154–166.
  https://doi.org/10.1175/1520-0469(1945)002%3C0154:IIRTCA%3E2.0.CO;2
* Kasten, F., Czeplak, G. (1980). Solar and terrestrial radiation dependent on the
  amount and type of cloud. *Solar Energy* 24(2), 177–189.
  https://doi.org/10.1016/0038-092X(80)90391-6
* Erbs, D. G., Klein, S. A., Duffie, J. A. (1982). Estimation of the diffuse radiation
  fraction for hourly, daily and monthly-average global radiation. *Solar Energy*
  28(4), 293–302. https://doi.org/10.1016/0038-092X(82)90302-4
* Spencer, J. W. (1971). Fourier series representation of the position of the sun.
  *Search* 2(5), 172.
* Wang, F., Shi, W., Lu, Y., Song, G., Rossi, R. M., Anaheim, S. (2016). Effects of
  moisture content and clothing fit on clothing apparent "wet" thermal insulation:
  a thermal manikin study. *Textile Research Journal* 86(1), 57–63.
  https://doi.org/10.1177/0040517515580527
* Kim, J., Schiavon, S., Brager, G. (2018). Personal comfort models — a new paradigm in
  thermal comfort for occupant-centric environmental control. *Building and
  Environment* 132, 114–124. https://doi.org/10.1016/j.buildenv.2018.01.023
* Kalman, R. E. (1960). A new approach to linear filtering and prediction problems.
  *J Basic Eng* 82(1), 35–45. https://doi.org/10.1115/1.3662552

Software and data:

* Tartarini, F., Schiavon, S. (2020). pythermalcomfort: a Python package for thermal
  comfort research. *SoftwareX* 12, 100578. https://doi.org/10.1016/j.softx.2020.100578 ;
  https://github.com/pythermalcomfort/pythermalcomfort (v4.8.1, MIT)
* UTCI program code and documentation: https://www.utci.org
* CBE Thermal Comfort Tool: https://comfort.cbe.berkeley.edu
* Open-Meteo forecast API (hourly variables): https://open-meteo.com/en/docs
* MET Norway Locationforecast 2.0: https://api.met.no/weatherapi/locationforecast/2.0/documentation

Some primary full texts (Springer, PubMed Central, CORE) could not be opened from
the build environment during this spike; their equations above were taken from
the pythermalcomfort source, which cites them, and from abstracts. Section 3.4 is
the one place where that matters.

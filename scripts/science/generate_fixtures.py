# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (c) 2026 Daniel Woo
"""Reference vectors for the thermal-comfort science module.

UTCI, IREQ, PMV and the ISO 9920 clothing corrections come from the CBE
pythermalcomfort package (MIT), so the TypeScript port is checked against an
independent, peer-reviewed implementation rather than against itself. Mean
radiant temperature and solar position have no outdoor-forecast equivalent in
that package, so they are computed here from the published equations and the
SolarCal shortwave term is used as a cross-check.

Run from the repository root:
    python3 -m venv /tmp/spike-venv
    /tmp/spike-venv/bin/pip install pythermalcomfort==4.8.1
    /tmp/spike-venv/bin/python -I scripts/science/generate_fixtures.py
"""

from __future__ import annotations

import json
import math
import sys
import warnings
from importlib.metadata import version
from pathlib import Path

import numpy as np
from pythermalcomfort.clothing import (
    clo_correction_factor_environment,
    clo_intrinsic_insulation_ensemble,
)
from pythermalcomfort.models import ireq, pmv_ppd_iso, solar_gain, utci

OUT = Path(__file__).resolve().parents[2] / "src" / "engine" / "science" / "__fixtures__"
PTC_VERSION = version("pythermalcomfort")
MET_W_M2 = 58.15
SIGMA = 5.67e-8

# Out-of-range inputs are recorded as such in the fixtures, so the warnings
# pythermalcomfort raises for them would only bury real problems.
warnings.filterwarnings("ignore")


def meta(model: str, source: str, units: dict, tolerance: dict, notes: str = "") -> dict:
    return {
        "model": model,
        "source": source,
        "generator": "scripts/science/generate_fixtures.py",
        "pythermalcomfort": {"version": PTC_VERSION, "licence": "MIT"},
        "units": units,
        "tolerance": tolerance,
        **({"notes": notes} if notes else {}),
    }


def r(x: float, nd: int = 3):
    if x is None or (isinstance(x, float) and not math.isfinite(x)):
        return None
    return round(float(x), nd)


def dump(name: str, data: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    text = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    path.write_text(text + "\n", encoding="utf-8")
    print(f"{path.relative_to(OUT.parents[3])}: {len(text) / 1024:.1f} KB", file=sys.stderr)


def wind_at_body(v10: float) -> float:
    """10 m wind to 1.1 m with a log profile over open ground (z0 = 0.01 m), as in UTCI."""
    return v10 * math.log(1.1 / 0.01) / math.log(10 / 0.01)


# --------------------------------------------------------------------------- UTCI

def gen_utci() -> None:
    tas = list(range(-30, 41, 5))
    dtr = [0, 10, 30]
    vs = [0.5, 1, 2, 5, 10, 20]
    rhs = [10, 30, 50, 70, 95]
    rows = []
    for ta in tas:
        for d in dtr:
            for v in vs:
                for rh in rhs:
                    tr = ta + d
                    limited = utci(tdb=ta, tr=tr, v=v, rh=rh, limit_inputs=True, round_output=False)
                    raw = utci(tdb=ta, tr=tr, v=v, rh=rh, limit_inputs=False, round_output=False)
                    in_range = bool(np.isfinite(limited.utci))
                    cat = str(limited.stress_category) if in_range else None
                    rows.append([ta, tr, v, rh, r(raw.utci, 2), in_range, cat])
    dump(
        "utci.json",
        {
            "meta": meta(
                "UTCI 6th-order polynomial (Broede et al. 2012), utci_a002",
                "pythermalcomfort.models.utci",
                {"ta": "degC", "tr": "degC", "v": "m/s at 10 m", "rh": "%", "utci": "degC"},
                {"utci": 0.05, "note": "same polynomial, so only float rounding should differ"},
                "utci is the raw polynomial even when inRange is false; inRange applies the "
                "official limits (-50<=ta<=50, -30<=tr-ta<=70, 0.5<=v<=17, pa<=5 kPa). "
                "category is the UTCI assessment scale label, upper edge inclusive.",
            ),
            "columns": ["ta", "tr", "v", "rh", "utci", "inRange", "category"],
            "rows": rows,
        },
    )


# --------------------------------------------------------------------------- IREQ

def walk_speed_for(m: float) -> float:
    """ISO 11079 lower walking-speed bound for a metabolic rate, capped at 1.2 m/s.

    Rounded up, because a speed rounded down falls just outside the standard's limits.
    """
    return min(math.ceil(max(0.0052 * (m - 58), 0.0) * 1000) / 1000, 1.2)


def ireq_case(ta, tr, va, rh, m, w, clo, p, walk, limit=True):
    res = ireq(
        tdb=ta, tr=tr, vr=va, rh=rh, met=m / MET_W_M2, wme=w / MET_W_M2,
        clo=clo, p=p, walk_sp=walk, limit_inputs=limit, round_output=False,
    )

    def dle(x):
        return x if isinstance(x, str) else r(x, 2)

    return {
        "in": {"ta": ta, "tr": tr, "va": va, "rh": rh, "M": m, "W": w, "clo": clo, "p": p, "walk": walk},
        "out": {
            "ireqMin": r(res.ireq_min), "ireqNeutral": r(res.ireq_neutral),
            "iclMin": r(res.icl_min), "iclNeutral": r(res.icl_neutral),
            "dleMin": dle(res.dle_min), "dleNeutral": dle(res.dle_neutral),
        },
    }


def gen_ireq() -> None:
    cases = []
    # The worked example from the pythermalcomfort docs, which follows ISO 11079 Annex.
    cases.append({"label": "pythermalcomfort docstring example", **ireq_case(-15, -15, 2, 55, 175, 0, 2.8, 50, 1.1)})
    for m in [70, 115, 135, 200, 300]:
        walk = walk_speed_for(m)
        for va in [0.4, 1, 3, 8]:
            for ta in [10, 0, -10, -20, -30, -40]:
                for clo in [1.0, 2.0, 3.0]:
                    cases.append(ireq_case(ta, ta, va, 50, m, 0, clo, 50, walk))
    # Radiation and permeability sensitivity at a mid case.
    for dtr in [-5, 10, 20]:
        cases.append(ireq_case(-5, -5 + dtr, 2, 70, 135, 0, 1.5, 50, 0.67))
    for p in [8, 100, 1000]:
        cases.append(ireq_case(-5, -5, 5, 70, 135, 0, 1.5, p, 0.67))
    # Cycling produces external work; about a fifth of the metabolic rate at commuting effort.
    cases.append(ireq_case(0, 0, 5, 80, 300, 60, 1.5, 50, 1.2))
    # Short exposures: how long each basic insulation lasts, for the exposure-aware target.
    dle_sweep = []
    for ta, va, m in [(5, 1, 135), (0, 3, 135), (-5, 2, 70), (-10, 4, 200), (2, 3, 300)]:
        for clo in [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0]:
            w = 60 if m == 300 else 0
            dle_sweep.append(ireq_case(ta, ta, va, 75, m, w, clo, 50, walk_speed_for(m)))
    # Above 10 degC the standard does not apply; kept so the warm-side extension can be compared with PMV.
    extrapolated = []
    for ta in [12, 15, 18, 21, 24]:
        for m in [70, 135, 200]:
            for va in [0.4, 1, 3]:
                c = ireq_case(ta, ta, va, 50, m, 0, 1.0, 50, walk_speed_for(m), limit=False)
                extrapolated.append(c)
    dump(
        "ireq.json",
        {
            "meta": meta(
                "IREQ, ISO 11079:2007 Annex (Holmer)",
                "pythermalcomfort.models.ireq",
                {
                    "ta": "degC", "tr": "degC", "va": "m/s relative air speed at body", "rh": "%",
                    "M": "W/m2", "W": "W/m2", "clo": "clo (basic insulation worn, for DLE)",
                    "p": "l/(m2 s) air permeability", "walk": "m/s",
                    "ireq": "clo (resultant)", "icl": "clo (basic)", "dle": "h, or 'more than 8'",
                },
                {"ireq": 0.05, "icl": 0.05, "dle": 0.1},
                "Inside the ISO 11079 limits (58<=M<=400, ta<=10, 0.4<=va<=18, walk>=0.0052(M-58)) only; "
                "null means outside the limits or a non-physical (negative) result. 'extrapolated' "
                "cases ignore the limits and are for comparison, not for acceptance tests.",
            ),
            "cases": cases,
            "dleSweep": dle_sweep,
            "extrapolated": extrapolated,
        },
    )


# --------------------------------------------------------------------------- PMV

def neutral_clo_pmv(ta, tr, v, rh, met) -> float | None:
    """Basic clo at which PMV = 0, by bisection; None when no clo in 0..2 reaches neutral."""
    def pmv(clo):
        return float(pmv_ppd_iso(tdb=ta, tr=tr, vr=v, rh=rh, met=met, clo=clo, limit_inputs=False, round_output=False).pmv)

    lo, hi = 0.0, 2.0
    if pmv(lo) > 0 or pmv(hi) < 0:
        return None
    for _ in range(40):
        mid = (lo + hi) / 2
        if pmv(mid) > 0:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def gen_pmv() -> None:
    cases = []
    for ta in [15, 20, 25, 28]:
        for v in [0.1, 0.5, 1.0]:
            for met in [1.2, 2.0, 2.6]:
                for clo in [0.3, 0.6, 1.0]:
                    res = pmv_ppd_iso(tdb=ta, tr=ta, vr=v, rh=50, met=met, clo=clo, limit_inputs=True, round_output=False)
                    cases.append({"in": {"ta": ta, "tr": ta, "vr": v, "rh": 50, "met": met, "clo": clo},
                                  "out": {"pmv": r(res.pmv, 3), "ppd": r(res.ppd, 2)}})
    neutral = []
    for ta in [12, 15, 18, 21, 24, 27]:
        for met in [1.2, 2.0, 2.6]:
            for v in [0.2, 1.0]:
                neutral.append({"in": {"ta": ta, "tr": ta, "vr": v, "rh": 50, "met": met},
                                "out": {"neutralClo": r(neutral_clo_pmv(ta, ta, v, 50, met), 3)}})
    dump(
        "pmv.json",
        {
            "meta": meta(
                "PMV/PPD, ISO 7730 (model '7730-2025' in pythermalcomfort)",
                "pythermalcomfort.models.pmv_ppd_iso",
                {"ta": "degC", "tr": "degC", "vr": "m/s relative", "rh": "%", "met": "met (58.15 W/m2)", "clo": "clo"},
                {"pmv": 0.01, "ppd": 0.2, "neutralClo": 0.02},
                "Cross-check for the warm side only. PMV is defined for 10<=ta<=30, vr<=1 m/s, met<=4, "
                "clo<=2; null pmv means outside those limits. neutralClo is the basic insulation giving PMV=0, "
                "solved by bisection on 0..2 clo (null when none).",
            ),
            "cases": cases,
            "neutral": neutral,
        },
    )


# --------------------------------------------------------------------------- clothing

# ISO 9920:2007 Annex B / ISO 7730 Table C.2 garment values where the catalogue
# maps onto a listed garment; 'estimate' where it does not (interpolated between
# neighbours, rounded to 0.05). Underwear and socks are worn every day, so they
# sit in the base allowance rather than in a category.
GARMENTS = {
    "base-allowance": {"clo": 0.06, "source": "ISO 7730 C.2: briefs 0.04 + ankle socks 0.02"},
    "tshirt": {"thin": 0.08, "medium": 0.09, "thick": 0.12, "source": "ISO 7730 C.2 T-shirt 0.09; thin and thick estimate"},
    "longsleeve": {"thin": 0.15, "medium": 0.25, "thick": 0.30, "source": "ISO 7730 C.2 light/normal/flannel shirt, long sleeves"},
    "thermal": {"thin": 0.12, "medium": 0.20, "thick": 0.30, "source": "ISO 7730 C.2 long-sleeve underwear 0.12; ASHRAE 55 long underwear top 0.20; thick estimate"},
    "jumper": {"thin": 0.20, "medium": 0.28, "thick": 0.35, "source": "ISO 7730 C.2 thin sweater / sweater / thick sweater"},
    "cardigan": {"thin": 0.18, "medium": 0.25, "thick": 0.32, "source": "estimate: sweater less about 10% for the open front"},
    "hoodie": {"thin": 0.25, "medium": 0.34, "thick": 0.40, "source": "ASHRAE 55 long-sleeve sweatshirt 0.34; thin and thick estimate"},
    "fleece": {"thin": 0.25, "medium": 0.35, "thick": 0.45, "source": "estimate: between sweater and jacket, by loft"},
    "light-jacket": {"thin": 0.25, "medium": 0.35, "thick": 0.40, "source": "ISO 7730 C.2 light summer jacket 0.25 / jacket 0.35; thick estimate"},
    "insulated-jacket": {"thin": 0.40, "medium": 0.55, "thick": 0.70, "source": "ISO 7730 C.2 down jacket 0.55; thin and thick estimate"},
    "coat": {"thin": 0.45, "medium": 0.60, "thick": 0.70, "source": "ISO 7730 C.2 coat 0.60 / parka 0.70; mac estimate"},
    "waterproof-jacket": {"thin": 0.15, "medium": 0.30, "thick": 0.55, "source": "estimate: unlined shell / lined / insulated as down jacket"},
    "shorts": {"clo": 0.08, "source": "ISO 7730 C.2 shorts 0.06, walking shorts 0.11"},
    "light-trousers": {"clo": 0.20, "source": "ISO 7730 C.2 light trousers"},
    "jeans": {"clo": 0.25, "source": "ISO 7730 C.2 normal trousers"},
    "heavy-trousers": {"clo": 0.28, "source": "ISO 7730 C.2 flannel trousers"},
    "trainers": {"clo": 0.02, "source": "ISO 7730 C.2 shoes, thin soled"},
    "boots": {"clo": 0.10, "source": "ISO 7730 C.2 boots"},
    "waterproof-shoes": {"clo": 0.04, "source": "ISO 7730 C.2 shoes, thick soled"},
    "sandals": {"clo": 0.02, "source": "ISO 7730 C.2 shoes, thin soled"},
    "hat": {"clo": 0.02, "source": "estimate; whole-body effect is small, value is local (head) cooling"},
    "scarf": {"clo": 0.02, "source": "estimate; whole-body effect is small, value is local (neck) cooling"},
    "gloves": {"clo": 0.05, "source": "ISO 7730 C.2 gloves"},
}


def clo_of(cat: str, t: str = "medium") -> float:
    g = GARMENTS[cat]
    return g["clo"] if "clo" in g else g[t]


def gen_clothing() -> None:
    ensembles = {
        "summer": [("tshirt", "thin"), ("shorts", None), ("sandals", None)],
        "two-light": [("longsleeve", "medium"), ("jumper", "thin"), ("light-trousers", None), ("trainers", None)],
        "jacket": [("longsleeve", "medium"), ("jumper", "medium"), ("light-jacket", "medium"), ("jeans", None), ("trainers", None)],
        "coat": [("longsleeve", "medium"), ("jumper", "medium"), ("coat", "medium"), ("jeans", None), ("boots", None), ("gloves", None)],
        "bundle": [("thermal", "thick"), ("jumper", "thick"), ("insulated-jacket", "thick"), ("heavy-trousers", None), ("boots", None), ("hat", None), ("scarf", None), ("gloves", None)],
    }
    ens_out = []
    for name, items in ensembles.items():
        clos = [GARMENTS["base-allowance"]["clo"]] + [clo_of(c, t or "medium") for c, t in items]
        ens_out.append({
            "name": name,
            "garments": [{"category": c, **({"thickness": t} if t else {})} for c, t in items],
            "sumClo": r(sum(clos)),
            "icl": r(float(clo_intrinsic_insulation_ensemble(clos))),
        })
    # The six layer plans in src/engine/requirements.ts, read as concrete garments,
    # so verdict edges in clo can sit between neighbouring plans.
    band_plans = {
        "tshirt": [("tshirt", "thin"), ("shorts", None), ("trainers", None)],
        "light": [("longsleeve", "medium"), ("light-trousers", None), ("trainers", None)],
        "two": [("longsleeve", "medium"), ("jumper", "medium"), ("light-trousers", None), ("trainers", None)],
        "jacket": [("longsleeve", "medium"), ("jumper", "medium"), ("light-jacket", "thin"), ("jeans", None), ("trainers", None)],
        "coat": [("longsleeve", "medium"), ("jumper", "medium"), ("coat", "medium"), ("jeans", None), ("trainers", None)],
        "bundle": [("thermal", "thick"), ("jumper", "thick"), ("insulated-jacket", "thick"), ("heavy-trousers", None), ("boots", None)],
    }
    plans_out = []
    for name, items in band_plans.items():
        clos = [GARMENTS["base-allowance"]["clo"]] + [clo_of(c, t or "medium") for c, t in items]
        plans_out.append({
            "band": name,
            "garments": [{"category": c, **({"thickness": t} if t else {})} for c, t in items],
            "sumClo": r(sum(clos)),
            "icl": r(float(clo_intrinsic_insulation_ensemble(clos))),
        })
    corr = []
    for icl in [0.3, 0.6, 1.0, 1.5, 2.5]:
        for vr in [0.15, 0.5, 1, 2, 3, 3.5]:
            for vw in [0, 0.5, 1.0, 1.2]:
                f = float(clo_correction_factor_environment(vr=vr, v_walk=vw, i_cl=icl))
                corr.append([icl, vr, vw, r(f, 4)])
    dump(
        "clothing.json",
        {
            "meta": meta(
                "ISO 9920:2007 ensemble summation and dynamic (resultant) correction",
                "pythermalcomfort.clothing.clo_intrinsic_insulation_ensemble, clo_correction_factor_environment",
                {"clo": "clo (1 clo = 0.155 m2K/W)", "vr": "m/s relative air speed", "vw": "m/s walking speed"},
                {"icl": 0.005, "factor": 0.001},
                "garments is the proposed catalogue table (category x thickness). ensembles include "
                "base-allowance. correction rows are [icl, vr, vw, factor], factor = I_T,r / I_T, valid for "
                "vr 0.15..3.5 m/s and vw 0..1.2 m/s; above 3.5 m/s the quadratic turns upward, so clamp vr.",
            ),
            "garments": GARMENTS,
            "ensembles": ens_out,
            "bandPlans": plans_out,
            "correctionColumns": ["icl", "vr", "vw", "factor"],
            "correction": corr,
        },
    )


# --------------------------------------------------------------------------- solar position and Tmrt

def solar_elevation(lat: float, lon: float, utc_iso: str) -> float:
    """NOAA solar position (Spencer 1971 Fourier series), degrees above the horizon, no refraction."""
    from datetime import datetime, timezone

    t = datetime.fromisoformat(utc_iso.replace("Z", "+00:00")).astimezone(timezone.utc)
    doy = t.timetuple().tm_yday
    hour = t.hour + t.minute / 60 + t.second / 3600
    g = 2 * math.pi / 365 * (doy - 1 + (hour - 12) / 24)
    eqt = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g)
                    - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    decl = (0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g)
            + 0.000907 * math.sin(2 * g) - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g))
    tst = hour * 60 + eqt + 4 * lon
    ha = math.radians(tst / 4 - 180)
    phi = math.radians(lat)
    cosz = math.sin(phi) * math.sin(decl) + math.cos(phi) * math.cos(decl) * math.cos(ha)
    return math.degrees(math.asin(max(-1.0, min(1.0, cosz))))


def vapour_pressure_hpa(ta: float, rh: float) -> float:
    return rh / 100 * 6.112 * math.exp(17.62 * ta / (243.12 + ta))


def longwave_down(ta: float, rh: float, cloud: float) -> float:
    """Brutsaert (1975) clear-sky emissivity with the Crawford and Duchon (1999) cloud blend."""
    e = vapour_pressure_hpa(ta, rh)
    tk = ta + 273.15
    eps_clear = 1.24 * (e / tk) ** (1 / 7)
    eps = cloud + (1 - cloud) * eps_clear
    return eps * SIGMA * tk ** 4


def projected_area_factor(elev: float) -> float:
    """Standing person, after Fanger (1970) as used by RayMan and VDI 3787-2."""
    return 0.308 * math.cos(math.radians(elev * (0.998 - elev * elev / 50000)))


def clear_sky_ghi(elev: float) -> float:
    """Haurwitz (1945) clear-sky global horizontal irradiance."""
    cz = math.sin(math.radians(elev))
    return 1098 * cz * math.exp(-0.057 / cz) if cz > 0 else 0.0


def ghi_from_cloud(elev: float, cloud: float) -> float:
    """Kasten and Czeplak (1980) cloud reduction of clear-sky irradiance; cloud is a 0..1 fraction."""
    return clear_sky_ghi(elev) * (1 - 0.75 * cloud ** 3.4)


def erbs_diffuse_fraction(kt: float) -> float:
    """Erbs, Klein and Duffie (1982) diffuse fraction from the clearness index."""
    if kt <= 0.22:
        return 1 - 0.09 * kt
    if kt <= 0.80:
        return 0.9511 - 0.1604 * kt + 4.388 * kt ** 2 - 16.638 * kt ** 3 + 12.336 * kt ** 4
    return 0.165


def split_ghi(elev: float, ghi: float, doy: int) -> tuple[float, float]:
    cz = math.sin(math.radians(elev))
    if cz <= 0 or ghi <= 0:
        return 0.0, max(ghi, 0.0)
    e0 = 1361 * (1 + 0.033 * math.cos(2 * math.pi * doy / 365))
    kt = min(ghi / (e0 * cz), 1.0)
    diffuse = ghi * erbs_diffuse_fraction(kt)
    return ghi - diffuse, diffuse


A_SW = 0.7
EPS_P = 0.97
ALBEDO = 0.2
MIN_ELEV = 1.0


def mean_radiant_temp(ta, rh, cloud, elev, direct_h, diffuse_h, albedo=ALBEDO):
    """Six-directional simplification for a standing person in the open (Thorsson et al. 2007; Di Napoli et al. 2020).

    Half the body sees the sky and half the ground; the ground is taken to be
    at air temperature because the forecast has no surface temperature.
    """
    tk = ta + 273.15
    l_down = longwave_down(ta, rh, cloud)
    l_up = EPS_P * SIGMA * tk ** 4
    ghi = direct_h + diffuse_h
    # Beam normal irradiance blows up near the horizon, so the sun only counts once it clears it.
    if elev >= MIN_ELEV:
        i_normal = direct_h / math.sin(math.radians(elev))
        fp = projected_area_factor(elev)
    else:
        i_normal, fp = 0.0, 0.0
    absorbed_lw = 0.5 * l_down + 0.5 * l_up
    absorbed_sw = A_SW / EPS_P * (0.5 * diffuse_h + 0.5 * albedo * ghi + fp * i_normal)
    tmrt_k = ((absorbed_lw + absorbed_sw) / SIGMA) ** 0.25
    return {
        "tmrt": tmrt_k - 273.15,
        "lwDown": l_down,
        "lwUp": l_up,
        "fp": fp,
        "beamNormal": i_normal,
    }


def gen_mrt() -> None:
    from datetime import datetime

    positions = []
    places = {"london": (51.51, -0.13), "oslo": (59.91, 10.75), "madrid": (40.42, -3.70), "sydney": (-33.87, 151.21)}
    times = ["2026-03-20T12:00:00Z", "2026-06-21T06:00:00Z", "2026-06-21T12:00:00Z", "2026-11-26T08:20:00Z",
             "2026-11-26T12:00:00Z", "2026-12-21T15:00:00Z", "2026-12-21T23:00:00Z"]
    for name, (lat, lon) in places.items():
        for t in times:
            positions.append({"place": name, "lat": lat, "lon": lon, "utc": t, "elevation": r(solar_elevation(lat, lon, t), 2)})

    forecast_cases = []
    # Open-Meteo-style rows: radiation is the preceding-hour mean, in W/m2 on a horizontal plane.
    for ta, rh in [(-5, 80), (5, 85), (15, 60), (25, 45), (32, 35)]:
        for elev, direct_h, diffuse_h, cloud in [
            (-10, 0, 0, 0.0), (-10, 0, 0, 1.0), (5, 20, 30, 0.3), (15, 150, 80, 0.2),
            (30, 400, 100, 0.1), (45, 600, 110, 0.0), (60, 750, 120, 0.0), (30, 20, 180, 1.0),
        ]:
            m = mean_radiant_temp(ta, rh, cloud, elev, direct_h, diffuse_h)
            sg = None
            if elev > 0 and direct_h > 0:
                # SolarCal with the beam from the side, full sky view and full sun; diffuse handled by its own fixed ratio.
                sg_res = solar_gain(sol_altitude=elev, sharp=90, sol_radiation_dir=direct_h / math.sin(math.radians(elev)),
                                    sol_transmittance=1, f_svv=1, f_bes=1, asw=A_SW, posture="standing", round_output=False)
                sg = r(float(sg_res.delta_mrt), 2)
            forecast_cases.append({
                "in": {"ta": ta, "rh": rh, "cloud": cloud, "elevation": elev, "direct": direct_h, "diffuse": diffuse_h},
                "out": {k: r(v, 2) for k, v in m.items()},
                "solarCalDeltaMrt": sg,
            })

    fallback_cases = []
    # MET Norway has cloud cover but no radiation: estimate GHI, split it, then Tmrt.
    for ta, rh in [(0, 85), (20, 55)]:
        for elev in [-5, 5, 20, 40, 60]:
            for cloud in [0.0, 0.5, 0.875, 1.0]:
                doy = datetime(2026, 6, 21).timetuple().tm_yday
                ghi = ghi_from_cloud(elev, cloud)
                direct_h, diffuse_h = split_ghi(elev, ghi, doy)
                m = mean_radiant_temp(ta, rh, cloud, elev, direct_h, diffuse_h)
                fallback_cases.append({
                    "in": {"ta": ta, "rh": rh, "cloud": cloud, "elevation": elev, "dayOfYear": doy},
                    "out": {"ghi": r(ghi, 1), "direct": r(direct_h, 1), "diffuse": r(diffuse_h, 1), "tmrt": r(m["tmrt"], 2)},
                })

    dump(
        "mrt.json",
        {
            "meta": meta(
                "Outdoor mean radiant temperature from forecast radiation (six-directional simplification)",
                "reference implementation in scripts/science/generate_fixtures.py; SolarCal (pythermalcomfort.models.solar_gain) as a cross-check",
                {"ta": "degC", "rh": "%", "cloud": "fraction 0..1", "elevation": "deg", "radiation": "W/m2", "tmrt": "degC"},
                {"elevation": 0.05, "tmrt": 0.1, "radiation": 0.5},
                f"Constants: shortwave absorptivity {A_SW}, body emissivity {EPS_P}, albedo {ALBEDO}, "
                f"sun ignored below {MIN_ELEV} deg. Ground longwave assumes surface = air temperature. "
                "solarCalDeltaMrt is the ASHRAE 55 SolarCal increment for the same beam; it uses its own "
                "diffuse and floor-reflection assumptions, so expect it within a few kelvin, not equal.",
            ),
            "solarPosition": positions,
            "forecast": forecast_cases,
            "cloudFallback": fallback_cases,
        },
    )


if __name__ == "__main__":
    gen_utci()
    gen_ireq()
    gen_pmv()
    gen_clothing()
    gen_mrt()

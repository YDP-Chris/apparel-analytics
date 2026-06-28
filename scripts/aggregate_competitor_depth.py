#!/usr/bin/env python3
"""
Aggregate per-brand depth metrics bucketed into Gymreapers' sub-categories.

For Phase 1, the competitive-intel product catalogs don't carry consistent
sub-category classification (category/subcategory fields are mostly None),
so we bucket by keyword-matching on product title/type/tags/collections
directly into GR's own sub-category taxonomy. That gives Kalina an apples-to-
apples view: "your Leggings row vs Vuori's leggings count," not a two-step
taxonomy hop.

Output: public/line-plan/competitor_depth.json
  {
    "brands": ["vuori", "gymshark", ...],
    "by_gr_subcategory": {
      "Womens Apparel|Leggings": {
        "gr_actual": {sku_count, title_count, color_count, msrp_avg, ...},  # from GR rollup
        "competitors": {
          "vuori": {title_count, color_count, sku_count, msrp_min/max/avg, top_colors},
          ...
        }
      }
    },
    "generated_at": "..."
  }
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
LINE_PLAN_DATA = Path("/mnt/data/agents/webhook-server/data/line-plan")
SKU_ROLLUP = LINE_PLAN_DATA / "sku_rollup.json"
PRODUCTS_DIR = Path("/mnt/data/agents/competitive-intel/data/products")
OUT = LINE_PLAN_DATA / "competitor_depth.json"

# Brands to include in the depth panel, segmented by tier so each GR
# sub-category gets benchmarked against the right set of competitors.
APPAREL_BRANDS = [
    "vuori", "lululemon", "alo", "gymshark", "tenthousand",
    "outdoor_voices", "rhone", "fabletics", "athleta",
    "gymreapers",
]

# Strength peers — Equipment sub-categories only.
STRENGTH_BRANDS = [
    "sbd", "schiek", "harbinger", "bear_grips", "slingshot",
    "inzer", "twopood", "rogue_fitness",
]

# Womens-direct competitors — set-driven, scrunch-legging brands that
# compete with GR Women's specifically. Surfaced ONLY when the selected
# sub-category is under "Womens Apparel".
WOMENS_DIRECT_BRANDS = [
    "dfyne",
    "oner_active",
]


# GR sub-category → list of keyword patterns (matched against title + tags + collections + product_type).
# Order matters — more specific patterns first (e.g. "Tank Tops" before "Tees" so a "Tank Top" isn't double-matched).
# Each pattern is a compiled regex run against lowercased text.
GR_SUBCAT_PATTERNS = {
    # WOMENS APPAREL
    ("Womens Apparel", "Leggings"): [r"\blegging", r"\btights?\b", r"\bcompression\s+tights?\b"],
    ("Womens Apparel", "Bras"): [r"\bbra\b", r"\bsports?\s*bra\b", r"\bbralette\b"],
    ("Womens Apparel", "Joggers"): [r"\bjogger", r"\bsweatpants?\b"],
    ("Womens Apparel", "Shorts"): [r"\bshorts?\b", r"\bbiker shorts?\b"],
    ("Womens Apparel", "Tank Tops"): [r"\btank\s*tops?\b", r"\bsingle?t\b", r"\bcami\b"],
    ("Womens Apparel", "Tees"): [r"\btees?\b", r"\bt-shirts?\b", r"\bcrop\s*top\b"],
    ("Womens Apparel", "Long Sleeve Shirts"): [r"\blong\s*sleeve", r"\bl\/s\b"],
    ("Womens Apparel", "Hoodies"): [r"\bhoodies?\b", r"\bhooded sweat", r"\bpullover hoodie"],
    ("Womens Apparel", "Jackets"): [r"\bjackets?\b", r"\bcoat\b", r"\bbomber\b"],
    ("Womens Apparel", "Quarter Zips"): [r"\b1\/4\s*zip\b", r"\bquarter[\s-]*zip\b", r"\bhalf[\s-]*zip\b"],
    ("Womens Apparel", "Bodysuit"): [r"\bbodysuits?\b", r"\bone[\s-]*piece\b", r"\ball[\s-]*in[\s-]*one\b"],
    ("Womens Apparel", "Polos"): [r"\bpolos?\b"],
    # MENS APPAREL
    ("Mens Apparel", "Joggers"): [r"\bjogger", r"\bsweatpants?\b"],
    ("Mens Apparel", "Shorts"): [r"\bshorts?\b", r"\btraining shorts?\b"],
    ("Mens Apparel", "Tank Tops"): [r"\btank\s*tops?\b", r"\bsingle?t\b", r"\bstringer\b"],
    ("Mens Apparel", "Tees"): [r"\btees?\b", r"\bt-shirts?\b", r"\bperformance tee\b"],
    ("Mens Apparel", "Basic Tee"): [r"\bbasic\s*tee\b", r"\bessential\s*tee\b"],
    ("Mens Apparel", "Graphic Tees"): [r"\bgraphic\s*tee\b", r"\blogo\s*tee\b"],
    ("Mens Apparel", "Long Sleeve Shirts"): [r"\blong\s*sleeve", r"\bl\/s\b"],
    ("Mens Apparel", "Hoodies"): [r"\bhoodies?\b", r"\bhooded sweat", r"\bpullover hoodie"],
    ("Mens Apparel", "Jackets"): [r"\bjackets?\b", r"\bcoat\b", r"\bbomber\b", r"\bwindbreaker\b"],
    ("Mens Apparel", "Quarter Zips"): [r"\b1\/4\s*zip\b", r"\bquarter[\s-]*zip\b", r"\bhalf[\s-]*zip\b"],
    ("Mens Apparel", "Polos"): [r"\bpolos?\b"],
    # ACCESSORIES
    ("Accessories", "Hats"): [r"\bhats?\b", r"\bcaps?\b", r"\bbeanies?\b", r"\btrucker\b", r"\bsnapback\b", r"\bdad hat\b"],
    ("Accessories", "Bags"): [r"\bbags?\b", r"\bbackpacks?\b", r"\btote\b", r"\bduffle\b", r"\bcrossbody\b"],
    ("Accessories", "Socks"): [r"\bsocks?\b", r"\bcrew\s*sock"],
    ("Accessories", "Bottles & Sleeves"): [r"\bbottle\b", r"\bshakers?\b", r"\bsleeves?\b"],
    ("Accessories", "Boxers"): [r"\bboxers?\b", r"\bunderwear\b", r"\bbriefs?\b"],
    ("Accessories", "Gloves"): [r"\bgloves?\b"],
    # EQUIPMENT (only strength peers will be matched into these)
    ("Equipment", "Belts"): [r"\bbelts?\b", r"\blifting belt\b", r"\bpowerlifting belt\b"],
    ("Equipment", "Knee Sleeves"): [r"\bknee\s*sleeves?\b"],
    ("Equipment", "Lifting Straps"): [r"\blifting\s*straps?\b", r"\bwrist\s*straps?\b"],
    ("Equipment", "Lifting Gloves"): [r"\blifting\s*gloves?\b", r"\bgrip\s*gloves?\b"],
    ("Equipment", "Wrist Wraps"): [r"\bwrist\s*wraps?\b"],
    ("Equipment", "Resistance Bands"): [r"\bresistance\s*bands?\b", r"\bhip\s*bands?\b"],
    ("Equipment", "Plate Carrier"): [r"\bplate\s*carrier", r"\bweighted\s*vest\b"],
    ("Equipment", "Jump Rope"): [r"\bjump\s*rope", r"\bspeed\s*rope\b"],
}

# Pre-compile
COMPILED = {key: [re.compile(p, re.IGNORECASE) for p in pats] for key, pats in GR_SUBCAT_PATTERNS.items()}


def match_subcategories(product: dict) -> list[tuple[str, str]]:
    """Return list of (category, sub_category) matches for this product.
    A product may match more than one (e.g. 'Mens Apparel|Tees' AND 'Mens Apparel|Graphic Tees')."""
    haystack_parts = [
        str(product.get("title", "")),
        str(product.get("product_type", "")),
        " ".join(product.get("tags") or []) if isinstance(product.get("tags"), list) else "",
        " ".join(product.get("collections") or []) if isinstance(product.get("collections"), list) else "",
    ]
    haystack = " | ".join(haystack_parts).lower()
    matches = []
    for key, patterns in COMPILED.items():
        for p in patterns:
            if p.search(haystack):
                matches.append(key)
                break
    return matches


def aggregate_brand(brand_slug: str, brand_file: Path) -> dict:
    """For one brand, bucket products into GR sub-categories."""
    try:
        data = json.loads(brand_file.read_text())
    except FileNotFoundError:
        return {}
    products = data.get("products", [])

    by_subcat = defaultdict(lambda: {
        "products": [],   # list of (title, msrp, colors[])
        "colors": Counter(),
        "titles": set(),
    })

    for p in products:
        matches = match_subcategories(p)
        for key in matches:
            bucket = by_subcat[key]
            bucket["titles"].add(p.get("title", "").strip())
            for color in (p.get("colors") or []):
                if color:
                    bucket["colors"][color.strip()] += 1
            bucket["products"].append({
                "title": p.get("title"),
                "msrp": p.get("max_price"),
                "color_count": p.get("color_count", 0),
                "variant_count": p.get("variant_count", 0),
            })

    out = {}
    for key, b in by_subcat.items():
        msrps = [p["msrp"] for p in b["products"] if isinstance(p.get("msrp"), (int, float)) and p["msrp"] > 0]
        skus = sum(p.get("variant_count") or 1 for p in b["products"])
        top_colors = [c for c, _ in b["colors"].most_common(8)]
        out[f"{key[0]}|{key[1]}"] = {
            "title_count": len(b["titles"]),
            "color_count": len(b["colors"]),
            "sku_count": skus,
            "msrp_min": round(min(msrps), 2) if msrps else None,
            "msrp_max": round(max(msrps), 2) if msrps else None,
            "msrp_avg": round(sum(msrps) / len(msrps), 2) if msrps else None,
            "top_colors": top_colors,
        }
    return out


def load_gr_rollup() -> dict:
    """Roll the per-collection SKU rollup up to (category, sub_category) only.
    The Phase 1 page works at sub-cat granularity, not collection."""
    data = json.loads(SKU_ROLLUP.read_text())
    by_subcat = defaultdict(lambda: {
        "sku_count": 0,
        "title_count": 0,
        "color_count": 0,
        "msrps": [],
        "status_mix": Counter(),
    })
    for r in data["rollup"]:
        key = (r["category"], r["sub_category"])
        b = by_subcat[key]
        b["sku_count"] += r["sku_count"]
        b["title_count"] += r["title_count"]
        b["color_count"] += r["color_count"]
        if r.get("msrp_avg"):
            # weight by sku count
            b["msrps"].append((r["msrp_avg"], r["sku_count"]))
        for status, n in (r.get("status_mix") or {}).items():
            b["status_mix"][status] += n

    out = {}
    for (cat, sub), b in by_subcat.items():
        msrps = b["msrps"]
        weighted_avg = None
        if msrps:
            total_skus = sum(n for _, n in msrps)
            weighted_avg = round(sum(m * n for m, n in msrps) / total_skus, 2) if total_skus else None
        out[f"{cat}|{sub}"] = {
            "sku_count": b["sku_count"],
            "title_count": b["title_count"],
            "color_count": b["color_count"],
            "msrp_avg": weighted_avg,
            "status_mix": dict(b["status_mix"]),
        }
    return out


def main():
    print("Loading GR rollup...")
    gr_rollup = load_gr_rollup()
    print(f"  GR sub-categories: {len(gr_rollup)}")

    print("Aggregating competitor brands...")
    by_brand: dict[str, dict] = {}
    all_brands = APPAREL_BRANDS + STRENGTH_BRANDS + WOMENS_DIRECT_BRANDS
    for brand in all_brands:
        brand_file = PRODUCTS_DIR / f"{brand}_products.json"
        if not brand_file.exists():
            print(f"  {brand}: NO CATALOG FILE")
            continue
        agg = aggregate_brand(brand, brand_file)
        if agg:
            by_brand[brand] = agg
            print(f"  {brand}: {len(agg)} GR sub-categories matched")

    # Pivot: by GR subcategory → competitors
    by_subcat: dict[str, dict] = {}
    all_subcats = set(gr_rollup.keys())
    for brand, brand_data in by_brand.items():
        all_subcats.update(brand_data.keys())

    for subcat_key in all_subcats:
        category = subcat_key.split("|", 1)[0]
        # Per-category eligibility:
        #   Equipment    → strength peers only
        #   Womens Apparel → apparel majors + womens-direct tier
        #   Mens / Accessories → apparel majors only
        if category == "Equipment":
            eligible_brands = STRENGTH_BRANDS
        elif category == "Womens Apparel":
            eligible_brands = APPAREL_BRANDS + WOMENS_DIRECT_BRANDS
        else:
            eligible_brands = APPAREL_BRANDS

        competitors = {}
        for brand in eligible_brands:
            if brand == "gymreapers":
                continue  # GR's own depth shown via gr_actual, not double-counted
            row = by_brand.get(brand, {}).get(subcat_key)
            if row and row["title_count"] > 0:
                competitors[brand] = row

        by_subcat[subcat_key] = {
            "gr_actual": gr_rollup.get(subcat_key),
            "competitors": competitors,
        }

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "brands_apparel": APPAREL_BRANDS,
        "brands_strength": STRENGTH_BRANDS,
        "brands_womens_direct": WOMENS_DIRECT_BRANDS,
        "by_gr_subcategory": by_subcat,
    }
    OUT.write_text(json.dumps(output, indent=2))
    print(f"\nWrote {OUT}")
    print(f"  GR sub-categories: {len(by_subcat)}")
    print(f"  Brands aggregated: {len(by_brand)}")


if __name__ == "__main__":
    main()

# Apparel Intel

A competitive intelligence dashboard tracking 12,000+ products across 6 major premium athleisure brands.

## Overview

This dashboard visualizes product catalog data collected from brand sitemaps to provide insights into:

- **Catalog size** - Who has the largest product assortment?
- **Category mix** - How do brands allocate across bottoms, tops, outerwear?
- **Subcategory battles** - Who leads in joggers, leggings, shorts?
- **Brand positioning** - Where does each brand over/under-index vs market?

## Brands Tracked

| Brand | Products | Focus |
|-------|----------|-------|
| Gymshark | 3,581 | Largest catalog, shorts-heavy |
| Alo Yoga | 3,396 | Leggings leader |
| Vuori | 2,422 | Shorts/joggers focus |
| Lululemon | 2,379 | Balanced, tanks leader |
| Outdoor Voices | 297 | Lifestyle positioning |
| Ten Thousand | 88 | Performance men's focus |

## Tech Stack

- **Framework:** Next.js 14 (App Router, static export)
- **Charts:** Tremor (React charting, Tailwind-native)
- **Styling:** Tailwind CSS
- **Data:** Static JSON generated from sitemap monitoring

## Development

```bash
# Install dependencies
npm install

# Generate data (requires competitive-intel data in ../competitive-intel/)
npm run prepare-data

# Run development server
npm run dev

# Build for production (includes data prep)
npm run build
```

## Deployment

This project is configured for static export. Deploy to Vercel, Netlify, or any static host:

```bash
npm run build
# Static files output to ./out/
```

## Design Principles

Following Cole Nussbaumer Knaflic's "Storytelling with Data":

1. **Context first** - Each page leads with what the data means, not just what it shows
2. **Eliminate clutter** - No gridlines, minimal legends, let the data speak
3. **Focus attention** - Strategic use of color to highlight what matters
4. **Tell a story** - Clear narrative arc on each page

## Data Pipeline

Product data flows from the competitive-intel agent:

```
competitive-intel/data/state.json
         ↓
scripts/prepare-data.ts (aggregation, indexing)
         ↓
data/products.json (optimized for dashboard)
         ↓
Next.js static build
```

## Pages

- `/` - Overview with headline insight and key metrics
- `/brands` - Category mix comparison across brands
- `/categories` - Deep dive into each product category
- `/subcategories` - Battle view for key segments (joggers, leggings, etc.)
- `/brand/[slug]` - Individual brand analysis with index calculations

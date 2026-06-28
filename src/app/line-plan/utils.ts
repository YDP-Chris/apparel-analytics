// Number/format helpers + Kalina's decision-rule thresholds in one place.
// The thresholds come from GR_Kalina_Line_Planning_Reference.docx.

export const VAR_PCT_THRESHOLDS = {
  // Var % vs Target buckets per Kalina's playbook
  green: -0.05,   // >-5% is "at or above plan"
  amber: -0.20,   // -5% to -20% is "amber"
  // <-20% is "red"
};

export type VarBucket = "green" | "amber" | "red" | "neutral";

export function varBucket(varPct: number | null | undefined): VarBucket {
  if (varPct == null) return "neutral";
  if (varPct >= VAR_PCT_THRESHOLDS.green) return "green";
  if (varPct >= VAR_PCT_THRESHOLDS.amber) return "amber";
  return "red";
}

export function varBucketClasses(b: VarBucket): { bg: string; text: string; border: string } {
  switch (b) {
    case "green":
      return { bg: "bg-gr-success/15", text: "text-gr-success", border: "border-gr-success/40" };
    case "amber":
      return { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/40" };
    case "red":
      return { bg: "bg-gr-danger/15", text: "text-gr-danger", border: "border-gr-danger/40" };
    default:
      return { bg: "bg-gr-raised", text: "text-gr-muted", border: "border-gr-border" };
  }
}

export function fmtMoney(n: number | null | undefined, opts?: { compact?: boolean }): string {
  if (n == null) return "—";
  if (opts?.compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  }
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function fmtPct(n: number | null | undefined, signed = true): string {
  if (n == null) return "—";
  const pct = n * 100;
  if (signed && pct > 0) return `+${pct.toFixed(1)}%`;
  return `${pct.toFixed(1)}%`;
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("en-US");
}

// Brand-name mapping for the competitor depth panel.
export const BRAND_NAMES: Record<string, string> = {
  vuori: "Vuori",
  lululemon: "Lululemon",
  alo: "Alo Yoga",
  gymshark: "Gymshark",
  tenthousand: "Ten Thousand",
  outdoor_voices: "Outdoor Voices",
  rhone: "Rhone",
  fabletics: "Fabletics",
  athleta: "Athleta",
  gymreapers: "Gymreapers",
  dfyne: "DFYNE",
  oner_active: "Oner Active",
  sbd: "SBD Apparel",
  schiek: "Schiek",
  harbinger: "Harbinger",
  bear_grips: "Bear Grips",
  slingshot: "Slingshot",
  inzer: "Inzer",
  twopood: "2POOD",
  rogue_fitness: "Rogue Fitness",
};

export function brandName(slug: string): string {
  return BRAND_NAMES[slug] ?? slug;
}

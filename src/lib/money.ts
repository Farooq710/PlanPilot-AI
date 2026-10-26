/** Indian rupee, en-IN grouping: 25000 -> "₹25,000", 120000 -> "₹1,20,000". */
export const inr = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`

/** Same grouping without the symbol, for table cells that carry their own. */
export const num = (n: number): string => Math.round(n).toLocaleString('en-IN')

/** Signed delta, for what-if diffs: 3200 -> "+₹3,200", -900 -> "−₹900". */
export const delta = (n: number): string =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${inr(Math.abs(n))}`

/** Percentage of budget used, clamped so a blown budget still renders. */
export const pctOf = (part: number, whole: number): number =>
  whole <= 0 ? 0 : Math.min(999, Math.round((part / whole) * 100))

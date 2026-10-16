// The programme chart's axis label tiers as container queries on the plot.

/**
 * The plot widths of AXIS_LABEL_TIERS in src/domain/engines/programme.ts (280, 440, 640 and 840 px), as container
 * queries. Tailwind needs whole class names, so they are written out; a test keeps the two in step.
 */
export const TICK_TIER_CLASS = ['', 'hidden @min-[440px]:block', 'hidden @min-[640px]:block', 'hidden @min-[840px]:block'] as const

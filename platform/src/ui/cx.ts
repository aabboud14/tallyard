/** Joins class names, skipping empty parts. */
export function cx(...parts: (string | false | null | undefined | 0)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** The shared focus ring for controls that draw their own (inputs, cards with a link overlay). */
export const focusRing = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'

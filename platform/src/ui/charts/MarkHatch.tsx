// A 45 degree hatch laid over late or declined fills, so they read apart from tight or waiting without colour.
// White 1 px lines at a 4 px pitch, at half opacity. Put <MarkHatch id> inside an svg's defs, or use
// HATCH_STYLE (in tones.ts) on an HTML element.

export function MarkHatch({ id }: { id: string }) {
  return (
    <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="4" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
    </pattern>
  )
}

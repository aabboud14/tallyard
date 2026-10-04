# Design plan

A precise working tool from construction and property: a survey drawing crossed with a stockyard ledger. See brief/05-DESIGN-AND-TECH.md section 1.

## Tokens (src/styles.css, `@theme static`)

| Token | Value | Use |
|---|---|---|
| paper | #F4F6F7 | page background |
| panel | #FFFFFF | tables, cards, panels |
| ink | #14202B | text |
| ink-soft | #3D4A56 | secondary text |
| steel | #2C5E86 | primary actions, links, drawings |
| steel-deep | #214A6B | hover |
| steel-tint | #E4EDF4 | selected rows, quiet fills |
| mill | #7B8A97 | rules, dimension lines (never text) |
| mill-text | #5A6873 | muted text (darkened mill) |
| rule, rule-soft | #D3DAE0, #E6EBEF | borders |
| survey, survey-tint | #F4C20D, #FDF3C4 | tags and status markers, always with ink text |
| oxide, oxide-tint | #A63A22, #F7E7E2 | private marking, blocking warnings |
| teal, teal-tint | #2E7D6B, #E1F0EC | a target or aim that is met |

## Type scale

- Display: Barlow Condensed 600, tabular figures. 28 px page figures, 22 px panel figures, 18 px tags and designations.
- Interface: IBM Plex Sans 400 body at 15 px, 500 labels, 600 headings (20 px h1, 16 px h2).
- Mono: IBM Plex Mono 400 at 11 px for dimension text inside drawings only.

## Layout sketch

```
+------------------------------------------------------------------------------+
| Tallyard  [Persona: Tom Ashby, Ostlea Estates, Asset manager v]  Demo script |
|           Assumptions  About  Reset demo data        [Prototype, sample data] |
+-----------+------------------------------------------------------------------+
| Supply    | <main>                                                            |
| Tiverne   |  h1 Screen title                         status tag               |
| House     |  +------------------------------+  +------------------------+     |
|  Inventory|  | dense table, numbers right   |  | detail panel           |     |
|  Capture  |  | units in column headers      |  | private fields marked  |     |
|  Priority |  |                              |  | with oxide rule + lock |     |
|  Listings |  +------------------------------+  +------------------------+     |
|  Offers   |                                                                   |
+-----------+------------------------------------------------------------------+
| Demo date: 7 October 2026                                                     |
+------------------------------------------------------------------------------+
```

Capture at 390 px is one column: description with Assist, photo input, family, fields, condition, recoverability, location, notes, Save. Every control is at least 44 px tall.

## Drawings

Inline SVG from real dimensions, one scale per list.

- Steel sections: the true I profile from h, b, tw and tf, root fillets drawn at 1.2 tw for appearance only. Dimension lines for h and b with mono text, the designation underneath in Barlow Condensed. A list of sections shares one scale (px per mm) computed from the largest h and b in the list, so a 610 beam is visibly larger than a 305 column.
- Panels, stone, bricks, floor panels and joists: a dimensioned rectangle in the same stroke and text style (width by height, or thickness).
- Stroke: steel blue, 1.5 px for the profile, mill grey 1 px for dimension lines with small end ticks drawn as lines (never characters).

## Privacy made visible

In owner views every private field sits in a block with an oxide red left rule, a small lock drawn as SVG, and the word "Private". Public fields are unmarked. The market preview sits beside the private record.

## Charts

Hand-built SVG: a bullet chart for the content by value aim and the diversion target (teal when met), one stacked horizontal bar for tonnes by destination, simple bars for priority scores.

# visual-qa

## Decisions
- **Brief section 11 sets Inter variable. The opsz axis is already imported, so large sizes already use the display cut. The generic look comes from effects and layout, not from the typeface.**: Read 'less AI-ish' as removing decorative effects (gradients, glows, vignettes, blur, tilted mosaics, glass cards, icon tiles, concentric rings) and replacing them with precise technical drawing, real-scale swatches and real charts. No new fonts and no new runtime dependencies.
- **Colour carries meaning instead of decoration, which matches how OneClickLCA's product shows performance against a benchmark. The state is computed by a pure, tested domain function (P2).**: Read 'colour-coded metrics' as each metric being coloured by its state against a target (good, warning, critical, neutral, always with an icon and a word), plus one fixed categorical colour per typology in charts. Metric kinds do not each get a decorative colour.
- **Categorical #2f6db5,#c4562c,#16917a,#b07d00,#8a56b8,#d0688f passes every adjacent-pair check with all contrasts at least 3:1, and its first three slots pass all-pairs (used for typology). Fit marks #2d8064,#d97706,#b91c1c,#a8a29e pass all-pairs CVD (worst 9.0). The neutral grey fails the chroma floor on purpose, so it always ships with a legend label.**: Add a validated data-vis token set: categorical viz-1 to viz-6, an ordinal and sequential ramp from the brand greens, and five status mark fills. All of these were run through the dataviz validator against #ffffff.
- **ui.test.tsx asserts bg-brand-600 on primary buttons, and several tests read the data attributes. No test is weakened (P8).**: Keep every token and class name that tests or features rely on (bg-brand-600, data-band, data-segments, data-kind, data-fit) and change values or add new tokens instead.
- **11 of the 17 Discover cards are steel and currently look almost the same. An axonometric shows length as well as section, so each card differs, and it previews the spinnable 3D view the partner asked for.**: Show steel as an axonometric line drawing of the extruded member at its recorded length, on paper ground, instead of the shaded profile on a blue-grey gradient grid.
- **The partner asked for project thumbnails. There are no real photos in the sandbox, and a precise elevation fits the technical drawing direction.**: Generate project and building thumbnails as line-drawn elevations seeded by ID and type. They are illustrations and are never called photos.
- **The traits used are recalled, not measured: real architectural photography, real product screenshots with life-cycle-stage stacked bars and rating scales, a dark ink and green palette, dense data tables, and standards named as text. Treat them as a summary to check.**: Did not inspect oneclicklca.com live. Both WebFetch (DNS) and curl (proxy 403) failed, so the benchmark notes come from prior knowledge of the site and product.
- **This avoids two agents editing the same feature file. TimelineStrip, styles.css, ui/index.ts, ui/labels.ts and the seed photo are listed as shared.**: Visual-qa owns the design system files and the two public marketing surfaces (Landing, AuthLayout). It does not own feature screens. Each screen recommendation is handed to the cluster that owns that screen, as the components and rules to apply.

## Spec
# Section 14.x Visual direction and design system refresh (cluster: visual-qa)

Source: a screenshot audit of the built app at 1440 px, 15 October 2026. The audit covered the landing page, sign-in, architect home, Discover, a material page, project overview, shortlist, specification and carbon; client home, approvals and reservations; owner home, building overview, inventory, priorities, listings, sharing and requests; surveyor home, capture and inventory; consultant home, carbon, compliance and waste. Screenshots are in the session scratchpad (`visual-qa/png/`); they are not committed.

## 1. What makes it read as generic or AI-generated

Ranked by how much each one costs credibility with architects and developers.

1. **Rendered material "illustrations" with decorative lighting.** Every illustration goes through `Finish()`: a diagonal light gradient, a radial vignette, a grain filter and, per family, blurred clouds (curtain wall), glare streak polygons, Gaussian-blurred stains (precast) and a drop shadow (steel). The result looks like a stock 3D render, not a material. The brick is too saturated and too regular. The timber is cartoon orange with dot knots. The raised floor reads as a calendar grid with one black square.
2. **Monotony in the showroom.** 11 of the 17 Discover cards show the same blue-grey I-section on the same gradient grid at the same size. The grid gives no sense of variety or scale, and nothing on the card shows length.
3. **Marketing tropes on the public pages.**
   - Landing: a masked grid background and a radial green glow behind the hero; a pill announcement above the headline; a blurred gradient halo behind a floating product collage with overlapping popovers; dotted backgrounds in the role cards; a dark green slab with three icon tiles; an avatar stack above the call to action.
   - Sign-in: a mosaic rotated by 8 degrees on dark green, under a glassmorphism floating card.
4. **Uniform cards and icon tiles.** Every section is a white bordered card with `shadow-sm` and a header rule. Stat tiles put a 14 px icon inside a 24 px tinted rounded square. Project headers use a green rounded square with a folder icon; building headers use a black square. Empty states draw two concentric rounded rings around a gradient tile.
5. **Dashboards are lists of text.**
   - Home pages are mostly a greeting, bare numbers and an activity feed. The feed takes the full right column, with avatar circles on every row.
   - Apart from thin status bars, nothing on screen is a chart. Carbon "by status" and "by typology" are thin progress lines. Compliance is three tables and a paragraph.
6. **Colour without meaning.**
   - Colour comes from one brand green, a few Tailwind blues, ambers and reds, and tinted pills.
   - The sustainability band is three identical green dashes (it reads as a signal-strength icon), repeated on every card.
   - Priority score bars use four colours that do not match their own legend order.
   - Status fills are hard-coded hex values in `Progress.tsx`, `TimelineStrip.tsx` and `SurveyorHome.tsx`.
7. **Pill noise.** Tinted, ringed, fully rounded pills appear on almost every row (Published, Shared, Private, Reuse, Downcycle, Awaiting the seller, Approved). In tables they compete with the data.
8. **Flat type hierarchy.**
   - Page titles are 22 px; section titles are 14 to 16 px semibold; muted 13 px sub-lines sit everywhere.
   - "INDICATIVE PACKAGE" is the one uppercase eyebrow, which is inconsistent.
   - The weakest graphic on the project overview is the programme: a thin 11 px axis and mint pill bars, when it should dominate.
9. **Placeholder photo.** The seeded TH-01 photo renders as an almost blank tile in Inventory, which looks broken.

What already works and stays: the inset app panel on a canvas background, the sidebar folders, breadcrumbs, the command palette, tabular figures, dense owner tables, the compliance headline figure, and the dimensioned 2D drawing tab (the best graphic in the app).

## 2. Benchmark notes (OneClickLCA, from prior knowledge; the site could not be reached from this environment)

- Credibility comes from **real data visualisation**: stacked bars by life-cycle module, a benchmark rating scale, and figures against a target. It does not come from decoration.
- Imagery is **real architecture** (photography of buildings and construction) next to **real product screenshots** at legible scale, not tilted.
- Standards are **named in text** (certification schemes, regulations) as proof of fit.
- Palette: a deep ink or near-black for dark bands, one green accent, white surfaces, and several chart hues used consistently.
- Dense tables and charts inside the product; generous whitespace only on marketing pages.

The direction for Tallyard is to beat this on the material side, using precise technical drawings and real-scale swatches, while matching its restraint and data clarity.

## 3. Principles for every screen

1. **One container per object, not per section.** Cards are for things you can open (a project, a material, a building) and for charts. Lists and tables sit on the page under a section heading, with no card around them.
2. **No decorative effects.** No gradients, glows, blur, backdrop blur on content, vignettes, drop shadows on drawings, masked grids, dotted backgrounds, rotation or overlapping floating cards. Shadows are reserved for overlays (popover, dialog, sheet, toast).
3. **Drawings are drawings.** Ink on paper, true proportions, hairlines, hatch for cut faces, dimensions in millimetres, a title strip. Swatches show material at a stated scale, with a scale bar.
4. **Colour carries meaning.** Brand green means action and selection. Mark colours mean state (fit, status, metric against target). Categorical hues mean identity (typology), in fixed order. Text never takes a series colour.
5. **Every chart has a word.** A status colour always comes with an icon and a label. Every chart with two or more series has a legend, and each chart has an accessible table alternative.
6. **Numbers first on dashboards.** The headline metrics come first, as a metric strip with state, then the programme, then actions. Activity comes last, collapsed to 5 rows.

## 4. Token set (`src/styles.css`, `@theme`)

Keep every existing token name and add the following. The changed values are marked.

```css
/* Neutrals: additions */
--color-canvas: #f4f3f1;      /* app background behind the inset panel; replaces bg-[#f4f3f1] in AppShell */
--color-paper: #f7f6f3;       /* drawing and swatch ground */
--color-night: #10201b;       /* the one dark band on public pages */
--color-night-line: #23362f;

/* Brand: unchanged values. brand-600 stays the action colour (ui.test asserts bg-brand-600). */

/* Data-vis categorical, fixed order, never cycled. Validated on #ffffff:
   adjacent pairs all pass (worst CVD dE 10.6, normal 15.9, all contrast >= 3:1);
   slots 1 to 3 pass all-pairs (worst CVD dE 10.8, normal 16.1). */
--color-viz-1: #2f6db5;  /* steel blue  : Structure */
--color-viz-2: #c4562c;  /* terracotta  : Envelope */
--color-viz-3: #16917a;  /* teal        : Finishes */
--color-viz-4: #b07d00;  /* ochre */
--color-viz-5: #8a56b8;  /* violet */
--color-viz-6: #d0688f;  /* rose */
--color-viz-other: #a8a29e; /* folded "Other" */

/* Ordinal ramp (one hue, light to dark; validated --ordinal, light end 2.13:1):
   brand-300 #82bea4, brand-500 #2d8064, brand-700 #175541.
   Sequential continuous use (heat cells) may run brand-100 to brand-900. */

/* Status and fit marks (fills for bars, dots, timeline windows). Text keeps the existing
   text tokens (brand-700, info-strong, warning, danger). Validated all-pairs:
   good/warning/critical/neutral worst CVD dE 9.0. */
--color-mark-neutral: #a8a29e;  /* shortlisted, available now, private, not started */
--color-mark-info: #2563eb;     /* sent to client, shared, in progress */
--color-mark-good: #2d8064;     /* approved, in time, published, on target */
--color-mark-warning: #d97706;  /* tight, near target */
--color-mark-critical: #b91c1c; /* declined, late, off target */

/* Type: one new size, one changed */
--text-2xs: 0.6875rem;              /* 11 px: axis ticks, drawing labels, chip text */
--text-2xs--line-height: 0.875rem;
--text-2xl: 1.5rem;                 /* CHANGED from 1.375rem: page titles 24 px */
--text-2xl--line-height: 2rem;
--text-2xl--letter-spacing: -0.02em;

/* Elevation: cards are flat */
--shadow-card: none;                /* documented: cards use border only */
```

**Type usage rules.**

| Element | Style |
|---|---|
| Page title | `text-2xl font-semibold` (24 px) |
| Section heading on the page | `text-lg font-semibold` (16 px), 12 px above its content |
| Card title | `text-base font-semibold` |
| Metric value | `text-3xl font-semibold tabular-nums`; hero metric `text-4xl` |
| Unit | `text-base text-muted` |
| Label | `text-sm text-muted` |
| Axis ticks, drawing labels | `text-2xs tabular-nums text-muted` |
| IDs and tags (TH-01, L-9F4CQQ) | `font-mono text-xs` |

No uppercase eyebrows: change "INDICATIVE PACKAGE" in `Reservations.tsx` to sentence case "Indicative package", owned by the reservations cluster.

**Spacing.**

| Area | Value |
|---|---|
| Page gutter | `px-8` at 1280 px and above, `px-6` from 1024 px, `px-4` below |
| Section stack | `gap-8` (32 px) |
| Card padding | `p-5` |
| Owner and consultant tables, desktop | rows `h-11` (44 px); phones keep 44 px targets (P9) |
| Discover grid | `gap-x-6 gap-y-10` |

**Radius.**

| Element | Radius |
|---|---|
| Cards and inputs | 8 px (unchanged) |
| Buttons | 6 px (unchanged) |
| Images and drawings | `rounded-md` (6 px), was `rounded-xl` |
| Chips and pills | `rounded-[5px]`, was full; the dot inside stays round |

**Elevation.**

| Level | Use |
|---|---|
| e0 | Cards: border only |
| e1 | Inputs and secondary buttons: `shadow-xs` |
| e2 | Popovers and menus: `shadow-pop` |
| e3 | Dialogs and sheets: `shadow-overlay` |

Hovering an interactive card changes `border-line-strong`; it no longer lifts with a shadow.

**Typology colours** (new export in `src/ui/labels.ts`):

```ts
export const TYPOLOGY_VIZ: Record<'structure' | 'envelope' | 'finishes', string> = {
  structure: 'var(--color-viz-1)', envelope: 'var(--color-viz-2)', finishes: 'var(--color-viz-3)',
}
export const MARK: Record<Tone, string> = {
  neutral: 'var(--color-mark-neutral)', brand: 'var(--color-mark-good)', info: 'var(--color-mark-info)',
  warning: 'var(--color-mark-warning)', danger: 'var(--color-mark-critical)',
}
```

The status palette and the categorical palette are never mixed in one chart. Carbon by status uses `MARK`; carbon by typology uses `TYPOLOGY_VIZ`.

**RIBA stages and the programme** (style rules for whichever cluster builds the stage timeline):

| Part | Style |
|---|---|
| Stage bands | alternate `bg-subtle` and `bg-surface`, labelled "Stage 2, Concept design" in `text-2xs` |
| Current stage | `bg-brand-50` with a `brand-600` 2 px top rule and `text-brand-700` label |
| Today line | 2 px `brand-600`, with a "Today" label |
| Site start and practical completion | 2 px ink lines with labels |
| Availability windows | 12 px high bars filled with the mark colour of their fit, 3 px radius |
| Late windows | add a 45 degree hatch overlay (`MarkHatch` pattern) so late reads apart from tight without colour |
| Storage runs | 1.5 px dashed lines in `mark-neutral` |

## 5. Imagery and illustration rules

**Two kinds of picture only. Both are illustrations; neither is ever called a photo.**

### A. Swatch: material close-up at stated scale

- **Ground and lighting.** Flat, even light. Remove `Finish()`'s light gradient and vignette entirely; keep grain at 0.05 at most. No blur filters, no clouds, no glare polygons, no drop shadows.
- **Scale bar.** Each swatch carries a scale bar bottom-left: a 2 px ink bar with the label "100 mm" or "1 m" (`text-2xs`, on a paper chip with no blur). Board scale is fixed per family:

| Family | Board width represents | Notes |
|---|---|---|
| Brick | 1.4 m | |
| Stone | 2.4 m | |
| Precast | 3.0 m | |
| Timber | 1.2 m | |
| Curtain wall | elevation | swatch not used for card; see drawings |
| Raised floor | plan | swatch not used for card; see drawings |

- **Brick.**
  - Clay tints change to `['#8f4a37','#9a5541','#84432f','#a05c45','#a8664f','#8b4a36','#7a3f2e','#96513c']`.
  - Stock tints change to `['#c2ad8a','#b5a07e','#cbb995','#a8916f','#bba27f','#b39d7b','#9c8666','#c6b28f']`.
  - Joint drops from 3.4 to 2.2 (10 mm at 215 mm = 46 px). Burnt probability drops from 0.07 to 0.04.
  - Lime mortar `#ddd5c6`; cement `#bdbab3`. Keep the specks; drop the per-brick white overlay.
- **Stone.** Keep the courses. Remove the radial gradient ground and use a flat `ground`. Flecks drop from 220 to 160 at opacity 0.08 to 0.25.
- **Precast.** Remove the `${uid}-soft` blur and the stains. Dots drop from 900 to 600, r 0.4 to 1.4, with opacity capped at 0.7. Keep the recessed joints.
- **Timber.**
  - Tints change to `['#b08a5e','#a57f55','#b8936a','#9c774e','#94704a']`; grain stroke `#6b4a2b`.
  - Knots: one ellipse plus one ring only.
  - Add 2 to 4 nail holes per board (r 1.2, `#2b1d12`, opacity 0.7). Gap colour `#2b1d12`.

### B. Drawing: precise technical line drawing

- Ink `#1c1917` on `paper`.
- Line weights:

| Line | Weight |
|---|---|
| Outline (cut) | 1.25 px |
| Visible edges | 0.9 px |
| Dimension lines | 0.75 px |
| Grid (detail views only) | 0.5 px at 0.35 opacity |

- Cut faces get a 45 degree hatch at 4 px pitch, 0.6 px, 0.45 opacity.
- Dimensions are in mm, with architectural 45 degree ticks (as now) and `text-2xs` labels.
- A **title strip** runs along the bottom: designation or family, then "Not to scale" or "Scale as drawn", then "Illustration from the survey record", in `text-2xs`, above a 0.75 px rule.
- **Card images by family:**

| Family | Card drawing |
|---|---|
| Steel | `SectionAxo`: an axonometric of the member extruded to `lengthM`. The section is cut at the near end (hatched), the far end is drawn, and length is dimensioned along the bottom flange ("7.5 m"). Projection 30 degrees; length foreshortened to 0.5 and clamped so the drawing fits a 4:3 board. No grid at card size. |
| Curtain wall | `PanelElevation`: one panel elevation with mullions (frame `#3d4349`, 6 px), a spandrel band, and glass as flat `#cfdbe1` with one 18 px vertical reflection band at 0.25 opacity. No clouds, blur or glare. |
| Raised floor | `PanelAxo`: one 600 by 600 panel in axonometric on four pedestals, edges drawn, panel dimensioned. |
| Brick, stone, precast, timber | Swatch (A) for the card; the material page gallery also shows the dimensioned drawing. |

- **Material page gallery order**: main image (swatch or axonometric), then the dimensioned 2D drawing, then any public photos, then the 3D view when the marketplace cluster adds it. Captions stay: "Illustration generated from the survey record" and "Drawing generated from the recorded dimensions".

### C. Elevations for projects and buildings (new)

`ElevationDrawing` draws a line elevation on paper:
- a ground line (1.25 px) and a parapet;
- floors as 0.75 px lines;
- a window rhythm by kind: office as a curtain wall grid, hotel as punched windows in pairs, residential as punched windows with balcony rails, building or other as a plain grid;
- a 4 px roof plant box.

Bay count comes from `rngFor(seed)` within 5 to 9. Storeys come from the `storeys` prop, otherwise from `rngFor` within each kind's range (office 6 to 12, hotel 6 to 10, residential 4 to 8, other 3 to 6). These are drawing coordinates only (P2). The drawing is decorative (`aria-hidden`) wherever the name sits beside it.

### D. Marketing pages

- No tilted or overlapping collages and no floating glass cards.
- Product views are shown straight, at 1:1 scale, in a plain 1 px frame with a 36 px window bar.
- Material imagery uses the same swatches and drawings as the app.

## 6. Component changes in `src/ui` (exact)

1. **`Card.tsx`**
   - `Card` base: `'relative min-w-0 rounded-lg border border-line bg-surface shadow-sm'` becomes `'relative min-w-0 rounded-lg border border-line bg-surface'`.
   - `interactive`: drop `hover:shadow-raised` and `transform`; use `'transition-colors duration-150 hover:border-line-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand-600'`.
   - `CardHeader`: add prop `divider?: boolean` (default `true`); when false, drop `border-b border-line-soft` and use `pb-0`.
   - `Stat`:
     - Remove the icon tile (`inline-flex size-6 ... rounded-md bg-subtle ... ring-1`) and render `<Icon className="size-3.5 text-faint" />` inline.
     - The non-bare frame loses `shadow-sm`.
     - New props: `state?: MetricState` (`'good' | 'warning' | 'critical' | 'neutral'`), `stateLabel?: string` (shown as a dot plus words under the value, `text-sm text-ink-soft`, dot in `MARK`), `meter?: { value: number; max: number; target?: number; label: string }` (renders `ProgressBar` with `tone` from the state and a target tick), `size?: 'md' | 'lg'` (lg uses `text-4xl`).
     - Text stays ink; only the dot and the meter fill take colour.
   - **New `MetricStrip`**: `({ items: StatProps[]; className })`. One bordered container, `grid` with `divide-x divide-line-soft` at `sm` and above, stacked with `divide-y` below; each cell is `Stat bare` with `p-5`. This replaces the ad hoc strips in the client, owner, surveyor and consultant homes.
2. **`Badge.tsx`**
   - `Pill`: `rounded-full` becomes `rounded-[5px]`. Add `variant?: 'soft' | 'quiet'` (default `'soft'`). `quiet` gives `'bg-transparent ring-0 px-0 text-ink-soft'` with the dot always shown.
   - `pillTones[*].dot` uses `MARK`: neutral `bg-[var(--color-mark-neutral)]`, brand `bg-[var(--color-mark-good)]`, info `bg-[var(--color-mark-info)]`, warning `bg-[var(--color-mark-warning)]` (replaces `bg-[#d97706]`), danger `bg-[var(--color-mark-critical)]`.
   - `StatusPill` and `FitPill` accept `variant` and pass it through. Tables (Inventory, Listings, Priorities route, Requests, Compliance status) use `variant="quiet"`.
   - `IndicativeMarker`: `text-xs` becomes `text-2xs`. Show one marker per card or chart header, not per figure (feature clusters apply this).
3. **`Progress.tsx`**
   - `fills` becomes `MARK` from `labels.ts`.
   - `ProgressBar`: add `target?: number`, drawn as `<rect x={target} width={max/200} fill="var(--color-ink)" />` in the same viewBox, with `aria-valuetext` naming the target. Track `h-1.5` becomes `h-2`, `ring-line-soft` is kept.
   - `SegmentedBar`: segments `first:rounded-l-full last:rounded-r-full` become `rounded-[2px]`, height md `h-2.5`, 2 px surface gap kept; legend dots `rounded-[2px] size-2.5`.
4. **`SustainabilityBand.tsx`**: the fill becomes positional, an ordinal ramp: segment 0 `bg-brand-300`, 1 `bg-brand-500`, 2 `bg-brand-700`; empty segments `bg-line`. Shape: sm `h-1.5 w-3`, md `h-2 w-4`, `rounded-[1px]`, gap 1 px. Keep `data-band`, `data-segments` and the words.
5. **`EmptyState.tsx`**: delete both ring `div`s and the gradient tile. The icon becomes `<Icon className="mb-3 size-6 text-faint" />`; `py-12` becomes `py-10`. The inline variant stays.
6. **`MaterialCard.tsx`**
   - Image wrapper `rounded-xl` becomes `rounded-md`. Hover becomes `group-hover:shadow-[0_0_0_1px_var(--color-line-strong)]` (no blur shadow); remove the `group-hover:scale-[1.025]` zoom.
   - Fit overlay `bg-white/90! shadow-sm backdrop-blur-sm` becomes `bg-surface! ring-line`.
   - Linked `after:rounded-xl` becomes `after:rounded-md`. The badge slot expects a white chip.
   - Facts line: `text-ink-soft`, at most 2 facts plus location; the band shows as `SustainabilityBand size="sm"` inline on the same line as the fit when there is no image overlay.
7. **`MaterialImage.tsx`**: `bg-subtle` becomes `bg-paper`. The `showKind` chip `rounded-full bg-white/80 ... backdrop-blur-sm` becomes `rounded-[5px] bg-surface/95 ring-1 ring-line`. New prop `view?: 'card' | 'detail'` (default `'card'`) passed to `MaterialIllustration` so steel draws the axonometric on cards and the detail page.
8. **`illustration/swatches.tsx`**
   - `Finish` is reduced to grain only (`grain` default 0.05; the `light` parameter is removed).
   - Family changes as in section 5A.
   - `Steel` is replaced by a call to the new `SectionAxo`, `CurtainWall` by `PanelElevation`, and `RaisedFloor` by `PanelAxo`.
   - New `ScaleBar({ x, y, px, label })`.
9. **`illustration/drawings.tsx`**
   - `INK` becomes `#1c1917` and `FILL` becomes `#f7f6f3`; the outline stroke is 1.25.
   - Add `TitleStrip({ text, width })`, `SectionAxo({ designation, lengthM, uid })`, `PanelAxo(...)` and `PanelElevation(...)`.
   - The hatch pattern pitch changes from 6 to 4 at opacity 0.45.
10. **New `illustration/elevation.tsx`**: `ElevationDrawing({ seed, kind, storeys, className })`, where `kind: 'office' | 'hotel' | 'residential' | 'building' | string` (unknown values draw as plain).
11. **New `Thumb.tsx`**
    - `ProjectThumb({ projectId, projectType, size = 'md' })`: md 48 by 48, lg 96 by 72, `rounded-md border border-line bg-paper`.
    - `BuildingThumb({ buildingId, storeys, size })`: the same frame with `kind="building"`.
    - These replace the green folder tile and the black building tile in `PageHeader leading` (applied by the project and building layout owners) and lead each project card on homes and lists.
12. **`Button.tsx`**: the primary and danger shadows `shadow-[inset_0_1px_0_rgb(255_255_255/0.10),0_1px_2px_rgb(28_25_23/0.14)]` become `shadow-xs`. `bg-brand-600` is unchanged.
13. **`SandboxBadge.tsx`**: the amber filled badge becomes `outline`-toned (`bg-surface text-ink-soft ring-line`) with the `FlaskConical` icon at `text-warning`. It is still the single Sandbox badge (P1).
14. **`PageHeader.tsx`**: the leading slot container becomes `shrink-0 self-start`, sized by its content; the meta row stays `text-sm text-muted`.
15. **`TimelineStrip.tsx`** (shared with the project timeline cluster)
    - `FIT_STYLE` takes fills from `MARK`: `in_time` bar `bg-[var(--color-mark-good)]/20 border-[var(--color-mark-good)]` (and so on for each fit); `late` adds `MarkHatch`.
    - Bar height `h-5` becomes `h-3`; axis labels `text-[11px]` become `text-2xs`.
    - The today line becomes `bg-brand-600`; the start line stays ink.
    - If the timeline cluster rewrites this file for RIBA stages, it applies these values and visual-qa does not edit it.
16. **New `src/ui/charts/`**
    - `ChartFrame.tsx`: `({ title, description?, indicative?, legend?, table: { columns: string[]; rows: (string | number)[][] }, children })`. It has a header with the title, the `IndicativeMarker` and a "Show as table" toggle (`SegmentedControl` Chart or Table); in table mode it renders a `Table`.
    - `BarList.tsx`: `({ items: { key: string; label: string; value: number; valueText: string; colour?: string; sub?: string }[]; max: number; ticks?: number[]; label: string })`. Horizontal bars, 10 px high, 4 px end radius, 2 px gap. Each bar is an `svg viewBox="0 0 {max} 1"` rect (no arithmetic in the component). Labels sit left, values right in ink; there is an optional tick axis below from `ticks`. The `role="img"` aria-label lists every label and value.
    - `TargetMeter.tsx`: `({ value: number; max: number; target: number; valueText: string; targetText: string; state: MetricState; label: string })`. A 12 px bar with the fill in `MARK[state]`, an ink target tick with the label "Aim at least 20%", axis ends `0%` and the `max` label.
    - `Legend.tsx`: `({ items: { key: string; label: string; colour: string; valueText?: string }[] })` with 10 px square swatches, `rounded-[2px]`.
    - `MarkHatch.tsx`: an SVG `<pattern>` (45 degrees, 4 px pitch, white 1 px at 0.5 opacity) used over late or declined fills.
    - `index.ts` exports all of the above.
17. **`index.ts`** (shared barrel): export `MetricStrip`, `ProjectThumb`, `BuildingThumb`, `ElevationDrawing`, `TYPOLOGY_VIZ`, `MARK`, and everything from `./charts`.
18. **`Gallery.tsx`** (dev page `/__ui`): add sections for the charts, thumbs, the quiet pills, `MetricStrip` and each family's new card image.

## 7. Domain functions (pure, tested)

`src/domain/engines/chartScale.ts`

```ts
/** The smallest "nice" number (1, 2, 2.5 or 5 times a power of ten) that is at least max. 0 gives 1. */
export function niceMax(max: number): number
/** Evenly spaced ticks from 0 to niceMax(max), count intervals (default 4). */
export function ticks(max: number, count?: number): number[]
```

Tests:

| Input | Expected |
|---|---|
| `niceMax(0)` | 1 |
| `niceMax(7)` | 10 |
| `niceMax(142.5)` | 200 |
| `niceMax(100.8)` | 200 |
| `niceMax(19.91)` | 20 |
| `niceMax(20.29)` | 25 |
| `niceMax(453)` | 500 |
| `niceMax(1)` | 1 |
| `ticks(142.5)` | `[0, 50, 100, 150, 200]` |
| `ticks(19.91, 4)` | `[0, 5, 10, 15, 20]` |
| negative input | throws |

`src/domain/engines/metricState.ts`

```ts
export type MetricState = 'good' | 'warning' | 'critical' | 'neutral'
/** State of a figure against a target. at_least: good when value >= target, warning when
    value >= target * (1 - band), else critical. at_most mirrors it. No target gives neutral. */
export function metricState(value: number, target: number | null, direction: 'at_least' | 'at_most', band?: number /* default 0.1 */): MetricState
```

Tests:

| Call | Expected |
|---|---|
| `metricState(19.91, 20, 'at_least')` | `'warning'` |
| `metricState(20.29, 20, 'at_least')` | `'good'` |
| `metricState(15, 20, 'at_least')` | `'critical'` |
| `metricState(5, null, 'at_least')` | `'neutral'` |
| `metricState(450, 500, 'at_most')` | `'good'` |
| `metricState(540, 500, 'at_most')` | `'warning'` |
| `metricState(600, 500, 'at_most')` | `'critical'` |
| `metricState(20, 20, 'at_least')` | `'good'` (boundary) |
| `band = 0` | collapses warning |

The words for each state go in `src/ui/labels.ts` as `METRIC_STATE = { good: 'On target', warning: 'Near target', critical: 'Off target', neutral: 'No target set' }` with icons `CircleCheck`, `TriangleAlert`, `CircleAlert`, `Minus`. If the dashboards or consultant cluster defines targets, it uses this function and these words.

## 8. Public surfaces (owned by visual-qa)

### Landing (`src/features/public/Landing.tsx`), in order

1. **Header**: a solid `bg-page` with a `border-b`; remove `backdrop-blur-md` and `/80`.
2. **Hero, left aligned on a 12-column grid.**
   - Left 6 columns: headline "Reuse the buildings coming down in the buildings going up" (`text-5xl`, was 6xl), the existing one-line description, then the Get started and Sign in buttons.
   - Remove the pill announcement, the masked grid, the radial glow and the blurred halo. The sandbox line moves under the buttons as plain `text-sm text-muted` ("Free sandbox with sample data. Nothing leaves your browser.").
   - Right 6 columns: one straight product view of Discover at real scale, in a plain frame (`rounded-lg border border-line bg-surface`, a 36 px bar with three 8 px `bg-line` dots, no shadow beyond `shadow-xs`). There are no overlapping popovers or toasts.
3. **Proof row** (new): a `MetricStrip` of sample-world figures, each from a selector over the seed: "Buildings in the sample", "Items surveyed", "Tonnes ready to reuse", "Avoided carbon, tCO2e". The last carries `IndicativeMarker`; the caption is "Sample data in the sandbox."
4. **Who it is for**: five rows, not five cards. Each is a 2-column row with the role name and one line on the left, and on the right one real component at 1:1 (an approvals card, a listing visibility control, the capture form header, the compliance meter). The rows are separated by `border-t`, with no dotted backgrounds.
5. **How it works**: three numbered steps as text, with one wide programme graphic beneath: a static `TimelineStrip` from `SAMPLE_MATERIALS` with three materials against a start date.
6. **Standards row** (new), plain text in `text-sm text-ink-soft`:
   - Title: "Outputs are mapped to"
   - Items: "London Plan Circular Economy Statement guidance", "RIBA Plan of Work stages", "BREEAM", "LEED", "WELL", "UK Net Zero Carbon Buildings Standard"
   - Note: "Indicative summaries to check against each scheme's current manual."
   - No logos and no badges.
7. **The dark band** keeps `bg-night` with the copy "Built for decisions you can stand behind". Remove the masked grid and replace the three icon tiles with three plain columns, each headed by a 1 px `night-line` rule.
8. **Sandbox call to action**: remove the avatar stack. Copy is unchanged.
9. **Footer**: unchanged.

### Sign-in panel (`src/features/auth/AuthLayout.tsx`)

- Replace the rotated mosaic, the gradient overlay and the glass card with a straight **drawing sheet** on `bg-paper` with a `border-l`:
  - a large `SectionAxo` for UB 457x191x67 at 7.5 m;
  - a dimensioned `SectionDrawing` beside it;
  - a title block bottom-right in a 1 px ink frame reading "UB 457x191x67, 7.5 m", "48 pieces, Central London" and "Illustration from the survey record";
  - under it, the existing line in ink on paper: "Every material shows when it comes out, and whether it arrives in time for your start on site."
- Below 1024 px the panel stays hidden, as now.

## 9. Screen-by-screen recommendations

Priority is set by architect and developer exposure. Each screen's owning cluster applies these; visual-qa supplies only the components.

1. **Architect home** (dashboards cluster)
   - A `MetricStrip` of 4: Active projects; Materials shortlisted; Avoided carbon on approved items (Indicative, with a `meter` against the live list); Waiting for approval (with `state` warning when anything has waited over 7 days, computed in the selector).
   - Project cards lead with a `ProjectThumb` lg, then name, client and type, then a one-row programme mini strip with today's RIBA stage.
   - The "New for your projects" row moves to Discover, per the partner.
   - Activity is collapsed to 5 rows with "Show all".
2. **Discover** (marketplace cluster)
   - Category folders use a 3-up grid of typology tiles. Each tile is a 2 by 2 collage of that typology's card drawings on paper, with a count and the typology colour as a 3 px left rule. This is the only place a typology colour appears outside charts.
   - Cards use the new imagery.
   - The "Checking against" picker becomes a full-width toolbar row with a project thumb.
   - Badges on images become white chips.
3. **Material page** (marketplace cluster): a paper-ground gallery and a simpler background, per the partner. Availability, sustainability and spec use `DescriptionList` without card shadows; the sustainability panel uses a `BarList` of avoided against new.
4. **Project overview** (project timeline cluster): the programme spans the full width at the top, at least 280 px high, with RIBA bands. Shortlist status uses `SegmentedBar`, carbon uses `TargetMeter` (secured against shortlisted), and Next steps is a numbered checklist with brand-600 step markers for a new project.
5. **Client home, approvals and reservations** (client cluster)
   - Home: a `MetricStrip` with cost, savings, carbon and % reuse, each with state where a target exists, plus a parallel programme across projects.
   - Approvals: guide price and carbon as a 2-cell figure row with Indicative.
   - Reservations: the package as a `BarList` (material, testing, storage, handling, delivery) against "The same new" as an ink target tick, plus a carbon summary row.
6. **Consultant carbon and compliance** (consultant cluster)
   - Carbon by status uses `BarList` with `MARK`; carbon by typology uses `BarList` with `TYPOLOGY_VIZ`.
   - The reuse figure becomes a `TargetMeter` (19.91% against an aim of at least 20%, state warning, "Near target").
   - Contribution by line becomes a `BarList`. The bill of materials table is collapsed by default to its total row, with "Show all lines".
7. **Owner home, building overview, inventory, priorities and listings** (owner cluster)
   - Home: a `MetricStrip` with potential avoided carbon as the hero (Indicative).
   - Building header: `BuildingThumb`.
   - "What the building holds" becomes a `BarList` by typology in `TYPOLOGY_VIZ`.
   - Inventory and Listings use `variant="quiet"` pills.
   - Priorities score bars become one segmented bar per row in the fixed order net value, carbon, demand, ease, using `viz-1` to `viz-4`. The legend is in the same order (it is currently mismatched).
8. **Surveyor home and capture** (surveyor cluster): a `MetricStrip`. The appointment progress steps use `MARK` dots in place of `bg-[#d08a2c]`.

## 10. Seed

- **Shared file `src/domain/seed/world.ts`**: replace `SAMPLE_PHOTO_DATA_URI` with an SVG that is plainly a steel stack (bundled beams, end-on, on a timber bearer, on paper) so the Inventory tile does not look broken. It stays a sample photo record in the data; the alt text stays "Photo of TH-01". This is low priority; the seed owner applies it.
- No new names are needed.

## 11. Copy strings (British English, sentence case, no dashes or arrows)

| Where | String |
|---|---|
| Chart table toggle | "Chart", "Table" |
| Metric states | "On target", "Near target", "Off target", "No target set" |
| Target labels | "Aim at least {n}%", "Aim at most {n}" |
| Drawing title strip | "Illustration from the survey record", "Not to scale" |
| Scale bar | "100 mm", "1 m" |
| Landing standards row | "Outputs are mapped to", followed by the six items in section 8 |
| Landing standards note | "Indicative summaries to check against each scheme's current manual." |
| Proof row caption | "Sample data in the sandbox." |
| Activity toggle | "Show all activity", "Show less" |

## 12. Tests

**Unit**
- `src/domain/engines/chartScale.test.ts` and `src/domain/engines/metricState.test.ts`, with the cases in section 7.

**UI** (`src/ui/ui.test.tsx` additions, plus `src/ui/charts/charts.test.tsx`)
1. **No decorative effects in illustrations.** For every family in `SAMPLE_MATERIALS`, the rendered `MaterialIllustration` contains no `radialGradient`, no `feGaussianBlur` and no `feDropShadow`. It keeps `data-kind="illustration"` and is identical across two renders.
2. **Steel shows its length.** The steel card illustration contains the text "7.5 m".
3. **Elevations.** `ElevationDrawing` with the same seed gives identical markup. `office` and `residential` give different markup for the same seed. It is `aria-hidden` when `decorative`.
4. **BarList.** It exposes `role="img"` with an aria-label listing each label and valueText, renders one rect per item with `width === value` in a viewBox of `max`, and computes nothing (a prop spy shows widths equal the inputs).
5. **TargetMeter.** The aria-valuetext includes the target text, and the state word renders next to an icon.
6. **ChartFrame.** Toggling to Table renders a table with the given rows.
7. **Quiet pills.** `Pill variant="quiet"` has no ring class and still renders its dot and text.
8. **Empty state.** `EmptyState` renders no element with class `rounded-[18px]` or `bg-gradient-to-b`.
9. **Sustainability band.** `SustainabilityBand` still exposes `data-band` and `data-segments`, and segment 3 for High has class `bg-brand-700`.
10. **Tokens.** `src/ui/tokens.test.ts` reads `src/styles.css` and asserts the six `--color-viz-*` values and five `--color-mark-*` values are exactly the validated hexes, so a later edit cannot drift them without a test change.

**Existing tests that must stay green**: primary button `bg-brand-600`; focus ring classes; "never describes an illustration as a photo"; "draws every family as a labelled illustration".

**E2E** (`e2e/`)
- Extend the route sweep with a screenshot step at 1440 px for the 30 screens audited here, written to `docs/screens/platform/`.
- Assert there is no horizontal scroll at 390, 1024 and 1440 px on the landing and sign-in pages after the rework.
- Assert the landing hero has no element with a computed `backdrop-filter` other than `none`.

## 13. File plan

**Visual-qa changes (owned)**
- `src/ui/Card.tsx`, `Badge.tsx`, `Progress.tsx`, `SustainabilityBand.tsx`, `EmptyState.tsx`, `MaterialCard.tsx`, `MaterialImage.tsx`, `Button.tsx`, `SandboxBadge.tsx`, `PageHeader.tsx`, `Gallery.tsx`, `ui.test.tsx`
- `src/ui/illustration/swatches.tsx`, `drawings.tsx`, `helpers.ts`
- `src/app/AppShell.tsx` (the canvas token only)
- `src/features/public/Landing.tsx`, `src/features/auth/AuthLayout.tsx`

**Visual-qa new files**
- `src/ui/illustration/elevation.tsx`
- `src/ui/Thumb.tsx`
- `src/ui/charts/ChartFrame.tsx`, `BarList.tsx`, `TargetMeter.tsx`, `Legend.tsx`, `MarkHatch.tsx`, `index.ts`, `charts.test.tsx`
- `src/ui/tokens.test.ts`
- `src/domain/engines/chartScale.ts`, `chartScale.test.ts`, `metricState.ts`, `metricState.test.ts`

**Shared (coordinate)**
- `src/styles.css` (tokens; visual-qa lands it first)
- `src/ui/index.ts` (exports)
- `src/ui/labels.ts` (`TYPOLOGY_VIZ`, `MARK`, `METRIC_STATE`)
- `src/ui/TimelineStrip.tsx` (style values only; the timeline cluster owns structure)
- `src/domain/seed/world.ts` (the sample photo only)

**Applied by other clusters (not edited by visual-qa)**
- Home pages
- `Discover.tsx`, `ListingTile.tsx`, `MaterialPage.tsx`, `MaterialGallery.tsx`
- `ProjectLayout.tsx`, `Overview.tsx`, `ProjectParts.tsx`
- `BuildingLayout.tsx`, `Overview.tsx`, `Inventory.tsx`, `Listings.tsx`, `Priorities.tsx`
- `Approvals.tsx`, `Reservations.tsx`
- `ProjectCarbon.tsx`, `Compliance.tsx`
- `SurveyorHome.tsx` (the `bg-[#d08a2c]` dot)

## 14. Order of work

1. Tokens, labels and the two domain functions, with tests.
2. Charts kit and thumbs.
3. Component class changes.
4. Illustrations.
5. Landing and sign-in.
6. Gallery and screenshots.

Steps 1 and 2 must land before the feature clusters build dashboards.

## Files changed
platform/src/styles.css
platform/src/ui/Card.tsx
platform/src/ui/Badge.tsx
platform/src/ui/Progress.tsx
platform/src/ui/SustainabilityBand.tsx
platform/src/ui/EmptyState.tsx
platform/src/ui/MaterialCard.tsx
platform/src/ui/MaterialImage.tsx
platform/src/ui/Button.tsx
platform/src/ui/SandboxBadge.tsx
platform/src/ui/PageHeader.tsx
platform/src/ui/TimelineStrip.tsx
platform/src/ui/labels.ts
platform/src/ui/index.ts
platform/src/ui/Gallery.tsx
platform/src/ui/ui.test.tsx
platform/src/ui/illustration/swatches.tsx
platform/src/ui/illustration/drawings.tsx
platform/src/ui/illustration/helpers.ts
platform/src/app/AppShell.tsx
platform/src/features/public/Landing.tsx
platform/src/features/auth/AuthLayout.tsx
platform/src/domain/seed/world.ts

## Files new
platform/src/ui/illustration/elevation.tsx
platform/src/ui/Thumb.tsx
platform/src/ui/charts/ChartFrame.tsx
platform/src/ui/charts/BarList.tsx
platform/src/ui/charts/TargetMeter.tsx
platform/src/ui/charts/Legend.tsx
platform/src/ui/charts/MarkHatch.tsx
platform/src/ui/charts/index.ts
platform/src/ui/charts/charts.test.tsx
platform/src/ui/tokens.test.ts
platform/src/domain/engines/chartScale.ts
platform/src/domain/engines/chartScale.test.ts
platform/src/domain/engines/metricState.ts
platform/src/domain/engines/metricState.test.ts

## Shared
platform/src/styles.css
platform/src/ui/index.ts
platform/src/ui/labels.ts
platform/src/ui/TimelineStrip.tsx
platform/src/domain/seed/world.ts
platform/src/ui/Card.tsx (Stat and new MetricStrip props used by every dashboard cluster)
platform/src/ui/Badge.tsx (Pill quiet variant used by owner, client and consultant clusters)

## Deps


## Open questions
- Should real photography (licensed images of reclaimed steel, brick and stone, or of buildings) replace the generated swatches on the landing page and the sample listings, as OneClickLCA does with architecture photography? REC: Not in this round. Images cannot be sourced or licensed from the sandbox, and P4/P5 favour honest, generated, labelled imagery. The precise drawings and real-scale swatches carry the B2B feel. Revisit when real accounts and owner photos exist (version 2).
- Who owns TimelineStrip.tsx, given that RIBA-stage programme work will restructure it? REC: The project timeline cluster owns the structure. Visual-qa supplies the style values in section 4 (MARK fills, h-3 bars, brand today line, hatch for late) and does not edit the file if the timeline cluster rewrites it in the same round.
- Should metric targets (for example the reuse aim of at least 20%, or carbon and cost targets on the developer dashboard) be stored per project, so metricState has something to compare against? REC: Yes. The consultant goals-and-targets cluster stores overridable targets per project. Until then, use the London Plan circular economy aim already in compliance (20% by value) as the only target, and show other metrics as 'No target set' (neutral).
- Is dark mode in scope? REC: No. Brief section 11 sets a light theme. The tokens are named by role so a dark set can be added later, but the categorical palette was validated for light surfaces only.

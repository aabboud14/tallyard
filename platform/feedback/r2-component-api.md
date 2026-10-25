# Round 2 design system: component API

From the design system stream. Import from src/ui.

## Step 1
Import everything below from 'src/ui', where all of it is exported. None of these props import store types. Positions are fractions from 0 to 1, and every figure and state is computed by the caller.

METRICS
- MetricGrid({ children, label?, className?, testId? }): two tiles across on phones, four from xl.
- MetricTile({ label: string, value: ReactNode, unit?, sub?, icon?: LucideIcon, state?: MetricState, stateLabel?: string, chart?: ReactNode, footer?: ReactNode, indicative?: boolean, href?: string, testId?, className? }).
  - state is 'good' | 'warning' | 'critical' | 'neutral'. It renders a dot, an icon and a word; warning and critical also tint the border, and good, warning and critical add a 2 px top rule. The value stays ink.
  - With href, the whole tile is a link named by its label.
  - The chart is shown only when the tile is at least 19rem wide.
- Stat (existing) adds state?, stateLabel?, meter?: { value, max, target?, label, valueText? }, size?: 'md' | 'lg' and testId?. The icon tile is removed.
- MetricStrip({ items: (StatProps & { key? })[], label?, testId?, className? }).
- StateLine({ state, label? }).

CHARTS
- Donut({ segments: { key, label, value, colour, valueText? }[], label, size?: 48 | 56 | 72 | 96, thickness?, centre?, testId? }). The aria-label reads "label: Seg value, ...". When every segment is zero it draws the track only.
- ProgressRing({ value, max, label, valueText, tone?: Tone, state?: MetricState, size?, thickness?, centre?, testId? }). The aria-label reads "label: valueText". A max of 0 draws the track only.
- BarList({ items: { key, label, value, valueText, colour?, sub?, href?, secondary?: { value, valueText } | null, target?: { value, label } | null, hatched? }[], max, ticks?: (number | { value, label })[], label, secondaryColour?, footer?, testId? }).
  - It is role img, or role group when any row has an href.
  - Each bar is rect[data-part=bar] with width equal to value, in viewBox "0 0 max 1".
- TargetMeter({ label, value, max, target: number | null, valueText, targetText: string | null, state: MetricState, stateText?, axis?: { start, end }, size?: 'sm' | 'md', testId? }). It is role meter, and its aria-valuetext reads "valueText. targetText. state word".
- Legend({ items: { key?, label, colour, valueText?, hatched? }[], label?, className? }).
- ChartFrame({ title, description?, indicative?, legend?, table: { columns, rows }, actions?, titleAs?, defaultView?, bordered?, testId?, children }). It has a Chart or Table switch.
- MarkHatch({ id }) is an svg pattern. HATCH_STYLE does the same for HTML.
- Colour sets: TONE_FILL (equal to MARK), TONE_CHIP, TYPOLOGY_FILL (equal to TYPOLOGY_VIZ), CHART_TRACK, CHART_GAP, VIZ, VIZ_OTHER, TRACK.

PROGRAMME AND STAGES
- RibaStageStrip({ stage: number | null, labels?: readonly string[] (defaults to RIBA_STAGES), showLabel?, size?: 'sm' | 'md', testId? }). The aria-label reads "RIBA stage 2 of 7, Concept Design".
- ribaStageText(stage) returns "Stage 2, Concept Design".
- ProgrammeChart({ axis: { ticks: { iso, at, label: string | null, major }[] }, today: { at }, todayLabel, stages: { stage, label, name, from, to, state: 'past' | 'current' | 'future', open? }[], milestones: { id, label, dateText, at }[], materials: { itemId, title, kind: 'now' | 'window', from, to, fit, windowText, storage: { from, to } | null }[], description, emptyText?, emptyAction?, testId = 'programme-chart' }).
  - Bands carry data-part=stage-band, and the figure is role img with the description as its name.
  - It takes ProgrammeView fields directly: pass today as { at } and stages with from and to.
- PortfolioTimeline({ ticks: { iso, at, label }[], today: number, todayText, rows: { id, name, href?, stageText?, segments: { stage, from, to, state: 'done' | 'current' | 'ahead' }[], siteStart, completion, materialsFrom: number | null, hasProgramme, siteStartText?, completionText?, materialsFromText? }[], emptyText = 'Programme not set', testId = 'portfolio-timeline' }). Rows carry the test id portfolio-row-{id}.

PANELS, 3D AND DRAWINGS
- CollapsiblePanel({ id, title, summary?, count?, icon?, defaultOpen = false, actions?, bordered = true, testId?, toggleTestId?, className?, children }).
  - The body has id {id}-body and the hidden attribute while closed.
  - Open state is remembered under the browser storage key PANELS_STORAGE_KEY ('tallyard-platform-v1-panels').
- usePersistentToggle(id, defaultOpen) returns [open, setOpen, toggle].
- ModelViewer({ mesh: Mesh, family: FamilyId, title, size?: 'stage' | 'thumb', angles?, onAnglesChange?, describedBy?, showReset = true, actions?, testId = 'model-viewer', className? }).
  - The test id, data-yaw and data-pitch sit on the focusable wrapper.
  - Arrow keys turn it and Home resets it. The svg is labelled "3D view of {title}".
- SpotIllustration({ kind: SpotKind }) is always aria-hidden. Kinds: project, building, materials, inbox, targets, search, activity.
- EmptyState gains illustration?: SpotKind.
- BuildingIllustration({ sketch: BuildingSketch, decorative?, className? }).
- ProjectThumbnail({ sketch, materials?: { publicId, spec }[], aspect?: '16/10' | '4/3' | '3/2' | '1/1', rounded?: 'none' | 'md' | 'top', decorative?, testId?, className? }).
- BuildingThumbnail({ ...same, without materials }).
- Build sketches with projectSketch or buildingSketch from domain/sketch.ts.
- MaterialImage and MaterialIllustration accept view?: 'card' | 'detail'. Use detail on the material page.
- Drawing pieces also exported: SectionAxo, PanelAxo, PanelElevation, TitleStrip, ScaleBar.

PILLS, TRACKING AND STATEMENTS
- Pill, StatusPill and FitPill accept variant?: 'soft' | 'quiet'.
- TrackStatusPill({ status: TrackStatusKey, size?, variant?, testId? }). TrackStatusKey is not_started | in_progress | at_risk | evidence_ready | not_applicable.
- TrackStatusSelect({ value, onChange, label, options?, disabled?, size?, testId? }).
- StatementSection({ id, heading, text, edited?, stale?, canEdit?, onSave?(text), onReset?, onKeep?, headingAs? }). Test ids: statement-section-{id}, statement-edit-{id}, statement-save-{id}, statement-reset-{id}, statement-stale-{id} and statement-text-{id}.

OTHER EXPORTS
- ProgressBar gains target? and targetText?.
- Segment gains colour?.
- CardHeader gains divider?.

## Step 2
New or changed exports from src/ui (import from 'src/ui'):
- BuildingIllustration({ sketch: BuildingSketch; className?: string; decorative?: boolean; fit?: boolean }). New prop: fit crops the view box to the building and its crane, leaves out the trees and draws with xMidYMid meet, so the frame must supply the paper. Without fit the output is unchanged: 320 by 200 board, sliced.
- BuildingDrawing({ sketch: BuildingSketch }): an SVG <g data-part="building" data-sketch data-use> holding the blocks, frame, scaffold and crane on the 320 by 200 board coordinates, with the ground at y 190. It has no svg wrapper, ground or trees and is meant for composing into a larger sheet.
- ProjectThumb and BuildingThumb({ sketch: BuildingSketch; size?: 'sm' | 'md' | 'lg' (32x32, 48x48 default, 96x72); decorative?: boolean (default true); className?: string; testId?: string }). A span with data-kind="illustration" and data-size, styled rounded-md border border-line bg-paper, drawing in fit mode. Use them in the PageHeader leading slot, in list rows, or to lead a card. Pass decorative={false} to give one the sketch label as its accessible name.
- ThumbProps (type), plus axo(x, y, z, origin?), re-exported from illustration/massing.
- Unchanged from step 1: ProjectThumbnail({ sketch, materials?: { publicId; spec }[], aspect?: '16/10' | '4/3' | '3/2' | '1/1', rounded?: 'none' | 'md' | 'top', decorative?, className?, testId? }) and BuildingThumbnail (the same props without materials).
- src/ui/samples.ts SAMPLE_DASHBOARD (as const): org, person, greeting, dateText, nav, metrics (active, shortlisted with segments { key, label, value, tone }, carbon with ring { value, max, valueText, centre }, waiting with state and stateLabel) and projects { id, name, client, projectType, typeText, stage, newFits, families, materials (indexes into SAMPLE_MATERIALS) }.
- Public surfaces (not in src/ui): src/features/public/LandingScene.tsx exports LandingScene({ className? }), whose svg has data-testid landing-scene. landingContent.ts exports HERO, SCENE_LABEL, SCENE_CAPTIONS, LANDING_FACTS, LANDING_ROLES, LANDING_STEPS, LANDING_PRINCIPLES, LANDING_CTA and the LandingRoleKey type. AuthLayout's BrandPanel keeps its name; it is now the drawing sheet with test ids auth-sheet and title-block.
- Landing test ids: landing, fact-{workspaces|families|typologies|indicative}, product-shot, role-{architect|client|owner|surveyor|consultant}, sheet-{01|02|03}, principles.
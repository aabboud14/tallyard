# Round 2 test changes: client and consultant fixes (fix-client_consultant)

Every existing assertion changed in this package, with its reason (P8). No test was skipped, deleted or weakened.

## src/store/selectors/sustainability-screens.test.ts

- "reads content by value near the 20% aim on the compliance page" becomes "reads content by value against the project target on the compliance page, with the 20% policy aim as a second mark". The compliance meter now reads `{ label: 'Secured against the project target', target: 0.25, state: 'critical', stateText: 'Off target', targetText: 'Target at least 25%' }` instead of `{ state: 'warning', stateText: 'Near target', targetText: 'Aim at least 20%' }`; the secured and with-approved figures (19.91% and 20.29%) are unchanged, and the test also checks the 20% policy aim as a reference mark (`{ value: 0.2, text: 'Policy aim 20%' }`).
  - Reason: BRIEF 14.2 ("`effectiveTargets(state, projectId)` is the one source of project targets for every dashboard") and client-consultant.md section 5.1 (`ComplianceView.targets` comes from `effectiveTargets`). The compliance card judged the fixed 20% aim while Sustainability, Goals and targets and the client home judged the same figure against Merrowgate's 25% override, so one project showed two verdicts. The policy aim stays on the meter as a second, grey mark with its own words.

## Added, not changed

- src/store/selectors/sustainability-screens.test.ts: the compliance meter follows a new target (30%), drops the second mark once reset to the 20% default, and reads the policy aim when content by value is not targeted; the reuse tile's content line ("19.9% reused and recycled by value, aim 25%") follows a new 30% target; the circular economy scheme card reads "Content by value at least 25%" and the statement status (side-aware) instead of "Measures under Policy SI 7" and "No rating".
- src/ui/charts/charts.test.tsx: TargetMeter draws a grey reference tick with its own words and speaks it.
- src/features/sustainability/sustainability.screens.test.tsx: a new value in the goal dialog starts without the previous reason (shown as the placeholder), and the default's basis is written out below the table layout, where a tooltip cannot be tapped open.
- e2e/r2-sustainability.spec.ts: a new journey. At 390 px the client tiles stack, and the to-do link for the statement lands with "Read and review" in the viewport. At 1024 px the tracking shows cards and at 1440 px a table, with no hidden sideways scroller in either; Kilnworth Place reads one "No consultant appointed" line. The consultant's scheme tabs wrap at 390 px, and at 1024 px the project tab strip keeps Compliance in view with chevrons towards hidden tabs. The compliance meter reads the 25% target and the 20% policy aim.

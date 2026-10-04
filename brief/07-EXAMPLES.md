# Build brief, file 7 of 7: worked examples

These are your tests. Every value was computed independently from the formulas in `03-ENGINES.md` and the seed in `06-DATA.md` before this brief was issued. Write the test before the function.

- Tolerance: half a unit of the last digit shown, inclusive. Where a value is shown at four decimals the underlying figure is unrounded; where it is shown at two it is a money amount already rounded to pence.
- Values marked `[£]` are money amounts and must match to the penny.
- Derive inputs from the seed by the rules in the brief. Do not hard-code an intermediate value to make a test pass.
- If a result differs, re-read the formula. See "The example decides" in `01-BRIEF.md` section 6.

## B1. Mass (F1)

| Item | Quantity | Mass | Area |
|---|---|---|---|
| TH-01 | 48 at 7.5 m, 67.1 kg/m | 24.156 t | |
| TH-02 | 60 at 9.0 m, 92.1 kg/m | 49.734 t | |
| TH-03 | 54 at 3.8 m, 117.9 kg/m | 24.19308 t | |
| TH-04 | 40 at 9.0 m, 113.0 kg/m | 40.680 t | |
| TH-05 | 36 at 7.6 m, 88.9 kg/m | 24.32304 t | |
| TH-06 | 96 at 6.0 m, 60.1 kg/m | 34.6176 t | |
| TH-07 | 600 m2 at 110 kg/m2 | 66.000 t | |
| TH-08 | 78 panels, 1.5 by 3.6 m, 55 kg/m2 | 23.166 t | 421.2 m2 |
| TH-09 | 1,140 m2 at 360 kg/m2 | 410.400 t | |
| TH-10 | 20,000 bricks at 2.3 kg | 46.000 t | |
| TH-11 | 3,000 panels at 12 kg | 36.000 t | 1,080 m2 |
| TH-12 (captured in step 1) | 30 at 3.2 m, 46.1 kg/m | 4.4256 t | |
| OS-21 | 520 m2 at 110 kg/m2 | 57.200 t | |
| OS-22 | 3,800 panels at 12 kg | 45.600 t | 1,368 m2 |
| 48 members of R1 | 48 at 7.2 m, 67.1 kg/m | 23.18976 t | |
| All 102 required members | | 54.977 t | |

## B2. Upfront carbon avoided (F2)

All figures in tCO2e. `newKm` is 120 throughout.

| Case | Baseline | A1A3 new | A4 new | A1A3 reuse | A4 reuse | Avoided | Percent |
|---|---|---|---|---|---|---|---|
| TH-01 at listing, 50 km | 24.156 t | 42.0314 | 0.3087 | 1.2078 | 0.1286 | 41.0037 | 96.8% |
| TH-01 plan item, allocated to R1, 50 km | 23.18976 t | 40.3502 | 0.2964 | 1.2078 | 0.1286 | 39.3101 | 96.7% |
| TH-01 deal via Tilbury (25 + 31 km), to R1 | 23.18976 t | 40.3502 | 0.2964 | 1.2078 | 0.1441 | 39.2947 | 96.7% |
| TH-01 deal via Barking (25 + 14 km), to R1 | 23.18976 t | 40.3502 | 0.2964 | 1.2078 | 0.1003 | 39.3384 | 96.8% |
| TH-01 deal direct (9 km), to R1 | 23.18976 t | 40.3502 | 0.2964 | 1.2078 | 0.0232 | 39.4156 | 97.0% |
| TH-08 at listing, 50 km | 421.2 m2 | 84.2400 | 0.2961 | 6.3180 | 0.1234 | 78.0947 | 92.4% |
| TH-11 at listing, 50 km | 1,080 m2 | 43.2000 | 0.4601 | 9.2880 | 0.1917 | 34.1804 | 78.3% |
| TH-12 at listing, 50 km | 4.4256 t | 7.7005 | 0.0566 | 0.2213 | 0.0236 | 7.5123 | 96.8% |
| OS-21 deal via Barking (25 + 14 km) | 57.2 t | 4.5760 | 0.7310 | 0.5720 | 0.2376 | 4.4974 | 84.7% |
| OS-22 deal via Park Royal (25 + 24 km) | 1,368 m2 | 54.7200 | 0.5828 | 11.7648 | 0.2380 | 43.3000 | 78.3% |
| OS-17, unused surplus | | | | | | null | null |

Merrowgate Wharf total avoided carbon: 47.7974 at the start (OS-21 plus OS-22), 87.0921 after the TH-01 deal is confirmed via Tilbury.

Matcher summary avoided carbon (F7, baseline 47.0957 t, stock 51.295 t, 50 km): 79.7105.

## B3. Diversion and reuse (F3), Durnley House

Normalised rows in tonnes, in bill order: concrete 6,650 recycled off site; concrete 1,200 recycled on site; mixed_inert 620 recycled off site; brick_block 36.8 reused off site; steel 212.4 reused off site; steel 1,490 recycled off site; aluminium 38 recycled off site; curtain_wall 19.0 reused off site; glass 64 recycled off site; stone 54 reused off site; concrete 410 recycled off site; timber 75 recovered; plasterboard 96 recycled off site; raised_floor 28.8 reused off site; mixed_cd 48 recovered; cables_copper 21 recycled off site; mixed_cd 262 landfill; insulation 24 landfill; asbestos 14.2 hazardous; and one unresolved row of 6.

| Measure | Before the open row is resolved | After it is set to mixed_cd, landfill |
|---|---|---|
| Total counted, non-hazardous | 11,349.0 t | 11,355.0 t |
| Recycled off site | 9,389.0 | 9,389.0 |
| Recycled on site | 1,200.0 | 1,200.0 |
| Reused off site | 351.0 | 351.0 |
| Reused on site | 0.0 | 0.0 |
| Other management | 123.0 | 123.0 |
| Landfill | 286.0 | 292.0 |
| Diversion rate | 97.47995% | 97.42845% |
| Reuse rate | 3.09278% | 3.09115% |
| Hazardous, separate | 14.2 | 14.2 |
| Tonnes per m2 GIA (15,800 m2) | 0.71829 | 0.71867 |

Shares after the row is resolved: reused off site 3.0911%, recycled on site 10.5680%, recycled off site 82.6860%, other management 1.0832%, landfill 2.5716%. Stated total 11,369.2 t equals the sum of all 20 data rows.

Potential carbon benefit of off-site reuse (A1-A3 only): bricks 7.6544; steel 358.956; curtain wall 63.90909 (19.0 t becomes 345.4545 m2); stone 3.780; raised floor 27.1296 (28.8 t becomes 864 m2); total 461.42909 tCO2e. Rows reused on site and rows with no marketplace family claim nothing.

## B4. Reused and recycled content by value (F4), Merrowgate Wharf

Total material value £11,680,600.

| Case | Reused and recycled value | Percent |
|---|---|---|
| Every reused fraction 0 | £2,058,220.00 | 17.6208% |
| At the start (stone and raised floor secured) | £2,325,660.00 | 19.9104% |
| After the TH-01 deal (23.18976 t of required steel) | £2,343,052.32 | 20.0593% |

Contributions in percentage points after the deal: stone cladding 2.0033 (`s` = 1), raised access floor 0.2863 (`s` = 3,800 / 30,600 = 0.124183), structural steel 0.1489 (`s` = 23.18976 / 1,150 = 0.020165). 17.6208 plus those three is 20.0593.

## B5. Price guidance and mandates (F5)

| Case | Inputs | Raw | Guide | Low | High |
|---|---|---|---|---|---|
| P1 | steel, condition A, untested, High demand | 770.4000 | 770 | 715 | 825 |
| P2 | steel, condition A, tested, High demand | 856.0000 | 855 | 795 | 915 |
| P3 | precast, condition B, untested, Low demand | 36.9619 | 37 | 34 | 40 |
| P4 | steel, condition C, untested, Low demand, scrap value set to 600 | 535.6800 | 600 | 560 | 640 |
| P5 | steel, condition A, tested, High demand, cap ratio set to 0.80 | 856.0000 | 800 | 745 | 855 |
| P6 | steel, condition A, tested, Balanced | 800.0000 | 800 | 745 | 855 |
| P7 | steel, condition A, untested, Low demand (TH-12) | 669.6000 | 670 | 625 | 715 |
| P8 | raised floor, condition B, untested, Balanced (TH-11) | 3.6432 | 3.60 | 3.30 | 3.90 |
| P9 | brick, condition B, untested, Balanced (TH-10) | 0.9853 | 0.99 | 0.92 | 1.06 |
| P10 | curtain wall, condition B, untested, Low demand (TH-08) | 77.0040 | 77 | 72 | 82 |
| P11 | stone, condition A, untested, Balanced (TH-07) | 162.0000 | 162 | 151 | 173 |
| P12 | brick, condition A, certified, High demand, cap ratio set to 1.20 | 1.3370 | 1.02 | 0.95 | 1.09 |
| P13 | timber, condition B, inspected, Balanced (OS-20) | 353.9700 | 355 | 330 | 380 |

Signal boundaries: a ratio of exactly 0.5 is Balanced; exactly 1.5 is Balanced; 1.501 is High demand; 0.499 is Low demand; zero supply is High demand.

Guide prices derived from the seed, each with its signal (these test the snapshot as well as F5):

| Lot | Condition, test status | Signal | Guide |
|---|---|---|---|
| TH-01 | A, untested | High demand | 770 |
| TH-02 | A, untested | Balanced | 720 |
| TH-03 | B, untested | Balanced | 660 |
| TH-04 | B, untested | Low demand | 615 |
| TH-05 | B, untested | Balanced | 660 |
| TH-06 | A, untested | High demand | 770 |
| TH-07 | A, untested | Balanced | 162 |
| TH-08 | B, untested | Low demand | 77 |
| TH-09 | B, untested | Low demand | 37 |
| TH-10 | B, untested | Balanced | 0.99 |
| TH-11 | B, untested | Balanced | 3.60 |
| TH-12 | A, untested | Low demand | 670 |
| OS-11, OS-12, OS-14, OS-28 | A, tested | High demand | 855 |
| OS-13 | B, tested | Balanced | 735 |
| OS-15 | B, untested | Low demand | 615 |
| OS-16 | B, inspected | Low demand | 650 |
| OS-17 | A, certified | Low demand | 780 |
| OS-18 | B, inspected | High demand | 168 |
| OS-19 | A, inspected | Balanced | 1.13 |
| OS-20 | B, inspected | Balanced | 355 |
| OS-23 | B, untested | Balanced | 3.60 |
| OS-24 | B, untested | Low demand | 77 |
| OS-25 | B, untested | Low demand | 37 |
| OS-26 | C, untested | Balanced | 0.86 |
| OS-27 | A, untested | High demand | 770 |

Mandates. Tiverne House clear-by is 30 April 2027, which is 205 days from the demo date, so urgency is 1.00 for every lot of that building. Suggested asks and reserves in pounds per unit: TH-01 800 and 730; TH-02 750 and 685; TH-03 685 and 625; TH-04 640 and 585; TH-05 685 and 625; TH-06 800 and 730; TH-07 168 and 154; TH-08 80 and 73; TH-09 38 and 35; TH-10 1.03 and 0.94; TH-11 3.70 and 3.40.

Urgency steps, from a guide of 770 with tick 5, by days to clear-by: 205 gives 800 and 730; 121 gives 800 and 730; 120 gives 770 and 700; 60 gives 770 and 700; 59 gives 720 and 660.

Buyer's suggested mandate from a guide of 770: open 700, maximum 780. From 720: 655 and 725. From 3.60 with tick 0.10: 3.30 and 3.60.

## B6. Deconstruction priority (F6), Tiverne House

After step 1, with TH-12 captured. The maximum net value is TH-07's £55,200.00 and the maximum carbon is TH-02's 84.4212, neither of which is TH-12, so the eleven seeded items score the same before step 1 and the order is unchanged.

| Rank | Tag | Guide | Net value [£] | Carbon | Signal | Ease | Score | Route |
|---|---|---|---|---|---|---|---|---|
| 1 | TH-02 | 720 | 31,332.42 | 84.4212 | Balanced | B | 68.705 | recover |
| 2 | TH-06 | 770 | 23,539.97 | 58.7618 | High demand | B | 63.940 | recover |
| 3 | TH-07 | 162 | 55,200.00 | 5.1120 | Balanced | B | 57.817 | recover |
| 4 | TH-01 | 770 | 16,426.08 | 41.0037 | High demand | B | 52.474 | recover |
| 5 | TH-08 | 77 | 17,690.40 | 78.0947 | Low demand | A | 50.571 | recover |
| 6 | TH-04 | 615 | 21,357.00 | 69.0525 | Low demand | B | 46.015 | recover |
| 7 | TH-05 | 660 | 13,864.13 | 41.2873 | Balanced | A | 44.718 | recover |
| 8 | TH-03 | 660 | 13,790.06 | 41.0667 | Balanced | B | 40.586 | recover |
| 9 | TH-11 | 3.60 | 7,200.00 | 34.1804 | Balanced | A | 37.364 | recover |
| 10 | TH-09 | 37 | -26,220.00 | 72.0067 | Low demand | C | 27.588 | recycle |
| 11 | TH-10 | 0.99 | 12,800.00 | 9.9109 | Balanced | C | 24.797 | recycle |
| 12 | TH-12 | 670 | 2,566.85 | 7.5123 | Low demand | A | 14.530 | recover |

Recoverable net value (the ten items routed "recover") £202,966.91. The top three of those by score hold 54.2%.

Score parts: TH-02 is 22.7047 net value, 30.0000 carbon, 10.0000 demand, 6.0000 ease. TH-01 is 11.9030, 14.5711, 20.0000, 6.0000.

## B7. Schedule matching (F7), Merrowgate Wharf

Need-by 3 April 2028 on every line. Requirements are processed R5, R2, R4, R1, R6, R3 and displayed R1 to R6.

After step 3 (TH-01 open, TH-02 to TH-06 shared in confidence, terms accepted):

| Requirement | Matched | Allocations: lot, pieces, over-specification kg/m, offcut m, grade flag, storage months |
|---|---|---|
| R1 | 52 of 52 | L-9F4CQQ: 48, 0.0, 0.30, flag, 13 to 16. L-NHZ32R: 4, 0.0, 1.80, no flag, 19 |
| R2 | 12 of 12 | L-WPX5A6: 12, 0.0, 0.60, flag, 13 to 16 |
| R3 | 10 of 10 | L-MNY55K: 10, 0.0, 0.20, flag, 10 to 13 |
| R4 | 8 of 8 | L-6DN4K3: 8, 7.7, 0.80, no flag, 17 to 18 |
| R5 | 0 of 6 | none. Reason: no stock long enough (longest visible in this serial size is 9.5 m) |
| R6 | 14 of 14 | L-FQK92P: 14, 6.0, 0.50, flag, 13 to 16 |

Summary: 96 of 102 members, 94.1176% coverage. Mass of all required members 54.977 t. Baseline mass of matched members 47.0957 t. Stock mass 51.295 t. Offcut mass 3.29378 t. Avoided carbon 79.7105 tCO2e.

Windows and storage ranges behind those numbers: Tiverne House lots dated in March 2027 give the window 1 January to 31 March 2027, so 13 to 16 months; TH-03, dated 12 April 2027, gives 1 April to 30 June 2027, so 10 to 13; OS-11 is in stock, so 19 and 19; OS-12's window is November 2026, so 17 to 18.

Variants:

| Variant | Result |
|---|---|
| After step 3, terms not accepted (open lots only) | R1 52 (L-9F4CQQ 48, L-NHZ32R 4), R4 8 (L-6DN4K3 8), all others 0. Total 60 of 102. |
| At the start, before TH-01 is published, terms accepted | R1 18 (L-NHZ32R 16, L-6DN4K3 2, reason "not enough eligible stock"), R2 12, R3 10, R4 8, R6 14. Total 62 of 102. |
| At the start, terms not accepted | R1 18, R4 8, others 0. Total 26 of 102. |
| `allowUnknownGrade` false, terms accepted | R1 18 (L-NHZ32R 16, L-6DN4K3 2), R4 8 (L-6DN4K3 8, allocated first because R4 is processed before R1), R2, R3 and R6 give "no stock of the required grade". Total 26 of 102. |
| After the TH-01 deal is confirmed, terms accepted | R1 now needs 4 and matches 4 (L-NHZ32R), R2 12, R3 10, R4 8, R6 14, R5 0. Total 48 of the 54 members still required. |

## B8. Package costs (F8), the TH-01 allocation

48 pieces, 24.156 t, allocated to R1, baseline 23.18976 t, so cost new is £23,189.76 in every column. Testing is on: 25 x 48 plus 300 x ceil(24.156 / 20) = £1,800.00. One load (ceil(24.156 / 26) = 1).

| Line | Estimate at guide 770, Tilbury, 16 months | Estimate at 740, Tilbury, 16 months | Confirmed at 740, Tilbury, 13 months | Confirmed at 740, Barking, 13 months | Confirmed at 740, direct |
|---|---|---|---|---|---|
| Material [£] | 18,600.12 | 17,875.44 | 17,875.44 | 17,875.44 | 17,875.44 |
| Testing [£] | 1,800.00 | 1,800.00 | 1,800.00 | 1,800.00 | 1,800.00 |
| Storage [£] | 1,352.74 | 1,352.74 | 1,099.10 | 1,570.14 | 0 |
| Handling out [£] | 217.40 | 217.40 | 217.40 | 241.56 | 0 |
| Delivery [£] | 235.80 | 235.80 | 235.80 | 205.20 | 196.20 |
| Buyer total [£] | 22,206.06 | 21,481.38 | 21,227.74 | 21,692.34 | 19,871.64 |
| Saving [£] | 983.70 | 1,708.38 | 1,962.02 | 1,497.42 | 3,318.12 |
| Saving percent | 4.242% | 7.367% | 8.461% | 6.457% | 14.309% |
| Break-even months | 27.635 | 36.207 | 36.207 | 25.398 | not applicable |
| Commission [£] | | | 1,430.04 | 1,430.04 | 1,430.04 |
| Inbound [£] | | | 248.40 | 212.40 | 0 |
| Handling in [£] | | | 217.40 | 241.56 | 0 |
| Seller net [£] | | | 15,979.60 | 15,991.44 | 16,445.40 |
| Gain over scrap [£] | | | 8,491.24 | 8,503.08 | 8,957.04 |

Scrap value £5,314.32 and recovery premium £2,174.04 for this lot in every column.

Facility comparison at the guide price, 16 months: Tilbury £22,206.06 (saving £983.70), Barking £22,779.36 (saving £410.40), Park Royal £26,324.13 (costs £3,134.37 more than new, 13.516%). Tilbury is the default.

Owner's holding view for TH-01, at the guide price via the building's default hub (Barking): material £18,600.12, commission £1,488.01, inbound £212.40, handling in £241.56, net £16,658.15, gain over scrap £9,169.79, holding 75.921 months.

Owner's holding view for TH-11 (covered only, so the nearest covered store, Park Royal), at its guide of £3.60: material £10,800.00, commission £864.00, inbound £410.40, handling in £432.00, net £9,093.60, scrap value £0.00, recovery premium £3,600.00, gain over scrap £5,493.60, holding 10.900 months.

Seller storage for stock already in a hub: OS-11 as a whole lot is 9.6624 t in Barking since 1 September 2026. Sold on the demo date that is 36 days, so 2 months, and `sellerStorage` is £96.62, with inbound and handling in at zero.

A negative case, which the reuse plan must word as "Costs £X more than new": the OS-11 allocation of 4 pieces (2.4156 t, baseline 1.93248 t) at its guide of £855, left at Barking, no testing because the lot is tested, 19 months: material £2,065.34, storage £229.48, handling out £24.16, delivery £205.20, total £2,524.18 against £1,932.48 new, so it costs £591.70 more (30.619%).

## B9. Negotiation (F9)

`S` is a seller move, `B` a buyer move, `hold` a move that leaves the price unchanged.

| Case | ask, reserve, open, max, tick | Sequence after the two opening entries | Outcome |
|---|---|---|---|
| N1 (the demo) | 800, 730, 700, 780, 5 | S 760, B 725, S 745, B 735 | agreed at 740 after 4 moves |
| N2 | 800, 750, 700, 720, 5 | S 760, B hold, S hold | no agreement |
| N3 | 770, 730, 765, 800, 5 | none | agreed at 770 with no moves |
| N4 | 800, 770, 700, 790, 5 | S hold, B 740, S 775, B 755, S hold, B 765 | agreed at 770 after 6 moves |
| N5 | 770, 730, 800, 820, 5 | none | agreed at 770 (the bid already meets the ask) |
| N6 | 770, 770, 765, 765, 5 | S hold, B hold | no agreement |
| N7 | 260, 225, 200, 245, 1 | S 236, B 214, S 227, B 219, S hold, B 222, S 225, B 223, S hold, B 224 | agreed at 225 after 10 moves |
| N8 | 800, 730, 300, 300, 5 | S hold, B hold | no agreement, and 730 never appears |
| N9 | 800, 700, 700, 780, 5 | S 760, B 725, S 745, B 735 | agreed at 740 (the twin of N1 with a lower reserve: the buyer's view is identical) |
| N10 | 3.70, 3.40, 3.30, 3.60, 0.10 | S 3.50 | agreed at 3.40 after 1 move |

## B10. Disclosure score (F10)

| Location, timing, open lots, frame pattern, public photo | Score | Band |
|---|---|---|
| region, quarter, 0, no, no | 10 | Low |
| region, quarter, 1, no, no | 10 | Low |
| local authority, quarter, 1, no, no | 25 | Medium |
| region, month, 1, no, no | 20 | Low |
| local authority, month, 1, no, no | 35 | Medium |
| local authority, month, 1, no, yes | 45 | High |
| region, quarter, 2, no, no | 20 | Low |
| region, quarter, 2, yes, no | 35 | Medium |
| region, quarter, 4, yes, no | 45 | High |
| region, quarter, 3, yes, yes | 45 | High |
| local authority, month, 6, yes, yes | 80 | High |

In step 3 the publishing lot is the building's only open lot, so the open lots term is 0 and the frame term is 0.

## B11. Revenue and models (F12), the TH-01 deal at £740

| Stream | Via Tilbury (the demo) | Via Barking | Direct |
|---|---|---|---|
| Commission [£] | 1,430.04 | 1,430.04 | 1,430.04 |
| Storage brokerage [£] | 153.39 | 205.33 | 0 |
| Testing referral [£] | 180.00 | 180.00 | 180.00 |
| Transport margin [£] | 24.21 | 20.88 | 9.81 |
| Deal total [£] | 1,787.64 | 1,836.25 | 1,619.85 |

Principal model for the same lot via Tilbury: purchase £13,285.80; sale at the tested guide of £855 per tonne £20,653.38; costs £3,582.30 (testing 1,800.00, storage for 13 months 1,099.10, handling in 217.40, handling out 217.40, inbound 248.40); margin £3,785.28; capital £16,868.10; return 22.440%. The margin is 2.117 times the agency deal total and the signal is High demand, so the hybrid flag is on. Via Barking: costs £4,065.66, margin £3,301.92, capital £17,351.46, return 19.030%, multiple 1.798, flag still on.

Forward sale via Tilbury: matching fee £178.75, total £1,966.39.

Ledger: transactions and data to date £14,404.80 at the start, £16,192.44 after the demo deal. Subscriptions £70,800.00 a year.

## B12. Bill import (F13), the sample file in C1

- The header is row 4. Above it: 2 title rows and 1 blank row. Below the data: 1 blank row and 1 total row. 20 data rows.
- Column mapping: `Ref` reference, `Waste description` description, `EWC code` code, `Qty` quantity, `UoM` unit, `Disposal route` route, `Destination facility` facility.
- Confidence: high for rows 1, 2, 3, 6, 7, 9, 11, 12, 13, 15, 16, 17, 18 and 19 (14 rows); medium for rows 4, 5, 8, 10 and 14, whose stream comes from a keyword (5 rows); low for row 20 (1 row).
- Row 2's code `170101` normalises to `17 01 01`. Row 5 converts 212,400 kg to 212.4 t. Row 18's unit `te` is tonnes. Row 19 is hazardous from the asterisk.
- Destinations: row 1 `Recycled off site` to recycled_off_site; row 2 `Crushed, used on site as piling mat` to recycled_on_site; row 3 `Recycling` to recycled_off_site; row 4 `Reuse off-site` to reused_off_site; row 8 `Re-use (sold)` to reused_off_site; row 11 `Crushed, recycled` to recycled_off_site; row 12 `Energy recovery (biomass)` to recovered; row 15 `EfW` to recovered; row 19 `Hazardous landfill` to hazardous_disposal; row 20 `TBC` unknown.
- Stated total 11,369.2 t matches the sum of the 20 data rows.
- The normalised rows are the ones listed in B3.

Further destination cases the rules must get right: `Non-hazardous landfill` to landfill (not hazardous); `Scrap sold to merchant` to recycled_off_site (not reuse); `Crushed and reused on site` to recycled_on_site (crushing wins); `Materials recovery facility` unknown (it is a sorting stop, not a final destination); `Backfill on site` to recovered; `Incineration with energy recovery` to recovered; `Re-used on-site` to reused_on_site; `Sold for resale` to reused_off_site; `Recycling (off-site)` to recycled_off_site; an empty cell unknown.

Keyword cases: `Rafters and roof timbers` to timber (not raised_floor: `raf` must be a whole word); `Draft excluder strips` to no stream; `RAF tiles` to raised_floor; `Stonework copings` to stone; `Brickwork` to brick_block; `Precast stairs` to concrete; `Mixed waste` to no stream.

## B13. Capture Assist (F14)

| Input | Expected |
|---|---|
| `48 no. 457x191x67 UB, 7.5m long, bolted, levels 1 to 6` | steel_section, UB 457x191x67, 48 pieces, 7.5 m, recoverability A, location "levels 1 to 6" |
| `UC 305 x 305 x 118 columns x 54 @ 3.8 m` | steel_section, UC 305x305x118, 54 pieces, 3.8 m, no recoverability, no location |
| `30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room` | steel_section, UC 203x203x46, 30 pieces, 3.2 m, recoverability A, location "roof plant room" |
| `approx 600 m2 portland stone cladding 50mm` | stone_cladding, 600 m2, thickness 50 mm, no count |
| `3000 raised access floor panels 600x600` | raised_floor, 3,000, panel 0.6 by 0.6 m, and "600x600" is not read as a steel section |
| `20,000 facing bricks, cement mortar` | clay_brick, 20,000, recoverability C |
| `78 curtain wall panels 1.5 x 3.6 m` | curtain_wall, 78 panels, 1.5 m by 3.6 m, area 421.2 m2 |
| `steel beams, various` | steel_section only; section, count and length empty and highlighted |
| `457x191x70 UB x 10 at 6m` | steel_section, UB 457x191x67 flagged "closest catalogue match, please check", 10 pieces, 6 m |
| `22 m3 pitch pine joists` | timber_joist, 22 m3 |
| `36 nr 254x254x89 UC at 7.6 m, bolted splices, levels 4 to 7, east core` | steel_section, UC 254x254x89, 36 pieces, 7.6 m, recoverability A, location "levels 4 to 7, east core" |
| `precast panels 150mm, cast-in fixings, north elevation, 1,140 m2` | precast_cladding, 1,140 m2, thickness 150 mm, recoverability C, location "north elevation" |
| `UB 406x178x60 x 96 @ 6.0m welded cleats` | steel_section, UB 406x178x60, 96 pieces, 6.0 m, recoverability B, no location |

## B14. Formatting

Run these through the display module.

| Value | Context | Shown as |
|---|---|---|
| 21227.74 | money | £21,227.74 |
| 740 | unit price, steel | £740 per tonne |
| 3.6 | unit price, raised floor | £3.60 per panel |
| 0.99 | unit price, brick | £0.99 per brick |
| 1150000 | bill of materials value | £1,150,000 |
| 24.156 | mass, marketplace | 24.16 t |
| 11369.2 | mass, waste | 11,369.2 t |
| 41.003723 | carbon | 41.0 tCO2e |
| 0.084611 | percent | 8.5% |
| 0.200593 | content by value | 20.06% |
| 0.001489 | contribution | +0.15 |
| 36.2066 | break-even | 36.2 months |
| 0.718671 | intensity | 0.72 t per m2 GIA |
| 68.705 | score | 68.7 |
| 2027-03-15 | date | 15 March 2027 |
| 2027-03-15 | quarter | Q1 2027 |
| 2026-11-15 | month | November 2026 |
| -591.70 | saving | Costs £591.70 more than new |

## B15. Privacy at data level

- `toPublicListing` for every seeded lot returns exactly the 21 keys in `04-PRIVACY-AND-SCREENS.md` section 1.
- The projection of TH-01 after step 3 has: `publicId` "L-9F4CQQ", `sharing` "open", `family` "steel_section", `title` "UB 457x191x67, 7.5 m", `quantity` 48 pieces, `massT` 24.156, `condition` "A", `testStatus` "untested", `grade` "unknown", `sourceType` "deconstruction", `sellerType` "Asset owner", `eraBand` "1970 or later", `location` region "Central London", `availability` window Q1 2027 from 2027-01-01 to 2027-03-31, `collectionHubId` null, `listedMonth` "2026-10", `status` "Available", `price` guide 770 low 715 high 825 signal "high", `carbon` avoided 41.0037, `photos` empty.
- The projection of OS-11 has `collectionHubId` "HUB-BARK", `availability` "now", `eraBand` "1970 or later", `photos` empty.
- The projection of OS-17 has `eraBand` null, `sourceType` "unused_surplus" and `carbon` null.
- The twin test (P2) passes: the twin's projections, matcher result, TH-01 package estimates at 770 and 740 and buyer-visible negotiation log are identical to the original's. The twin's confirmed storage is 15 months against the original's 13 (TH-01 dated 20 January 2027 is 439 days from the need-by date, against 385), and its seller-side inbound is £261.00 against £248.40 (45 km against 38). Neither figure is visible to the buyer before confirmation.

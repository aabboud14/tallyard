# Build brief, file 6 of 7: reference data, seed world and sample files

All of this is sample data for a fictional world. Load it without randomness. Every price, ratio, premium, fee and rate here is a placeholder for the founder to validate, unless a row says "published" or "indicative".

## A1. Steel sections

Verified against a published section table. Mass in kg per metre. Dimensions in mm: depth h, width b, web thickness tw, flange thickness tf. Draw root fillets at 1.2 times tw for appearance only.

| Designation | Mass | h | b | tw | tf |
|---|---|---|---|---|---|
| UB 305x165x40 | 40.3 | 303.4 | 165.0 | 6.0 | 10.2 |
| UB 356x171x51 | 51.0 | 355.0 | 171.5 | 7.4 | 11.5 |
| UB 406x178x54 | 54.1 | 402.6 | 177.7 | 7.7 | 10.9 |
| UB 406x178x60 | 60.1 | 406.4 | 177.9 | 7.9 | 12.8 |
| UB 406x178x67 | 67.1 | 409.4 | 178.8 | 8.8 | 14.3 |
| UB 457x191x67 | 67.1 | 453.4 | 189.9 | 8.5 | 12.7 |
| UB 457x191x74 | 74.3 | 457.0 | 190.4 | 9.0 | 14.5 |
| UB 457x191x82 | 82.0 | 460.0 | 191.3 | 9.9 | 16.0 |
| UB 457x191x98 | 98.3 | 467.2 | 192.8 | 11.4 | 19.6 |
| UB 533x210x82 | 82.2 | 528.3 | 208.8 | 9.6 | 13.2 |
| UB 533x210x92 | 92.1 | 533.1 | 209.3 | 10.1 | 15.6 |
| UB 533x210x101 | 101.0 | 536.7 | 210.0 | 10.8 | 17.4 |
| UB 610x229x101 | 101.2 | 602.6 | 227.6 | 10.5 | 14.8 |
| UB 610x229x113 | 113.0 | 607.6 | 228.2 | 11.1 | 17.3 |
| UB 610x229x125 | 125.1 | 612.2 | 229.0 | 11.9 | 19.6 |
| UC 203x203x46 | 46.1 | 203.2 | 203.6 | 7.2 | 11.0 |
| UC 203x203x60 | 60.0 | 209.6 | 205.8 | 9.4 | 14.2 |
| UC 254x254x73 | 73.1 | 254.1 | 254.6 | 8.6 | 14.2 |
| UC 254x254x89 | 88.9 | 260.3 | 256.3 | 10.3 | 17.3 |
| UC 254x254x107 | 107.1 | 266.7 | 258.8 | 12.8 | 20.5 |
| UC 305x305x97 | 96.9 | 307.9 | 305.3 | 9.9 | 15.4 |
| UC 305x305x118 | 117.9 | 314.5 | 307.4 | 12.0 | 18.7 |
| UC 305x305x137 | 136.9 | 320.5 | 309.2 | 13.8 | 21.7 |
| UC 305x305x158 | 158.1 | 327.1 | 311.2 | 15.8 | 25.0 |

## A2. Material families and parameters

Carbon factors: `t` means tCO2e per tonne, `m2` means kgCO2e per m2. Prices in pounds per pricing unit.

| Family | Display label | Layer | Pricing unit | Mass rule | factorNew | factorReuse | New price | Base reuse ratio | Scrap value | Cap ratio | Tick | Recovery premium | Storage |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| steel_section | Structural steel section | Superstructure | tonne | pieces x length x kg per metre | 1.74 t | 0.05 t | 1,000 | 0.80 | 220 | 0.95 | 5 | 90 | open or covered |
| curtain_wall | Curtain wall panel | Shell/Skin | m2 | 55 kg per m2 | 200 m2 | 15 m2 | 1,000 | 0.10 | 10 | 0.95 | 1 | 35 | covered only |
| precast_cladding | Precast cladding panel | Shell/Skin | m2 | 360 kg per m2 | 0.178 t | 0.010 t | 320 | 0.15 | 0 | 0.95 | 1 | 60 | open or covered |
| stone_cladding | Stone cladding | Shell/Skin | m2 | 110 kg per m2 | 0.08 t | 0.01 t | 450 | 0.40 | 0 | 0.95 | 1 | 70 | open or covered |
| clay_brick | Clay brick | Shell/Skin | brick | 2.3 kg each | 0.213 t | 0.005 t | 0.85 | 1.40 | 0 | 3.00 | 0.01 | 0.35 | open or covered |
| raised_floor | Raised access floor panel | Space | panel | 12 kg and 0.36 m2 each | 40 m2 | 8.6 m2 | 11.00 | 0.40 | 0 | 0.95 | 0.10 | 1.20 | covered only |
| timber_joist | Timber joist | Superstructure | m3 | 500 kg per m3 | 0.263 t | 0.02 t | 450 | 0.90 | 0 | 0.95 | 5 | 60 | covered only |

Carbon factor sources and status (show these on the Assumptions screen and in "How this is calculated"):

| Family | New | Reuse |
|---|---|---|
| steel_section | Published: UK average for new structural sections | Indicative: rounded up from published declarations for reclaimed steel (about 0.045 to 0.047 for modules A1-A3) |
| curtain_wall | Indicative: published studies give about 150 to 190 for aluminium curtain walling | Placeholder: assumes units are reinstalled without re-glazing |
| precast_cladding | Published: ICE database V3, precast concrete, unreinforced | Placeholder |
| stone_cladding | Indicative: published declarations for Portland stone are lower | Placeholder |
| clay_brick | Published: ICE database V3, clay brick | Placeholder |
| raised_floor | Indicative: a published declaration for a new panel, fossil carbon | Indicative: a published declaration for a reclaimed panel system with new pedestals |
| timber_joist | Published: ICE database V3, softwood, excluding sequestration | Placeholder |

The base reuse ratio of 0.80 for steel reflects the founder's working assumption that reclaimed steel sells for about 20% less than new. Label it "Founder assumption, to be validated". Scrap value is zero for everything except metal: rubble and waste wood earn nothing.

Title templates (the public title of a listing, built from structured fields only):

| Family | Structured fields | Title |
|---|---|---|
| steel_section | designation, length | `UB 457x191x67, 7.5 m` |
| curtain_wall | system, panel width, panel height | `Unitised curtain wall panels, 1.5 m by 3.6 m` |
| precast_cladding | thickness | `Precast concrete cladding panels, 150 mm` |
| stone_cladding | stone, thickness | `Portland stone cladding, 50 mm` |
| clay_brick | brick type, mortar | `Clay facing bricks, cement mortar` |
| raised_floor | panel size | `Raised access floor panels, 600 by 600` |
| timber_joist | species | `Timber joists, pitch pine` |

Other parameters:

| Parameter | Value | Status |
|---|---|---|
| Road transport factor | 0.1065 kgCO2e per tonne km | Published: UK government conversion factors 2020, as used in the IStructE embodied carbon guide |
| New product transport distance | 120 km | Published: RICS whole life carbon standard, 2nd edition, default for nationally manufactured products |
| Listing-level reuse distance | 50 km | Placeholder |
| Hub inbound allowance | 25 km | Placeholder (a privacy device, see F2) |
| Steel testing | £25 per piece non-destructive, plus £300 per 20 t or part for destructive tests | Placeholder |
| Haulage standard rate | £180 per load plus £1.80 per km, payload 26 t per load | Placeholder |
| Commission | 8% of material price | Placeholder |
| Storage brokerage | 10% of storage and handling fees | Placeholder |
| Testing referral | 10% of testing fees | Placeholder |
| Transport margin | 5% of transport cost | Candidate, not from the founder's notes |
| Matching fee (forward sale) | 1% of material price | Candidate |
| Principal buy ratio | 0.55 of new price | Placeholder |
| Hybrid threshold | Principal margin at least 1.5 times agency revenue | Placeholder |
| Subscriptions per year | Supplier £4,800, buyer organisation £3,600, professional seat £1,200 | Placeholder |
| Price factors | Condition, test status and signal factors, range of 7% either side, mandate multipliers and urgency steps as in F5 | Placeholder |
| Priority weights | 0.40 net value, 0.30 carbon, 0.20 demand, 0.10 ease | Placeholder |
| Negotiation | Concession 0.4 of the gap, at most 12 moves | Placeholder |
| Disclosure score | Points and bands as in F10 | Placeholder |
| Diversion target | 95% of demolition waste | Published: London Plan 2021 Policy SI 7 |
| Content by value aim | 20% | Published: Circular Economy Statements guidance (2022), paragraph 4.7.6 |

Storage facilities (partners, described by category):

| ID | Display name | Type | Region | Storage per tonne per month | Handling per tonne each way |
|---|---|---|---|---|---|
| HUB-BARK | Open yard, Barking | open | Outer London East | £5.00 | £10 |
| HUB-PARK | Covered store, Park Royal | covered | Outer London West | £14.00 | £12 |
| HUB-TILB | Open yard, Tilbury | open | East of England | £3.50 | £9 |

Distances in km. These are record data held on the building, hub and project records.

| From | HUB-BARK | HUB-PARK | HUB-TILB | Merrowgate Wharf |
|---|---|---|---|---|
| Tiverne House | 18 | 14 | 38 | 9 |
| HUB-BARK | | | | 14 |
| HUB-PARK | | | | 24 |
| HUB-TILB | | | | 31 |

Hauliers (per load: fixed plus rate times km): Haulier A £180 plus £1.80 per km, 3 days' notice. Haulier B £210 plus £1.75 per km, 2 days. Haulier C £195 plus £2.10 per km, 5 days.

Regions used in the prototype: Central London, Inner London East, Inner London West, Outer London East, Outer London West, South East, East of England.

## A3. Tiverne House

- Internal ID `bld_zad898`. Owner Ostlea Estates. Tiverne House, 14 Garnet Row, London EC2. Local authority: City of London. Region: Central London.
- Built 1984, seven storeys, about 5,200 m2 GIA, steel frame with composite slabs, stone and precast cladding, curtain wall added in 2003. Tenants: Corvane Insurance, Meridale Partners.
- Programme: strip-out starts 4 January 2027, dismantling starts 25 January 2027, clear-by date 30 April 2027. Still standing.
- Default hub HUB-BARK. Disclosure: region, quarter.
- Surveyed by Dana Kowalski of Tarnbrook Deconstruction on 14 September 2026. The inventory is a first survey tranche, not the whole building.
- Every item: test status untested. Steel grade unknown (private note: "Archive drawings indicate Grade 50B to BS 4360, roughly S355. Unconfirmed.").

| Tag | Public ID | Family | Specification | Quantity | Condition | Recoverability | Exact available-from date | Private location |
|---|---|---|---|---|---|---|---|---|
| TH-01 | L-9F4CQQ | steel_section | UB 457x191x67, 7.5 m | 48 pieces | A | B | 15 March 2027 | Secondary floor beams under composite slab, levels 1 to 6 |
| TH-02 | L-WPX5A6 | steel_section | UB 533x210x92, 9.0 m | 60 pieces | A | B | 22 March 2027 | Primary beams, levels 1 to 6 |
| TH-03 | L-MNY55K | steel_section | UC 305x305x118, 3.8 m | 54 pieces | B | B | 12 April 2027 | Lower columns, concrete encased, cut at each floor, ground to level 3 |
| TH-04 | L-2R8X5N | steel_section | UB 610x229x113, 9.0 m | 40 pieces | B | B | 19 April 2027 | Heavy primary beams, ground and level 1 |
| TH-05 | L-775DW8 | steel_section | UC 254x254x89, 7.6 m | 36 pieces | B | A | 29 March 2027 | Upper columns, two-storey lengths with bolted splices, levels 3 to 7 |
| TH-06 | L-FQK92P | steel_section | UB 406x178x60, 6.0 m | 96 pieces | A | B | 8 March 2027 | Infill beams, levels 1 to 6 |
| TH-07 | L-DAXNV3 | stone_cladding | Portland stone, 50 mm | 600 m2 | A | B | 22 February 2027 | On fixings, north and east elevations |
| TH-08 | L-8N33X4 | curtain_wall | Unitised, panels 1.5 m by 3.6 m | 78 panels (421.2 m2) | B | A | 15 February 2027 | Installed 2003, south elevation |
| TH-09 | L-323M2J | precast_cladding | 150 mm | 1,140 m2 | B | C | 1 March 2027 | Cast-in fixings, west elevation and core |
| TH-10 | L-5RC3DR | clay_brick | Facing, cement mortar | 20,000 bricks | B | C | 8 March 2027 | Plant enclosure and rear wall |
| TH-11 | L-33XJ8M | raised_floor | 600 by 600 | 3,000 panels | B | A | 25 January 2027 | Levels 2 to 5 |

State at the start:

- TH-02 to TH-06 are `matched_only`, listed in September 2026, with these asks and reserves in pounds per tonne (the F5 suggestions): TH-02 750 and 685, TH-03 685 and 625, TH-04 640 and 585, TH-05 685 and 625, TH-06 800 and 730.
- TH-01 and TH-07 to TH-11 are `private`.
- TH-01 has one private photo: the sample photo. It is an inline SVG data URI held in the seed: a 640 by 480 grey rectangle with the words "Sample photo". Seeded photos are data URIs; captured photos are blobs in IndexedDB. For the end-to-end test, build `e2e/fixtures/sample-photo.jpg` in a script: a small JPEG that contains an EXIF segment, so the test can show the stored copy has none.
- Lots published during the session are listed in October 2026.
- Pool of public IDs for new lots, used in order: `L-GMXG69`, `L-NNGR64`, `L-MNRF3J`, `L-AFJQ3Z`, `L-HFFX9J`, `L-K8CGH4`. Internal item IDs are any fixed, distinct values of the form `itm_` plus six characters, written into the seed, with a fixed pool for new items.

## A4. Other sellers' lots

All are `open` and were listed in September 2026, unless marked sold. "Now" means in stock. Otherwise the exact date is private and the public window is in brackets. A lot held at a hub takes the hub's region. These sellers have no names in the sample data and are not simulated.

| Tag | Public ID | Seller type | Source type | Specification | Quantity | Grade, test status | Condition | Era band | Held at | Availability | Region |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OS-11 | L-NHZ32R | Deconstruction contractor | deconstruction | UB 457x191x67, 9.0 m | 16 pieces | S355, tested | A | 1970 or later | HUB-BARK since 1 September 2026 | now | hub |
| OS-12 | L-6DN4K3 | Deconstruction contractor | deconstruction | UB 457x191x82, 8.0 m | 10 pieces | S355, tested | A | 1970 or later | source site | 15 November 2026 (November 2026) | Inner London East |
| OS-13 | L-Q58AZF | Waste management firm | deconstruction | UB 610x229x125, 9.5 m | 12 pieces | S275, tested | B | before 1970 | HUB-TILB since 15 June 2026 | now | hub |
| OS-14 | L-2MAC36 | Deconstruction contractor | deconstruction | UC 305x305x97, 4.2 m | 30 pieces | S355, tested | A | 1970 or later | HUB-BARK since 3 August 2026 | now | hub |
| OS-15 | L-53XY6Y | Asset owner | deconstruction | UC 203x203x60, 3.2 m | 24 pieces | unknown, untested | B | 1970 or later | source site | 11 January 2027 (Q1 2027) | Outer London West |
| OS-16 | L-R7ZRMD | Contractor | unused_surplus | UB 356x171x51, 5.0 m | 36 pieces | S275, inspected | B | none | source site | 7 December 2026 (Q4 2026) | Inner London West |
| OS-17 | L-YZ2C7H | Manufacturer | unused_surplus | UB 305x165x40, 4.5 m | 50 pieces | S275, certified | A | none | seller's yard, not a hub | now | South East |
| OS-18 | L-Q23X7N | Asset owner | deconstruction | Portland stone, 50 mm | 180 m2 | inspected | B | none | source site | 8 February 2027 (Q1 2027) | Central London |
| OS-19 | L-A945G6 | Deconstruction contractor | deconstruction | Clay bricks: London stock, lime mortar | 45,000 bricks | inspected | A | none | HUB-TILB since 11 May 2026 | now | hub |
| OS-20 | L-CJGQP7 | Deconstruction contractor | deconstruction | Timber joists, pitch pine | 22 m3 | inspected | B | none | HUB-PARK since 20 July 2026 | now | hub |
| OS-21 | L-R8Q33F | Asset owner | deconstruction | Portland stone, 50 mm | 520 m2 | inspected | A | none | HUB-BARK | sold (A6) | hub |
| OS-22 | L-5APGJ7 | Property manager | fit_out_strip | Raised floor, 600 by 600 | 3,800 panels | inspected | B | none | HUB-PARK | sold (A6) | hub |
| OS-23 | L-6VWCWH | Property manager | fit_out_strip | Raised floor, 600 by 600 | 6,500 panels | untested | B | none | HUB-PARK since 14 September 2026 | now | hub |
| OS-24 | L-9XXQC3 | Asset owner | deconstruction | Unitised curtain wall, panels 1.5 m by 3.3 m | 96 panels (475.2 m2) | untested | B | none | source site | 12 April 2027 (Q2 2027) | Inner London East |
| OS-25 | L-J4WX28 | Waste management firm | deconstruction | Precast cladding, 150 mm | 300 m2 | untested | B | none | HUB-TILB since 6 July 2026 | now | hub |
| OS-26 | L-8WARGH | Waste management firm | deconstruction | Clay bricks: facing, cement mortar | 18,000 bricks | untested | C | none | HUB-TILB since 6 July 2026 | now | hub |
| OS-27 | L-6APVMW | Asset owner | deconstruction | UB 533x210x82, 7.5 m | 20 pieces | unknown, untested | A | 1970 or later | source site | 3 March 2027 (Q1 2027) | Outer London East |
| OS-28 | L-YJ4Z6W | Deconstruction contractor | deconstruction | UC 254x254x73, 3.5 m | 28 pieces | S355, tested | A | 1970 or later | HUB-BARK since 24 August 2026 | now | hub |

## A5. Merrowgate Wharf, other demand and the market snapshot

**Merrowgate Wharf.** Internal ID `prj_hp23zk`. Developer Lantern Quay Developments. Site in London E16. Local authority: Newham. Region: Inner London East. A ten-storey commercial building, 38 m high, 16,500 m2 GIA, so the application is referable to the Mayor. Steel frame of about 1,150 t. RIBA Stage 2. Planning submission January 2027. Steel erection starts 3 April 2028, which is the steel need-by date. Team: Studio Oriel (architect), a structural engineer, Halewick Sustainability (consultant). Blind description: "Design team", "commercial project". Approved for private matching by Ostlea Estates. The confidentiality terms are not yet accepted at the start.

Requirement lines, which are also the sample steel schedule (C2):

| Ref | Section | Length | Count | Minimum grade |
|---|---|---|---|---|
| R1 | UB 457x191x67 | 7.2 m | 52 | S355 |
| R2 | UB 533x210x92 | 8.4 m | 12 | S355 |
| R3 | UC 305x305x118 | 3.6 m | 10 | S355 |
| R4 | UB 457x191x74 | 7.2 m | 8 | S355 |
| R5 | UB 610x229x125 | 10.5 m | 6 | S355 |
| R6 | UB 406x178x54 | 5.5 m | 14 | S275 |

**Other demand.** Two other projects exist only as requirement lines in the market snapshot. They are never shown to anyone.

- Project C: 60 x UB 457x191x67 at 8.0 m; 10 x UB 457x191x98 at 7.0 m; 40 x UB 533x210x92 at 8.0 m; 40 x UC 305x305x118 at 3.6 m; 60 x UC 254x254x89 at 3.6 m; 12 x UC 254x254x73 at 3.5 m; 150 x UB 406x178x60 at 6.0 m; 20 x UB 406x178x67 at 6.0 m; stone_cladding 450 m2; clay_brick 40,000; raised_floor 2,000 panels.
- Project F: raised_floor 5,000 panels; clay_brick 12,000; timber_joist 14 m3.

**Market snapshot.** Supply is the open, unsold lots in A4. Demand is every line above, across the three projects. Check values:

| Key | Snapshot supply | Demand | Signal for a lot in the snapshot | A Tiverne House item, with its own quantity added |
|---|---|---|---|---|
| UB 457x191 | 16.222 t | 68.491 t | High demand | TH-01: ratio 1.70, High demand |
| UB 533x210 | 12.330 t | 38.756 t | High demand | TH-02: 0.62, Balanced |
| UC 305x305 | 12.209 t | 21.222 t | High demand | TH-03: 0.58, Balanced |
| UB 610x229 | 14.261 t | 7.881 t | Balanced (0.55) | TH-04: 0.14, Low demand |
| UC 254x254 | 7.164 t | 22.273 t | High demand | TH-05: 0.71, Balanced |
| UB 406x178 | 0 | 66.308 t | High demand | TH-06: 1.92, High demand |
| UC 203x203 | 4.608 t | 0 | Low demand | TH-12: 0, Low demand |
| UB 356x171 | 9.180 t | 0 | Low demand | |
| UB 305x165 | 9.068 t | 0 | Low demand | |
| stone_cladding | 180 m2 | 450 m2 | High demand | TH-07: 0.58, Balanced |
| curtain_wall | 475.2 m2 | 0 | Low demand | TH-08: 0, Low demand |
| precast_cladding | 300 m2 | 0 | Low demand | TH-09: 0, Low demand |
| clay_brick | 63,000 | 52,000 | Balanced (0.83) | TH-10: 0.63, Balanced |
| raised_floor | 6,500 | 7,000 | Balanced (1.08) | TH-11: 0.74, Balanced |
| timber_joist | 22 m3 | 14 m3 | Balanced (0.64) | |

## A6. Merrowgate Wharf bill of materials and earlier deals

Material values exclude labour. GIA 16,500 m2. Lines tied to a marketplace family have a line quantity in that family's pricing unit.

| Line | Building element | Layer | Mass (t) | Material value | Recycled share of new material | Family and line quantity |
|---|---|---|---|---|---|---|
| Concrete in foundations and basement | 1 Substructure | Substructure | 9,600 | £610,000 | 0.10 | |
| Reinforcement | 1 Substructure | Substructure | 420 | £340,000 | 0.97 | |
| Structural steel sections | 2.1 Frame | Superstructure | 1,150 | £1,150,000 | 0.25 | steel_section, 1,150 t |
| Metal decking | 2.2 Upper floors | Superstructure | 185 | £230,000 | 0.25 | |
| Concrete and mesh in composite slabs | 2.2 Upper floors | Superstructure | 6,300 | £420,000 | 0.12 | |
| Roof coverings and insulation | 2.3 Roof | Shell/Skin | 140 | £190,000 | 0.08 | |
| Unitised curtain wall | 2.5 External walls | Shell/Skin | 269.5 | £4,900,000 | 0.18 | |
| Stone cladding | 2.5 External walls | Shell/Skin | 57.2 | £234,000 | 0.00 | stone_cladding, 520 m2 |
| Partitions and linings | 2.7 Internal walls and partitions | Space | 560 | £330,000 | 0.35 | |
| Raised access floor | 3 Internal finishes | Space | 367.2 | £336,600 | 0.20 | raised_floor, 30,600 panels |
| Other floor, wall and ceiling finishes | 3 Internal finishes | Space | 230 | £390,000 | 0.10 | |
| Building services plant and distribution | 5 Services | Services | 380 | £2,550,000 | 0.06 | |

Total material value £11,680,600. Total mass 19,658.9 t. The three family lines are valued at the family's new price times the line quantity, which is why a reclaimed item counts at the price of the same quantity of new product.

Two deals were confirmed before the demo date. They are seeded records, not recomputed: each has only the fields below, and its buyer view shows the material line with "Earlier deal. The cost breakdown and the seller are not part of the sample data."

| Lot | Item | Quantity | Mass | Agreed price | Material | Route | Confirmed | Avoided carbon (F2, confirmed via hub) |
|---|---|---|---|---|---|---|---|---|
| OS-21, `L-R8Q33F` | Portland stone cladding, 50 mm | 520 m2 | 57.20 t | £175 per m2 | £91,000.00 | HUB-BARK | 14 September 2026 | 4.4974 tCO2e |
| OS-22, `L-5APGJ7` | Raised access floor panels, 600 by 600 | 3,800 panels (1,368 m2) | 45.60 t | £3.70 per panel | £14,060.00 | HUB-PARK | 21 September 2026 | 43.3000 tCO2e |

## A7. Waste streams, codes and keywords

| EWC code | Stream | Display name |
|---|---|---|
| 17 01 01 | concrete | Concrete |
| 17 01 02 | brick_block | Bricks |
| 17 01 07 | mixed_inert | Mixed concrete, bricks and tiles |
| 17 02 01 | timber | Timber |
| 17 02 02 | glass | Glass |
| 17 02 03 | plastic | Plastic |
| 17 04 01 | copper | Copper |
| 17 04 02 | aluminium | Aluminium |
| 17 04 05 | steel | Iron and steel |
| 17 04 07 | mixed_metals | Mixed metals |
| 17 04 11 | cables_copper | Cables |
| 17 05 04 | soil_stones | Soil and stones (excavation) |
| 17 06 04 | insulation | Insulation |
| 17 06 05* | asbestos | Asbestos-containing materials (hazardous) |
| 17 08 02 | plasterboard | Gypsum and plasterboard |
| 17 09 04 | mixed_cd | Mixed construction and demolition waste |

Keyword fallback when a row has no code, first match wins, in this order: `curtain wall` to curtain_wall ("Curtain walling"); `raf` or `raised access` to raised_floor ("Raised access floor panels"); `stone` to stone ("Stone"); `steel` to steel; `brick` to brick_block; `concrete` or `precast` to concrete; `timber` or `wood` to timber; `glass` to glass; `plasterboard` or `gypsum` to plasterboard.

Destination display names: Reused on site, Reused off site, Recycled on site, Recycled off site, Other management (energy recovery, backfill), Landfill, Hazardous disposal.

## A8. Certification mapping rows

Each row carries label L19.

| Workbook | Scheme and requirement | What the workbook provides |
|---|---|---|
| Project compliance | Circular Economy Statement guidance (2022): bill of materials with reused and recycled content by value, aim of at least 20% | Bill of materials, Summary |
| Project compliance | BREEAM New Construction Version 7 series, Mat 05 Material efficiency: reuse of materials | Reused items |
| Project compliance | BREEAM New Construction Version 7 series, Mat 01 Building life cycle assessment | Embodied carbon: factors for the reclaimed items, as an input to the assessment, which is done elsewhere |
| Project compliance | LEED v5 Materials and Resources: Building and Materials Reuse | Reused items |
| Project compliance | LEED v5 Materials and Resources: Quantify and Assess Embodied Carbon; Reduce Embodied Carbon | Embodied carbon, as an input only |
| Waste and reuse | London Plan 2021 Policy SI 7 and the Circular Economy Statement: recycling and waste reporting, at least 95% of demolition waste diverted from landfill | Recycling and waste reporting |
| Waste and reuse | Circular Economy Statement guidance: data for the pre-demolition audit and for post-construction reporting. The audit itself is carried out independently. | Arisings |
| Waste and reuse | BREEAM New Construction Version 7 series, Wst 01 Construction waste management: diversion of resources from landfill | Arisings, Recycling and waste reporting |
| Waste and reuse | LEED v5 Materials and Resources: Construction and Demolition Waste Diversion. LEED counts diversion differently, so these figures are an input only. | Recycling and waste reporting |

## A9. Ledger seed

Fixed entries, shown below the deals made in the session:

| Entry | Amount |
|---|---|
| Commission, stone cladding deal `L-R8Q33F`, September 2026 | £7,280.00 |
| Commission, raised access floor deal `L-5APGJ7`, September 2026 | £1,124.80 |
| Data and insights (placeholder) | £6,000.00 |
| Survey referral (not simulated) | £0.00 |
| Subscriptions, annual: 9 suppliers, 3 buyer organisations, 14 professional seats | £70,800.00 |

"Transactions and data to date" is £14,404.80 at the start.

## A10. Twin seed (tests only, `src/test/`)

The twin is the seed with these changes and no others: the building is "Twin House, 1 Twin Street", owned by "Twin Estates", tenants "Twin Tenant One" and "Twin Tenant Two", owner persona "Twin Owner", surveyed by "Twin Surveys"; TH-01's exact available-from date is 20 January 2027 (the same quarter); distances from the building are 30 km to HUB-BARK, 20 to HUB-PARK, 45 to HUB-TILB and 15 to Merrowgate Wharf; TH-01's reserve is £700. The postcode district, local authority, region, clear-by date and every ask are unchanged. These names exist only in test fixtures and are exempt from the names check.

## A11. Allowed names

Group 1, the fictional world. Organisations: Tallyard, Ostlea Estates, Tarnbrook Deconstruction, Studio Oriel, Lantern Quay Developments, Halewick Sustainability, Pellory Estates, Corvane Insurance, Meridale Partners. People: Tom Ashby, Dana Kowalski, Priya Nair, Marcus Lindqvist. Buildings and addresses: Tiverne House, 14 Garnet Row, Merrowgate Wharf, Durnley House. Partners are described by category: "Open yard, Barking", "Covered store, Park Royal", "Open yard, Tilbury", "Haulier A", "Haulier B", "Haulier C", "the testing partner". Group 2, standards bodies and publications, which may be named as sources: SCI, BCSA, RICS, BREEAM, BRE, LEED, ICE database, IStructE, London Plan, Greater London Authority, European Waste Catalogue, RIBA, NRM.

Group 3, the descriptive facility names in the sample bill (C1), which are fictional and generic: the thirteen strings in the Destination facility column.

Keep all three groups in `src/domain/reference/names.ts` so the scan script can check them. `08-TIER2.md` adds one person and one organisation.

## C. Sample files

Ship both inside the app ("Load sample ...") and build them as real files for the tests.

### C1. Durnley House waste bill

Durnley House was owned by Pellory Estates and deconstructed in the first half of 2026. GIA 15,800 m2. Engagement ID `wst_6yy2w2`. Build this as a real `.xlsx` with the quirks intact: two title rows, a blank row, the header, twenty data rows, a blank row and a total row. Store the quantities that have thousands separators as text cells, as real bills do, and the rest as numbers.

```
Row 1: Durnley House, waste and arisings summary
Row 2: Issued by the deconstruction contractor, 14/07/2026
Row 3: (blank)
Row 4: Ref | Waste description | EWC code | Qty | UoM | Disposal route | Destination facility
 1 | Concrete crushed for 6F2                 | 17 01 01  | 6,650    | t      | Recycled off site                   | Aggregate recycler, Essex
 2 | Concrete crushed for piling mat          | 170101    | 1200     | tonnes | Crushed, used on site as piling mat | Retained on site
 3 | Brick and block rubble                   | 17 01 07  | 620      | t      | Recycling                           | Aggregate recycler, Essex
 4 | Facing bricks, cleaned (16,000 nr)       |           | 36.8     | t      | Reuse off-site                      | Reclamation yard, Kent
 5 | Structural steel sections sold for reuse |           | 212400   | kg     | Reuse offsite                       | Steel stockholder, East London
 6 | Steel scrap, mixed sections and rebar    | 17 04 05  | 1,490    | t      | Recycled                            | Metal recycler, Thames Estuary
 7 | Aluminium                                | 17 04 02  | 38       | t      | recycle                             | Metal recycler, Thames Estuary
 8 | Curtain walling panels (64 nr)           |           | 19.0     | t      | Re-use (sold)                       | Facade contractor, Midlands
 9 | Glass                                    | 17 02 02  | 64       | t      | Recycled                            | Glass recycler, Yorkshire
10 | Portland stone cladding                  |           | 54       | t      | Reuse off site                      | Stone merchant, Dorset
11 | Precast cladding panels                  | 17 01 01  | 410      | t      | Crushed, recycled                   | Aggregate recycler, Essex
12 | Timber                                   | 17 02 01  | 75       | t      | Energy recovery (biomass)           | Biomass plant, Kent
13 | Plasterboard                             | 17 08 02  | 96       | t      | Recycle                             | Gypsum recycler, Midlands
14 | RAF panels 600x600 (2,400 nr)            |           | 28.8     | t      | Reuse (sold)                        | Flooring reseller, London
15 | Carpet and ceiling tiles                 | 17 09 04  | 48       | t      | EfW                                 | Energy from waste plant, South London
16 | Cables and copper                        | 17 04 11  | 21       | t      | Recycled                            | Metal recycler, Thames Estuary
17 | Mixed C&D waste                          | 17 09 04  | 262      | t      | Landfill                            | Landfill, Essex
18 | Mineral wool insulation                  | 17 06 04  | 24       | te     | landfill                            | Landfill, Essex
19 | ACM, asbestos cement sheet               | 17 06 05* | 14.2     | t      | Hazardous landfill                  | Hazardous waste landfill, Northamptonshire
20 | Sundry strip-out items                   |           | 6        | t      | TBC                                 |
(blank row)
TOTAL |                                       |           | 11,369.2 | t      |                                     |
```

### C2. Merrowgate Wharf steel schedule

A CSV with the header `Mark,Section,Length (mm),Qty,Grade` and the six lines of A5, with marks R1 to R6 and lengths in millimetres (7200, 8400, 3600, 7200, 10500, 5500). There is no need-by column: every line takes the project's steel need-by date.

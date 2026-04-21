# Cellsite Solutions Shelter Configurator — POC Customization Brief

## Context

This project is a customization of an existing open-source floor planner:
**Starting point:** https://github.com/charmlinn/blueprint3d-modern
(Next.js 15 + TypeScript + Three.js + shadcn/ui + IndexedDB)

The goal is to convert the residential room planner into a telecom shelter
configurator where customers can:
1. Pick a preset shelter size
2. Add telecom equipment (HVAC, racks, ladder tray, battery, ISP cabinets)
3. See live cost + capacity + cooling calculations
4. Request a quote

This tool will be embedded on cellsitesolutions.com.

---

## Changes to Make

### Phase 1 — Replace free-draw floorplan with preset shelters

Remove the 2D wall-drawing editor entirely from the sidebar and UI. Customers
don't draw rooms — they pick from preset shelter sizes.

- Add a dropdown at the top: "Shelter size"
- Options: 10'×12', 12'×20', 12'×30', 14'×40' (and allow adding more later)
- Each preset is a JSON template in `/public/templates/shelters/[id].json`
  defining corners, walls, door position, and ceiling height (assume 8'6" AFF
  unless otherwise specified in the template)
- Selecting a preset loads that template and replaces the current scene
- Delete all 2D wall-drawing controls from the UI
- Keep the 2D canvas — we'll reuse it for top-down mode in phase 4

### Phase 2 — Extend item types to support ceiling-mounted equipment

The existing codebase has `FloorItem`, `WallItem`, and `InWallItem`.
Add a new `CeilingItem` type that:
- Snaps to the ceiling plane (y = ceilingHeight)
- Renders at ceiling height in 3D
- Can be a long linear item (like ladder tray) with adjustable endpoints,
  not just a fixed-size box
- Shows a dashed outline when "transparent walls" mode is active (visual
  cue that it's above the viewer)

Ladder tray is the primary use case. Build it as a parametric shape (a
length, not a fixed mesh) so users can drag endpoints to change its run.

### Phase 3 — Build the auto-placement engine

When a user clicks "Add" on a product in the sidebar, the app should
auto-place it in a sensible default location based on the product's
`autoPlacement.strategy` field, THEN let the user drag to adjust.

After placement, show a toast: "Auto-placed [item] on [location]. Drag to
adjust."

Implement these strategies:
- **`longest-exterior-wall`** (HVAC) — find the longest wall with no
  existing HVAC, place centered on that wall at `heightAFF` (typically 84").
  If more than one HVAC, prefer the opposite wall.
- **`centerline-above-rack-row`** (ladder tray) — run a straight line down
  the approximate center of the shelter at `heightAFF` (typically 96").
  Default length = 80% of shelter length.
- **`next-in-rack-row`** (19" racks) — place at back wall, left to right,
  respecting each rack's front clearance spec (typically 36"). New rack
  snaps to right of last placed rack with proper spacing.
- **`against-wall`** (battery, ISP cabinet) — snap to any open wall with
  enough space for the footprint + clearance.

Constraint enforcement (item must stay on its mount type):
- Wall items can only be dragged along walls, not into open space
- Ceiling items stay at ceiling height
- Floor items stay on the floor
- When dragged to an invalid position, snap back to nearest valid location

### Phase 4 — View mode controls (3D + top-down only for POC)

Top toolbar toggles:
- **View mode:** "3D" (default) / "Top-down"
  - 3D: perspective camera with OrbitControls
  - Top-down: orthographic camera looking straight down
- **Transparent walls** checkbox (default on, only applies in 3D)
  - When on: walls render at ~25% opacity so you can see inside
  - When off: walls are solid (exterior view only)
- **Hide ceiling** checkbox (default off, only applies in 3D)
  - When on: ceiling mesh is hidden, ladder tray fully visible from above

In top-down mode:
- Ceiling-mount items render as DASHED outlines (architectural convention —
  dashed = above viewer's head)
- Floor-mount items render as solid outlines
- Wall-mount items render as short thick lines on the wall they're mounted to
- Include a simple legend in the corner explaining the line styles

Section view is **out of scope for POC** — don't build it yet.

### Phase 5 — Replace the furniture catalog with shelter products

- Delete all residential furniture items, textures, and related UI
- Load products from `/public/catalog/shelter-products.json`
- Sidebar groups products by category:
  - HVAC
  - Racks
  - Power (batteries, rectifiers, PDUs)
  - Cable management (ladder tray, cable ladder)
  - Cabinets (ISP, battery cabinets)
  - Other
- Each product card shows: thumbnail, name, category, "starting at" price
- Click the card → auto-placement runs, item appears in scene
- Initial catalog should have ~8-10 products covering all categories
  (use placeholder colored boxes for 3D representation until GLB files
  are ready; see loader spec below)

Product JSON schema:
```json
{
  "id": "hvac-bard-w24",
  "name": "Bard WA24 Wall-Mount HVAC",
  "category": "HVAC",
  "mountType": "wall",
  "autoPlacement": {
    "strategy": "longest-exterior-wall",
    "heightAFF": 84,
    "spacingMin": 36,
    "preferOppositeWall": true
  },
  "footprint": { "width": 36, "depth": 12, "height": 84 },
  "clearance": { "front": 36, "sides": 6, "rear": 0 },
  "cost": 4850,
  "specs": {
    "btuCooling": 24000,
    "powerDraw": 2400
  },
  "modelPath": "/models/hvac-bard-w24.glb"
}
```

GLB loader: if `modelPath` exists and the file is reachable, load the GLB
and use it as the mesh. If not, render a colored placeholder box sized
to `footprint` with the product name as a label. This lets the POC work
before all models are converted.

### Phase 6 — Live KPI sidebar (right side, 280px wide)

On every scene state change, compute and display:
- **Total cost** = sum of `item.cost` across all placed items, plus
  `ladderTray.length * costPerFoot` for parametric items. Format as USD.
- **Server capacity** = sum of rack U-space × 0.7 (reserving 30% for
  switches, cabling, blanking panels). Display as "42 / 84 U used"
  with a progress bar, and below it "~29 1U servers."
- **Cooling load** = (rack count × 5000 BTU) + (shelter surface area
  in ft² × 30 BTU for envelope gain estimate). Show the number in kBTU.
- **Cooling capacity** = sum of `btuCooling` across all HVAC units.
- Display cooling as a progress bar: load / capacity. If load > capacity,
  show a red warning: "Cooling load exceeds HVAC capacity. Add HVAC
  or reduce load."
- **Total power draw** = sum of `powerDraw` across all items. Display in kW.

Below the KPIs, show a Bill of Materials list (one row per item with
name, quantity, unit cost, total).

At the bottom, a "Request Quote" button that generates a PDF of the
current configuration (floor plan screenshot + BOM table + KPI summary)
and opens a `mailto:` with sales@cellsitesolutions.com with the config
JSON in the body.

### Phase 7 — Natural-language quick config (the demo wow factor)

Add a text input at the top of the page: "Describe your shelter needs
and we'll configure it for you."

When the user submits:
1. POST the prompt to a Next.js API route at `/api/configure`
2. That route calls the Anthropic API (model: `claude-sonnet-4-6`)
3. System prompt describes: the available shelter sizes, the product
   catalog with key specs, and the expected output format (JSON matching
   the scene state schema)
4. Claude returns a JSON configuration
5. The app applies the returned configuration to the scene (selecting
   shelter size, then placing each item)

Example input: "12 by 20 shelter for 15 kW of IT load, dual HVAC for
redundancy, 2 racks, include cable management"

Expected behavior: shelter loads as 12×20, 2 HVAC units auto-place on
opposite walls, 2 racks appear at back wall, ladder tray runs across
ceiling. User can then fine-tune.

Handle errors gracefully: if Claude returns invalid JSON, show "Sorry,
couldn't understand that. Try being more specific, or configure manually
using the catalog."

Use environment variable `ANTHROPIC_API_KEY` for the API key.

---

## Out of Scope for POC

- User accounts (use the existing IndexedDB save/load from the starter)
- Real pricing (show "starting at" prices only)
- Quote submission to CRM (mailto: link is fine for POC)
- Multiple shelters in one session
- Section view (2D side elevation) — add in v2 if validated
- Rack interior configuration (what goes inside each rack) — v2 feature
- Mobile optimization — desktop-first for POC
- Advanced AI validation (cooling margin warnings, redundancy checks) — v2
- Quote narrative generation — v2

---

## Build Order

Work through the phases sequentially. At the end of each phase, STOP and
show me what you built before continuing. This prevents spending hours on
something that goes the wrong direction.

1. Phase 1 (preset shelters) — stop and show
2. Phase 2 (CeilingItem type) — stop and show
3. Phase 3 (auto-placement engine) — stop and show
4. Phase 4 (view modes) — stop and show
5. Phase 5 (shelter catalog) — stop and show
6. Phase 6 (KPI sidebar) — stop and show
7. Phase 7 (natural-language config) — stop and show

---

## Technical Notes

- All units in inches internally; display in feet+inches in the UI
- Origin: back-left corner of shelter at (0, 0, 0), Y up
- Coordinate system: X = shelter width, Z = shelter depth, Y = height
- Store scene state in existing Zustand store (already set up in the
  starter) — extend the schema as needed
- Keep all three existing locales working (en / zh / tw) — add
  translations for new strings
- Deploy target: Vercel (the starter is Next.js, deploys natively)

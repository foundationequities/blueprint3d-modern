# Getting Started — Shelter Configurator POC

Your week-one checklist for kicking off the POC. Work through these in order.

## Day 1 — Prove the starter works on your machine

- [ ] Install Node.js (version 20+) from https://nodejs.org if not already installed
- [ ] Install Git if not already installed
- [ ] Fork https://github.com/charmlinn/blueprint3d-modern to your own GitHub account
- [ ] Clone your fork locally: `git clone <your-fork-url>`
- [ ] Run `cd blueprint3d-modern && npm install`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000 in your browser
- [ ] Click around — draw a room, drop some furniture, switch 2D/3D
- [ ] Goal of this day: confirm the starter runs and you understand the baseline UX

If any step fails, STOP and resolve before moving on. Don't try to customize a codebase that doesn't run cleanly first.

## Day 2 — Prove your SolidWorks pipeline works

- [ ] Pick ONE SolidWorks model (recommendation: the Bard HVAC unit — exercises wall mounting)
- [ ] Export from SolidWorks to STEP format (File → Save As → STEP)
- [ ] Install Blender (free, https://blender.org) if not already installed
- [ ] Install the STEP importer add-on in Blender
- [ ] Import the STEP file into Blender
- [ ] Apply Decimate modifier, target under 50,000 triangles
- [ ] Export as glTF 2.0 (GLB) format
- [ ] Open your GLB at https://gltf.report to verify it loads and looks acceptable
- [ ] Goal of this day: confirm your models export cleanly to web-compatible format at reasonable file sizes (aim for under 2 MB per product)

If models look bad at acceptable file sizes, you'll know before investing in code work. This is the single most important de-risking step.

## Day 3 — Install Claude Code and do a dry run

- [ ] Install Claude Code: `npm install -g @anthropic-ai/claude-code`
- [ ] Navigate to your forked repo: `cd blueprint3d-modern`
- [ ] Copy BRIEF.md into the repo root
- [ ] Copy shelter-products.json to `public/catalog/shelter-products.json` (create the folder)
- [ ] Copy shelter-12x20.json to `public/templates/shelters/shelter-12x20.json` (create the folder)
- [ ] Copy your GLB file(s) to `public/models/` (create the folder)
- [ ] Run `claude` in the repo root
- [ ] First message to Claude Code: "Read BRIEF.md and start with Phase 1. Stop and show me before continuing to Phase 2."

## Days 4-5 — Phase 1 and 2

- [ ] Complete Phase 1 (preset shelters) with Claude Code
- [ ] Review the diff, test in browser
- [ ] Complete Phase 2 (CeilingItem type)
- [ ] Review, test

## Week 2 — Phases 3-7

Pace: roughly one phase per day, with testing and iteration. Realistic total timeline: 10-15 working days from kickoff to demoable POC.

## Before You Start

Read the Thios case study: https://blog.thios.co/i-built-an-open-source-3d-configurator?lang=en

It's the most realistic "what building this will actually feel like" reference. 30 minutes of reading will save you days of miscalibrated expectations about how Claude Code development feels day-to-day.

## If You Get Stuck

- Ask Claude Code to explain what a chunk of existing code does before asking it to modify
- If a phase output goes off track, it's usually cheaper to `git reset --hard` and retry with clearer instructions than to debug a half-wrong result
- Keep each Claude Code session focused on one phase — starting fresh for each phase helps
- The auto-placement engine (Phase 3) is the most complex piece. Budget extra time for it. Expect 2-3 iterations.

## Critical API Key Note

Phase 7 uses the Anthropic API. Before building it:
- [ ] Get an API key from https://console.anthropic.com
- [ ] Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`
- [ ] Add `.env.local` to `.gitignore` (it should already be there in the starter)

Never commit the API key. Never put it in client-side code. The API call must go through the Next.js API route (`/api/configure`) which keeps the key server-side.

## When the POC is Done

You should be able to demo this workflow end-to-end:
1. Open the URL
2. Type "12 by 20 shelter for 15kW IT load with dual HVAC" and submit
3. Watch the shelter auto-configure itself
4. Toggle between 3D and top-down to show layout
5. Toggle "Hide ceiling" to reveal ladder tray
6. Drag an HVAC unit along its wall to show customization
7. Watch the KPIs (cost, cooling load, power) update live
8. Click "Request Quote" to generate the PDF

That's your POC. Ship it to a handful of customers, see what they say, iterate.

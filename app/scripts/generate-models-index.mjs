#!/usr/bin/env node
/**
 * Scans /app/public/models/<category>/ for .glb files and writes
 * /app/public/models/index.json — the manifest the ItemsList UI fetches
 * at runtime to populate the product catalog.
 *
 * - Categories are fixed (matches the sidebar buttons): Bed, HVAC,
 *   Electrical, CableRacks, Battery, MoreOptions.
 * - For each <name>.glb, looks for a <name>.png/.jpg/.jpeg/.webp
 *   thumbnail in the same folder. If absent, thumbnailPath is null and
 *   the UI shows a placeholder.
 * - CATEGORY_CONFIG attaches the right mount type and Item factory id
 *   to every product in a category (HVAC + Electrical are wall items,
 *   CableRacks are ceiling items, Bed + Battery + MoreOptions are floor
 *   items).
 * - Pre-seeded entries (e.g. legacy CDN-hosted bed) live in
 *   models-seed.json next to this script and are merged in first.
 *
 * Run via `pnpm run generate:models` or implicitly via predev/prebuild.
 */

import {
  readdirSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readFileSync
} from 'node:fs'
import { join, basename, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_DIR = join(__dirname, '..')
const MODELS_DIR = join(APP_DIR, 'public', 'models')
const OUTPUT = join(MODELS_DIR, 'index.json')
const SEED_FILE = join(__dirname, 'models-seed.json')

/** Item types reflect the factory ids in src/items/factory.ts.
 *  1 = FloorItem, 2 = WallItem, 11 = CeilingItem (added Phase 2). */
const CATEGORY_CONFIG = {
  HVAC:        { mountType: 'wall',    itemType: '2', defaultHeightAFF: 84 },
  Electrical:  { mountType: 'wall',    itemType: '2', defaultHeightAFF: 60 },
  ServerRacks: { mountType: 'floor',   itemType: '1' },
  CableRacks:  { mountType: 'ceiling', itemType: '11' },
  Battery:     { mountType: 'floor',   itemType: '1' },
  MoreOptions: { mountType: 'floor',   itemType: '1' }
}
const CATEGORIES = Object.keys(CATEGORY_CONFIG)
const THUMB_EXTS = ['png', 'jpg', 'jpeg', 'webp']

const seed = existsSync(SEED_FILE)
  ? JSON.parse(readFileSync(SEED_FILE, 'utf-8'))
  : {}

const manifest = {}
for (const category of CATEGORIES) {
  const cfg = CATEGORY_CONFIG[category]
  const dir = join(MODELS_DIR, category)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const items = []
  if (Array.isArray(seed[category])) {
    for (const seeded of seed[category]) {
      items.push({
        mountType: cfg.mountType,
        itemType: cfg.itemType,
        defaultHeightAFF: cfg.defaultHeightAFF ?? null,
        ...seeded,
        type: seeded.type ?? cfg.itemType
      })
    }
  }

  const entries = readdirSync(dir, { withFileTypes: true })
  const glbFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.glb'))
    .map((e) => e.name)
    .sort()
  const fileNameSet = new Set(entries.filter((e) => e.isFile()).map((e) => e.name))

  for (const glb of glbFiles) {
    const base = basename(glb, extname(glb))
    let thumbnailPath = null
    for (const ext of THUMB_EXTS) {
      const candidate = `${base}.${ext}`
      if (fileNameSet.has(candidate)) {
        thumbnailPath = `/models/${category}/${candidate}`
        break
      }
    }
    items.push({
      key: `${category}/${base}`,
      name: humanize(base),
      modelPath: `/models/${category}/${glb}`,
      thumbnailPath,
      type: cfg.itemType,
      mountType: cfg.mountType,
      defaultHeightAFF: cfg.defaultHeightAFF ?? null
    })
  }

  manifest[category] = items
}

writeFileSync(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`)

const total = Object.values(manifest).reduce((acc, arr) => acc + arr.length, 0)
console.log(
  `Wrote ${OUTPUT.replace(APP_DIR + '/', '')} — ${total} item(s) across ${CATEGORIES.length} categories`
)

function humanize(slug) {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

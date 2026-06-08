#!/usr/bin/env node
// Scans app/public/shelters for .glb files matching {MFR}-SHELTER-{W}x{L}.glb,
// produces app/public/shelters/index.json describing the catalog.
import { readdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sheltersDir = resolve(__dirname, '../public/shelters')
const outputPath = resolve(sheltersDir, 'index.json')

const MFR_INFO = {
  RMS: { type: 'concrete', label: 'Concrete' },
  DPS: { type: 'datacomm', label: 'Datacomm Pro' }
}
const FILENAME_RE = /^([A-Z]+)-SHELTER-(\d+)x(\d+)\.glb$/i

let entries = []
try {
  for (const file of readdirSync(sheltersDir)) {
    if (!file.toLowerCase().endsWith('.glb')) continue
    const m = file.match(FILENAME_RE)
    if (!m) { console.warn(`Skipping ${file}: bad format`); continue }
    const mfr = m[1].toUpperCase()
    const info = MFR_INFO[mfr]
    if (!info) { console.warn(`Skipping ${file}: unknown mfr "${mfr}"`); continue }
    const widthFt = parseInt(m[2], 10)
    const lengthFt = parseInt(m[3], 10)
    entries.push({
      id: `${mfr}-${widthFt}x${lengthFt}`,
      manufacturer: mfr,
      type: info.type,
      label: info.label,
      widthFt, lengthFt,
      sizeLabel: `${widthFt}' × ${lengthFt}'`,
      url: `/shelters/${file}`
    })
  }
} catch (e) {
  if (e.code !== 'ENOENT') throw e
  console.warn(`Shelter dir missing at ${sheltersDir}; emitting empty catalog`)
}

entries.sort((a, b) =>
  a.type !== b.type ? a.type.localeCompare(b.type)
  : a.widthFt !== b.widthFt ? a.widthFt - b.widthFt
  : a.lengthFt - b.lengthFt
)

writeFileSync(outputPath, JSON.stringify({ shelters: entries }, null, 2) + '\n')
console.log(`Wrote shelter catalog: ${entries.length} shelter(s)`)

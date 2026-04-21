import type { SavedFloorplan } from '@blueprint3d/model/floorplan'
import type { SerializedItem } from '@blueprint3d/model/model'

/**
 * Shelter template schema — describes a preset telecom shelter's corners,
 * walls, door opening, and ceiling height. Lives in /public/templates/shelters.
 * All distance values in INCHES (converted to centimeters for the internal
 * floorplan model in `shelterToFloorplan`).
 */
export interface ShelterTemplate {
  id: string
  name: string
  dimensions: {
    widthFt: number
    depthFt: number
    ceilingHeightIn: number
  }
  corners: Array<{ id: string; x: number; z: number }>
  walls: Array<{
    id: string
    from: string
    to: string
    side: 'front' | 'back' | 'left' | 'right'
    exterior: boolean
  }>
  door: {
    wallId: string
    offsetFromStart: number
    width: number
    height: number
  }
  notes?: string
}

export const INCH_TO_CM = 2.54

export type LoadedScene = {
  floorplan: SavedFloorplan
  items: SerializedItem[]
}

/**
 * Convert a ShelterTemplate into the payload shape that
 * `Model.loadSerialized` expects. Floorplan corners use (x, y) where
 * "y" is the top-down axis (maps from the template's z). Values are
 * converted inches → cm to match the codebase's internal units.
 */
export function shelterToFloorplan(t: ShelterTemplate): LoadedScene {
  const corners: SavedFloorplan['corners'] = {}
  for (const c of t.corners) {
    corners[c.id] = { x: c.x * INCH_TO_CM, y: c.z * INCH_TO_CM }
  }
  const walls: SavedFloorplan['walls'] = t.walls.map((w) => ({
    corner1: w.from,
    corner2: w.to
  }))
  return {
    floorplan: {
      corners,
      walls,
      wallTextures: [],
      floorTextures: {},
      newFloorTextures: {}
    },
    items: []
  }
}

export async function loadShelterById(id: string): Promise<ShelterTemplate> {
  const res = await fetch(`/templates/shelters/${id}.json`)
  if (!res.ok) {
    throw new Error(`Shelter template "${id}" failed to load (HTTP ${res.status})`)
  }
  return (await res.json()) as ShelterTemplate
}

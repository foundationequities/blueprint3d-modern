import * as THREE from 'three'
import type { Floorplan } from '@blueprint3d/model/floorplan'
import type { Wall } from '@blueprint3d/model/wall'
import { INCH_TO_CM, type ShelterTemplate } from './shelter-template'

/**
 * Minimal wall-item stub that's recognized by edge.ts's hole-cutting code
 * (`wall.items.forEach(...)`) to punch an opening in the wall geometry
 * without needing a full Item subclass.
 */
interface DoorStub {
  position: THREE.Vector3
  halfSize: THREE.Vector3
  updateEdgeVisibility: () => void
}

export interface ShelterDoorHandle {
  wall: Wall
  stub: DoorStub
  frameMeshes: THREE.Mesh[]
  dispose: () => void
}

/**
 * Returns an ordered list of wall ids that are valid "door sides" — the
 * two longest walls of the shelter (or, for a square shelter, an opposite
 * pair picked via side metadata). Index 0 is the default, index 1 the
 * alternate for the "switch door" toggle.
 */
export function getDoorCandidateWallIds(template: ShelterTemplate): string[] {
  const cornerMap = new Map(template.corners.map((c) => [c.id, c]))
  const walls = template.walls.map((w) => {
    const a = cornerMap.get(w.from)
    const b = cornerMap.get(w.to)
    const len = a && b ? Math.hypot(b.x - a.x, b.z - a.z) : 0
    return { ...w, len }
  })
  const maxLen = Math.max(...walls.map((w) => w.len))
  const EPS = 0.01
  const longWalls = walls.filter((w) => Math.abs(w.len - maxLen) < EPS)
  if (longWalls.length === 2) return longWalls.map((w) => w.id)
  // Square shelter — all 4 walls equal. Pick the front/back pair as the
  // toggle axis (user will toggle between the "North" and "South" walls).
  const front = longWalls.find((w) => w.side === 'front')
  const back = longWalls.find((w) => w.side === 'back')
  if (front && back) return [front.id, back.id]
  const first = longWalls[0]
  const last = longWalls[longWalls.length - 1]
  return first && last ? [first.id, last.id] : []
}

/**
 * Install the shelter door: punch a hole in the specified wall via a stub
 * in wall.items, then add a visible frame (posts + lintel + threshold) so
 * the opening is obvious from both interior and exterior.
 *
 * Returns null if the wall can't be resolved.
 */
export function installShelterDoor(
  template: ShelterTemplate,
  wallId: string,
  scene: THREE.Scene,
  floorplan: Floorplan
): ShelterDoorHandle | null {
  const tplWall = template.walls.find((w) => w.id === wallId)
  if (!tplWall) return null

  const wall = floorplan
    .getWalls()
    .find((w) => w.getStart().id === tplWall.from && w.getEnd().id === tplWall.to)
  if (!wall) return null

  const start = wall.getStart()
  const end = wall.getEnd()
  const dx = end.x - start.x
  const dy = end.y - start.y
  const wallLen = Math.hypot(dx, dy)
  if (wallLen === 0) return null

  const ux = dx / wallLen
  const uy = dy / wallLen

  const door = template.door
  const widthCm = door.width * INCH_TO_CM
  const heightCm = door.height * INCH_TO_CM

  // For non-default walls, auto-center the door along the wall; use the
  // JSON's explicit offset only when the active wall matches the JSON's wallId.
  const isDefaultWall = wallId === door.wallId
  const offsetInchesAlongWall = isDefaultWall
    ? door.offsetFromStart + door.width / 2
    : wallLen / INCH_TO_CM / 2
  const offsetCm = offsetInchesAlongWall * INCH_TO_CM

  const centerX = start.x + ux * offsetCm
  const centerZ = start.y + uy * offsetCm
  const centerY = heightCm / 2

  // Wall direction in world XZ plane
  const wallAngle = Math.atan2(uy, ux) // floorplan y → world z
  const threeAngle = -wallAngle // rotation around Y to align +X with wall direction

  // ── 1. Stub for the cutout ─────────────────────────────────────────
  const stub: DoorStub = {
    position: new THREE.Vector3(centerX, centerY, centerZ),
    halfSize: new THREE.Vector3(widthCm / 2, heightCm / 2, 10),
    updateEdgeVisibility: () => {
      /* no-op — stub isn't a real Item */
    }
  }
  wall.items.push(stub as unknown as never)
  // Trigger edge re-render so the hole appears.
  wall.fireRedraw()

  // ── 2. Visible door frame ─────────────────────────────────────────
  const frameMeshes: THREE.Mesh[] = []
  const frameThickness = 20 // cm (spans a normal wall + extra)
  const frameDepth = 6 // cm (post/lintel "wood" depth along wall)
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a2a1a,
    roughness: 0.6,
    metalness: 0.05,
    side: THREE.DoubleSide
  })

  const addFramePart = (
    width: number,
    height: number,
    thickness: number,
    localX: number,
    localY: number
  ) => {
    const geo = new THREE.BoxGeometry(width, height, thickness)
    const mesh = new THREE.Mesh(geo, frameMaterial)
    mesh.castShadow = false
    mesh.receiveShadow = false
    // Position relative to door center in world space, rotated into wall's frame.
    const worldX = centerX + ux * localX
    const worldZ = centerZ + uy * localX
    mesh.position.set(worldX, localY, worldZ)
    mesh.rotation.y = threeAngle
    scene.add(mesh)
    frameMeshes.push(mesh)
  }

  // Left post
  addFramePart(frameDepth, heightCm, frameThickness, -widthCm / 2 - frameDepth / 2, heightCm / 2)
  // Right post
  addFramePart(frameDepth, heightCm, frameThickness, widthCm / 2 + frameDepth / 2, heightCm / 2)
  // Top lintel (spans posts)
  addFramePart(
    widthCm + frameDepth * 2,
    frameDepth,
    frameThickness,
    0,
    heightCm + frameDepth / 2
  )
  // Floor threshold (thin)
  addFramePart(widthCm + frameDepth * 2, 3, frameThickness, 0, 1.5)

  const dispose = () => {
    const idx = wall.items.indexOf(stub as unknown as never)
    if (idx >= 0) wall.items.splice(idx, 1)
    wall.fireRedraw()
    for (const mesh of frameMeshes) {
      scene.remove(mesh)
      mesh.geometry.dispose()
      const mat = mesh.material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat.dispose()
    }
    frameMeshes.length = 0
  }

  return { wall, stub, frameMeshes, dispose }
}

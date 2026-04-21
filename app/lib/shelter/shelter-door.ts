import * as THREE from 'three'
import type { Floorplan } from '@blueprint3d/model/floorplan'
import { INCH_TO_CM, type ShelterTemplate } from './shelter-template'

/**
 * Build a non-interactive placeholder door mesh for a shelter template.
 * Returns null if the door's target wall can't be matched — caller treats
 * that as "no door rendered". Full structural door opening is a later phase.
 */
export function buildShelterDoorPlaceholder(
  template: ShelterTemplate,
  floorplan: Floorplan
): THREE.Mesh | null {
  const door = template.door
  const tplWall = template.walls.find((w) => w.id === door.wallId)
  if (!tplWall) return null

  const wall = floorplan
    .getWalls()
    .find((w) => w.getStart().id === tplWall.from && w.getEnd().id === tplWall.to)
  if (!wall) return null

  const start = wall.getStart()
  const end = wall.getEnd()
  const dx = end.x - start.x
  const dy = end.y - start.y
  const wallLen = Math.sqrt(dx * dx + dy * dy)
  if (wallLen === 0) return null

  const ux = dx / wallLen
  const uy = dy / wallLen

  const offsetCm = (door.offsetFromStart + door.width / 2) * INCH_TO_CM
  const centerX = start.x + ux * offsetCm
  const centerZ = start.y + uy * offsetCm

  const widthCm = door.width * INCH_TO_CM
  const heightCm = door.height * INCH_TO_CM
  const thicknessCm = 2 * INCH_TO_CM

  const geometry = new THREE.BoxGeometry(widthCm, heightCm, thicknessCm)
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    transparent: true,
    opacity: 0.75
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(centerX, heightCm / 2, centerZ)
  mesh.rotation.y = -Math.atan2(uy, ux)
  mesh.name = `shelter-door-placeholder-${template.id}`
  return mesh
}

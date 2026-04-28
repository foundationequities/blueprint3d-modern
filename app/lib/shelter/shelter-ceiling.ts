import * as THREE from 'three'
import { INCH_TO_CM, type ShelterTemplate } from './shelter-template'

export interface ShelterCeilingHandle {
  mesh: THREE.Mesh
  dispose: () => void
}

/**
 * Add a translucent ceiling plane at the shelter's ceiling height so
 * ceiling-mounted items (cable racks etc.) read clearly from below.
 * Transparent enough to see through from a top-down camera but visible
 * enough that the user can tell where "the ceiling" is.
 */
export function buildShelterCeiling(
  template: ShelterTemplate,
  scene: THREE.Scene
): ShelterCeilingHandle | null {
  if (template.corners.length < 3) return null

  const points = template.corners.map(
    (c) => new THREE.Vector2(c.x * INCH_TO_CM, c.z * INCH_TO_CM)
  )
  const shape = new THREE.Shape(points)
  const geometry = new THREE.ShapeGeometry(shape)
  const material = new THREE.MeshBasicMaterial({
    color: 0xb9c6d4,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = Math.PI / 2
  mesh.position.y = template.dimensions.ceilingHeightIn * INCH_TO_CM
  mesh.name = `shelter-ceiling-${template.id}`
  scene.add(mesh)

  return {
    mesh,
    dispose: () => {
      scene.remove(mesh)
      mesh.geometry.dispose()
      const mat = mesh.material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat.dispose()
    }
  }
}

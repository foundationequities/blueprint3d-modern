import * as THREE from 'three'
import { Utils } from '../core/utils'
import { Configuration, configWallHeight } from '../core/configuration'
import { Item } from './item'
import type { Model } from '../model/model'
import type { Metadata } from './metadata'

/**
 * A Ceiling Item is suspended from the ceiling plane. Y is locked to
 * (ceilingHeight - halfSize.y); X / Z move freely within any room
 * polygon. This is the minimum viable implementation for Phase 2 of
 * BRIEF.md (cable tray, ladder tray, ceiling-mounted gear).
 */
export abstract class CeilingItem extends Item {
  constructor(
    model: Model,
    metadata: Metadata,
    geometry: THREE.BufferGeometry,
    material: THREE.Material | THREE.Material[],
    position?: THREE.Vector3,
    rotation?: number,
    scale?: THREE.Vector3
  ) {
    super(model, metadata, geometry, material, position, rotation, scale)
    this.allowRotate = true
  }

  private ceilingY(): number {
    return Configuration.getNumericValue(configWallHeight)
  }

  public placeInRoom(): void {
    if (!this.position_set) {
      const center = this.model.floorplan.getCenter()
      this.position.x = center.x
      this.position.z = center.z
    }
    this.position.y = this.ceilingY() - this.halfSize.y
  }

  public resized(): void {
    this.position.y = this.ceilingY() - this.halfSize.y
  }

  public moveToPosition(vec3: THREE.Vector3, _intersection: THREE.Intersection | null): void {
    const target = new THREE.Vector3(vec3.x, this.ceilingY() - this.halfSize.y, vec3.z)
    if (!this.isValidPosition(target)) {
      this.showError(target)
      return
    }
    this.hideError()
    this.position.copy(target)
  }

  public isValidPosition(vec3: THREE.Vector3): boolean {
    const corners = this.getCorners('x', 'z', vec3)
    const rooms = this.model.floorplan.getRooms()
    for (const room of rooms) {
      if (
        Utils.pointInPolygon(vec3.x, vec3.z, room.interiorCorners) &&
        !Utils.polygonPolygonIntersect(corners, room.interiorCorners)
      ) {
        return true
      }
    }
    return false
  }
}

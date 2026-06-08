import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// GLTF files use meters; blueprint3d's internal scene uses centimeters.
const METER_TO_CM = 100

export interface LoadedShelter {
  root: THREE.Group
  bbox: THREE.Box3
  dispose: () => void
}

export async function loadShelterGLB(url: string): Promise<LoadedShelter> {
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(url)
  const root = gltf.scene
  root.name = 'shelter-glb'
  root.scale.setScalar(METER_TO_CM)

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      if (mat && 'envMapIntensity' in mat) {
        ;(mat as THREE.MeshStandardMaterial).envMapIntensity = 1.0
      }
    }
  })

  const bbox = new THREE.Box3().setFromObject(root)

  return {
    root,
    bbox,
    dispose: () => {
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.geometry?.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m) => m?.dispose())
      })
    }
  }
}

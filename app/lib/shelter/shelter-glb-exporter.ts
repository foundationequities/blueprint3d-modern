import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

/**
 * Exports a scene (shelter + all placed items) as a single binary .glb
 * and triggers a browser download.
 */
export async function exportSceneAsGLB(
  scene: THREE.Object3D,
  filename: string
): Promise<void> {
  const exporter = new GLTFExporter()
  const result = await new Promise<ArrayBuffer | object>((resolve, reject) => {
    exporter.parse(
      scene,
      (out) => resolve(out as ArrayBuffer | object),
      (err) => reject(err),
      { binary: true, embedImages: true }
    )
  })

  let blob: Blob
  if (result instanceof ArrayBuffer) {
    blob = new Blob([result], { type: 'model/gltf-binary' })
  } else {
    blob = new Blob([JSON.stringify(result)], { type: 'model/gltf+json' })
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.glb') || filename.endsWith('.gltf')
    ? filename
    : `${filename}.glb`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ProductPreviewProps {
  modelPath: string
  /** Pixel height of the canvas. Width fills the container. */
  height?: number
}

/**
 * Small, self-contained 3D preview of a GLB. Loads the file, frames it
 * to fit, and slowly auto-rotates. Cleans up its renderer / scene on
 * unmount or model change.
 */
export function ProductPreview({ modelPath, height = 220 }: ProductPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const t = useTranslations('BluePrint.products.preview')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setStatus('loading')

    const width = container.clientWidth || 280
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(width, height, false)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 5000)

    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(4, 8, 6)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.6)
    fill.position.set(-5, 3, -4)
    scene.add(fill)

    let model: THREE.Group | null = null
    let frameId = 0
    let cancelled = false

    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || width
      renderer.setSize(w, height, false)
      camera.aspect = w / height
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    const loader = new GLTFLoader()
    loader.load(
      modelPath,
      (gltf) => {
        if (cancelled) return
        model = gltf.scene
        const bbox = new THREE.Box3().setFromObject(model)
        const size = bbox.getSize(new THREE.Vector3())
        const center = bbox.getCenter(new THREE.Vector3())
        model.position.sub(center)
        const maxDim = Math.max(size.x, size.y, size.z) || 1
        const fov = (camera.fov / 2) * (Math.PI / 180)
        const dist = (maxDim * 1.6) / Math.tan(fov)
        camera.position.set(dist * 0.85, dist * 0.5, dist * 0.95)
        camera.lookAt(0, 0, 0)
        scene.add(model)
        setStatus('ready')
      },
      undefined,
      (err) => {
        if (cancelled) return
        console.error('[ProductPreview] failed to load', modelPath, err)
        setStatus('error')
      }
    )

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      if (model) model.rotation.y += 0.006
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if ((mesh as THREE.Mesh).geometry) mesh.geometry?.dispose()
        const m = (mesh as THREE.Mesh).material
        if (m) {
          if (Array.isArray(m)) m.forEach((mm) => mm.dispose())
          else m.dispose()
        }
      })
      renderer.dispose()
    }
  }, [modelPath, height])

  return (
    <div className="relative rounded-md border border-border/60 bg-muted/30 overflow-hidden">
      <div ref={containerRef} className="w-full" style={{ height }} />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-background/60 backdrop-blur-sm gap-2">
          {status === 'loading' ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span className="text-xs">{t('loading')}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="size-4" />
              <span className="text-xs">{t('error')}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { TopNavBar } from './TopNavBar'
import { ConfiguratorSidebar } from './ConfiguratorSidebar'
import { ShelterEmptyState } from './ShelterEmptyState'
import { ZoomControls } from './ZoomControls'
import { ProjectsView } from './ProjectsView'
import { SettingsDialog } from './SettingsDialog'
import { ContextMenu } from './ContextMenu'
import { BedSizeInput } from './BedSizeInput'
import { TextureSelector } from './TextureSelector'
import { SaveFloorplanDialog } from './SaveFloorplanDialog'
import { TouchHelp } from './TouchHelp'
import { ControlsHelp } from './ControlsHelp'
import { blueprintStorage } from '@/services/storage'
import {
  INCH_TO_CM,
  loadShelterById,
  shelterToFloorplan,
  type ShelterTemplate
} from '@/lib/shelter/shelter-template'
import {
  getDoorCandidateWallIds,
  installShelterDoor,
  type ShelterDoorHandle
} from '@/lib/shelter/shelter-door'
import { findCatalogOption } from '@/lib/shelter/shelter-catalog'
import { useShelterStore } from '@/stores/use-shelter-store'

import { Blueprint3d } from '@blueprint3d/blueprint3d'
import {
  Configuration,
  configDimUnit,
  configWallHeight
} from '@blueprint3d/core/configuration'
import type { Item } from '@blueprint3d/items/item'
import type { HalfEdge } from '@blueprint3d/model/half_edge'
import type { Room } from '@blueprint3d/model/room'
import { Blueprint3DModes, type Blueprint3DMode } from '@blueprint3d/config/modes'
import { RoomType } from '@blueprint3d/types/room_types'

export interface Blueprint3DAppConfig {
  enableWheelZoom?: boolean | (() => boolean)
  mode?: Blueprint3DMode
  onBlueprint3DReady?: (blueprint3d: Blueprint3d) => void
  onBedSizeChange?: (width: number, length: number) => void
  isLanguageOption?: boolean
  openMyFloorplans?: boolean
  isFullscreen?: boolean
  onFullscreenToggle?: () => void
  onViewModeChange?: (mode: '2d' | '3d') => void
  renderOverlay?: () => React.ReactNode
  alwaysSpin?: boolean
}

interface Blueprint3DAppBaseProps {
  config?: Blueprint3DAppConfig
}

export function Blueprint3DAppBase({ config = {} }: Blueprint3DAppBaseProps) {
  const {
    enableWheelZoom = true,
    mode = Blueprint3DModes.BEDROOM,
    onBlueprint3DReady,
    onBedSizeChange,
    isLanguageOption = false,
    openMyFloorplans = false,
    isFullscreen = false,
    onViewModeChange,
    renderOverlay,
    alwaysSpin = false
  } = config

  const t = useTranslations('BluePrint.saveDialog')
  const tItems = useTranslations('BluePrint.items')
  const tShelter = useTranslations('BluePrint.shelter')
  const tMyFloorplans = useTranslations('BluePrint.myFloorplans')

  const contentRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const floorplannerCanvasRef = useRef<HTMLCanvasElement>(null)
  const blueprint3dRef = useRef<Blueprint3d | null>(null)
  const loadingToastsRef = useRef<Array<{ toastId: string | number; itemName: string }>>([])
  const doorHandleRef = useRef<ShelterDoorHandle | null>(null)

  const [activeTab, setActiveTab] = useState<'projects' | 'edit' | 'items'>(
    openMyFloorplans ? 'projects' : 'edit'
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [textureType, setTextureType] = useState<'floor' | 'wall' | null>(null)
  const [currentTarget, setCurrentTarget] = useState<HalfEdge | Room | null>(null)
  const [itemsLoading, setItemsLoading] = useState(0)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  const pendingSelectionId = useShelterStore((s) => s.pendingSelectionId)
  const builtSelectionId = useShelterStore((s) => s.builtSelectionId)
  const template = useShelterStore((s) => s.template)
  const activeDoorIndex = useShelterStore((s) => s.activeDoorIndex)
  const setPendingSelection = useShelterStore((s) => s.setPending)
  const setBuiltInStore = useShelterStore((s) => s.setBuilt)
  const setActiveDoorIndex = useShelterStore((s) => s.setActiveDoorIndex)
  const [isBuilding, setIsBuilding] = useState(false)

  const doorCandidates = useMemo(
    () => (template ? getDoorCandidateWallIds(template) : []),
    [template]
  )

  const [currentBlueprint, setCurrentBlueprint] = useState<{
    id: string
    name: string
    roomType: RoomType
  } | null>(null)

  const [currentMode, setCurrentMode] = useState<Blueprint3DMode>(mode)

  const getWheelZoomEnabled = useCallback(() => {
    if (typeof enableWheelZoom === 'function') {
      return enableWheelZoom()
    }
    return enableWheelZoom
  }, [enableWheelZoom])

  const disposeDoor = useCallback(() => {
    if (doorHandleRef.current) {
      doorHandleRef.current.dispose()
      doorHandleRef.current = null
    }
  }, [])

  const installDoorForIndex = useCallback(
    (tmpl: ShelterTemplate, index: number) => {
      const blueprint3d = blueprint3dRef.current
      if (!blueprint3d) return
      const candidates = getDoorCandidateWallIds(tmpl)
      if (candidates.length === 0) return
      const wallId = candidates[index % candidates.length]
      disposeDoor()
      const handle = installShelterDoor(
        tmpl,
        wallId,
        blueprint3d.model.scene.getScene(),
        blueprint3d.model.floorplan
      )
      if (handle) {
        doorHandleRef.current = handle
      }
      blueprint3d.model.scene.needsUpdate = true
    },
    [disposeDoor]
  )

  const buildShelterFromOption = useCallback(
    async (optionId: string): Promise<ShelterTemplate> => {
      const blueprint3d = blueprint3dRef.current
      if (!blueprint3d) throw new Error('Blueprint3d not initialized')
      const option = findCatalogOption(optionId)
      if (!option) throw new Error(`Unknown shelter option: ${optionId}`)

      const tmpl = await loadShelterById(option.templateId)
      Configuration.setValue(
        configWallHeight,
        tmpl.dimensions.ceilingHeightIn * INCH_TO_CM
      )

      disposeDoor()
      const payload = shelterToFloorplan(tmpl)
      blueprint3d.model.loadSerialized(JSON.stringify(payload))

      // Place the door on the first candidate (longest wall).
      installDoorForIndex(tmpl, 0)

      blueprint3d.model.scene.needsUpdate = true
      setBuiltInStore(option.id, tmpl)
      return tmpl
    },
    [setBuiltInStore, disposeDoor, installDoorForIndex]
  )

  const handleSwitchDoor = useCallback(() => {
    if (!template || doorCandidates.length < 2) return
    const next = (activeDoorIndex + 1) % doorCandidates.length
    installDoorForIndex(template, next)
    setActiveDoorIndex(next)
  }, [template, doorCandidates, activeDoorIndex, installDoorForIndex, setActiveDoorIndex])

  const handleShelterSelect = useCallback(
    (optionId: string) => {
      setPendingSelection(optionId)
    },
    [setPendingSelection]
  )

  const handleBuildShelter = useCallback(() => {
    if (!pendingSelectionId || isBuilding) return
    if (pendingSelectionId === builtSelectionId) return
    setIsBuilding(true)
    const toastId = toast.loading(tShelter('loadingToast'))
    buildShelterFromOption(pendingSelectionId)
      .then((template) => {
        toast.success(tShelter('loadedToast', { name: template.name }), {
          id: toastId
        })
      })
      .catch((err) => {
        console.error('[Blueprint3DAppBase] Error building shelter:', err)
        toast.error(tShelter('loadError'), { id: toastId })
      })
      .finally(() => {
        setIsBuilding(false)
      })
  }, [pendingSelectionId, builtSelectionId, isBuilding, buildShelterFromOption, tShelter])

  // Initialize Blueprint3d
  useEffect(() => {
    if (!viewerRef.current || blueprint3dRef.current) return

    const savedUnit = localStorage.getItem('dimensionUnit')
    if (savedUnit) {
      Configuration.setValue(configDimUnit, savedUnit)
    }

    const opts = {
      floorplannerElement: 'floorplanner-canvas',
      threeElement: '#viewer',
      textureDir: '/models/textures/',
      widget: false,
      enableWheelZoom: getWheelZoomEnabled(),
      alwaysSpin
    }

    const blueprint3d = new Blueprint3d(opts)
    blueprint3dRef.current = blueprint3d

    if (onBlueprint3DReady) {
      onBlueprint3DReady(blueprint3d)
    }

    blueprint3d.three.itemSelectedCallbacks.add((item) => {
      setSelectedItem(item)
      setTextureType(null)
    })

    blueprint3d.three.itemUnselectedCallbacks.add(() => {
      setSelectedItem(null)
    })

    blueprint3d.three.wallClicked.add((halfEdge) => {
      setCurrentTarget(halfEdge)
      setTextureType('wall')
      setSelectedItem(null)
    })

    blueprint3d.three.floorClicked.add((room) => {
      setCurrentTarget(room)
      setTextureType('floor')
      setSelectedItem(null)
    })

    blueprint3d.three.nothingClicked.add(() => {
      setTextureType(null)
      setCurrentTarget(null)
    })

    blueprint3d.model.scene.itemLoadingCallbacks.add(() => {
      setItemsLoading((prev) => prev + 1)
    })

    blueprint3d.model.scene.itemLoadedCallbacks.add((item) => {
      setItemsLoading((prev) => prev - 1)
      const loadingToasts = loadingToastsRef.current
      if (loadingToasts.length > 0) {
        const { toastId, itemName } = loadingToasts.shift()!
        toast.success(tItems('loadedSuccess', { name: itemName }), { id: toastId })
      }
    })

    blueprint3d.model.scene.itemLoadErrorCallbacks.add(() => {
      setItemsLoading((prev) => prev - 1)
      const loadingToasts = loadingToastsRef.current
      if (loadingToasts.length > 0) {
        const { toastId, itemName } = loadingToasts.shift()!
        toast.error(tItems('loadError', { name: itemName }), { id: toastId })
      }
    })

    // No auto-load: the scene starts empty. User picks a shelter in the
    // sidebar dropdown and clicks BUILD to populate it.

    return () => {
      // Cleanup if needed
    }
  }, [getWheelZoomEnabled, tItems, mode, onBlueprint3DReady, alwaysSpin])

  // Update wheel zoom setting when it changes
  useEffect(() => {
    if (blueprint3dRef.current) {
      blueprint3dRef.current.three.controls.enableWheelZoom = getWheelZoomEnabled()
    }
  }, [getWheelZoomEnabled])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (blueprint3dRef.current && activeTab === 'edit') {
        if (viewMode === '3d') {
          blueprint3dRef.current.three.updateWindowSize()
        } else {
          blueprint3dRef.current.floorplanner?.resizeView()
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [activeTab, viewMode])

  // Handle resize with ResizeObserver for accurate sizing
  useEffect(() => {
    if (!contentRef.current || !blueprint3dRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      if (!blueprint3dRef.current || activeTab !== 'edit') return
      if (viewMode === '3d') {
        blueprint3dRef.current.three.updateWindowSize()
      } else {
        blueprint3dRef.current.floorplanner?.resizeView()
      }
    })

    resizeObserver.observe(contentRef.current)
    return () => resizeObserver.disconnect()
  }, [activeTab, viewMode])

  const handleZoomIn = useCallback(() => {
    const three = blueprint3dRef.current?.three
    if (!three) return
    // dollyOut multiplies scale by <1, shrinking the orbit radius → camera moves closer (zoom in).
    three.controls.dollyOut(0.85)
    three.controls.update()
    three.needsUpdate()
  }, [])

  const handleZoomOut = useCallback(() => {
    const three = blueprint3dRef.current?.three
    if (!three) return
    three.controls.dollyIn(0.85)
    three.controls.update()
    three.needsUpdate()
  }, [])

  const handleZoomReset = useCallback(() => {
    const three = blueprint3dRef.current?.three
    if (!three) return
    three.centerCamera()
    three.needsUpdate()
  }, [])

  const handleViewChange = useCallback(
    (mode: '2d' | '3d') => {
      if (!blueprint3dRef.current) return
      blueprint3dRef.current.three.setViewMode(mode)
      setViewMode(mode)
      onViewModeChange?.(mode)

      if (mode === '2d') {
        setTimeout(() => {
          if (blueprint3dRef.current) {
            blueprint3dRef.current.floorplanner?.reset()
            blueprint3dRef.current.floorplanner?.resetOrigin()
          }
        }, 50)
      } else {
        setTimeout(() => {
          if (blueprint3dRef.current) {
            blueprint3dRef.current.model.floorplan.update()
            blueprint3dRef.current.three.updateWindowSize()
          }
        }, 50)
      }
    },
    [onViewModeChange]
  )

  const handleDeleteItem = useCallback(() => {
    if (selectedItem) {
      selectedItem.removeFromScene()
      setSelectedItem(null)
    }
  }, [selectedItem])

  const handleResizeItem = useCallback(
    (height: number, width: number, depth: number) => {
      if (selectedItem) selectedItem.resize(height, width, depth)
    },
    [selectedItem]
  )

  const handleFixedChange = useCallback(
    (fixed: boolean) => {
      if (selectedItem) selectedItem.setFixed(fixed)
    },
    [selectedItem]
  )

  // Generate top-down thumbnail
  const generateTopDownThumbnail = useCallback((): string => {
    if (!blueprint3dRef.current) return ''

    const three = blueprint3dRef.current.three
    const camera = three.camera
    const controls = three.controls
    const renderer = three.renderer

    const savedPosition = camera.position.clone()
    const savedTarget = controls.target.clone()
    const savedRotation = camera.rotation.clone()
    const savedAspect = camera.aspect

    const currentCanvas = renderer.domElement
    const savedWidth = currentCanvas.width
    const savedHeight = currentCanvas.height

    const targetWidth = 1800
    const targetHeight = 1200

    try {
      renderer.setSize(targetWidth, targetHeight, false)
      camera.aspect = targetWidth / targetHeight
      camera.updateProjectionMatrix()

      const center = blueprint3dRef.current.model.floorplan.getCenter()
      const size = blueprint3dRef.current.model.floorplan.getSize()

      const targetAspect = 3 / 2
      const roomAspect = size.x / size.z
      const margin = 1.4

      let viewWidth: number, viewHeight: number
      if (roomAspect > targetAspect) {
        viewWidth = size.x * margin
        viewHeight = viewWidth / targetAspect
      } else {
        viewHeight = size.z * margin
        viewWidth = viewHeight * targetAspect
      }

      const fov = camera.fov * (Math.PI / 180)
      const distance = Math.max(viewWidth, viewHeight) / (2 * Math.tan(fov / 2))

      controls.target.set(center.x, 0, center.z)
      camera.position.set(center.x, distance, center.z)
      camera.lookAt(controls.target)
      camera.updateProjectionMatrix()
      controls.update()

      renderer.clear()
      renderer.render(three.scene.getScene(), camera)

      return currentCanvas.toDataURL('image/webp', 0.85)
    } finally {
      renderer.setSize(savedWidth, savedHeight, false)
      camera.aspect = savedAspect
      camera.position.copy(savedPosition)
      controls.target.copy(savedTarget)
      camera.rotation.copy(savedRotation)
      camera.updateProjectionMatrix()
      controls.update()

      renderer.clear()
      renderer.render(three.scene.getScene(), camera)
    }
  }, [])

  // Save: update existing or show dialog
  const handleSave = useCallback(async () => {
    if (currentBlueprint) {
      if (!blueprint3dRef.current) return
      const toastId = toast.loading(t('saving') || 'Saving floorplan...')
      try {
        const data = blueprint3dRef.current.model.exportSerialized()
        const thumbnail = generateTopDownThumbnail()
        const layoutData = JSON.parse(data)
        await blueprintStorage.update(currentBlueprint.id, {
          name: currentBlueprint.name,
          layoutData,
          thumbnailBase64: thumbnail,
          roomType: currentBlueprint.roomType
        })
        toast.success(t('saveSuccess'), { id: toastId })
      } catch (error) {
        console.error('Failed to update floorplan:', error)
        toast.error(t('saveError'), { id: toastId })
      }
    } else {
      setSaveDialogOpen(true)
    }
  }, [currentBlueprint, generateTopDownThumbnail, t])

  const handleNew = useCallback(() => {
    setSaveDialogOpen(true)
  }, [])

  // Create new blueprint via dialog
  const handleSaveFloorplan = useCallback(
    async (name: string, roomType: RoomType) => {
      if (!blueprint3dRef.current) return
      const toastId = toast.loading(t('saving') || 'Saving floorplan...')
      try {
        const data = blueprint3dRef.current.model.exportSerialized()
        const thumbnail = generateTopDownThumbnail()
        const layoutData = JSON.parse(data)
        const result = await blueprintStorage.create({
          name,
          layoutData,
          thumbnailBase64: thumbnail,
          roomType
        })
        setCurrentBlueprint({ id: result.id, name, roomType })
        toast.success(t('saveSuccess'), { id: toastId })
      } catch (error) {
        console.error('Failed to save floorplan:', error)
        toast.error(t('saveError'), { id: toastId })
      }
    },
    [generateTopDownThumbnail, t]
  )

  // Load from saved floorplan
  const handleLoadFloorplan = useCallback(
    (data: string, loadedMode?: RoomType, blueprintId?: string, blueprintName?: string) => {
      if (!blueprint3dRef.current) return
      blueprint3dRef.current.model.loadSerialized(data)
      if (loadedMode) setCurrentMode(loadedMode as Blueprint3DMode)
      if (blueprintId && blueprintName) {
        setCurrentBlueprint({
          id: blueprintId,
          name: blueprintName,
          roomType: loadedMode || RoomType.BEDROOM
        })
      }
      setActiveTab('edit')
    },
    []
  )

  const handleUnitChange = useCallback(
    (unit: string) => {
      Configuration.setValue(configDimUnit, unit)
      if (blueprint3dRef.current && activeTab === 'edit' && viewMode === '2d') {
        blueprint3dRef.current.floorplanner?.reset()
      }
    },
    [activeTab, viewMode]
  )

  const handleTabChange = useCallback(
    (tab: 'projects' | 'edit' | 'items') => {
      setActiveTab(tab)
      setTextureType(null)

      if (blueprint3dRef.current && tab === 'edit') {
        blueprint3dRef.current.three.stopSpin()
        blueprint3dRef.current.three.getController().setSelectedObject(null)

        if (viewMode === '2d') {
          const canvas = floorplannerCanvasRef.current
          if (canvas) {
            const resizeObserver = new ResizeObserver(() => {
              if (blueprint3dRef.current && canvas.clientWidth > 0) {
                blueprint3dRef.current.floorplanner?.reset()
                blueprint3dRef.current.floorplanner?.resetOrigin()
                resizeObserver.disconnect()
              }
            })
            resizeObserver.observe(canvas)
          }
        } else {
          blueprint3dRef.current.model.floorplan.update()
          setTimeout(() => {
            if (blueprint3dRef.current) {
              blueprint3dRef.current.three.updateWindowSize()
            }
          }, 100)
        }
      }
    },
    [viewMode]
  )

  const handleItemSelect = useCallback(
    (item: {
      name: string
      key: string
      model: string
      type: string
      description?: string
    }) => {
      if (!blueprint3dRef.current) return
      const translatedName = tItems(item.key)
      const toastId = toast.loading(tItems('loadingItem', { name: translatedName }))
      loadingToastsRef.current.push({ toastId, itemName: translatedName })

      const metadata = {
        itemName: item.name,
        itemKey: item.key,
        resizable: true,
        modelUrl: item.model,
        itemType: parseInt(item.type),
        description: item.description
      }

      blueprint3dRef.current.model.scene.addItem(parseInt(item.type), item.model, metadata)
      setActiveTab('edit')
      setViewMode('3d')
    },
    [tItems]
  )

  const handleTextureSelect = useCallback(
    (textureUrl: string, stretch: boolean, scale: number) => {
      if (currentTarget) {
        currentTarget.setTexture(textureUrl, stretch, scale)
      }
    },
    [currentTarget]
  )

  const sidebarVisible = !isFullscreen

  return (
    <div className="relative h-full w-full">
      {/* Top Navigation Bar — stops short of the sidebar */}
      {!isFullscreen && (
        <div
          className={`absolute top-0 left-0 z-50 ${sidebarVisible ? 'right-[340px]' : 'right-0'}`}
        >
          <TopNavBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            viewMode={viewMode}
            onViewModeChange={handleViewChange}
            onSettingsClick={() => setSettingsOpen(true)}
            onSave={handleSave}
            onNew={handleNew}
            currentBlueprintName={currentBlueprint?.name}
          />
        </div>
      )}

      {/* Main Content Area — pushed left of the sidebar */}
      <div
        ref={contentRef}
        className={`absolute top-0 left-0 bottom-0 overflow-hidden ${sidebarVisible ? 'right-[340px]' : 'right-0'}`}
      >
        <TouchHelp />

        {/* Projects View */}
        <div
          className="absolute inset-0"
          style={{ display: activeTab === 'projects' ? 'block' : 'none' }}
        >
          {activeTab === 'projects' && (
            <ProjectsView
              onBlueprintLoad={(layoutData, roomType, id, name) => {
                handleLoadFloorplan(layoutData, roomType, id, name)
                setActiveTab('edit')
                setViewMode('3d')
              }}
            />
          )}
        </div>

        {/* Edit View */}
        <div
          className="absolute inset-0"
          style={{ display: activeTab === 'edit' || activeTab === 'items' ? 'block' : 'none' }}
        >
          {/* 3D Viewer */}
          <div
            id="viewer"
            ref={viewerRef}
            className="absolute inset-0"
            style={{ display: viewMode === '3d' ? 'block' : 'none' }}
          >
            {viewMode === '3d' && (
              <>
                {!isFullscreen && <ControlsHelp viewMode="3d" />}
                {!isFullscreen && builtSelectionId && (
                  <ZoomControls
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onReset={handleZoomReset}
                  />
                )}
                {renderOverlay && renderOverlay()}

                {itemsLoading > 0 && (
                  <div id="loading-modal">
                    <div className="loading-content">
                      <p>
                        {tMyFloorplans('loading')}
                        <span className="loading-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 2D Floorplanner */}
          <div
            id="floorplanner"
            className="absolute inset-0"
            style={{ display: viewMode === '2d' ? 'block' : 'none' }}
          >
            <canvas id="floorplanner-canvas" ref={floorplannerCanvasRef}></canvas>
            {viewMode === '2d' && !isFullscreen && <ControlsHelp viewMode="2d" />}
          </div>

          {/* Empty-state overlay when no shelter has been built yet */}
          {!builtSelectionId && !isFullscreen && (
            <ShelterEmptyState />
          )}

          {/* Context Menu */}
          {selectedItem && !textureType && !isFullscreen && (
            <div className="absolute right-2 md:right-4 top-16 md:top-20 z-[70]">
              <ContextMenu
                selectedItem={selectedItem}
                onDelete={handleDeleteItem}
                onResize={handleResizeItem}
                onFixedChange={handleFixedChange}
              />
            </div>
          )}

          {/* Texture Selector */}
          {textureType && !isFullscreen && (
            <div className="absolute right-2 md:right-4 top-16 md:top-20 z-[70] max-h-[calc(100vh-100px)] md:max-h-[calc(100vh-120px)] overflow-y-auto">
              <TextureSelector type={textureType} onTextureSelect={handleTextureSelect} />
            </div>
          )}

          {/* Bed Size Input for generator mode */}
          {mode === 'generator' && !selectedItem && !textureType && onBedSizeChange && !isFullscreen && (
            <div className="absolute right-2 md:right-4 top-16 md:top-20 z-[70]">
              <BedSizeInput onSizeChange={onBedSizeChange} />
            </div>
          )}
        </div>
      </div>

      {/* Configurator Sidebar — always visible on the right */}
      {sidebarVisible && (
        <div className="absolute top-0 right-0 bottom-0 w-[340px] z-40 shadow-xl">
          <ConfiguratorSidebar
            pendingSelectionId={pendingSelectionId}
            builtSelectionId={builtSelectionId}
            onSelect={handleShelterSelect}
            onBuild={handleBuildShelter}
            isBuilding={isBuilding}
            onSwitchDoor={handleSwitchDoor}
            canSwitchDoor={doorCandidates.length >= 2}
            onItemSelect={handleItemSelect}
          />
        </div>
      )}

      {/* Current Blueprint Name indicator */}
      {currentBlueprint && !isFullscreen && activeTab !== 'projects' && (
        <div className="absolute bottom-3 left-3 z-40 pointer-events-none">
          <span className="text-xs text-muted-foreground/60 bg-background/30 backdrop-blur-sm px-2 py-1 rounded">
            {currentBlueprint.name}
          </span>
        </div>
      )}

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={settingsOpen}
        onOpenChange={setSettingsOpen}
        onUnitChange={handleUnitChange}
        isLanguageOption={isLanguageOption}
      />

      {/* Save Floorplan Dialog */}
      <SaveFloorplanDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveFloorplan}
        defaultName={`Floorplan ${new Date().toLocaleDateString()}`}
        defaultRoomType={
          Object.values(RoomType).includes(currentMode as RoomType)
            ? (currentMode as RoomType)
            : RoomType.BEDROOM
        }
      />
    </div>
  )
}

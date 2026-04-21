'use client'

import { Plus, Minus, Crosshair } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

interface ZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  disabled?: boolean
}

export function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  disabled
}: ZoomControlsProps) {
  const t = useTranslations('BluePrint.zoom')

  return (
    <div className="absolute bottom-5 right-5 z-[70] flex flex-col gap-1 bg-background/70 backdrop-blur-sm rounded-md border border-border/60 p-1 shadow-lg pointer-events-auto">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onZoomIn}
        disabled={disabled}
        aria-label={t('zoomIn')}
        title={t('zoomIn')}
        className="h-8 w-8"
      >
        <Plus className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onZoomOut}
        disabled={disabled}
        aria-label={t('zoomOut')}
        title={t('zoomOut')}
        className="h-8 w-8"
      >
        <Minus className="size-4" />
      </Button>
      <div className="h-px bg-border/60 mx-1" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onReset}
        disabled={disabled}
        aria-label={t('reset')}
        title={t('reset')}
        className="h-8 w-8"
      >
        <Crosshair className="size-4" />
      </Button>
    </div>
  )
}

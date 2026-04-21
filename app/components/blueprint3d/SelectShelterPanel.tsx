'use client'

import { CheckCircle2, Hammer } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { findCatalogOption } from '@/lib/shelter/shelter-catalog'
import { ShelterSizePicker } from './ShelterSizePicker'

interface SelectShelterPanelProps {
  pendingSelectionId: string | null
  builtSelectionId: string | null
  onSelect: (id: string) => void
  onBuild: () => void
  isBuilding: boolean
}

export function SelectShelterPanel({
  pendingSelectionId,
  builtSelectionId,
  onSelect,
  onBuild,
  isBuilding
}: SelectShelterPanelProps) {
  const t = useTranslations('BluePrint.shelter')

  const pending = pendingSelectionId ? findCatalogOption(pendingSelectionId) : null
  const built = builtSelectionId ? findCatalogOption(builtSelectionId) : null
  const hasPendingChange =
    !!pending && pending.id !== builtSelectionId

  const buildDisabled =
    !pending || isBuilding || (!!built && built.id === pending.id)

  return (
    <section className="border-b border-border p-5 space-y-4 bg-card">
      <div className="space-y-1">
        <h2 className="uppercase tracking-[0.12em] text-[11px] font-semibold text-muted-foreground">
          {t('selectHeader')}
        </h2>
        <p className="text-xs text-muted-foreground/80 leading-snug">
          {t('selectSubhead')}
        </p>
      </div>

      <ShelterSizePicker
        selectedId={pendingSelectionId}
        onSelect={onSelect}
      />

      <Button
        type="button"
        onClick={onBuild}
        disabled={buildDisabled}
        size="lg"
        className={cn(
          'w-full font-semibold tracking-wide',
          !buildDisabled && 'shadow-md'
        )}
      >
        <Hammer className="size-4 mr-2" />
        {isBuilding ? t('buildingButton') : t('buildButton')}
      </Button>

      {built && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" />
          <span>
            {t('builtStatus', {
              size: t(`sizes.${built.labelKey}`),
              category: t(`categories.${catalogCategoryLabelKey(built.id)}`)
            })}
            {hasPendingChange && (
              <span className="block text-amber-500 mt-1">
                {t('pendingChange')}
              </span>
            )}
          </span>
        </div>
      )}
    </section>
  )
}

function catalogCategoryLabelKey(optionId: string): string {
  return optionId.startsWith('datacomm-') ? 'datacommPro' : 'concrete'
}

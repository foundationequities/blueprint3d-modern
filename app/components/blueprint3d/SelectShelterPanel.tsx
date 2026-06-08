'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ShelterSizePicker } from './ShelterSizePicker'
import type { ShelterCatalogEntry } from '@/lib/shelter/shelter-glb-catalog'

interface SelectShelterPanelProps {
  pendingSelectionId: string | null
  builtEntry: ShelterCatalogEntry | null
  onSelectShelter: (entry: ShelterCatalogEntry) => void
  isLoading: boolean
}

export function SelectShelterPanel({
  pendingSelectionId,
  builtEntry,
  onSelectShelter,
  isLoading
}: SelectShelterPanelProps) {
  const t = useTranslations('BluePrint.shelter')

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
        onSelect={onSelectShelter}
        disabled={isLoading}
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 shrink-0 animate-spin" />
          <span>{t('loadingToast')}</span>
        </div>
      )}

      {!isLoading && builtEntry && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" />
          <span>
            {t('builtStatus', {
              size: builtEntry.sizeLabel,
              category: builtEntry.label
            })}
          </span>
        </div>
      )}
    </section>
  )
}

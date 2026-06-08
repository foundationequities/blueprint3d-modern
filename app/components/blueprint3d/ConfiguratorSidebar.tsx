'use client'

import { useTranslations } from 'next-intl'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ItemsList } from './ItemsList'
import { SelectShelterPanel } from './SelectShelterPanel'
import type { ShelterCatalogEntry } from '@/lib/shelter/shelter-glb-catalog'

interface ConfiguratorSidebarProps {
  pendingSelectionId: string | null
  builtSelectionId: string | null
  builtEntry: ShelterCatalogEntry | null
  onSelectShelter: (entry: ShelterCatalogEntry) => void
  isLoading: boolean
  onItemSelect: (item: {
    name: string
    key: string
    model: string
    type: string
    description?: string
  }) => void
}

export function ConfiguratorSidebar({
  pendingSelectionId,
  builtSelectionId,
  builtEntry,
  onSelectShelter,
  isLoading,
  onItemSelect
}: ConfiguratorSidebarProps) {
  const t = useTranslations('BluePrint.shelter')
  const tSidebar = useTranslations('BluePrint.sidebar')

  const itemsEnabled = !!builtSelectionId

  return (
    <aside className="flex flex-col h-full w-full bg-card border-l border-border">
      <SelectShelterPanel
        pendingSelectionId={pendingSelectionId}
        builtEntry={builtEntry}
        onSelectShelter={onSelectShelter}
        isLoading={isLoading}
      />

      <section className="flex-1 min-h-0 flex flex-col">
        <header className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h2 className="uppercase tracking-[0.12em] text-[11px] font-semibold text-muted-foreground">
            {tSidebar('addItems')}
          </h2>
          {!itemsEnabled && (
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground/80">
              <Lock className="size-3" />
              {t('itemsLocked')}
            </span>
          )}
        </header>

        <div
          className={cn(
            'flex-1 min-h-0 overflow-y-auto px-5 pb-5 relative',
            !itemsEnabled && 'pointer-events-none opacity-40 select-none'
          )}
          aria-disabled={!itemsEnabled}
        >
          <ItemsList onItemSelect={onItemSelect} />
        </div>
      </section>
    </aside>
  )
}

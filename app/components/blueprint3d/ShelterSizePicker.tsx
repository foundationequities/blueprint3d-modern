'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  loadShelterCatalog,
  groupShelterCatalogByType,
  type ShelterCatalogEntry
} from '@/lib/shelter/shelter-glb-catalog'

type ShelterType = 'concrete' | 'datacomm'

// Display order + labels for the product-line toggle. Falls back to the
// catalog's own `label` for the size dropdown so copy stays data-driven.
const TYPE_ORDER: ShelterType[] = ['concrete', 'datacomm']
const TYPE_LABEL: Record<ShelterType, string> = {
  concrete: 'Concrete',
  datacomm: 'Datacomm Pro'
}

interface ShelterSizePickerProps {
  /** Currently selected catalog id (highlights the matching size). */
  selectedId: string | null
  /** Fired when the user picks a size — receives the full catalog entry. */
  onSelect: (entry: ShelterCatalogEntry) => void
  disabled?: boolean
  className?: string
}

export function ShelterSizePicker({
  selectedId,
  onSelect,
  disabled,
  className
}: ShelterSizePickerProps) {
  const [entries, setEntries] = useState<ShelterCatalogEntry[]>([])
  const [error, setError] = useState(false)
  const [activeType, setActiveType] = useState<ShelterType>('concrete')

  useEffect(() => {
    let cancelled = false
    loadShelterCatalog()
      .then((catalog) => {
        if (!cancelled) setEntries(catalog.shelters)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const grouped = useMemo(
    () => groupShelterCatalogByType({ shelters: entries }),
    [entries]
  )

  const availableTypes = useMemo(
    () => TYPE_ORDER.filter((type) => (grouped.get(type)?.length ?? 0) > 0),
    [grouped]
  )

  // Keep the active product line in sync with the loaded selection, and
  // default to the first available type once the catalog arrives.
  useEffect(() => {
    const selected = entries.find((e) => e.id === selectedId)
    if (selected) {
      setActiveType(selected.type)
    } else if (availableTypes.length > 0 && !availableTypes.includes(activeType)) {
      setActiveType(availableTypes[0])
    }
  }, [selectedId, entries, availableTypes, activeType])

  const sizes = grouped.get(activeType) ?? []
  const selectedInActiveType =
    sizes.some((s) => s.id === selectedId) ? (selectedId ?? undefined) : undefined

  const handleSizeChange = (id: string) => {
    const entry = entries.find((e) => e.id === id)
    if (entry) onSelect(entry)
  }

  if (error) {
    return (
      <p className="text-xs text-destructive">
        Could not load the shelter catalog.
      </p>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Step 1: product line */}
      <div className="grid grid-cols-2 gap-1.5">
        {TYPE_ORDER.map((type) => {
          const enabled = availableTypes.includes(type)
          const active = activeType === type
          return (
            <button
              key={type}
              type="button"
              disabled={disabled || !enabled}
              onClick={() => setActiveType(type)}
              className={cn(
                'rounded-md border px-3 py-2 text-xs font-medium tracking-wide transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                (disabled || !enabled) && 'opacity-40 pointer-events-none'
              )}
            >
              {TYPE_LABEL[type]}
            </button>
          )
        })}
      </div>

      {/* Step 2: size */}
      <Select
        value={selectedInActiveType}
        onValueChange={handleSizeChange}
        disabled={disabled || sizes.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a size" />
        </SelectTrigger>
        <SelectContent>
          {sizes.map((entry) => (
            <SelectItem key={entry.id} value={entry.id}>
              {entry.sizeLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

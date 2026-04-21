'use client'

import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface ShelterOption {
  id: string
  labelKey: string
}

interface ShelterSizePickerProps {
  options: ShelterOption[]
  selectedId: string | null
  onSelect: (id: string) => void
  disabled?: boolean
  className?: string
}

export function ShelterSizePicker({
  options,
  selectedId,
  onSelect,
  disabled,
  className
}: ShelterSizePickerProps) {
  const t = useTranslations('BluePrint.shelter')

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm font-medium text-muted-foreground">
        {t('sizeLabel')}
      </span>
      <Select
        value={selectedId ?? undefined}
        onValueChange={onSelect}
        disabled={disabled}
      >
        <SelectTrigger className="min-w-[220px]">
          <SelectValue placeholder={t('sizePlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {t(opt.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

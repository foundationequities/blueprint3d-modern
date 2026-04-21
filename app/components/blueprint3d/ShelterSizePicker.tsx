'use client'

import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { SHELTER_CATALOG } from '@/lib/shelter/shelter-catalog'

interface ShelterSizePickerProps {
  selectedId: string | null
  onSelect: (id: string) => void
  disabled?: boolean
  className?: string
}

export function ShelterSizePicker({
  selectedId,
  onSelect,
  disabled,
  className
}: ShelterSizePickerProps) {
  const t = useTranslations('BluePrint.shelter')

  return (
    <Select
      value={selectedId ?? undefined}
      onValueChange={onSelect}
      disabled={disabled}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={t('sizePlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        {SHELTER_CATALOG.map((category) => (
          <SelectGroup key={category.labelKey}>
            <SelectLabel className="uppercase tracking-wide text-[10px] font-semibold">
              {t(`categories.${category.labelKey}`)}
            </SelectLabel>
            {category.options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {t(`sizes.${opt.labelKey}`)}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

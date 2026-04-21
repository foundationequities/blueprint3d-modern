'use client'

import { Boxes } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function ShelterEmptyState() {
  const t = useTranslations('BluePrint.shelter')

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="max-w-sm text-center space-y-3 bg-background/70 backdrop-blur-sm rounded-lg px-6 py-5 border border-border/50">
        <Boxes className="size-10 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-semibold">{t('emptyTitle')}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('emptyBody')}
        </p>
      </div>
    </div>
  )
}

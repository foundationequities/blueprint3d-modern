'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ImageOff, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ProductPreview } from './ProductPreview'

export interface ProductItem {
  key: string
  name: string
  modelPath: string
  thumbnailPath: string | null
  type: string
  mountType?: 'floor' | 'wall' | 'ceiling'
  defaultHeightAFF?: number | null
}

type ProductManifest = Record<string, ProductItem[]>

const CATEGORIES = [
  'HVAC',
  'Electrical',
  'ServerRacks',
  'CableRacks',
  'Battery',
  'MoreOptions'
] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_LABEL_KEYS: Record<Category, string> = {
  HVAC: 'hvac',
  Electrical: 'electrical',
  ServerRacks: 'serverRacks',
  CableRacks: 'cableRacks',
  Battery: 'battery',
  MoreOptions: 'moreOptions'
}

interface ItemsListProps {
  onItemSelect: (item: { name: string; key: string; model: string; type: string }) => void
}

export function ItemsList({ onItemSelect }: ItemsListProps) {
  const t = useTranslations('BluePrint.products')

  const [manifest, setManifest] = useState<ProductManifest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'all' | Category>('all')
  const [previewItem, setPreviewItem] = useState<ProductItem | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/models/index.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<ProductManifest>
      })
      .then((data) => {
        if (!cancelled) setManifest(data)
      })
      .catch((err) => {
        console.error('[ItemsList] Failed to load manifest', err)
        if (!cancelled) {
          setLoadError(String(err))
          setManifest({})
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const items = useMemo(() => {
    if (!manifest) return []
    if (selectedCategory === 'all') {
      return CATEGORIES.flatMap((c) => manifest[c] ?? [])
    }
    return manifest[selectedCategory] ?? []
  }, [manifest, selectedCategory])

  const isLoading = manifest === null

  // Preview-mode view
  if (previewItem) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPreviewItem(null)}
          className="-ml-2"
        >
          <ArrowLeft className="size-4 mr-1.5" />
          {t('preview.back')}
        </Button>

        <ProductPreview modelPath={previewItem.modelPath} />

        <div className="space-y-1">
          <h3 className="text-sm font-semibold leading-tight">{previewItem.name}</h3>
          {previewItem.mountType && (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t(`preview.mount.${previewItem.mountType}`)}
            </p>
          )}
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full font-semibold"
          onClick={() => {
            onItemSelect({
              name: previewItem.name,
              key: previewItem.key,
              model: previewItem.modelPath,
              type: previewItem.type
            })
            setPreviewItem(null)
          }}
        >
          <Plus className="size-4 mr-2" />
          {t('preview.addToScene')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
          className="whitespace-nowrap"
        >
          {t('categories.all')}
        </Button>
        {CATEGORIES.map((cat) => {
          const count = manifest ? manifest[cat]?.length ?? 0 : 0
          return (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="whitespace-nowrap"
            >
              {t(`categories.${CATEGORY_LABEL_KEYS[cat]}`)}
              {manifest && (
                <span className="ml-1.5 text-[10px] opacity-60 tabular-nums">{count}</span>
              )}
            </Button>
          )
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">{t('list.loading')}</span>
        </div>
      )}

      {/* Items grid */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => setPreviewItem(item)}
              className={cn(
                'border border-border rounded-md hover:border-primary active:border-primary transition-colors',
                'p-2 flex flex-col items-center gap-2 cursor-pointer bg-card group min-h-[140px]'
              )}
            >
              <div className="relative w-full aspect-square bg-muted/40 rounded">
                {item.thumbnailPath ? (
                  <Image
                    src={item.thumbnailPath}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 33vw, 12vw"
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-1">
                    <ImageOff className="size-5" />
                    <span className="text-[10px] uppercase tracking-wide">
                      {t('list.noPreview')}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs text-center font-medium leading-tight line-clamp-2">
                {item.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty / error states */}
      {!isLoading && items.length === 0 && !loadError && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">{t('list.noItemsFound')}</p>
          <p className="text-xs mt-2 leading-relaxed">
            {selectedCategory === 'all'
              ? t('list.dropGlbsHint')
              : t('list.emptyCategoryHint', {
                  category: t(`categories.${CATEGORY_LABEL_KEYS[selectedCategory as Category]}`)
                })}
          </p>
        </div>
      )}

      {!isLoading && loadError && items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-xs">
          {t('list.manifestError')}
        </div>
      )}
    </div>
  )
}

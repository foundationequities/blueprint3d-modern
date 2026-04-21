/**
 * Shelter product catalog — grouped by brand/series for the top-right
 * selector in the configurator UI. Categories are cosmetic groupings;
 * shelters with the same dimensions across categories currently resolve
 * to the same underlying template (behavioural differences like wall
 * thickness or door style can be added per option later).
 */

export interface ShelterCatalogOption {
  /** Unique value used as the dropdown key. */
  id: string
  /** Shelter template JSON id under /public/templates/shelters. */
  templateId: string
  /** Translation key under BluePrint.shelter.sizes for the display label. */
  labelKey: string
  widthFt: number
  depthFt: number
}

export interface ShelterCatalogCategory {
  /** Translation key under BluePrint.shelter.categories. */
  labelKey: string
  options: ShelterCatalogOption[]
}

export const SHELTER_CATALOG: ShelterCatalogCategory[] = [
  {
    labelKey: 'concrete',
    options: [
      {
        id: 'concrete-9x16',
        templateId: 'shelter-9x16',
        labelKey: '9x16',
        widthFt: 9,
        depthFt: 16
      },
      {
        id: 'concrete-10x12',
        templateId: 'shelter-10x12',
        labelKey: '10x12',
        widthFt: 10,
        depthFt: 12
      },
      {
        id: 'concrete-10x20',
        templateId: 'shelter-10x20',
        labelKey: '10x20',
        widthFt: 10,
        depthFt: 20
      },
      {
        id: 'concrete-12x16',
        templateId: 'shelter-12x16',
        labelKey: '12x16',
        widthFt: 12,
        depthFt: 16
      },
      {
        id: 'concrete-12x20',
        templateId: 'shelter-12x20',
        labelKey: '12x20',
        widthFt: 12,
        depthFt: 20
      }
    ]
  },
  {
    labelKey: 'datacommPro',
    options: [
      {
        id: 'datacomm-10x12',
        templateId: 'shelter-10x12',
        labelKey: '10x12',
        widthFt: 10,
        depthFt: 12
      },
      {
        id: 'datacomm-12x16',
        templateId: 'shelter-12x16',
        labelKey: '12x16',
        widthFt: 12,
        depthFt: 16
      },
      {
        id: 'datacomm-12x20',
        templateId: 'shelter-12x20',
        labelKey: '12x20',
        widthFt: 12,
        depthFt: 20
      },
      {
        id: 'datacomm-12x26',
        templateId: 'shelter-12x26',
        labelKey: '12x26',
        widthFt: 12,
        depthFt: 26
      },
      {
        id: 'datacomm-24x36',
        templateId: 'shelter-24x36',
        labelKey: '24x36',
        widthFt: 24,
        depthFt: 36
      }
    ]
  }
]

export function findCatalogOption(optionId: string): ShelterCatalogOption | null {
  for (const cat of SHELTER_CATALOG) {
    const match = cat.options.find((o) => o.id === optionId)
    if (match) return match
  }
  return null
}

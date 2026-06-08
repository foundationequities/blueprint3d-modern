export interface ShelterCatalogEntry {
  id: string
  manufacturer: 'RMS' | 'DPS'
  type: 'concrete' | 'datacomm'
  label: string
  widthFt: number
  lengthFt: number
  sizeLabel: string
  url: string
}

export interface ShelterCatalog {
  shelters: ShelterCatalogEntry[]
}

export async function loadShelterCatalog(): Promise<ShelterCatalog> {
  const res = await fetch('/shelters/index.json', { cache: 'no-cache' })
  if (!res.ok) throw new Error(`Shelter catalog load failed: ${res.status}`)
  return res.json()
}

export function groupShelterCatalogByType(
  catalog: ShelterCatalog
): Map<'concrete' | 'datacomm', ShelterCatalogEntry[]> {
  const map = new Map<'concrete' | 'datacomm', ShelterCatalogEntry[]>()
  for (const entry of catalog.shelters) {
    if (!map.has(entry.type)) map.set(entry.type, [])
    map.get(entry.type)!.push(entry)
  }
  return map
}

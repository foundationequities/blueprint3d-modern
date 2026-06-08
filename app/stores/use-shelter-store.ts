import { create } from 'zustand'
import type { ShelterCatalogEntry } from '@/lib/shelter/shelter-glb-catalog'

interface ShelterStore {
  /** Catalog id selected in the picker (optimistic — updates immediately). */
  pendingSelectionId: string | null
  /** Catalog id of the GLB currently loaded into the scene. */
  builtSelectionId: string | null
  /** Full catalog entry for the loaded shelter (drives the status line). */
  builtEntry: ShelterCatalogEntry | null
  setPending: (id: string | null) => void
  setBuilt: (entry: ShelterCatalogEntry) => void
  clear: () => void
}

export const useShelterStore = create<ShelterStore>((set) => ({
  pendingSelectionId: null,
  builtSelectionId: null,
  builtEntry: null,
  setPending: (id) => set({ pendingSelectionId: id }),
  setBuilt: (entry) =>
    set({
      builtSelectionId: entry.id,
      builtEntry: entry,
      pendingSelectionId: entry.id
    }),
  clear: () =>
    set({ pendingSelectionId: null, builtSelectionId: null, builtEntry: null })
}))

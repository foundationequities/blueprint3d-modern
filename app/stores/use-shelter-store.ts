import { create } from 'zustand'
import type { ShelterTemplate } from '@/lib/shelter/shelter-template'

interface ShelterStore {
  /** Catalog option id the user picked in the dropdown but has not yet built. */
  pendingSelectionId: string | null
  /** Catalog option id of the shelter currently rendered in the scene. */
  builtSelectionId: string | null
  /** Template JSON loaded for the currently-built shelter. */
  template: ShelterTemplate | null
  setPending: (optionId: string | null) => void
  setBuilt: (optionId: string, template: ShelterTemplate) => void
  clear: () => void
}

export const useShelterStore = create<ShelterStore>((set) => ({
  pendingSelectionId: null,
  builtSelectionId: null,
  template: null,
  setPending: (optionId) => set({ pendingSelectionId: optionId }),
  setBuilt: (optionId, template) =>
    set({ builtSelectionId: optionId, template, pendingSelectionId: optionId }),
  clear: () => set({ pendingSelectionId: null, builtSelectionId: null, template: null })
}))

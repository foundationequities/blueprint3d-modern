import { create } from 'zustand'
import type { ShelterTemplate } from '@/lib/shelter/shelter-template'

interface ShelterStore {
  selectedShelterId: string | null
  template: ShelterTemplate | null
  setShelter: (template: ShelterTemplate) => void
  clear: () => void
}

export const useShelterStore = create<ShelterStore>((set) => ({
  selectedShelterId: null,
  template: null,
  setShelter: (template) =>
    set({ selectedShelterId: template.id, template }),
  clear: () => set({ selectedShelterId: null, template: null })
}))

import { group } from "@/pages/server/types"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

interface SelectItem {
  label: string
  value: string
}
type state = {
  status: string | null
  keyword: string
  groups: group[]
  currentGroup: group | null
  statusList: SelectItem[]
  setStatus: (val: string) => void
  setCurrentGroup: (val: group) => void
  setGroups: (val: group[]) => void
  setKeyword: (val: string) => void
}

export const useStore = create<state>()(
  persist(
    (set) => {
      return {
        status: null,
        keyword: "",
        groups: [],
        currentGroup: null,
        statusList: [
          {
            label: "在线",
            value: "online",
          },
          {
            label: "离线",
            value: "offline",
          },
        ],
        setStatus: (val) => {
          return set(() => ({ status: val }))
        },
        setKeyword: (val) => {
          return set(() => ({ keyword: val }))
        },
        setCurrentGroup: (val) => {
          return set(() => ({ currentGroup: val }))
        },
        setGroups: (val) => {
          return set(() => ({ groups: val }))
        },
      }
    },
    {
      name: "vps",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)

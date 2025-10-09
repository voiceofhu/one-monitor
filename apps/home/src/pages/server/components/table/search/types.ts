import { Table } from "@tanstack/react-table"

import { vps } from "../../types"

export interface SearchProps {
  table: Table<vps>
}

export interface ColumnVisibilityProps extends SearchProps {
  setColumnVisibility: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

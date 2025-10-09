import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  //   DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { vps } from "@/pages/server/types"
import { Header } from "@tanstack/react-table"
import { PinOff,Pin as PinIcon } from "lucide-react"

interface PinProps {
  header: Header<vps, unknown>
}
export function Pin({ header }: PinProps) {
  if (!header) return null
  const canPin = header.column.getCanPin()
  const isPin = header.column.getIsPinned()
  return (
    <div>
      {canPin && (
        <div
          className="flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {isPin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                header.column.pin(false)
              }}
              className={cn("h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200")}
            >
              <PinOff className="w-3 h-3 mr-2" />
            </Button>
          )}
          {!isPin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  className={cn("h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200")}
                >
                  <PinIcon
                    className={cn(
                      "w-3 h-3 transition-colors cursor-pointer",
                      header.column.getIsPinned() ? "text-primary" : "text-gray-400 hover:text-gray-600",
                    )}
                  />
                  <span className="sr-only">固定列选项</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-auto" align="end">
                {/* <DropdownMenuLabel className="text-xs text-left font-medium text-gray-700">列固定位置</DropdownMenuLabel> */}
                {/* <DropdownMenuSeparator /> */}

                <DropdownMenuRadioGroup
                  value={header.column.getIsPinned() || "unpin"}
                  onValueChange={(value) => {
                    switch (value) {
                      case "left":
                        header.column.pin("left")
                        break
                      case "right":
                        header.column.pin("right")
                        break
                      case "unpin":
                      default:
                        header.column.pin(false)
                        break
                    }
                  }}
                >
                  <DropdownMenuRadioItem value="left" className="text-xs text-left cursor-pointer">
                    固定到左侧
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="right" className="text-xs text-left cursor-pointer">
                    固定到右侧
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  )
}

import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"

import { Button } from "./ui/button"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "./ui/drawer"

interface NavigationProps {
  customBackgroundImage?: string
}

const navigationItems = [
  { key: "server", path: "/", label: "实例", icon: "" },
  { key: "domain", path: "/domain", label: "域名", icon: "" },
  { key: "monitor", path: "/monitor", label: "监控", icon: "" },
  { key: "network", path: "/network", label: "网络", icon: "" },
]

export function Navigation({ customBackgroundImage }: NavigationProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleNavigation = (path: string) => {
    navigate(path)
    setIsMobileMenuOpen(false)
    sessionStorage.removeItem("selectedGroup")
  }

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/server")
    }
    return location.pathname === path
  }

  return (
    <div className="">
      {/* 桌面端导航 */}
      <div className="hidden md:flex  ml-4 items-center gap-1">
        {navigationItems.map((item) => (
          <Button
            key={item.key}
            variant="ghost"
            size="sm"
            onClick={() => handleNavigation(item.path)}
            className={cn("text-sm font-medium transition-all duration-200")}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* 移动端 Drawer */}
      <div className="md:hidden">
        <Drawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "rounded-full px-[9px] ",
                customBackgroundImage ? "bg-white/70 dark:bg-black/70 backdrop-blur-sm" : "bg-white dark:bg-black",
              )}
            >
              <Menu className="w-4 h-4" />
            </Button>
          </DrawerTrigger>

          <DrawerContent className="max-h-[50vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2">
                <span>🧭</span>
                导航菜单
              </DrawerTitle>
              <DrawerDescription>选择你要访问的页面</DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4">
              <div className="grid gap-2">
                {navigationItems.map((item) => (
                  <Button
                    key={item.key}
                    variant={isActivePath(item.path) ? "default" : "ghost"}
                    size="lg"
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "justify-start text-base font-medium w-full h-12",
                      isActivePath(item.path) ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-secondary/80",
                    )}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    <div className="flex flex-col items-start">
                      <span>{item.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.path === "/" ? "服务器管理" : item.path === "/monitor" ? "性能监控" : item.path === "/network" ? "网络状态" : ""}
                      </span>
                    </div>
                    {isActivePath(item.path) && <div className="ml-auto w-2 h-2 bg-primary-foreground rounded-full" />}
                  </Button>
                ))}
              </div>
            </div>

            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  <X className="w-4 h-4 mr-2" />
                  关闭菜单
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  )
}
